const prisma = require('../config/prisma');

/**
 * Create a new Ticket.
 * @param {string} customerId - The customer user ID.
 * @param {object} data - Ticket details (title, description, categoryId, priority).
 * @returns {Promise<object>} Created ticket.
 */
const createTicket = async (customerId, data) => {
  const ticket = await prisma.ticket.create({
    data: {
      title: data.title,
      description: data.description,
      status: 'OPEN',
      priority: data.priority || 'MEDIUM',
      categoryId: data.categoryId === 'unassigned' ? null : (data.categoryId || null),
      aiReason: data.aiReason || null,
      customerId
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true, role: true }
      },
      agent: {
        select: { id: true, name: true, email: true, role: true }
      },
      category: {
        select: { id: true, name: true, isActive: true }
      }
    }
  });

  // Asynchronously send email and socket notifications concurrently
  process.nextTick(async () => {
    try {
      const emailService = require('./emailService');
      const socketService = require('./socketService');
      
      emailService.sendTicketCreatedEmail(ticket).catch(err => {
        const logger = require('../utils/logger');
        logger.error(`Email dispatch error in createTicket: ${err.message}`);
      });
      
      socketService.emitTicketCreated(ticket);
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error(`Failed to trigger notification callbacks in createTicket: ${err.message}`);
    }
  });

  return ticket;
};

/**
 * Get ticket by ID with accessibility validations.
 * @param {string} id - Ticket ID.
 * @param {object} user - Requesting user object (id, role).
 * @returns {Promise<object>} Ticket details.
 */
const getTicketById = async (id, user) => {
  const ticket = await prisma.ticket.findFirst({
    where: { id, isDeleted: false },
    include: {
      customer: {
        select: { id: true, name: true, email: true, role: true }
      },
      agent: {
        select: { id: true, name: true, email: true, role: true }
      },
      category: {
        select: { id: true, name: true, isActive: true }
      }
    }
  });

  if (!ticket) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }

  // Enforce customer scoping
  if (user.role === 'CUSTOMER' && ticket.customerId !== user.id) {
    const error = new Error('You do not have permission to access this ticket.');
    error.statusCode = 403;
    throw error;
  }

  return ticket;
};

/**
 * Update an existing support ticket.
 * @param {string} id - Ticket ID.
 * @param {object} user - Requesting user (id, role).
 * @param {object} updateData - Request body updates.
 * @returns {Promise<object>} Updated ticket.
 */
