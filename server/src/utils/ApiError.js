// ---------------------------------------------------------------------
// utils/ApiError.js
// A tiny error class that carries an HTTP status code, so controllers can
// just `throw new ApiError(404, 'not found')` and the error handler knows
// exactly what to send back.
// ---------------------------------------------------------------------
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // expected error vs. a real bug
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
