# PayFlow — Multi-Tenant Invoice & Payment API

> A production-grade SaaS backend for invoice management and payment tracking, built with Node.js, Express, and PostgreSQL.

[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-blue)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## What it does

PayFlow is a multi-tenant REST API that lets businesses manage their invoices and payments end-to-end. Each business (tenant) gets a fully isolated workspace — their data is never mixed with another tenant's. Core features:

- **Multi-tenancy** — every request is scoped to a tenant via JWT middleware. No handler ever manually extracts tenant context.
- **Invoice lifecycle** — create invoices with line items, auto-calculate tax, generate PDFs and store them on AWS S3, track status from draft → sent → paid
- **Payment state machine** — strict transition rules (pending → processing → completed/failed → refunded). Invalid transitions are rejected with a 400 error.
- **Webhook dispatch** — async event delivery to tenant endpoints with exponential backoff retry (up to 3 attempts: 2s, 4s, 8s)
- **Role-based access control** — owner / admin / member roles enforced at the route level using composable middleware

## Tech Stack

| Layer       | Technology                          |
|-------------|--------------------------------------|
| Runtime     | Node.js 20                           |
| Framework   | Express 4                            |
| Database    | PostgreSQL 16 (connection pooling)   |
| Auth        | JWT + bcryptjs (12 salt rounds)      |
| Validation  | Zod (schema-first, request parsing)  |
| PDF         | PDFKit                               |
| Storage     | AWS S3 (eu-north-1)                  |
| Logging     | Winston (JSON in prod, pretty in dev)|
| Testing     | Jest + Supertest                     |
| Container   | Docker + docker-compose              |

---

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & docker-compose
- AWS account (for S3 PDF storage)

### Run locally

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/payflow.git
cd payflow/backend

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Fill in your values (JWT_SECRET, AWS credentials, etc.)

# 4. Start PostgreSQL + API together
docker-compose up
```

API is live at `http://localhost:3000`  
Health check: `GET http://localhost:3000/health`

### Run tests

```bash
npm test
```

---

## API Reference

### Auth
| Method | Endpoint               | Description                        |
|--------|------------------------|------------------------------------|
| POST   | /api/v1/auth/register  | Create a new tenant + owner user   |
| POST   | /api/v1/auth/login     | Authenticate and receive JWT       |
| GET    | /api/v1/auth/me        | Get current user + tenant info     |

### Invoices
| Method | Endpoint                    | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | /api/v1/invoices            | List invoices (paginated, filtered)|
| POST   | /api/v1/invoices            | Create invoice with line items     |
| GET    | /api/v1/invoices/:id        | Get single invoice                 |
| POST   | /api/v1/invoices/:id/pdf    | Generate PDF and upload to S3      |
| PATCH  | /api/v1/invoices/:id/status | Update invoice status              |

### Payments
| Method | Endpoint                     | Description                       |
|--------|------------------------------|-----------------------------------|
| GET    | /api/v1/payments             | List payments                     |
| POST   | /api/v1/payments             | Create payment for an invoice     |
| PATCH  | /api/v1/payments/:id/status  | Advance payment through states    |

---

## Architecture Decisions

**Module-based structure over layered architecture** — code lives in feature folders (`/auth`, `/invoices`, `/payments`) rather than top-level `/controllers`, `/services`, `/models`. A new developer can find everything about invoices in one place without jumping across the codebase.

**`app.js` vs `server.js` separation** — `app.js` builds and exports the Express app. `server.js` is the only file that calls `app.listen()`. This means integration tests import the app directly without ever binding a port — clean, fast, no port conflicts in CI.

**Tenant context middleware** — after JWT verification, a dedicated middleware resolves the tenant from the database and attaches it to `req.tenant` and `req.tenantId`. Every downstream handler gets tenant context for free. No controller ever touches the JWT payload directly.

**Payment state machine** — transitions are defined in a `TRANSITIONS` map. Any attempt to move to an invalid state throws an `AppError` with code `INVALID_STATE_TRANSITION`. This makes the payment flow explicit, testable, and impossible to corrupt through bad API calls.

**Centralised error handling** — all errors funnel through a single Express error middleware. Operational errors (expected, safe to expose) get their message returned. Unknown errors get logged with full stack trace and return a generic 500 in production. JWT errors, PostgreSQL constraint violations — all handled in one place.

**Async webhook dispatch** — webhooks are fired after payment events using fire-and-forget (`.catch(() => {})`). Payment API responses stay fast. Webhook failures are logged and retried internally without affecting the caller.

---

## Project Structure

```
backend/
├── src/
│   ├── config/             # DB pool, AWS S3 client, env validation
│   ├── modules/
│   │   ├── auth/           # Register, login, JWT, role guard
│   │   ├── invoices/       # CRUD, PDF generation, status management
│   │   ├── payments/       # State machine, payment lifecycle
│   │   └── webhooks/       # Event dispatch with retry logic
│   └── shared/
│       ├── middleware/      # Error handler, rate limiter, tenant context
│       ├── utils/           # Logger, async wrapper, pagination
│       └── validators/      # Zod schemas for all request bodies
├── db/
│   └── migrations/         # Numbered SQL files (run automatically via Docker)
├── tests/
│   ├── unit/
│   └── integration/        # Full HTTP → DB flow tests with Supertest
├── .env.example
├── Dockerfile
├── server.js
└── package.json
```

---

## Author

**John Ayomide Abe** — Backend & Fullstack Engineer  
Node.js · Java/Spring · React · PostgreSQL · AWS  

[![LinkedIn](https://img.shields.io/badge/LinkedIn-john--abe-blue?logo=linkedin)](https://www.linkedin.com/in/john-abe-601247236/)
[![Portfolio](https://img.shields.io/badge/Portfolio-johnabebackenddev.ng-green)](https://johnabebackenddev.ng)
[![Email](https://img.shields.io/badge/Email-Johnabe410@gmail.com-red)](mailto:Johnabe410@gmail.com)