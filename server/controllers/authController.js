const authService = require('../services/authService');
const logger = require('../utils/logger');

// @desc    Register a new user (always as CUSTOMER)
// @route   POST /api/v1/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    // Explicitly do NOT pass any role provided by the client
    const user = await authService.registerUser({ 
      name, 
      email, 
      password, 
      role: 'CUSTOMER' 
    });

    logger.info(`User registered successfully: ${user.email}`);

    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const { user, token } = await authService.loginUser({ email, password });

    logger.info(`User logged in: ${user.email} (${user.role})`);

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log user out / invalidate session
// @route   POST /api/v1/auth/logout
// @access  Public (Will clear token in client-side)
const logout = async (req, res, next) => {
  try {
    logger.info('User logged out');
    return res.status(200).json({
      status: 'success',
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout
};
