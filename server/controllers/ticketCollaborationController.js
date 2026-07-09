const { z } = require('zod');
const collaborationService = require('../services/ticketCollaborationService');
const logger = require('../utils/logger');

// Input Validation Schemas
const commentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(1000, 'Comment cannot exceed 1000 characters')
}).strict();

// ==========================================
// COMMENTS HANDLERS
// ==========================================

const getComments = async (req, res, next) => {
  try {
    const comments = await collaborationService.getComments(req.params.ticketId, req.user);
    return res.status(200).json({
      status: 'success',
      data: { comments }
    });
  } catch (error) {
    next(error);
  }
};

const addComment = async (req, res, next) => {
  try {
    const parseResult = commentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: parseResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const comment = await collaborationService.addComment(req.params.ticketId, req.user, parseResult.data);
    logger.info(`Comment added to ticket ${req.params.ticketId} by ${req.user.email}`);

    return res.status(201).json({
      status: 'success',
      message: 'Comment added successfully',
      data: { comment }
    });
  } catch (error) {
    next(error);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const parseResult = commentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: parseResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const comment = await collaborationService.updateComment(
      req.params.ticketId,
      req.params.commentId,
      req.user,
      parseResult.data
    );
    logger.info(`Comment ${req.params.commentId} updated on ticket ${req.params.ticketId} by ${req.user.email}`);

    return res.status(200).json({
      status: 'success',
      message: 'Comment updated successfully',
      data: { comment }
    });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    await collaborationService.deleteComment(req.params.ticketId, req.params.commentId, req.user);
    logger.info(`Comment ${req.params.commentId} deleted on ticket ${req.params.ticketId} by ${req.user.email}`);

    return res.status(200).json({
      status: 'success',
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ATTACHMENTS HANDLERS
// ==========================================

const getAttachments = async (req, res, next) => {
  try {
    const attachments = await collaborationService.getAttachments(req.params.ticketId, req.user);
    return res.status(200).json({
      status: 'success',
      data: { attachments }
    });
  } catch (error) {
    next(error);
  }
};

const addAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded or file rejected by storage filter.'
      });
    }

    const attachment = await collaborationService.addAttachment(req.params.ticketId, req.user, req.file);
    logger.info(`Attachment uploaded to ticket ${req.params.ticketId} by ${req.user.email}`);

    return res.status(201).json({
      status: 'success',
      message: 'Attachment uploaded successfully',
      data: { attachment }
    });
  } catch (error) {
    next(error);
  }
};

const downloadAttachment = async (req, res, next) => {
  try {
    const { attachment, fullPath } = await collaborationService.getAttachmentDetails(
      req.params.ticketId,
      req.params.attachmentId,
      req.user
    );

    logger.info(`Attachment ${req.params.attachmentId} downloaded by ${req.user.email}`);
    return res.download(fullPath, attachment.originalName);
  } catch (error) {
    next(error);
  }
};

const deleteAttachment = async (req, res, next) => {
  try {
    await collaborationService.deleteAttachment(req.params.ticketId, req.params.attachmentId, req.user);
    logger.info(`Attachment ${req.params.attachmentId} deleted by ${req.user.email}`);

    return res.status(200).json({
      status: 'success',
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  getAttachments,
  addAttachment,
  downloadAttachment,
  deleteAttachment
};
