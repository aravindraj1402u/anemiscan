// ---------------------------------------------------------------------
// routes/admin.routes.js  —  STAGE 2
// Scaffolded now so the folder structure is complete; the full dashboard,
// hospital CRUD, screening table and audit trail are built in Stage 2.
// Every route here is admin-only.
// ---------------------------------------------------------------------
const express = require('express');
const { authenticate, authorize, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Everything below this line requires a valid admin token.
router.use(authenticate, authorize('admin'));

const notYet = (stage) => (_req, res) =>
  res.status(501).json({
    success: false,
    error: { message: `Not implemented yet — arrives in ${stage}.` },
  });

router.get('/dashboard', notYet('Stage 2'));
router.get('/hospitals', notYet('Stage 2'));
router.post('/hospitals', notYet('Stage 2'));
router.put('/hospitals/:id', notYet('Stage 2'));
router.get('/screenings', notYet('Stage 2'));
// Deleting is super-admin only + reason required + written to audit_logs.
router.delete('/hospitals/:id', requireSuperAdmin, notYet('Stage 2'));
router.delete('/screenings/:id', requireSuperAdmin, notYet('Stage 2'));

module.exports = router;
