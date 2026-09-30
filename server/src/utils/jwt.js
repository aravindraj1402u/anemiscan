// ---------------------------------------------------------------------
// utils/jwt.js
// Signing and verifying JSON Web Tokens.
// The token payload carries `sub` (the account id) and `role`, which is
// what the RBAC middleware later trusts. Never put secrets in a JWT —
// the payload is only base64-encoded, not encrypted.
// ---------------------------------------------------------------------
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ROLES = Object.freeze({
  USER: 'user',
  HOSPITAL: 'hospital',
  ADMIN: 'admin',
});

/**
 * @param {{ id: string, role: string, adminRole?: string, name?: string }} account
 * @returns {string} signed access token
 */
function signAccessToken(account) {
  const payload = {
    sub: account.id,
    role: account.role,
    name: account.name || null,
  };
  if (account.role === ROLES.ADMIN && account.adminRole) {
    payload.adminRole = account.adminRole; // 'super_admin' | 'viewer'
  }
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/** @returns {object} decoded payload, or throws on invalid/expired token */
function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signAccessToken, verifyAccessToken, ROLES };
