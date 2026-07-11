const { z } = require('zod');
const ticketService = require('../services/ticketService');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

// Input Validation Schemas
const analyzeTicketSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().trim().nullable().optional()
}).strict();

const createTicketSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  categoryId: z.string().trim().nullable().optional(),
  aiReason: z.string().trim().nullable().optional()
}).strict();

const updateTicketSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').optional(),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  categoryId: z.string().trim().nullable().optional(),
  aiReason: z.string().trim().nullable().optional(),
  agentId: z.string().trim().nullable().optional()
}).strict();

// @desc    Get all tickets with filters, search, pagination
// @route   GET /api/v1/tickets
// @access  Private
const getTickets = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      categoryId,
      agentId,
      customerId,
      startDate,
      endDate,
      createdByMe,
      assignedToMe,
      unassigned,
      sortBy,
      sortOrder,
      page,
      limit
    } = req.query;

    const result = await ticketService.getAllTickets({
      search,
      status,
      priority,
      categoryId,
      agentId,
      customerId,
      role: req.user.role,
      startDate,
      endDate,
      createdByMe,
      assignedToMe,
      unassigned,
      sortBy,
      sortOrder,
      page,
      limit,
      currentUserId: req.user.id
    });

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ticket by ID
// @route   GET /api/v1/tickets/:id
// @access  Private
const getTicket = async (req, res, next) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id, req.user);
    return res.status(200).json({
      status: 'success',
      data: {
        ticket
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Ticket
// @route   POST /api/v1/tickets
// @access  Private/Customer
const createTicket = async (req, res, next) => {
  try {
    // Only customers are allowed to create tickets
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({
        status: 'error',
        message: 'Only customers can create support tickets.'
      });
    }

    const parseResult = createTicketSchema.safeParse(req.body);
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

    const ticket = await ticketService.createTicket(req.user.id, parseResult.data);
    logger.info(`Ticket created: HD-${ticket.ticketNumber.toString().padStart(6, '0')} (ID: ${ticket.id})`);

    return res.status(201).json({
      status: 'success',
      message: 'Support ticket created successfully',
      data: {
        ticket
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing ticket
// @route   PATCH /api/v1/tickets/:id
// @access  Private
const updateTicket = async (req, res, next) => {
  try {
    const parseResult = updateTicketSchema.safeParse(req.body);
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

    const ticket = await ticketService.updateTicket(req.params.id, req.user, parseResult.data);
    logger.info(`Ticket updated: HD-${ticket.ticketNumber.toString().padStart(6, '0')} by ${req.user.email}`);

    return res.status(200).json({
      status: 'success',
      message: 'Ticket updated successfully',
      data: {
        ticket
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft Delete Ticket
// @route   DELETE /api/v1/tickets/:id
// @access  Private/Admin
const deleteTicket = async (req, res, next) => {
  try {
    const ticket = await ticketService.deleteTicket(req.params.id);
    logger.info(`Ticket soft-deleted: HD-${ticket.ticketNumber.toString().padStart(6, '0')} (ID: ${ticket.id})`);

    return res.status(200).json({
      status: 'success',
      message: 'Ticket deleted successfully',
      data: {
        ticket
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Analyze ticket content using AI (Gemini)
// @route   POST /api/v1/tickets/ai/analyze
// @access  Private
const analyzeTicket = async (req, res, next) => {
  try {
    const parseResult = analyzeTicketSchema.safeParse(req.body);
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

    const result = await aiService.predictCategoryPriority(parseResult.data.title, parseResult.data.description);
    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Recommend Knowledge Base articles using AI (Gemini)
// @route   POST /api/v1/tickets/ai/recommend-kb
// @access  Private
const recommendKBArticles = async (req, res, next) => {
  try {
    const parseResult = analyzeTicketSchema.safeParse(req.body);
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

    const recommendations = await aiService.recommendKnowledgeBase(
      parseResult.data.title,
      parseResult.data.description,
      req.body.categoryId
    );

    return res.status(200).json({
      status: 'success',
      data: { recommendations }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate Ticket Summary using AI (Gemini)
// @route   POST /api/v1/tickets/ai/summary
// @access  Private
const generateTicketSummary = async (req, res, next) => {
  try {
    const summarySchema = z.object({
      ticketId: z.string().uuid('Invalid ticket ID format')
    }).strict();

    const parseResult = summarySchema.safeParse(req.body);
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

    const result = await aiService.generateTicketSummary(parseResult.data.ticketId, req.user);
    logger.info(`AI Summary generated for ticket ${parseResult.data.ticketId} by ${req.user.email}`);

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate Suggested Reply using AI (Gemini)
// @route   POST /api/v1/tickets/ai/reply
// @access  Private
const generateSuggestedReply = async (req, res, next) => {
  try {
    const replySchema = z.object({
      ticketId: z.string().uuid('Invalid ticket ID format')
    }).strict();

    const parseResult = replySchema.safeParse(req.body);
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

    const result = await aiService.generateSuggestedReply(parseResult.data.ticketId, req.user);
    logger.info(`AI Suggested Reply generated for ticket ${parseResult.data.ticketId} by ${req.user.email}`);

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Find duplicate tickets using AI (Gemini)
// @route   POST /api/v1/tickets/ai/duplicates
// @access  Private
const findDuplicateTickets = async (req, res, next) => {
  try {
    const parseResult = analyzeTicketSchema.safeParse(req.body);
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

    const duplicates = await aiService.findDuplicateTickets(
      parseResult.data.title,
      parseResult.data.description
    );

    return res.status(200).json({
      status: 'success',
      data: { duplicates }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Analyze Ticket Sentiment using AI (Gemini)
// @route   POST /api/v1/tickets/ai/sentiment
// @access  Private
const analyzeTicketSentiment = async (req, res, next) => {
  try {
    const sentimentSchema = z.object({
      ticketId: z.string().uuid('Invalid ticket ID format')
    }).strict();

    const parseResult = sentimentSchema.safeParse(req.body);
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

    const result = await aiService.analyzeTicketSentiment(parseResult.data.ticketId, req.user);
    logger.info(`AI Sentiment analyzed for ticket ${parseResult.data.ticketId} by ${req.user.email}`);

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Recommend Agent Assignment using AI (Gemini)
// @route   POST /api/v1/tickets/ai/assign
// @access  Private
const recommendAgentAssignment = async (req, res, next) => {
  try {
    const assignmentSchema = z.object({
      ticketId: z.string().uuid('Invalid ticket ID format')
    }).strict();

    const parseResult = assignmentSchema.safeParse(req.body);
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

    const result = await aiService.recommendAgentAssignment(parseResult.data.ticketId, req.user);
    logger.info(`AI Agent Assignment recommended for ticket ${parseResult.data.ticketId} by ${req.user.email}`);

    return res.status(200).json({
      status: 'success',
      data: { recommendation: result }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  analyzeTicket,
  recommendKBArticles,
  generateTicketSummary,
  generateSuggestedReply,
  findDuplicateTickets,
  analyzeTicketSentiment,
  recommendAgentAssignment
};
