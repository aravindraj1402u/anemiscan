// ---------------------------------------------------------------------
// middleware/loginLockout.js
// Per-account lockout: after LOGIN_MAX_ATTEMPTS failed logins an account
// is frozen for LOGIN_LOCK_MINUTES. Kept in memory for Stage 1 — in
// production swap the Map for Redis or a `login_attempts` table so the
// lockout is shared across every server instance.
// ---------------------------------------------------------------------
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const attempts = new Map(); // key: `${role}:${identifier}` -> { count, lockedUntil }

function keyOf(role, identifier) {
  return `${role}:${String(identifier).toLowerCase()}`;
}

/** Reject the request if the account is currently locked. */
function checkLockout(req, _res, next) {
  const { role, identifier } = req.body || {};
  const rec = attempts.get(keyOf(role, identifier));
  if (rec?.lockedUntil && rec.lockedUntil > Date.now()) {
    const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    return next(new ApiError(429, `Too many attempts. Try again in ${mins} minute(s).`));
  }
  return next();
}

/** Call on a failed login. */
function recordFailure(role, identifier) {
  const key = keyOf(role, identifier);
  const rec = attempts.get(key) || { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= env.loginMaxAttempts) {
    rec.lockedUntil = Date.now() + env.loginLockMinutes * 60000;
    rec.count = 0; // reset the counter; the lock now does the work
  }
  attempts.set(key, rec);
}

/** Call on a successful login. */
function clearFailures(role, identifier) {
  attempts.delete(keyOf(role, identifier));
}

module.exports = { checkLockout, recordFailure, clearFailures };
