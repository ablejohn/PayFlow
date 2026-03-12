// src/modules/invoices/invoice.service.js

const { query, withTransaction } = require('../../config/database');
const { uploadToS3 } = require('../../config/aws');
const { Errors } = require('../../shared/middleware/errorHandler');
const { parsePagination, paginatedResponse } = require('../../shared/utils/pagination');
const PDFDocument = require('pdfkit');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a sequential invoice number scoped to a tenant: INV-2024-0042 */
const generateInvoiceNumber = async (client, tenantId) => {
  const result = await client.query(
    `SELECT COUNT(*) as count FROM invoices WHERE tenant_id = $1`,
    [tenantId]
  );
  const seq = parseInt(result.rows[0].count, 10) + 1;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(seq).padStart(4, '0')}`;
};

/** Calculate totals from line items and tax rate */
const calculateTotals = (lineItems, taxRate) => {
  const subtotal  = lineItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const total     = parseFloat((subtotal + taxAmount).toFixed(2));
  return { subtotal: parseFloat(subtotal.toFixed(2)), taxAmount, total };
};

// ─── PDF Generation ───────────────────────────────────────────────────────────

const generateInvoicePDF = (invoice) => {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data',  (chunk) => chunks.push(chunk));
    doc.on('end',   ()      => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('PayFlow', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Invoice Management Platform', 50, 80);

    // Invoice metadata
    doc.fillColor('#000').fontSize(20).text(`Invoice ${invoice.invoice_number}`, 350, 50);
    doc.fontSize(10).text(`Date: ${new Date(invoice.created_at).toLocaleDateString('en-SE')}`, 350, 80);
    if (invoice.due_date) {
      doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString('en-SE')}`, 350, 95);
    }

    // Bill to
    doc.moveDown(3);
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:');
    doc.fontSize(10).font('Helvetica')
      .text(invoice.customer_name)
      .text(invoice.customer_email);

    // Line items table
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, doc.y, { width: 250 });
    doc.text('Qty',   300, doc.y - doc.currentLineHeight(), { width: 60, align: 'right' });
    doc.text('Price', 360, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
    doc.text('Total', 440, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });

    doc.moveTo(50, doc.y + 4).lineTo(550, doc.y + 4).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica');

    for (const item of invoice.line_items) {
      const lineTotal = (item.qty * item.unit_price).toFixed(2);
      doc.text(item.description, 50,   doc.y, { width: 250 });
      doc.text(String(item.qty), 300,  doc.y - doc.currentLineHeight(), { width: 60,  align: 'right' });
      doc.text(item.unit_price.toFixed(2), 360, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
      doc.text(lineTotal, 440, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
      doc.moveDown(0.5);
    }

    // Totals
    doc.moveTo(350, doc.y + 4).lineTo(550, doc.y + 4).stroke();
    doc.moveDown(0.5);
    doc.text(`Subtotal:`, 350, doc.y, { width: 90 });
    doc.text(`${invoice.currency} ${invoice.subtotal}`, 440, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
    doc.moveDown(0.5);
    doc.text(`Tax (${invoice.tax_rate}%):`, 350, doc.y, { width: 90 });
    doc.text(`${invoice.currency} ${invoice.tax_amount}`, 440, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold');
    doc.text(`Total:`, 350, doc.y, { width: 90 });
    doc.text(`${invoice.currency} ${invoice.total_amount}`, 440, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });

    if (invoice.notes) {
      doc.moveDown(3).font('Helvetica').fontSize(9).fillColor('#666').text(`Notes: ${invoice.notes}`);
    }

    doc.end();
  });
};

// ─── Service Functions ────────────────────────────────────────────────────────

const createInvoice = async (tenantId, userId, data) => {
  const { customerName, customerEmail, lineItems, taxRate = 0, currency = 'SEK', dueDate, notes } = data;
  const { subtotal, taxAmount, total } = calculateTotals(lineItems, taxRate);

  return withTransaction(async (client) => {
    const invoiceNumber = await generateInvoiceNumber(client, tenantId);

    const result = await client.query(
      `INSERT INTO invoices
         (tenant_id, created_by, invoice_number, customer_name, customer_email,
          line_items, subtotal, tax_rate, tax_amount, total_amount, currency, due_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [tenantId, userId, invoiceNumber, customerName, customerEmail,
       JSON.stringify(lineItems), subtotal, taxRate, taxAmount, total, currency, dueDate || null, notes || null]
    );

    return result.rows[0];
  });
};

const listInvoices = async (tenantId, queryParams) => {
  const { limit, offset, page } = parsePagination(queryParams);
  const { status, search } = queryParams;

  let whereClause = 'WHERE tenant_id = $1';
  const params = [tenantId];
  let paramIdx = 2;

  if (status) {
    whereClause += ` AND status = $${paramIdx++}`;
    params.push(status);
  }

  if (search) {
    whereClause += ` AND (customer_name ILIKE $${paramIdx} OR invoice_number ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT id, invoice_number, customer_name, customer_email, total_amount,
              currency, status, due_date, created_at
       FROM invoices ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    ),
    query(`SELECT COUNT(*) FROM invoices ${whereClause}`, params),
  ]);

  return paginatedResponse(dataResult.rows, parseInt(countResult.rows[0].count, 10), { limit, page });
};

const getInvoice = async (tenantId, invoiceId) => {
  const result = await query(
    'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
    [invoiceId, tenantId]
  );
  if (!result.rows[0]) throw Errors.notFound('Invoice');
  return result.rows[0];
};

const generateAndStorePDF = async (tenantId, invoiceId) => {
  const invoice = await getInvoice(tenantId, invoiceId);
  const buffer  = await generateInvoicePDF(invoice);
  const key     = `tenants/${tenantId}/invoices/${invoiceId}.pdf`;
  const pdfUrl  = await uploadToS3({ key, buffer });

  await query('UPDATE invoices SET pdf_url = $1 WHERE id = $2', [pdfUrl, invoiceId]);

  return { pdfUrl };
};

const updateInvoiceStatus = async (tenantId, invoiceId, status) => {
  const extra = status === 'paid' ? ', paid_at = NOW()' : '';
  const result = await query(
    `UPDATE invoices SET status = $1${extra} WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [status, invoiceId, tenantId]
  );
  if (!result.rows[0]) throw Errors.notFound('Invoice');
  return result.rows[0];
};

module.exports = { createInvoice, listInvoices, getInvoice, generateAndStorePDF, updateInvoiceStatus };
