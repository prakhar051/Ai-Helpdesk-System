const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

if (!JWT_SECRET) {
  throw new Error('CRITICAL CONFIG ERROR: JWT_SECRET environment variable is missing.');
}

/**
 * Generate a JWT token for a given user payload (id, role).
 * @param {object} payload - User properties to embed in token.
 * @returns {string} Signed JWT.
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * Verify a JWT token and decode its payload.
 * @param {string} token - Signed JWT.
 * @returns {object} Decoded payload.
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};
