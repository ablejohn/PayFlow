// tests/integration/payments.test.js
// Tests the full HTTP → controller → service → DB chain.
// Uses supertest to fire real HTTP requests against the app.

const request = require('supertest');
const app     = require('../../src/app');

// In CI, this connects to a real test DB (set via DATABASE_URL env var)
// Locally, use: docker-compose up db -d before running tests

describe('POST /api/v1/auth/register + payments flow', () => {
  let token;
  let invoiceId;
  let paymentId;

  const tenant = {
    tenantName: 'Test Corp',
    tenantSlug: `test-corp-${Date.now()}`, // Unique slug per test run
    fullName:   'Test Owner',
    email:      `owner-${Date.now()}@test.com`,
    password:   'Password123!',
  };

  it('should register a new tenant and return a token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(tenant)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    token = res.body.data.token;
  });

  it('should create an invoice', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName:  'Acme AB',
        customerEmail: 'billing@acme.se',
        lineItems: [
          { description: 'API Development', qty: 10, unit_price: 1500 },
          { description: 'DevOps Setup',    qty: 1,  unit_price: 5000 },
        ],
        taxRate:  25,
        currency: 'SEK',
      })
      .expect(201);

    expect(res.body.data.invoice_number).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(res.body.data.total_amount).toBe('23750.00'); // (15000+5000) * 1.25
    invoiceId = res.body.data.id;
  });

  it('should create a payment for the invoice', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ invoiceId, provider: 'stripe' })
      .expect(201);

    expect(res.body.data.status).toBe('pending');
    paymentId = res.body.data.id;
  });

  it('should transition payment from pending → processing → completed', async () => {
    await request(app)
      .patch(`/api/v1/payments/${paymentId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'processing' })
      .expect(200);

    const res = await request(app)
      .patch(`/api/v1/payments/${paymentId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' })
      .expect(200);

    expect(res.body.data.status).toBe('completed');
  });

  it('should reject invalid state transition (completed → pending)', async () => {
    await request(app)
      .patch(`/api/v1/payments/${paymentId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'pending' })
      .expect(400);
  });

  it('should show invoice as paid after payment completed', async () => {
    const res = await request(app)
      .get(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.status).toBe('paid');
  });
});
