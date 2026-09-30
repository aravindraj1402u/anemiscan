// ---------------------------------------------------------------------
// routes/auth.routes.js
// Public auth endpoints + the protected /me.
// ---------------------------------------------------------------------
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');

const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { checkLockout } = require('../middleware/loginLockout');
const { passwordProblem } = require('../utils/password');

const router = express.Router();

// Coarse per-IP throttle in front of the per-account lockout.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please slow down.' } },
});

// ---- POST /api/auth/login ------------------------------------------
router.post(
  '/login',
  loginLimiter,
  [
    body('role').isIn(['user', 'hospital', 'admin']).withMessage('role must be user, hospital or admin'),
    body('identifier').trim().notEmpty().withMessage('identifier (phone or email) is required'),
    body('password').isString().notEmpty().withMessage('password is required'),
  ],
  validate,
  checkLockout,
  ctrl.login
);

// ---- POST /api/auth/register/hospital ------------------------------
router.post(
  '/register/hospital',
  [
    body('name').trim().isLength({ min: 2, max: 180 }),
    body('district').trim().notEmpty(),
    body('phone').trim().matches(/^[0-9+\- ]{7,15}$/).withMessage('valid phone required'),
    body('email').isEmail().normalizeEmail(),
    body('password').custom((v) => {
      const problem = passwordProblem(v);
      if (problem) throw new Error(problem);
      return true;
    }),
  ],
  validate,
  ctrl.registerHospital
);

// ---- POST /api/auth/register/user ----------------------------------
router.post(
  '/register/user',
  [
    body('name').trim().isLength({ min: 2, max: 120 }),
    body('phone').trim().matches(/^[0-9]{10}$/).withMessage('10-digit phone required'),
    body('password').custom((v) => {
      const problem = passwordProblem(v);
      if (problem) throw new Error(problem);
      return true;
    }),
    body('age').optional().isInt({ min: 1, max: 120 }).toInt(),
    body('gender').optional().isIn(['male', 'female', 'other']),
  ],
  validate,
  ctrl.registerUser
);

// ---- GET /api/auth/me ----------------------------------------------
router.get('/me', authenticate, ctrl.me);

module.exports = router;
