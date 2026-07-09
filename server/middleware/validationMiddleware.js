/**
 * Generic request body validation middleware using Zod.
 * @param {z.ZodSchema} schema - The Zod validation schema.
 * @returns {Function} Express middleware.
 */
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }
};

module.exports = validate;
