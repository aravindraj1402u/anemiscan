// ---------------------------------------------------------------------
// utils/password.js
// Hashing (bcrypt, 10 salt rounds) + a simple strength check.
// We use bcryptjs (pure JS) so there is no native build step to trip up
// on a fresh machine.
// ---------------------------------------------------------------------
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/** Hash a plaintext password before storing it. */
function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Compare a plaintext attempt against a stored hash. Returns a boolean. */
function verifyPassword(plain, hash) {
  if (!hash) return Promise.resolve(false); // guest account, no password set
  return bcrypt.compare(plain, hash);
}

/**
 * Password policy: at least 8 characters, with an uppercase letter,
 * a lowercase letter, a digit and a symbol. Returns an error string or null.
 */
function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a symbol';
  return null;
}

module.exports = { hashPassword, verifyPassword, passwordProblem };
