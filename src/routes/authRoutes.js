const express = require('express');
const router = express.Router();
const { login, register, registerCitizen, getMe, demoLogin } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', login);
router.post('/demo-login', demoLogin);
router.post('/register', protect, authorize('super_admin'), register);
router.post('/register/citizen', registerCitizen);
router.get('/me', protect, getMe);

module.exports = router;
