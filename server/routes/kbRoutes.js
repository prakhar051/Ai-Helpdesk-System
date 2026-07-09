const express = require('express');
const kbController = require('../controllers/kbController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protection middleware to all Knowledge Base endpoints
router.use(protect);

// Publicly viewable articles (restrictions based on role logic are inside the controller/service)
router.get('/', kbController.getArticles);
router.get('/:id', kbController.getArticle);

// Management endpoints (restricted to ADMIN only)
router.use(restrictTo('ADMIN'));

router.post('/', kbController.createArticle);
router.patch('/:id', kbController.updateArticle);
router.delete('/:id', kbController.deleteArticle);

module.exports = router;
