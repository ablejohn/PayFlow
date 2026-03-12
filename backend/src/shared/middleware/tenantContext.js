// src/shared/middleware/tenantContext.js
// This is the heart of multi-tenancy.
// After auth middleware verifies the JWT, this middleware ensures every
// downstream handler has req.tenantId available — no handler ever needs
// to extract it from the token manually.
//
// It also verifies the tenant is still active (not suspended/cancelled).

const { query } = require('../../config/database');
const { Errors } = require('./errorHandler');
const asyncWrapper = require('../utils/asyncWrapper');

const tenantContext = asyncWrapper(async (req, res, next) => {
  // req.user is set by auth middleware (auth.middleware.js)
  if (!req.user?.tenantId) {
    throw Errors.unauthorized();
  }

  const result = await query(
    'SELECT id, name, slug, plan, is_active FROM tenants WHERE id = $1',
    [req.user.tenantId]
  );

  const tenant = result.rows[0];

  if (!tenant) {
    throw Errors.notFound('Tenant');
  }

  if (!tenant.is_active) {
    throw Errors.forbidden(); // Account suspended
  }

  // Attach full tenant object — controllers can read plan, slug, etc.
  req.tenant   = tenant;
  req.tenantId = tenant.id;

  next();
});

module.exports = tenantContext;
