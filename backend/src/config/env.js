// src/config/env.js
// All env vars are validated at startup — app crashes early with a clear message
// rather than failing silently later. This is a production best practice.

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'AWS_REGION',
  'AWS_BUCKET_NAME',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const env = {
  nodeEnv:     process.env.NODE_ENV || 'development',
  port:        parseInt(process.env.PORT || '3000', 10),
  isProduction: process.env.NODE_ENV === 'production',

  db: {
    url:            process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
  },

  jwt: {
    secret:    process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN, // e.g. '7d'
  },

  aws: {
    region:          process.env.AWS_REGION,
    bucketName:      process.env.AWS_BUCKET_NAME,
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    max:      parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};

module.exports = env;
