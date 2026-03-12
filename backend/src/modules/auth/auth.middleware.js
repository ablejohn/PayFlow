// src/modules/auth/auth.middleware.js

const { verifyToken } = require('./auth.service');
const { Errors } = require('../../shared/middleware/errorHandler');

/**
 * protect() — verifies JWT and attaches decoded payload to req.user.
 * Apply to any route that requires authentication.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(Errors.unauthorized());
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = {
      id:       decoded.sub,
      tenantId: decoded.tenantId,
      role:     decoded.role,
    };
    next();
  } catch (err) {
    next(err); // Passes JsonWebTokenError / TokenExpiredError to errorHandler
  }
};

/**
 * roleGuard(...roles) — restricts a route to specific roles.
 * Must be used AFTER protect().
 *
 * Usage:
 *   router.delete('/tenants/:id', protect, roleGuard('owner'), handler)
 */
const roleGuard = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(Errors.unauthorized());

  if (!allowedRoles.includes(req.user.role)) {
    return next(Errors.forbidden());
  }

  next();
};

module.exports = { protect, roleGuard };
