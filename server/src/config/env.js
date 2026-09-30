// ---------------------------------------------------------------------
// config/env.js
// Loads .env once and exposes a single frozen `env` object.
// Reading every secret from one place means no stray process.env calls.
// ---------------------------------------------------------------------
const path = require('path');
const dotenv = require('dotenv');

// Load server/.env regardless of the folder we start the process from.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

function required(key, fallback) {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),

  // PostgreSQL — either a single URL or the individual PG* vars.
  databaseUrl: process.env.DATABASE_URL || null,
  pg: {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'anemiscan',
  },

  // Auth
  jwtSecret: required('JWT_SECRET', 'dev_only_insecure_secret_change_me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Login lockout policy
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS || 5),
  loginLockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 15),

  isProd: (process.env.NODE_ENV || 'development') === 'production',
};

if (env.isProd && env.jwtSecret === 'dev_only_insecure_secret_change_me') {
  throw new Error('Refusing to start in production with the default JWT_SECRET.');
}

module.exports = Object.freeze(env);
