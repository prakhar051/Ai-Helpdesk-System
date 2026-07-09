const prisma = require('../config/prisma');

/**
 * Get a user by ID.
 * @param {string} id - The user ID.
 * @returns {Promise<object>} User record without password.
 */
const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Update current user's profile.
 * @param {string} userId - ID of the user.
 * @param {object} data - Update data (name, email).
 * @returns {Promise<object>} Updated user record without password.
 */
const updateUserProfile = async (userId, data) => {
  const updateData = { ...data };

  if (updateData.email) {
    const normalizedEmail = updateData.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing && existing.id !== userId) {
      const error = new Error('Email is already registered');
      error.statusCode = 400;
      throw error;
    }
    updateData.email = normalizedEmail;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData
  });

  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

/**
 * Get paginated, filtered, and searched user list.
 * @param {object} params - Search, role, isActive, page, limit filters.
 * @returns {Promise<object>} User list and pagination metadata.
 */
const getAllUsers = async ({ search, role, isActive, page = 1, limit = 10 }) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (role && ['ADMIN', 'AGENT', 'CUSTOMER'].includes(role)) {
    where.role = role;
  }

  if (isActive !== undefined && isActive !== null && isActive !== '') {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (search) {
    const searchLower = search.trim();
    where.OR = [
      { name: { contains: searchLower, mode: 'insensitive' } },
      { email: { contains: searchLower, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.user.count({ where })
  ]);

  return {
    users,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  };
};

/**
 * Update role of a specific user.
 * @param {string} userId - User ID to update.
 * @param {string} role - The new role.
 * @returns {Promise<object>} Updated user record.
 */
const updateUserRole = async (userId, role) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return updatedUser;
};

/**
 * Update active status of a specific user.
 * @param {string} userId - User ID to toggle.
 * @param {boolean} isActive - New active status.
 * @returns {Promise<object>} Updated user record.
 */
const updateUserStatus = async (userId, isActive) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return updatedUser;
};

module.exports = {
  getUserById,
  updateUserProfile,
  getAllUsers,
  updateUserRole,
  updateUserStatus
};
