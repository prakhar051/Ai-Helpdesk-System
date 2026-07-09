const { z } = require('zod');
const categoryService = require('../services/categoryService');
const logger = require('../utils/logger');

// Validation Schemas
const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  description: z.string().trim().max(255, 'Description must not exceed 255 characters').optional()
}).strict();

const updateCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  description: z.string().trim().max(255, 'Description must not exceed 255 characters').optional().nullable(),
  isActive: z.boolean().optional()
}).strict();

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Private
const getCategories = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    
    // Customers can only list active categories
    const isActiveFilter = req.user.role === 'CUSTOMER' ? 'true' : isActive;

    const categories = await categoryService.getAllCategories({
      search,
      isActive: isActiveFilter
    });

    return res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category by ID
// @route   GET /api/v1/categories/:id
// @access  Private
const getCategory = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Category (Admin only)
// @route   POST /api/v1/categories
// @access  Private/Admin
const createCategory = async (req, res, next) => {
  try {
    const parseResult = createCategorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: parseResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const category = await categoryService.createCategory(parseResult.data);
    logger.info(`Category created: ${category.name} (ID: ${category.id}) by Admin: ${req.user.email}`);

    return res.status(201).json({
      status: 'success',
      message: 'Category created successfully',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Category (Admin only)
// @route   PATCH /api/v1/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res, next) => {
  try {
    const parseResult = updateCategorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: parseResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const category = await categoryService.updateCategory(req.params.id, parseResult.data);
    logger.info(`Category updated: ${category.name} (ID: ${category.id}) by Admin: ${req.user.email}`);

    return res.status(200).json({
      status: 'success',
      message: 'Category updated successfully',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate Category (Admin only - soft delete)
// @route   DELETE /api/v1/categories/:id
// @access  Private/Admin
const deactivateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.deactivateCategory(req.params.id);
    logger.info(`Category deactivated: ${category.name} (ID: ${category.id}) by Admin: ${req.user.email}`);

    return res.status(200).json({
      status: 'success',
      message: 'Category deactivated successfully',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deactivateCategory
};
