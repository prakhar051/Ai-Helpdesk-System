const express = require('express');
const ticketController = require('../controllers/ticketController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply session authentication guards on all ticket routes
router.use(protect);

// Main listing & fetch actions (RBAC permissions verified inside controllers/services)
router.get('/', ticketController.getTickets);
router.get('/:id', ticketController.getTicket);

// Create tickets
router.post('/', ticketController.createTicket);

// Update status/descriptions
router.patch('/:id', ticketController.updateTicket);

// Soft delete (restricted strictly to ADMIN)
router.delete('/:id', restrictTo('ADMIN'), ticketController.deleteTicket);

module.exports = router;
