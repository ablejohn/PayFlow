// src/app.js
// Builds and exports the Express app without starting it.
// This separation makes integration testing clean.

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');

const { apiLimiter }  = require('./shared/middleware/rateLimiter');
const { errorHandler } = require('./shared/middleware/errorHandler');
const logger           = require('./shared/utils/logger');

const authRoutes    = require('./modules/auth/auth.routes');
const invoiceRoutes = require('./modules/invoices/invoice.routes');
const paymentRoutes = require('./modules/payments/payment.routes');

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ─── Parsing ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));     // Limit body size

// ─── Rate limiting ───────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Request logging (dev only) ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',     authRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({
  success: false,
  error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
}));

// ─── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
