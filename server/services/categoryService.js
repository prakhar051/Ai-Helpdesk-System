const prisma = require('../config/prisma');

/**
 * Create a new Category (Admin only).
 * @param {object} data - Category parameters (name, description).
 * @returns {Promise<object>} Created category.
 */
const createCategory = async (data) => {
  const category = await prisma.category.create({
    data: {
      name: data.name.trim(),
      description: data.description ? data.description.trim() : null,
      isActive: true
    }
  });
  return category;
};

/**
 * Get category by ID.
 * @param {string} id - Category ID.
 * @returns {Promise<object>} Category details.
 */
const getCategoryById = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id }
  });

  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  return category;
};

/**
 * Update an existing Category.
 * @param {string} id - Category ID.
 * @param {object} data - Updated fields.
 * @returns {Promise<object>} Updated category details.
 */
const updateCategory = async (id, data) => {
  // Check existence
  await getCategoryById(id);

  const finalUpdates = {};
  if (data.name !== undefined) finalUpdates.name = data.name.trim();
  if (data.description !== undefined) finalUpdates.description = data.description ? data.description.trim() : null;
  if (data.isActive !== undefined) finalUpdates.isActive = data.isActive;

  const updated = await prisma.category.update({
    where: { id },
    data: finalUpdates
  });

  return updated;
};

/**
 * Deactivate a Category (Soft deletion as per prompt rules).
 * @param {string} id - Category ID.
 * @returns {Promise<object>} Deactivated category record.
 */
const deactivateCategory = async (id) => {
  return await updateCategory(id, { isActive: false });
};

/**
 * Fetch all categories with search and status filters.
 * @param {object} query - filters (search, isActive)
 * @returns {Promise<Array>} List of category records.
 */
const getAllCategories = async ({ search, isActive } = {}) => {
  const where = {};

  if (isActive !== undefined && isActive !== null && isActive !== '') {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (search) {
    const searchClean = search.trim();
    where.OR = [
      { name: { contains: searchClean, mode: 'insensitive' } },
      { description: { contains: searchClean, mode: 'insensitive' } }
    ];
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: 'asc' }
  });

  return categories;
};

module.exports = {
  createCategory,
  getCategoryById,
  updateCategory,
  deactivateCategory,
  getAllCategories
};
