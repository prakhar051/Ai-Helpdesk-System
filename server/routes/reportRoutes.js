const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const reportController = require('../controllers/reportController');

const router = express.Router();

// Apply protection middleware to all reports endpoints
router.use(protect);

router.get('/tickets', reportController.exportTickets);
router.get('/dashboard', reportController.exportDashboard);
router.get('/kb', reportController.exportKb);
router.get('/users', reportController.exportUsers);
router.get('/categories', reportController.exportCategories);

module.exports = router;
