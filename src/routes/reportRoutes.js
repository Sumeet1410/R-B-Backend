const express = require('express');
const router = express.Router();
const {
  getSummaryStats,
  getByDistrict,
  getByStage,
  getByType
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (token) {
    return protect(req, res, next);
  }
  next();
};

// Summary stats accessible on public overview with optional district scoping
router.get('/summary', optionalAuth, getSummaryStats);

// Deep analytical reports restricted exclusively to Super Admin per requirements
router.use(protect);
router.use(authorize('super_admin'));

router.get('/by-district', getByDistrict);
router.get('/by-stage', getByStage);
router.get('/by-type', getByType);

module.exports = router;
