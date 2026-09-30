// ---------------------------------------------------------------------
// middleware/errorHandler.js
// Central place every error funnels through. Keeps stack traces out of
// API responses (they leak internals) while logging them server-side.
// ---------------------------------------------------------------------
const env = require('../config/env');

/** Turn an unknown path into a clean 404. */
function notFound(req, _res, next) {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Postgres unique-violation -> friendlier 409
  if (err.code === '23505') {
    statusCode = 409;
    message = 'That record already exists (duplicate value)';
  }
  // Postgres foreign-key violation
  if (err.code === '23503') {
    statusCode = 409;
    message = 'Related record not found (foreign key constraint)';
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
    if (env.isProd) message = 'Something went wrong. Please try again.';
  }

  res.status(statusCode).json({
    success: false,
    error: { message, details },
  });
}

module.exports = { notFound, errorHandler };
