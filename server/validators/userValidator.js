const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').optional(),
  email: z.string().trim().email('Invalid email address').optional()
}).strict();

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'AGENT', 'CUSTOMER'], {
    errorMap: () => ({ message: 'Role must be ADMIN, AGENT, or CUSTOMER' })
  })
}).strict();

const updateStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'isActive status is required'
  })
}).strict();

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

module.exports = {
  updateProfileSchema,
  updateRoleSchema,
  updateStatusSchema,
  validate
};
