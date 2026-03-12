// server.js
// Only file that calls app.listen() — keeps app.js importable for tests.

require('dotenv').config();
const app    = require('./src/app');
const env    = require('./src/config/env');
const logger = require('./src/shared/utils/logger');
const { query } = require('./src/config/database');

const startServer = async () => {
  // Verify DB connection before accepting traffic
  try {
    await query('SELECT 1');
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error('❌ Database connection failed', { error: err.message });
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    logger.info(`🚀 PayFlow API running on port ${env.port} [${env.nodeEnv}]`);
  });

  // Graceful shutdown — finish in-flight requests before closing
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

startServer();
