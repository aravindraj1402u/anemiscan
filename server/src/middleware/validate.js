// ---------------------------------------------------------------------
// middleware/validate.js
// Wraps express-validator: run the checks, and if anything failed, stop
// the request with a 422 and the list of problems. Controllers can then
// assume the body is clean.
// ---------------------------------------------------------------------
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(req, _res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  return next(new ApiError(422, 'Validation failed', details));
}

module.exports = { validate };
