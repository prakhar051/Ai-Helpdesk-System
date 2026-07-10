const express = require('express');
const ticketController = require('../controllers/ticketController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const multer = require('multer');
const collaborationController = require('../controllers/ticketCollaborationController');

const router = express.Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Apply session authentication guards on all ticket routes
router.use(protect);

// Main listing & fetch actions (RBAC permissions verified inside controllers/services)
router.get('/', ticketController.getTickets);
router.get('/:id', ticketController.getTicket);

// Create tickets
router.post('/', ticketController.createTicket);
router.post('/ai/analyze', ticketController.analyzeTicket);
router.post('/ai/recommend-kb', ticketController.recommendKBArticles);
router.post('/ai/summary', ticketController.generateTicketSummary);

// Update status/descriptions
router.patch('/:id', ticketController.updateTicket);

// Soft delete (restricted strictly to ADMIN)
router.delete('/:id', restrictTo('ADMIN'), ticketController.deleteTicket);

// ==========================================
// TICKET COLLABORATION (COMMENTS & ATTACHMENTS)
// ==========================================

// Comments Routes
router.get('/:ticketId/comments', collaborationController.getComments);
router.post('/:ticketId/comments', collaborationController.addComment);
router.patch('/:ticketId/comments/:commentId', collaborationController.updateComment);
router.delete('/:ticketId/comments/:commentId', collaborationController.deleteComment);

// Attachments Routes
router.get('/:ticketId/attachments', collaborationController.getAttachments);
router.post('/:ticketId/attachments', upload.single('file'), collaborationController.addAttachment);
router.get('/:ticketId/attachments/:attachmentId/download', collaborationController.downloadAttachment);
router.delete('/:ticketId/attachments/:attachmentId', collaborationController.deleteAttachment);

module.exports = router;
