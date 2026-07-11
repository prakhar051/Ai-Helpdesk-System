const dashboardService = require('../services/dashboardService');
const logger = require('../utils/logger');

// @desc    Retrieve dynamic Helpdesk operations metrics and charts data
// @route   GET /api/v1/dashboard
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getDashboardStats(req.user);
    
    logger.info(`Dashboard stats compiled successfully for user: ${req.user.email} (Role: ${req.user.role})`);

    return res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    logger.error(`Failed to compile dashboard stats: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
