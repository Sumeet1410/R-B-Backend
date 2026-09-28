const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getOfficers,
  getEngineers,
  getOrganizations
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Public / Form dropdown endpoints (no strict auth required so dropdowns never block UI)
router.get('/roles/officers', getOfficers);
router.get('/roles/engineers', getEngineers);
router.get('/roles/organizations', getOrganizations);

// Protected routes
router.use(protect);

router.get('/', authorize('super_admin'), getUsers);
router.get('/:id', getUserById);
router.put('/:id', authorize('super_admin'), updateUser);
router.delete('/:id', authorize('super_admin'), deleteUser);

module.exports = router;
