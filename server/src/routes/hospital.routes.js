// ---------------------------------------------------------------------
// routes/hospital.routes.js  —  STAGE 3
// Hospital portal endpoints. The whole router is hospital-only, and
// loadApprovedHospital blocks accounts that aren't approved yet.
// ---------------------------------------------------------------------
const express = require('express');
const { authenticate, authorize, loadApprovedHospital } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('hospital'), loadApprovedHospital);

const notYet = (stage) => (_req, res) =>
  res.status(501).json({ success: false, error: { message: `Not implemented yet — arrives in ${stage}.` } });

router.get('/queue', notYet('Stage 3'));
router.put('/referrals/:id', notYet('Stage 3'));
router.get('/profile', notYet('Stage 3'));

module.exports = router;
