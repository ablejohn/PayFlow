-- Migration 004: Payments & Webhooks

CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE webhook_event  AS ENUM ('payment.completed', 'payment.failed', 'invoice.paid', 'invoice.overdue');

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id      UUID           NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount          NUMERIC(12, 2) NOT NULL,
  currency        CHAR(3)        NOT NULL DEFAULT 'SEK',
  status          payment_status NOT NULL DEFAULT 'pending',
  provider        VARCHAR(50)    NOT NULL DEFAULT 'stripe',  -- stripe | klarna | swish
  provider_ref    VARCHAR(255),                              -- external transaction ID
  failure_reason  TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant_id  ON payments(tenant_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_status     ON payments(status);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Webhook delivery log (retry-safe, idempotent)
CREATE TABLE webhook_deliveries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type    webhook_event NOT NULL,
  payload       JSONB         NOT NULL,
  endpoint_url  TEXT          NOT NULL,
  status_code   INT,
  attempts      INT           NOT NULL DEFAULT 0,
  last_attempt  TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_tenant_id ON webhook_deliveries(tenant_id);
