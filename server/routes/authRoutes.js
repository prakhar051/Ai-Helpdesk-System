const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerSchema, loginSchema, validate } = require('../validators/authValidator');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);

// Protected Test Routes
router.get('/me', protect, (req, res) => {
  res.status(200).json({ status: 'success', data: { user: req.user } });
});

router.get('/admin-only', protect, restrictTo('ADMIN'), (req, res) => {
  res.status(200).json({ status: 'success', message: 'Welcome Admin!' });
});

router.get('/agent-only', protect, restrictTo('AGENT', 'ADMIN'), (req, res) => {
  res.status(200).json({ status: 'success', message: 'Welcome Agent/Admin!' });
});

module.exports = router;
