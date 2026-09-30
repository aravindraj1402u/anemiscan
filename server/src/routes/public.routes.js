// ---------------------------------------------------------------------
// routes/public.routes.js  —  STAGES 1/2/3 (screening sync + stats)
// The mobile app posts screenings here (optionally as an anonymous guest),
// and the public stats endpoints power the heat map.
// ---------------------------------------------------------------------
const express = require('express');

const router = express.Router();

const notYet = (stage) => (_req, res) =>
  res.status(501).json({ success: false, error: { message: `Not implemented yet — arrives in ${stage}.` } });

router.post('/screenings', notYet('Stage 2')); // app -> server sync
router.post('/referrals', notYet('Stage 3'));  // user shares a case with a hospital
router.get('/stats/heatmap', notYet('Stage 2')); // district aggregation

module.exports = router;
