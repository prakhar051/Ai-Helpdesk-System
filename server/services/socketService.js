const { getIO } = require('../socket/socketServer');
const logger = require('../utils/logger');

// Standard helper to get IO instance safely without throwing
const getIOInstance = () => {
  try {
    return getIO();
  } catch (err) {
    logger.error(`Failed to retrieve socket server instance: ${err.message}`);
    return null;
  }
};

const createPayload = (type, data) => ({
  type,
  timestamp: new Date().toISOString(),
  data
});

/**
 * Emit a socket event to a specific room safely.
 */
const emitToRoom = (room, eventName, payload) => {
  const io = getIOInstance();
  if (!io) return;
  try {
    io.to(room).emit(eventName, payload);
    logger.debug(`Socket event [${eventName}] emitted to room [${room}]`);
  } catch (err) {
    logger.error(`Failed to emit socket event [${eventName}] to room [${room}]: ${err.message}`);
  }
};

// ==========================================
// SOCKET SERVICES EVENTS
// ==========================================

const emitTicketCreated = (ticket) => {
  const payload = createPayload('ticket:created', { ticket });

  // 1. Notify Customer
  emitToRoom(`user:${ticket.customerId}`, 'ticket:created', payload);

  // 2. Notify Admins
  emitToRoom('admin', 'ticket:created', payload);

  // Trigger real-time KPI refresh
  emitDashboardUpdate();

  // Send toast notifications
  emitNotification(`user:${ticket.customerId}`, {
    title: 'Ticket Submitted',
    message: `Your ticket HD-${ticket.ticketNumber.toString().padStart(6, '0')} has been registered.`,
    type: 'success',
    ticketId: ticket.id
  });
  if (ticket.priority === 'URGENT') {
    emitNotification('admin', {
      title: '🚨 Urgent Ticket Submitted',
      message: `Ticket HD-${ticket.ticketNumber.toString().padStart(6, '0')} requires immediate attention.`,
      type: 'error',
      ticketId: ticket.id
    });
  } else {
    emitNotification('admin', {
      title: 'New Ticket Queue',
      message: `A new ticket has been added: ${ticket.title}`,
      type: 'info',
      ticketId: ticket.id
    });
  }
};

const emitTicketUpdated = (ticket) => {
  const payload = createPayload('ticket:updated', { ticket });

  emitToRoom(`user:${ticket.customerId}`, 'ticket:updated', payload);
  emitToRoom('admin', 'ticket:updated', payload);
  if (ticket.agentId) {
    emitToRoom(`user:${ticket.agentId}`, 'ticket:updated', payload);
  }
};

const emitTicketAssigned = (ticket) => {
  const payload = createPayload('ticket:assigned', { ticket });

  emitToRoom(`user:${ticket.customerId}`, 'ticket:assigned', payload);
  emitToRoom('admin', 'ticket:assigned', payload);
  if (ticket.agentId) {
    emitToRoom(`user:${ticket.agentId}`, 'ticket:assigned', payload);
    
    // Toast notification to Agent
    emitNotification(`user:${ticket.agentId}`, {
      title: 'New Ticket Assignment',
      message: `You have been assigned to handle Ticket HD-${ticket.ticketNumber.toString().padStart(6, '0')}.`,
      type: 'success',
      ticketId: ticket.id
    });
  }

  emitDashboardUpdate();
};

const emitTicketStatusChanged = (ticket, oldStatus) => {
  const payload = createPayload('ticket:status', { ticket, oldStatus });

  emitToRoom(`user:${ticket.customerId}`, 'ticket:status', payload);
  emitToRoom('admin', 'ticket:status', payload);
  if (ticket.agentId) {
    emitToRoom(`user:${ticket.agentId}`, 'ticket:status', payload);
  }

  // Toast notification to Customer
  emitNotification(`user:${ticket.customerId}`, {
    title: 'Ticket Status Update',
    message: `Your ticket status was changed from ${oldStatus} to ${ticket.status}.`,
    type: 'info',
    ticketId: ticket.id
  });

  emitDashboardUpdate();
};

const emitTicketComment = (ticket, comment, commenter) => {
  const payload = createPayload('ticket:comment', { ticketId: ticket.id, comment });

  emitToRoom(`user:${ticket.customerId}`, 'ticket:comment', payload);
  emitToRoom('admin', 'ticket:comment', payload);
  if (ticket.agentId) {
    emitToRoom(`user:${ticket.agentId}`, 'ticket:comment', payload);
  }

  // Send targeted notifications depending on commenter role
  if (commenter.role === 'CUSTOMER') {
    if (ticket.agentId) {
      emitNotification(`user:${ticket.agentId}`, {
        title: 'New Customer Message',
        message: `${commenter.name} added a reply to Ticket HD-${ticket.ticketNumber.toString().padStart(6, '0')}.`,
        type: 'info',
        ticketId: ticket.id
      });
    }
  } else {
    emitNotification(`user:${ticket.customerId}`, {
      title: 'New Support Message',
      message: `Support agent ${commenter.name} replied to your request.`,
      type: 'info',
      ticketId: ticket.id
    });
  }
};

const emitTicketResolved = (ticket) => {
  const payload = createPayload('ticket:resolved', { ticket });

  emitToRoom(`user:${ticket.customerId}`, 'ticket:resolved', payload);
  emitToRoom('admin', 'ticket:resolved', payload);
  if (ticket.agentId) {
    emitToRoom(`user:${ticket.agentId}`, 'ticket:resolved', payload);
  }

  // Toast to customer
  emitNotification(`user:${ticket.customerId}`, {
    title: 'Ticket Resolved',
    message: `Support ticket HD-${ticket.ticketNumber.toString().padStart(6, '0')} has been marked resolved.`,
    type: 'success',
    ticketId: ticket.id
  });

  emitDashboardUpdate();
};

const emitTicketClosed = (ticket) => {
  const payload = createPayload('ticket:closed', { ticket });

  emitToRoom(`user:${ticket.customerId}`, 'ticket:closed', payload);
  emitToRoom('admin', 'ticket:closed', payload);
  if (ticket.agentId) {
    emitToRoom(`user:${ticket.agentId}`, 'ticket:closed', payload);
  }

  // Toast to customer
  emitNotification(`user:${ticket.customerId}`, {
    title: 'Ticket Closed',
    message: `Your support request has been successfully closed.`,
    type: 'info',
    ticketId: ticket.id
  });

  emitDashboardUpdate();
};

const emitDashboardUpdate = () => {
  const payload = createPayload('dashboard:update', {});
  emitToRoom('admin', 'dashboard:update', payload);
  emitToRoom('agent', 'dashboard:update', payload);
};

const emitNotification = (targetRoom, payload) => {
  const wsPayload = createPayload('notification', payload);
  emitToRoom(targetRoom, 'notification', wsPayload);
};

module.exports = {
  emitTicketCreated,
  emitTicketUpdated,
  emitTicketAssigned,
  emitTicketStatusChanged,
  emitTicketComment,
  emitTicketResolved,
  emitTicketClosed,
  emitDashboardUpdate,
  emitNotification
};
