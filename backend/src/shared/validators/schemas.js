// src/shared/validators/schemas.js
// Zod schemas validate all incoming request bodies at the route level.
// This keeps controllers clean — they only receive validated, typed data.

const { z } = require('zod');

// ─── Auth ────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  tenantName: z.string().min(2).max(255),
  tenantSlug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  fullName:   z.string().min(2).max(255),
  email:      z.string().email(),
  password:   z.string().min(8).max(100),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ─── Invoices ────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1),
  qty:         z.number().positive(),
  unit_price:  z.number().nonnegative(),
});

const createInvoiceSchema = z.object({
  customerName:  z.string().min(1).max(255),
  customerEmail: z.string().email(),
  lineItems:     z.array(lineItemSchema).min(1),
  taxRate:       z.number().min(0).max(100).default(0),
  currency:      z.string().length(3).default('SEK'),
  dueDate:       z.string().datetime().optional(),
  notes:         z.string().max(1000).optional(),
});

const updateInvoiceSchema = createInvoiceSchema.partial();

// ─── Payments ────────────────────────────────────────────────────────────────

const createPaymentSchema = z.object({
  invoiceId:   z.string().uuid(),
  provider:    z.enum(['stripe', 'klarna', 'swish']).default('stripe'),
  providerRef: z.string().optional(),
});

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On failure: returns 400 with field-level error details.
 * On success: replaces req.body with the parsed (coerced) data.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: {
        code:    'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: result.error.flatten().fieldErrors,
      },
    });
  }
  req.body = result.data; // Use coerced/defaulted values
  next();
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  createPaymentSchema,
};
