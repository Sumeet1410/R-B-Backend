const express = require('express');
const router = express.Router();
const {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  changeStage,
  uploadDocument,
  deleteAsset
} = require('../controllers/assetController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Optional auth for getAssets so citizens/guests can view public active assets
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (token) {
    return protect(req, res, next);
  }
  next();
};

router.get('/', optionalAuth, getAssets);
router.get('/:id', optionalAuth, getAssetById);

// Protected routes
router.use(protect);

router.post('/', authorize('super_admin'), createAsset);
router.put('/:id', authorize('super_admin', 'regional_officer'), updateAsset);
router.put('/:id/stage', authorize('super_admin', 'regional_officer'), changeStage);
router.post('/:id/documents', authorize('super_admin', 'regional_officer', 'field_engineer'), upload.single('document'), uploadDocument);
router.delete('/:id', authorize('super_admin'), deleteAsset);

module.exports = router;
