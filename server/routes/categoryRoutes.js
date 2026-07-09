const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth protect wrapper to all category routes
router.use(protect);

// Public listings (RBAC constraints mapped in controller)
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);

// Management (Restricted strictly to ADMIN)
router.use(restrictTo('ADMIN'));

router.post('/', categoryController.createCategory);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deactivateCategory);

module.exports = router;
