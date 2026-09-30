// ---------------------------------------------------------------------
// services/auth.service.js
// All the database work for authentication lives here, so the controller
// stays thin and readable.
// ---------------------------------------------------------------------
const { query } = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { ROLES } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

/**
 * Look up one account by role + identifier and check the password.
 * @returns {Promise<{id, role, adminRole, name, district}>}
 * Throws ApiError(401) on bad credentials (same message for "no such user"
 * and "wrong password" so attackers can't probe for valid accounts).
 */
async function authenticateAccount(role, identifier, password) {
  const BAD = () => new ApiError(401, 'Invalid credentials');

  if (role === ROLES.ADMIN) {
    const { rows } = await query(
      'SELECT admin_id AS id, name, password_hash, role AS admin_role, is_active FROM admins WHERE email = $1',
      [identifier]
    );
    const admin = rows[0];
    if (!admin || !admin.is_active) throw BAD();
    if (!(await verifyPassword(password, admin.password_hash))) throw BAD();
    return { id: admin.id, role: ROLES.ADMIN, adminRole: admin.admin_role, name: admin.name };
  }

  if (role === ROLES.HOSPITAL) {
    const { rows } = await query(
      `SELECT hospital_id AS id, name, district, password_hash, is_approved
         FROM hospitals WHERE email = $1`,
      [identifier]
    );
    const hospital = rows[0];
    if (!hospital) throw BAD();
    if (!(await verifyPassword(password, hospital.password_hash))) throw BAD();
    if (!hospital.is_approved) {
      throw new ApiError(403, 'Your hospital registration is awaiting admin approval');
    }
    return { id: hospital.id, role: ROLES.HOSPITAL, name: hospital.name, district: hospital.district };
  }

  // default: app user (login is optional, so a missing hash simply fails)
  const { rows } = await query(
    'SELECT user_id AS id, name, district, password_hash FROM users WHERE phone = $1',
    [identifier]
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) throw BAD();
  return { id: user.id, role: ROLES.USER, name: user.name, district: user.district };
}

/** Create a hospital account (is_approved defaults to false). */
async function createHospital(data) {
  const existing = await query('SELECT 1 FROM hospitals WHERE email = $1', [data.email]);
  if (existing.rowCount > 0) {
    throw new ApiError(409, 'A hospital with that email already exists');
  }
  const password_hash = await hashPassword(data.password);
  const { rows } = await query(
    `INSERT INTO hospitals
       (name, district, address, phone, email, password_hash, department, doctor_count, latitude, longitude)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING hospital_id AS id, name, district, email, is_approved, created_at`,
    [
      data.name, data.district, data.address || null, data.phone, data.email,
      password_hash, data.department || 'General', data.doctor_count || 0,
      data.latitude ?? null, data.longitude ?? null,
    ]
  );
  return rows[0];
}

/** Create (or upgrade a guest into) a user account. */
async function createUser(data) {
  const existing = await query('SELECT user_id FROM users WHERE phone = $1', [data.phone]);
  const password_hash = await hashPassword(data.password);

  if (existing.rowCount > 0) {
    // The phone already exists (probably a guest) — set its password.
    const { rows } = await query(
      `UPDATE users SET password_hash = $2, name = COALESCE($3, name)
        WHERE phone = $1
        RETURNING user_id AS id, name, district`,
      [data.phone, password_hash, data.name || null]
    );
    return rows[0];
  }

  const { rows } = await query(
    `INSERT INTO users (name, phone, age, gender, district, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING user_id AS id, name, district`,
    [data.name, data.phone, data.age ?? null, data.gender ?? null, data.district ?? null, password_hash]
  );
  return rows[0];
}

/** Fetch the current account's own profile (used by GET /auth/me). */
async function getProfile(auth) {
  if (auth.role === ROLES.ADMIN) {
    const { rows } = await query(
      'SELECT admin_id AS id, name, email, role AS admin_role, created_at FROM admins WHERE admin_id = $1',
      [auth.id]
    );
    return rows[0] || null;
  }
  if (auth.role === ROLES.HOSPITAL) {
    const { rows } = await query(
      `SELECT hospital_id AS id, name, district, email, department, doctor_count,
              beds_available, is_approved, created_at
         FROM hospitals WHERE hospital_id = $1`,
      [auth.id]
    );
    return rows[0] || null;
  }
  const { rows } = await query(
    'SELECT user_id AS id, name, phone, age, gender, district, created_at FROM users WHERE user_id = $1',
    [auth.id]
  );
  return rows[0] || null;
}

module.exports = { authenticateAccount, createHospital, createUser, getProfile };
