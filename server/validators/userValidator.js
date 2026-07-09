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

module.exports = {
  updateProfileSchema,
  updateRoleSchema,
  updateStatusSchema
};
