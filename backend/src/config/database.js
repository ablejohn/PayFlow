// src/config/database.js
// Uses pg Pool — one shared pool for the whole app (not one connection per request).
// This is the correct pattern for production Node.js apps.

const { Pool } = require('pg');
const env = require('./env');
const logger = require('../shared/utils/logger');

const pool = new Pool({
  connectionString: env.db.url,
  max:              env.db.maxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.isProduction ? { rejectUnauthorized: true } : false,
});

pool.on('connect', () => {
  logger.debug('PostgreSQL client connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
  process.exit(1); // Fatal — let the process manager restart
});

/**
 * Run a single query against the pool.
 * @param {string} text    - SQL string with $1, $2 placeholders
 * @param {Array}  params  - Parameterised values (prevents SQL injection)
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client for transactions.
 * Always release() the client in a finally block.
 */
const getClient = () => pool.connect();

/**
 * Convenience wrapper for transactions.
 * Automatically handles BEGIN / COMMIT / ROLLBACK.
 *
 * Usage:
 *   await withTransaction(async (client) => {
 *     await client.query('INSERT ...');
 *     await client.query('UPDATE ...');
 *   });
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, withTransaction };
