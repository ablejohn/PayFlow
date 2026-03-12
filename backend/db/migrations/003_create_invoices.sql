-- Migration 003: Invoices

CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by      UUID           NOT NULL REFERENCES users(id),
  invoice_number  VARCHAR(50)    NOT NULL,         -- e.g. INV-2024-0042
  customer_name   VARCHAR(255)   NOT NULL,
  customer_email  VARCHAR(255)   NOT NULL,
  line_items      JSONB          NOT NULL DEFAULT '[]', -- [{description, qty, unit_price}]
  subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5, 2)  NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency        CHAR(3)        NOT NULL DEFAULT 'SEK',
  status          invoice_status NOT NULL DEFAULT 'draft',
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  pdf_url         TEXT,                            -- S3 URL after generation
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT invoices_number_tenant_unique UNIQUE (invoice_number, tenant_id)
);

CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_status    ON invoices(status);
CREATE INDEX idx_invoices_due_date  ON invoices(due_date);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
