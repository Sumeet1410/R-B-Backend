const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  submitProgress,
  completeTask
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', authorize('super_admin', 'regional_officer'), createTask);
router.put('/:id', authorize('super_admin', 'regional_officer'), updateTask);
router.post('/:id/progress', authorize('organization', 'super_admin', 'regional_officer'), upload.array('photos', 5), submitProgress);
router.post('/:id/complete', authorize('organization', 'super_admin', 'regional_officer'), upload.array('documents', 5), completeTask);

module.exports = router;