const updateTicket = async (id, user, updateData) => {
  const ticket = await prisma.ticket.findFirst({
    where: { id, isDeleted: false }
  });

  if (!ticket) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }

  const finalUpdates = {};

  // Role validation controls
  if (user.role === 'CUSTOMER') {
    if (ticket.customerId !== user.id) {
      const error = new Error('You do not have permission to update this ticket.');
      error.statusCode = 403;
      throw error;
    }
    if (ticket.status !== 'OPEN') {
      const error = new Error('Customers can only edit open tickets.');
      error.statusCode = 400;
      throw error;
    }
    // Customers can only change title and description, and optionally category during initial OPEN phase
    if (updateData.title !== undefined) finalUpdates.title = updateData.title;
    if (updateData.description !== undefined) finalUpdates.description = updateData.description;
    if (updateData.categoryId !== undefined) finalUpdates.categoryId = updateData.categoryId === 'unassigned' ? null : updateData.categoryId;
    if (updateData.aiReason !== undefined) finalUpdates.aiReason = updateData.aiReason;

  } else if (user.role === 'AGENT') {
    // Agents can change status, priority, and categories. They cannot change description.
    if (updateData.status !== undefined) finalUpdates.status = updateData.status;
    if (updateData.priority !== undefined) finalUpdates.priority = updateData.priority;
    if (updateData.categoryId !== undefined) finalUpdates.categoryId = updateData.categoryId === 'unassigned' ? null : updateData.categoryId;
    if (updateData.aiReason !== undefined) finalUpdates.aiReason = updateData.aiReason;
    
    if (updateData.agentId !== undefined) {
      const targetAgentId = updateData.agentId === 'unassigned' ? null : updateData.agentId;
      // Agents can only claim a ticket for themselves (cannot assign to others or unassign)
      if (targetAgentId !== user.id) {
        const error = new Error('Agents do not have permission to assign tickets to others or unassign them.');
        error.statusCode = 403;
        throw error;
      }
      // Agents cannot claim a ticket already assigned to someone else
      if (ticket.agentId !== null && ticket.agentId !== user.id) {
        const error = new Error('This ticket has already been assigned to another agent.');
        error.statusCode = 403;
        throw error;
      }
      finalUpdates.agentId = targetAgentId;
    }

  } else if (user.role === 'ADMIN') {
    // Admins can change everything
    if (updateData.title !== undefined) finalUpdates.title = updateData.title;
    if (updateData.description !== undefined) finalUpdates.description = updateData.description;
    if (updateData.status !== undefined) finalUpdates.status = updateData.status;
    if (updateData.priority !== undefined) finalUpdates.priority = updateData.priority;
    if (updateData.categoryId !== undefined) finalUpdates.categoryId = updateData.categoryId === 'unassigned' ? null : updateData.categoryId;
    if (updateData.agentId !== undefined) finalUpdates.agentId = updateData.agentId === 'unassigned' ? null : updateData.agentId;
    if (updateData.aiReason !== undefined) finalUpdates.aiReason = updateData.aiReason;
  }

  const updateWhere = { id };
  
  // Atomic claiming protection: match database row only if agentId is still null
  if (ticket.agentId === null && finalUpdates.agentId === user.id) {
    updateWhere.agentId = null;
  }

  let updated;
  try {
    updated = await prisma.ticket.update({
      where: updateWhere,
      data: finalUpdates,
      include: {
        customer: {
          select: { id: true, name: true, email: true, role: true }
        },
        agent: {
          select: { id: true, name: true, email: true, role: true }
        },
        category: {
          select: { id: true, name: true, isActive: true }
        }
      }
    });
  } catch (err) {
    // Catch Prisma code P2025: Record to update not found (meaning agentId is no longer null)
    if (err.code === 'P2025' && updateWhere.agentId === null) {
      const error = new Error('This ticket has already been claimed by another agent.');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }

  // Asynchronously send email and socket notifications concurrently
  const oldStatus = ticket.status;
  const oldAgentId = ticket.agentId;
  process.nextTick(async () => {
    try {
      const emailService = require('./emailService');
      const socketService = require('./socketService');
      
      let assignedOrStatusChanged = false;

      // 1. Check for Assignment changes
      if (updated.agentId && updated.agentId !== oldAgentId) {
        emailService.sendTicketAssignmentEmail(updated).catch(err => {
          const logger = require('../utils/logger');
          logger.error(`Email dispatch error in updateTicket assignment: ${err.message}`);
        });
        socketService.emitTicketAssigned(updated);
        assignedOrStatusChanged = true;
      }
      
      // 2. Check for Status changes
      if (updated.status !== oldStatus) {
        assignedOrStatusChanged = true;
        if (updated.status === 'RESOLVED') {
          emailService.sendTicketResolvedEmail(updated).catch(err => {
            const logger = require('../utils/logger');
            logger.error(`Email dispatch error in updateTicket resolve: ${err.message}`);
          });
          socketService.emitTicketResolved(updated);
        } else if (updated.status === 'CLOSED') {
          emailService.sendTicketClosedEmail(updated).catch(err => {
            const logger = require('../utils/logger');
            logger.error(`Email dispatch error in updateTicket close: ${err.message}`);
          });
          socketService.emitTicketClosed(updated);
        } else {
          emailService.sendTicketStatusChangedEmail(updated, oldStatus).catch(err => {
            const logger = require('../utils/logger');
            logger.error(`Email dispatch error in updateTicket status change: ${err.message}`);
          });
          socketService.emitTicketStatusChanged(updated, oldStatus);
        }
      }

      // 3. Emit general update if no specific routing/status changed
      if (!assignedOrStatusChanged) {
        socketService.emitTicketUpdated(updated);
      }
    } catch (err) {
      const logger = require('../utils/logger');
      logger.error(`Failed to trigger notification callbacks in updateTicket: ${err.message}`);
    }
  });

  return updated;
};

