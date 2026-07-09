const prisma = require('../config/prisma');

/**
 * Create a new Ticket.
 * @param {string} customerId - The customer user ID.
 * @param {object} data - Ticket details (title, description).
 * @returns {Promise<object>} Created ticket.
 */
const createTicket = async (customerId, data) => {
  const ticket = await prisma.ticket.create({
    data: {
      title: data.title,
      description: data.description,
      status: 'OPEN',
      customerId
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true, role: true }
      },
      agent: {
        select: { id: true, name: true, email: true, role: true }
      }
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
    // Customers can only change title and description
    if (updateData.title !== undefined) finalUpdates.title = updateData.title;
    if (updateData.description !== undefined) finalUpdates.description = updateData.description;

  } else if (user.role === 'AGENT') {
    // Agents can change status and assignees. They cannot change description.
    if (updateData.status !== undefined) finalUpdates.status = updateData.status;
    if (updateData.agentId !== undefined) finalUpdates.agentId = updateData.agentId === 'unassigned' ? null : updateData.agentId;

  } else if (user.role === 'ADMIN') {
    // Admins can change everything
    if (updateData.title !== undefined) finalUpdates.title = updateData.title;
    if (updateData.description !== undefined) finalUpdates.description = updateData.description;
    if (updateData.status !== undefined) finalUpdates.status = updateData.status;
    if (updateData.agentId !== undefined) finalUpdates.agentId = updateData.agentId === 'unassigned' ? null : updateData.agentId;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: finalUpdates,
    include: {
      customer: {
        select: { id: true, name: true, email: true, role: true }
      },
      agent: {
        select: { id: true, name: true, email: true, role: true }
      }
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
 * @param {object} params - search, status, agentId, customerId, role, page, limit
 * @returns {Promise<object>} Tickets array & pagination.
 */
const getAllTickets = async ({ search, status, agentId, customerId, role, page = 1, limit = 8 }) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 8);
  const skip = (pageNum - 1) * limitNum;

  const where = { isDeleted: false };

  // Customer visibility scope constraint
  if (role === 'CUSTOMER') {
    where.customerId = customerId;
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

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Search keyword parsing
  if (search) {
    const searchClean = search.trim();
    // Check if searching ticket reference (e.g. HD-000102 -> 102)
    const ticketRefMatch = searchClean.match(/^HD-(\d+)$/i);
    const numericVal = ticketRefMatch ? parseInt(ticketRefMatch[1]) : parseInt(searchClean);

    where.OR = [
      { title: { contains: searchClean, mode: 'insensitive' } },
      { description: { contains: searchClean, mode: 'insensitive' } }
    ];

    if (!isNaN(numericVal)) {
      where.OR.push({ ticketNumber: numericVal });
    }
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true, role: true }
        },
        agent: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
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
