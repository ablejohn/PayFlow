// src/modules/invoices/invoice.controller.js

const invoiceService = require('./invoice.service');
const asyncWrapper   = require('../../shared/utils/asyncWrapper');

const createInvoice = asyncWrapper(async (req, res) => {
  const invoice = await invoiceService.createInvoice(req.tenantId, req.user.id, req.body);
  res.status(201).json({ success: true, data: invoice });
});

const listInvoices = asyncWrapper(async (req, res) => {
  const result = await invoiceService.listInvoices(req.tenantId, req.query);
  res.json({ success: true, ...result });
});

const getInvoice = asyncWrapper(async (req, res) => {
  const invoice = await invoiceService.getInvoice(req.tenantId, req.params.id);
  res.json({ success: true, data: invoice });
});

const generatePDF = asyncWrapper(async (req, res) => {
  const result = await invoiceService.generateAndStorePDF(req.tenantId, req.params.id);
  res.json({ success: true, data: result });
});

const updateStatus = asyncWrapper(async (req, res) => {
  const invoice = await invoiceService.updateInvoiceStatus(req.tenantId, req.params.id, req.body.status);
  res.json({ success: true, data: invoice });
});

module.exports = { createInvoice, listInvoices, getInvoice, generatePDF, updateStatus };
