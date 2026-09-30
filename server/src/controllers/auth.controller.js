// ---------------------------------------------------------------------
// controllers/auth.controller.js
// Thin HTTP layer: read the request, call the service, send a response.
// ---------------------------------------------------------------------
const authService = require('../services/auth.service');
const { signAccessToken } = require('../utils/jwt');
const { recordFailure, clearFailures } = require('../middleware/loginLockout');
const { writeAudit } = require('../utils/audit');

/**
 * POST /api/auth/login
 * Body: { role: 'user'|'hospital'|'admin', identifier, password }
 * `identifier` is the phone (user) or email (hospital/admin).
 */
async function login(req, res, next) {
  const { role, identifier, password } = req.body;
  try {
    let account;
    try {
      account = await authService.authenticateAccount(role, identifier, password);
    } catch (err) {
      // Only count genuine credential failures toward the lockout.
      if (err.statusCode === 401) recordFailure(role, identifier);
      throw err;
    }

    clearFailures(role, identifier);
    const token = signAccessToken(account);

    await writeAudit({
      actorId: account.id,
      actorRole: account.role,
      action: 'LOGIN',
      tableAffected: account.role === 'admin' ? 'admins' : account.role === 'hospital' ? 'hospitals' : 'users',
      recordId: account.id,
    });

    res.json({
      success: true,
      data: {
        token,
        account: {
          id: account.id,
          role: account.role,
          adminRole: account.adminRole || null,
          name: account.name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/register/hospital */
async function registerHospital(req, res, next) {
  try {
    const hospital = await authService.createHospital(req.body);
    await writeAudit({
      actorId: hospital.id,
      actorRole: 'hospital',
      action: 'REGISTER_HOSPITAL',
      tableAffected: 'hospitals',
      recordId: hospital.id,
    });
    res.status(201).json({
      success: true,
      message: 'Registration received. An administrator will review your account.',
      data: hospital,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/register/user  (optional account for the mobile app) */
async function registerUser(req, res, next) {
  try {
    const user = await authService.createUser(req.body);
    const token = signAccessToken({ id: user.id, role: 'user', name: user.name });
    res.status(201).json({ success: true, data: { token, account: { ...user, role: 'user' } } });
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/me */
async function me(req, res, next) {
  try {
    const profile = await authService.getProfile(req.auth);
    if (!profile) return res.status(404).json({ success: false, error: { message: 'Account not found' } });
    res.json({ success: true, data: { role: req.auth.role, profile } });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, registerHospital, registerUser, me };
