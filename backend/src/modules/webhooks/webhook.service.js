// src/modules/webhooks/webhook.service.js
// Webhooks notify tenants' external systems when key events happen.
// Retry logic: up to 3 attempts with exponential backoff.

const { query } = require('../../config/database');
const logger    = require('../../shared/utils/logger');

const MAX_ATTEMPTS = 3;

/**
 * Fetch all registered webhook endpoints for a tenant and event type.
 * (In a full build, tenants would register endpoints via API — stored in a
 * webhook_endpoints table. Here we query directly for simplicity.)
 */
const getTenantEndpoints = async (tenantId, eventType) => {
  // Simplified: in production this queries a webhook_endpoints table
  // For now we return a mock to keep the structure complete
  return [];
};

/**
 * Deliver a single webhook with retry logic.
 */
const deliverWebhook = async (deliveryId, url, payload, attempt = 1) => {
  try {
    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-PayFlow-Event':  payload.event,
        'X-PayFlow-Tenant': payload.tenantId,
      },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(10000), // 10s timeout
    });

    await query(
      `UPDATE webhook_deliveries
       SET status_code = $1, attempts = $2, last_attempt = NOW(),
           delivered_at = CASE WHEN $1 BETWEEN 200 AND 299 THEN NOW() ELSE NULL END
       WHERE id = $3`,
      [response.status, attempt, deliveryId]
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    logger.info('Webhook delivered', { deliveryId, url, attempt });
  } catch (err) {
    logger.warn('Webhook delivery failed', { deliveryId, url, attempt, error: err.message });

    if (attempt < MAX_ATTEMPTS) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      setTimeout(() => deliverWebhook(deliveryId, url, payload, attempt + 1), delay);
    } else {
      logger.error('Webhook exhausted retries', { deliveryId, url });
    }
  }
};

/**
 * Main dispatch function — called by other services after key events.
 * Creates a delivery record then fires async (non-blocking).
 */
const dispatch = async (tenantId, eventType, data) => {
  const endpoints = await getTenantEndpoints(tenantId, eventType);

  for (const endpoint of endpoints) {
    const payload = {
      event:     eventType,
      tenantId,
      timestamp: new Date().toISOString(),
      data,
    };

    const result = await query(
      `INSERT INTO webhook_deliveries (tenant_id, event_type, payload, endpoint_url)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, eventType, JSON.stringify(payload), endpoint.url]
    );

    const deliveryId = result.rows[0].id;

    // Fire and forget — caller should .catch() this
    deliverWebhook(deliveryId, endpoint.url, payload);
  }
};

module.exports = { dispatch };
