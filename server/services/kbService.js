const prisma = require('../config/prisma');

/**
 * Generate a unique slug from title.
 * @param {string} title - The article title.
 * @returns {string} The formatted URL slug.
 */
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 7);
};

/**
 * Create a new Article/FAQ.
 * @param {string} authorId - Author user ID.
 * @param {object} data - Article creation parameters.
 * @returns {Promise<object>} Created article details.
 */
const createArticle = async (authorId, data) => {
  const slug = generateSlug(data.title);
  
  const article = await prisma.article.create({
    data: {
      title: data.title,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      status: data.status || 'DRAFT',
      isFaq: data.isFaq || false,
      slug,
      authorId
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  return article;
};

/**
 * Get an article by ID.
 * @param {string} id - The article ID.
 * @param {string} role - The role of the requesting user.
 * @returns {Promise<object>} Article details.
 */
const getArticleById = async (id, role) => {
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  if (!article) {
    const error = new Error('Article not found');
    error.statusCode = 404;
    throw error;
  }

  // Enforce customer draft block
  if (article.status === 'DRAFT' && role === 'CUSTOMER') {
    const error = new Error('You do not have permission to access this draft article.');
    error.statusCode = 403;
    throw error;
  }

  // Increment viewCount in the background
  const updatedArticle = await prisma.article.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  return updatedArticle;
};

/**
 * Update an existing Article/FAQ.
 * @param {string} id - The article ID.
 * @param {object} data - Updated parameters.
 * @returns {Promise<object>} Updated article details.
 */
const updateArticle = async (id, data) => {
  const updateData = { ...data };

  // Regenerate slug if title is updated
  if (updateData.title) {
    updateData.slug = generateSlug(updateData.title);
  }

  const updated = await prisma.article.update({
    where: { id },
    data: updateData,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  return updated;
};

/**
 * Delete an Article/FAQ by ID.
 * @param {string} id - The article ID.
 * @returns {Promise<object>} The deleted article record.
 */
const deleteArticle = async (id) => {
  const deleted = await prisma.article.delete({
    where: { id }
  });
  return deleted;
};

/**
 * Retrieve paginated, filtered, and searched Article list.
 * @param {object} params - Filters (search, category, status, isFaq, role, page, limit).
 * @returns {Promise<object>} List of articles and pagination metadata.
 */
const getAllArticles = async ({ search, category, status, isFaq, role, page = 1, limit = 10 }) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  // Role based visibility restrictions
  if (role === 'CUSTOMER') {
    where.status = 'PUBLISHED';
  } else if (status) {
    where.status = status;
  }

  // Type filter
  if (isFaq !== undefined && isFaq !== null && isFaq !== '') {
    where.isFaq = isFaq === 'true' || isFaq === true;
  }

  // Category filter
  if (category) {
    where.category = category;
  }

  // Text search
  if (search) {
    const searchLower = search.trim();
    where.OR = [
      { title: { contains: searchLower, mode: 'insensitive' } },
      { content: { contains: searchLower, mode: 'insensitive' } },
      { tags: { hasSome: [searchLower] } }
    ];
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.article.count({ where })
  ]);

  return {
    articles,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  };
};

module.exports = {
  createArticle,
  getArticleById,
  updateArticle,
  deleteArticle,
  getAllArticles
};
