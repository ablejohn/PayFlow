// src/modules/payments/payment.controller.js

const paymentService = require('./payment.service');
const asyncWrapper   = require('../../shared/utils/asyncWrapper');

const createPayment = asyncWrapper(async (req, res) => {
  const payment = await paymentService.createPayment(req.tenantId, req.body);
  res.status(201).json({ success: true, data: payment });
});

const listPayments = asyncWrapper(async (req, res) => {
  const payments = await paymentService.listPayments(req.tenantId, req.query);
  res.json({ success: true, data: payments });
});

const updateStatus = asyncWrapper(async (req, res) => {
  const { status, failureReason } = req.body;
  const payment = await paymentService.updatePaymentStatus(
    req.tenantId, req.params.id, status, failureReason
  );
  res.json({ success: true, data: payment });
});

module.exports = { createPayment, listPayments, updateStatus };
