const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');

let ioInstance = null;

const initSocket = (server) => {
  if (ioInstance) return ioInstance;

  ioInstance = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true
    }
  });

  // Authentication Middleware
  ioInstance.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication token is missing.'));
      }

      // Verify token
      const decoded = verifyToken(token);
      
      // Fetch user from DB
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        return next(new Error('The user belonging to this token no longer exists.'));
      }

      if (!user.isActive) {
        return next(new Error('Your account has been deactivated.'));
      }

      // Attach user object to socket
      socket.user = user;
      next();
    } catch (err) {
      logger.warn(`Socket authentication failed: ${err.message}`);
      return next(new Error('Authentication failed: Invalid or expired token.'));
    }
  });

  // Handle socket connections
  ioInstance.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket client connected: ${socket.id} (User: ${user.email}, Role: ${user.role})`);

    // Join personal room scoped by user id
    socket.join(`user:${user.id}`);

    // Join role rooms
    if (user.role === 'ADMIN') {
      socket.join('admin');
      socket.join('agent'); // Admins can manage agent assignments and workload queue
    } else if (user.role === 'AGENT') {
      socket.join('agent');
    } else if (user.role === 'CUSTOMER') {
      socket.join('customer');
    }

    socket.on('disconnect', (reason) => {
      logger.info(`Socket client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return ioInstance;
};

const getIO = () => {
  return ioInstance;
};

module.exports = {
  initSocket,
  getIO
};
