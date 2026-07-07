const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');

const app = express();

// Security Headers Middleware
app.use(helmet());

// Cross-Origin Resource Sharing
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: clientUrl,
  credentials: true
}));

// Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Version 1 Route Registrations
app.use('/api/v1/health', healthRoutes);

// Catch-all 404 Route handler
app.use((req, res, next) => {
  res.status(404);
  const error = new Error(`API Endpoint Not Found - ${req.originalUrl}`);
  next(error);
});

// Global Centralized Error Handler
app.use(errorHandler);

module.exports = app;
