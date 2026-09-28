const express = require('express');
const router = express.Router();
const {
  getRecentEvents,
  getAssetTimeline,
  addNoteEvent
} = require('../controllers/timelineController');
const { protect, authorize } = require('../middleware/auth');

const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (token) {
    return protect(req, res, next);
  }
  next();
};

router.get('/', optionalAuth, getRecentEvents);
router.get('/:assetId', getAssetTimeline);
router.post('/:assetId/note', protect, authorize('super_admin', 'regional_officer', 'field_engineer'), addNoteEvent);

module.exports = router;
