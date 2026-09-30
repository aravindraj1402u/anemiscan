// ---------------------------------------------------------------------
// routes/index.js
// Mounts every sub-router under /api.
// ---------------------------------------------------------------------
const express = require('express');

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const hospitalRoutes = require('./hospital.routes');
const publicRoutes = require('./public.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/hospital', hospitalRoutes);
router.use('/', publicRoutes); // /api/screenings, /api/referrals, /api/stats/*

module.exports = router;
