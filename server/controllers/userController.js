const userService = require('../services/userService');
const logger = require('../utils/logger');

// @desc    Get current user profile
// @route   GET /api/v1/users/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    return res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PATCH /api/v1/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateUserProfile(req.user.id, req.body);
    logger.info(`Profile updated for user: ${updatedUser.email}`);

    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/v1/users/:id
// @access  Private/Admin
const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (paginated, filtered, searched)
// @route   GET /api/v1/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const { search, role, isActive, page, limit } = req.query;
    const result = await userService.getAllUsers({ search, role, isActive, page, limit });

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PATCH /api/v1/users/:id/role
// @access  Private/Admin
const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const updatedUser = await userService.updateUserRole(req.params.id, role);
    logger.info(`Admin updated role of ${updatedUser.email} to ${role}`);

    return res.status(200).json({
      status: 'success',
      message: 'User role updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (active/inactive)
// @route   PATCH /api/v1/users/:id/status
// @access  Private/Admin
const updateStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const updatedUser = await userService.updateUserStatus(req.params.id, isActive);
    logger.info(`Admin updated status of ${updatedUser.email} to ${isActive ? 'Active' : 'Inactive'}`);

    return res.status(200).json({
      status: 'success',
      message: `User status set to ${isActive ? 'Active' : 'Inactive'}`,
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUser,
  getUsers,
  updateRole,
  updateStatus
};
