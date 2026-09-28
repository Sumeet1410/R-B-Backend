const express = require('express');
const router = express.Router();
const {
  fileComplaint,
  getComplaints,
  getComplaintById,
  triggerInvestigation,
  triageComplaint,
  getComplaintStats
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

// Super admin does not see complaints; complaints are managed by Regional Officer and Citizens
router.get('/stats', authorize('regional_officer'), getComplaintStats);
router.get('/', authorize('regional_officer', 'citizen'), getComplaints);
router.get('/:id', authorize('regional_officer', 'citizen'), getComplaintById);
router.post('/', authorize('citizen'), upload.array('photos', 5), fileComplaint);

// Regional officer triage & investigation trigger
router.post('/:id/investigate', authorize('regional_officer'), triggerInvestigation);
router.put('/:id/triage', authorize('regional_officer'), triageComplaint);

module.exports = router;
