// src/shared/utils/logger.js
// Structured JSON logging in production, pretty-printed in development.
// Always log with context objects — never interpolate strings.

const { createLogger, format, transports } = require('winston');
const env = require('../../config/env');

const logger = createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: env.isProduction
    ? format.combine(format.timestamp(), format.json())
    : format.combine(
        format.colorize(),
        format.timestamp({ format: 'HH:mm:ss' }),
        format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      ),
  transports: [new transports.Console()],
});

module.exports = logger;
