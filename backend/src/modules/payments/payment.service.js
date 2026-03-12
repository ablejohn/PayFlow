// src/modules/payments/payment.service.js
// Payments follow a strict state machine — not every transition is allowed.
// This prevents invalid states like refunding a pending payment.

const { query, withTransaction } = require('../../config/database');
const { AppError, Errors } = require('../../shared/middleware/errorHandler');
const webhookService = require('../webhooks/webhook.service');

// Valid state transitions
const TRANSITIONS = {
  pending:    ['processing', 'failed'],
  processing: ['completed', 'failed'],
  completed:  ['refunded'],
  failed:     [],
  refunded:   [],
};

const assertTransition = (currentStatus, nextStatus) => {
  if (!TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    throw new AppError(
      `Cannot transition payment from '${currentStatus}' to '${nextStatus}'`,
      400,
      'INVALID_STATE_TRANSITION'
    );
  }
};

const createPayment = async (tenantId, data) => {
  const { invoiceId, provider, providerRef } = data;

  // Ensure invoice belongs to this tenant
  const invoiceResult = await query(
    'SELECT id, total_amount, currency, status FROM invoices WHERE id = $1 AND tenant_id = $2',
    [invoiceId, tenantId]
  );

  const invoice = invoiceResult.rows[0];
  if (!invoice) throw Errors.notFound('Invoice');

  if (invoice.status === 'paid') {
    throw new AppError('Invoice is already paid', 400, 'ALREADY_PAID');
  }

  const result = await query(
    `INSERT INTO payments (tenant_id, invoice_id, amount, currency, provider, provider_ref)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [tenantId, invoiceId, invoice.total_amount, invoice.currency, provider, providerRef || null]
  );

  return result.rows[0];
};

const updatePaymentStatus = async (tenantId, paymentId, nextStatus, failureReason = null) => {
  return withTransaction(async (client) => {
    const payResult = await client.query(
      'SELECT * FROM payments WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [paymentId, tenantId]
    );

    const payment = payResult.rows[0];
    if (!payment) throw Errors.notFound('Payment');

    assertTransition(payment.status, nextStatus);

    const extra = nextStatus === 'completed'
      ? ', processed_at = NOW()'
      : '';

    const updated = await client.query(
      `UPDATE payments
       SET status = $1, failure_reason = $2${extra}
       WHERE id = $3
       RETURNING *`,
      [nextStatus, failureReason, paymentId]
    );

    // If payment completed → mark invoice as paid
    if (nextStatus === 'completed') {
      await client.query(
        `UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = $1`,
        [payment.invoice_id]
      );

      // Fire webhook asynchronously (don't await — don't block the response)
      webhookService.dispatch(tenantId, 'payment.completed', {
        paymentId,
        invoiceId: payment.invoice_id,
        amount:    payment.amount,
        currency:  payment.currency,
      }).catch(() => {}); // Webhook failures are logged internally, not thrown
    }

    if (nextStatus === 'failed') {
      webhookService.dispatch(tenantId, 'payment.failed', {
        paymentId,
        reason: failureReason,
      }).catch(() => {});
    }

    return updated.rows[0];
  });
};

const listPayments = async (tenantId, queryParams = {}) => {
  const { invoiceId, status } = queryParams;
  let where = 'WHERE tenant_id = $1';
  const params = [tenantId];
  let i = 2;

  if (invoiceId) { where += ` AND invoice_id = $${i++}`; params.push(invoiceId); }
  if (status)    { where += ` AND status = $${i++}`;     params.push(status);    }

  const result = await query(
    `SELECT * FROM payments ${where} ORDER BY created_at DESC`,
    params
  );
  return result.rows;
};

module.exports = { createPayment, updatePaymentStatus, listPayments };
