// src/shared/middleware/errorHandler.js
// The single place where ALL errors in the app are formatted and returned.
// Every thrown error eventually lands here via Express's error pipeline.

const logger = require('../utils/logger');
const env = require('../../config/env');

// Custom error class — use this to throw errors with HTTP status codes
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Operational = expected error (not a bug)
  }
}

// Specific error factories for common cases
const Errors = {
  notFound:      (resource = 'Resource') => new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  unauthorized:  ()                       => new AppError('Authentication required', 401, 'UNAUTHORIZED'),
  forbidden:     ()                       => new AppError('Insufficient permissions', 403, 'FORBIDDEN'),
  badRequest:    (msg)                    => new AppError(msg, 400, 'BAD_REQUEST'),
  conflict:      (msg)                    => new AppError(msg, 409, 'CONFLICT'),
};

// Express 4-argument error middleware
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Operational errors: expected, safe to expose message
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code:    err.code,
        message: err.message,
      },
    });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'A record with this value already exists' },
    });
  }

  // JWT errors from auth middleware
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
    });
  }

  // Unknown error — log it, hide details from client in production
  logger.error('Unhandled error', {
    message: err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
  });

  return res.status(500).json({
    success: false,
    error: {
      code:    'INTERNAL_ERROR',
      message: env.isProduction ? 'An unexpected error occurred' : err.message,
    },
  });
};

module.exports = { errorHandler, AppError, Errors };
