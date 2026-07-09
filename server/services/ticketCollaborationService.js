const prisma = require('../config/prisma');
const storage = require('../utils/storage');

/**
 * Validate ticket accessibility based on ownership and user RBAC role.
 * @param {string} ticketId - Ticket ID.
 * @param {object} user - User object.
 * @returns {Promise<object>} The ticket.
 */
const validateTicketAccess = async (ticketId, user) => {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, isDeleted: false }
  });

  if (!ticket) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }

  // Enforce customer ownership check
  if (user.role === 'CUSTOMER' && ticket.customerId !== user.id) {
    const error = new Error('You do not have permission to perform collaboration actions on this ticket.');
    error.statusCode = 403;
    throw error;
  }

  return ticket;
};

// ==========================================
// COMMENTS SECTION
// ==========================================

const getComments = async (ticketId, user) => {
  await validateTicketAccess(ticketId, user);

  return await prisma.comment.findMany({
    where: { ticketId },
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'asc' } // Chronological ordering
  });
};

const addComment = async (ticketId, user, data) => {
  await validateTicketAccess(ticketId, user);

  if (!data.content || !data.content.trim()) {
    const error = new Error('Comment content cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.comment.create({
    data: {
      content: data.content.trim(),
      ticketId,
      authorId: user.id
    },
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });
};

const updateComment = async (ticketId, commentId, user, data) => {
  await validateTicketAccess(ticketId, user);

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, ticketId }
  });

  if (!comment) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  // Strictly restrict editing to comment author
  if (comment.authorId !== user.id) {
    const error = new Error('You do not have permission to edit another user\'s comment.');
    error.statusCode = 403;
    throw error;
  }

  if (!data.content || !data.content.trim()) {
    const error = new Error('Comment content cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.comment.update({
    where: { id: commentId },
    data: { content: data.content.trim() },
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });
};

const deleteComment = async (ticketId, commentId, user) => {
  await validateTicketAccess(ticketId, user);

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, ticketId }
  });

  if (!comment) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    throw error;
  }

  // RBAC checks for deletion:
  // ADMIN can delete any comment.
  // AGENT and CUSTOMER can only delete their own comments.
  if (user.role !== 'ADMIN' && comment.authorId !== user.id) {
    const error = new Error('You do not have permission to delete this comment.');
    error.statusCode = 403;
    throw error;
  }

  return await prisma.comment.delete({
    where: { id: commentId }
  });
};

// ==========================================
// ATTACHMENTS SECTION
// ==========================================

const getAttachments = async (ticketId, user) => {
  await validateTicketAccess(ticketId, user);

  return await prisma.attachment.findMany({
    where: { ticketId },
    include: {
      uploadedBy: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const addAttachment = async (ticketId, user, file) => {
  await validateTicketAccess(ticketId, user);

  if (!file) {
    const error = new Error('No file provided for upload.');
    error.statusCode = 400;
    throw error;
  }

  // Double check file size limit (10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    const error = new Error('File size exceeds 10MB limit.');
    error.statusCode = 400;
    throw error;
  }

  // Save via generic utility
  const saved = await storage.saveFile(file.buffer, file.originalname, file.mimetype);

  return await prisma.attachment.create({
    data: {
      filename: saved.filename,
      originalName: file.originalname,
      filePath: saved.filePath,
      mimeType: file.mimetype,
      fileSize: saved.fileSize,
      ticketId,
      uploadedById: user.id
    },
    include: {
      uploadedBy: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });
};

const getAttachmentDetails = async (ticketId, attachmentId, user) => {
  await validateTicketAccess(ticketId, user);

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, ticketId }
  });

  if (!attachment) {
    const error = new Error('Attachment not found');
    error.statusCode = 404;
    throw error;
  }

  const fullPath = storage.getFullPath(attachment.filePath);

  return {
    attachment,
    fullPath
  };
};

const deleteAttachment = async (ticketId, attachmentId, user) => {
  await validateTicketAccess(ticketId, user);

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, ticketId }
  });

  if (!attachment) {
    const error = new Error('Attachment not found');
    error.statusCode = 404;
    throw error;
  }

  // RBAC checks for deletion:
  // ADMIN can delete any attachment.
  // AGENT and CUSTOMER can only delete their own uploads.
  if (user.role !== 'ADMIN' && attachment.uploadedById !== user.id) {
    const error = new Error('You do not have permission to delete this attachment.');
    error.statusCode = 403;
    throw error;
  }

  // Remove database row first
  await prisma.attachment.delete({
    where: { id: attachmentId }
  });

  // Clean local file
  await storage.deleteFile(attachment.filePath);

  return attachment;
};

module.exports = {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  getAttachments,
  addAttachment,
  getAttachmentDetails,
  deleteAttachment
};