/**
 * Soft delete a support ticket (Admin only).
 * @param {string} id - Ticket ID.
 * @returns {Promise<object>} Deleted ticket record.
 */
const deleteTicket = async (id) => {
  const ticket = await prisma.ticket.findFirst({
    where: { id, isDeleted: false }
  });

  if (!ticket) {
    const error = new Error('Ticket not found');
    error.statusCode = 404;
    throw error;
  }

  const deleted = await prisma.ticket.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date()
    }
  });

  return deleted;
};

/**
 * Query all tickets with search, filters, pagination, and role-based scoping.
 * @param {object} params - search, status, priority, categoryId, agentId, customerId, role, page, limit, etc.
 * @returns {Promise<object>} Tickets array & pagination.
 */
const getAllTickets = async ({
  search,
  status,
  priority,
  categoryId,
  agentId,
  customerId,
  role,
  startDate,
  endDate,
  createdByMe,
  assignedToMe,
  unassigned,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  page = 1,
  limit = 8,
  currentUserId
}) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 8);
  const skip = (pageNum - 1) * limitNum;

  const where = { isDeleted: false };

  // Customer visibility scope constraint
  if (role === 'CUSTOMER') {
    where.customerId = currentUserId;
  } else {
    // Admins and Agents can filter by specific customerId if requested
    if (customerId) {
      where.customerId = customerId;
    }
    // Filter by specific assignee status
    if (agentId) {
      where.agentId = agentId === 'unassigned' ? null : agentId;
    }
  }

  // Toggle createdByMe / assignedToMe / unassigned
  if (createdByMe === 'true' || createdByMe === true) {
    where.customerId = currentUserId;
  }
  if (assignedToMe === 'true' || assignedToMe === true) {
    where.agentId = currentUserId;
  }
  if (unassigned === 'true' || unassigned === true) {
    where.agentId = null;
  }

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Filter by priority
  if (priority) {
    where.priority = priority;
  }

  // Filter by category
  if (categoryId) {
    where.categoryId = categoryId === 'unassigned' ? null : categoryId;
  }

  // Filter by date range
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  // Search keyword parsing
  if (search) {
    const searchClean = search.trim();
    // Check if searching ticket reference (e.g. HD-000102 -> 102)
    const ticketRefMatch = searchClean.match(/^HD-(\d+)$/i);
    const numericVal = ticketRefMatch ? parseInt(ticketRefMatch[1]) : parseInt(searchClean);

    where.OR = [
      { title: { contains: searchClean, mode: 'insensitive' } },
      { description: { contains: searchClean, mode: 'insensitive' } },
      { customer: { name: { contains: searchClean, mode: 'insensitive' } } },
      { agent: { name: { contains: searchClean, mode: 'insensitive' } } },
      { category: { name: { contains: searchClean, mode: 'insensitive' } } }
    ];

    if (!isNaN(numericVal)) {
      where.OR.push({ ticketNumber: numericVal });
    }

    // Also match status / priority enums if searchClean matches them
    const possibleStatuses = ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'];
    const possiblePriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const searchUpper = searchClean.toUpperCase();
    if (possibleStatuses.includes(searchUpper)) {
      where.OR.push({ status: searchUpper });
    }
    if (possiblePriorities.includes(searchUpper)) {
      where.OR.push({ priority: searchUpper });
    }
  }

  // Sorting
  const allowedSortFields = ['createdAt', 'updatedAt', 'priority', 'ticketNumber'];
  const actualSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const actualSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true, role: true }
        },
        agent: {
          select: { id: true, name: true, email: true, role: true }
        },
        category: {
          select: { id: true, name: true, isActive: true }
        }
      },
      orderBy: { [actualSortBy]: actualSortOrder },
      skip,
      take: limitNum
    }),
    prisma.ticket.count({ where })
  ]);

  return {
    tickets,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  };
};

module.exports = {
  createTicket,
  getTicketById,
  updateTicket,
  deleteTicket,
  getAllTickets
};
