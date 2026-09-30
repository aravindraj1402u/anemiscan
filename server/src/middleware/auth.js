// ---------------------------------------------------------------------
// middleware/auth.js
// `authenticate`  -> verifies the JWT and attaches req.auth
// `authorize(...)` -> lets only the listed roles through
// `requireSuperAdmin` -> only super_admin admins may delete things
// ---------------------------------------------------------------------
const { verifyAccessToken, ROLES } = require('../utils/jwt');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');

/** Verify the Bearer token on every protected route. */
function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      id: payload.sub,
      role: payload.role,
      adminRole: payload.adminRole || null,
      name: payload.name || null,
    };
    return next();
  } catch (_err) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

/** Role gate. Usage: router.get('/', authenticate, authorize('admin'), handler) */
function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth) return next(new ApiError(401, 'Not authenticated'));
    if (!allowedRoles.includes(req.auth.role)) {
      return next(new ApiError(403, 'You do not have permission for this action'));
    }
    return next();
  };
}

/** Only the top-level admin role may run destructive operations. */
function requireSuperAdmin(req, _res, next) {
  if (req.auth?.role !== ROLES.ADMIN || req.auth.adminRole !== 'super_admin') {
    return next(new ApiError(403, 'Only a super admin may perform this action'));
  }
  return next();
}

/**
 * For the hospital portal: fetch the caller's hospital and confirm it is
 * approved before letting them act. Attaches req.hospital.
 */
async function loadApprovedHospital(req, _res, next) {
  try {
    const { rows } = await query(
      'SELECT hospital_id, name, district, is_approved FROM hospitals WHERE hospital_id = $1',
      [req.auth.id]
    );
    const hospital = rows[0];
    if (!hospital) return next(new ApiError(404, 'Hospital account not found'));
    if (!hospital.is_approved) {
      return next(new ApiError(403, 'Your hospital registration is awaiting approval'));
    }
    req.hospital = hospital;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { authenticate, authorize, requireSuperAdmin, loadApprovedHospital };
