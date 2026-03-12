// src/modules/payments/payment.routes.js

const router = require('express').Router();
const ctrl   = require('./payment.controller');
const { protect, roleGuard } = require('../auth/auth.middleware');
const tenantContext = require('../../shared/middleware/tenantContext');
const { validate, createPaymentSchema } = require('../../shared/validators/schemas');
const { z } = require('zod');

router.use(protect, tenantContext);

router.get('/',    ctrl.listPayments);
router.post('/',   validate(createPaymentSchema), ctrl.createPayment);

router.patch(
  '/:id/status',
  roleGuard('owner', 'admin'),
  validate(z.object({
    status:        z.enum(['processing', 'completed', 'failed', 'refunded']),
    failureReason: z.string().optional(),
  })),
  ctrl.updateStatus
);

module.exports = router;
