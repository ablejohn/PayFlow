// src/shared/middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');
const env = require('../../config/env');

// General API rate limiter — applied globally
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max:      env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    error: {
      code:    'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
    },
  },
});

// Stricter limiter for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    error: {
      code:    'RATE_LIMITED',
      message: 'Too many login attempts, please try again in 15 minutes.',
    },
  },
});

module.exports = { apiLimiter, authLimiter };
