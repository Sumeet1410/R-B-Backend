const express = require('express');
const router = express.Router();
const {
  getInspections,
  getInspectionById,
  orderInspection,
  submitInspection,
  reviewInspection
} = require('../controllers/inspectionController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

// Only Regional Officers and Field Engineers interact with inspections (Super Admin excluded)
router.get('/', authorize('regional_officer', 'field_engineer'), getInspections);
router.get('/:id', authorize('regional_officer', 'field_engineer'), getInspectionById);

// Regional Officer triggers/orders inspection
router.post('/order', authorize('regional_officer'), orderInspection);

// ONLY Field Engineer can submit an inspection report
router.post('/', authorize('field_engineer'), upload.array('photos', 6), submitInspection);

// Regional Officer reviews / approves / rejects inspection
router.put('/:id/review', authorize('regional_officer'), reviewInspection);

module.exports = router;
