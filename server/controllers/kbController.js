const { z } = require('zod');
const kbService = require('../services/kbService');
const logger = require('../utils/logger');

// Validation Schemas
const createArticleSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  content: z.string().trim().min(5, 'Content must be at least 5 characters'),
  category: z.string().trim().min(1, 'Category is required'),
  tags: z.array(z.string().trim()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  isFaq: z.boolean().optional()
}).strict();

const updateArticleSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').optional(),
  content: z.string().trim().min(5, 'Content must be at least 5 characters').optional(),
  category: z.string().trim().min(1, 'Category is required').optional(),
  tags: z.array(z.string().trim()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  isFaq: z.boolean().optional()
}).strict();

// @desc    Get all articles & FAQs (filtered, searched, paginated)
// @route   GET /api/v1/kb
// @access  Private
const getArticles = async (req, res, next) => {
  try {
    const { search, category, status, isFaq, page, limit } = req.query;
    const result = await kbService.getAllArticles({
      search,
      category,
      status,
      isFaq,
      role: req.user.role,
      page,
      limit
    });

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get article by ID
// @route   GET /api/v1/kb/:id
// @access  Private
const getArticle = async (req, res, next) => {
  try {
    const article = await kbService.getArticleById(req.params.id, req.user.role);
    return res.status(200).json({
      status: 'success',
      data: {
        article
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Article/FAQ
// @route   POST /api/v1/kb
// @access  Private/Admin
const createArticle = async (req, res, next) => {
  try {
    // Validate request body
    const parseResult = createArticleSchema.safeParse(req.body);
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

    const article = await kbService.createArticle(req.user.id, parseResult.data);
    logger.info(`Article created by Admin: ${article.title} (ID: ${article.id})`);

    return res.status(201).json({
      status: 'success',
      message: 'Article created successfully',
      data: {
        article
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing Article/FAQ
// @route   PATCH /api/v1/kb/:id
// @access  Private/Admin
const updateArticle = async (req, res, next) => {
  try {
    // Validate request body
    const parseResult = updateArticleSchema.safeParse(req.body);
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

    const updated = await kbService.updateArticle(req.params.id, parseResult.data);
    logger.info(`Article updated: ${updated.title} (ID: ${updated.id})`);

    return res.status(200).json({
      status: 'success',
      message: 'Article updated successfully',
      data: {
        article: updated
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Article/FAQ
// @route   DELETE /api/v1/kb/:id
// @access  Private/Admin
const deleteArticle = async (req, res, next) => {
  try {
    const deleted = await kbService.deleteArticle(req.params.id);
    logger.info(`Article deleted: ${deleted.title} (ID: ${deleted.id})`);

    return res.status(200).json({
      status: 'success',
      message: 'Article deleted successfully',
      data: {
        article: deleted
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle
};
