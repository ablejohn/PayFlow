// src/modules/invoices/invoice.routes.js

const router = require('express').Router();
const ctrl   = require('./invoice.controller');
const { protect, roleGuard } = require('../auth/auth.middleware');
const tenantContext = require('../../shared/middleware/tenantContext');
const { validate, createInvoiceSchema } = require('../../shared/validators/schemas');
const { z } = require('zod');

// All invoice routes require auth + tenant context
router.use(protect, tenantContext);

router.get('/',    ctrl.listInvoices);
router.post('/',   validate(createInvoiceSchema), ctrl.createInvoice);
router.get('/:id', ctrl.getInvoice);

// Generate and store PDF for an invoice
router.post('/:id/pdf', ctrl.generatePDF);

// Update status — only owners/admins can mark as paid/cancelled
router.patch(
  '/:id/status',
  roleGuard('owner', 'admin'),
  validate(z.object({ status: z.enum(['draft','sent','paid','overdue','cancelled']) })),
  ctrl.updateStatus
);

module.exports = router;
