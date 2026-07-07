const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log the complete error stack trace using Winston
  logger.error(`App Error: ${err.message}`, { 
    url: req.originalUrl, 
    method: req.method, 
    stack: err.stack 
  });

  const response = {
    status: 'error',
    message: err.message || 'Internal Server Error'
  };

  // Mask stack traces from client payloads in production mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
