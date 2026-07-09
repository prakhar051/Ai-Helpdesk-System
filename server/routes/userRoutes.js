const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo, validate } = require('../middleware/authMiddleware');
const { 
  updateProfileSchema, 
  updateRoleSchema, 
  updateStatusSchema
} = require('../validators/userValidator');

const router = express.Router();

// Apply protection middleware to all user routes
router.use(protect);

// Current user profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);

// Admin-only user management routes
router.use(restrictTo('ADMIN'));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.patch('/:id/role', validate(updateRoleSchema), userController.updateRole);
router.patch('/:id/status', validate(updateStatusSchema), userController.updateStatus);

module.exports = router;
