// src/modules/auth/auth.service.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, withTransaction } = require('../../config/database');
const { AppError, Errors } = require('../../shared/middleware/errorHandler');
const env = require('../../config/env');

const SALT_ROUNDS = 12;

/**
 * Register a new tenant + owner user in a single transaction.
 * Either both records are created, or neither is.
 */
const register = async ({ tenantName, tenantSlug, fullName, email, password }) => {
  return withTransaction(async (client) => {
    // 1. Create tenant
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug, plan`,
      [tenantName, tenantSlug]
    );
    const tenant = tenantResult.rows[0];

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Create owner user
    const userResult = await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, 'owner')
       RETURNING id, email, full_name, role`,
      [tenant.id, email, passwordHash, fullName]
    );
    const user = userResult.rows[0];

    // 4. Issue token
    const token = issueToken(user, tenant);

    return { user, tenant, token };
  });
};

/**
 * Authenticate a user and return a JWT.
 */
const login = async ({ email, password }) => {
  // Fetch user + tenant in one join (avoids N+1)
  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.role, u.password_hash, u.is_active,
            t.id as tenant_id, t.name as tenant_name, t.slug, t.plan, t.is_active as tenant_active
     FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE u.email = $1`,
    [email]
  );

  const row = result.rows[0];

  if (!row) {
    // Same error for wrong email or wrong password — prevents user enumeration
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!row.is_active) {
    throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
  }

  if (!row.tenant_active) {
    throw new AppError('Tenant account is suspended', 403, 'TENANT_SUSPENDED');
  }

  const isMatch = await bcrypt.compare(password, row.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Update last login
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [row.id]);

  const user   = { id: row.id, email: row.email, fullName: row.full_name, role: row.role };
  const tenant = { id: row.tenant_id, name: row.tenant_name, slug: row.slug, plan: row.plan };
  const token  = issueToken(user, tenant);

  return { user, tenant, token };
};

/**
 * Sign a JWT with user + tenant context embedded.
 */
const issueToken = (user, tenant) => {
  return jwt.sign(
    {
      sub:      user.id,
      tenantId: tenant.id,
      role:     user.role,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
};

/**
 * Verify a token and return decoded payload.
 * Throws if invalid or expired — caught by errorHandler.
 */
const verifyToken = (token) => jwt.verify(token, env.jwt.secret);

module.exports = { register, login, verifyToken };
