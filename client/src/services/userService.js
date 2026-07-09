import apiClient from './apiClient';

/**
 * Fetch current user profile.
 * @returns {Promise<object>} Current user object.
 */
export const getProfile = async () => {
  const response = await apiClient.get('/users/profile');
  return response.data;
};

/**
 * Update current user profile.
 * @param {object} data - Profile updates (name, email).
 * @returns {Promise<object>} Response success wrapper.
 */
export const updateProfile = async (data) => {
  const response = await apiClient.patch('/users/profile', data);
  return response.data;
};

/**
 * Fetch paginated, filtered list of all users (Admin only).
 * @param {object} params - Search, role, isActive, page, and limit query filters.
 * @returns {Promise<object>} Array of users and pagination metadata.
 */
export const getUsers = async (params = {}) => {
  const response = await apiClient.get('/users', { params });
  return response.data;
};

/**
 * Fetch specific user details by ID (Admin only).
 * @param {string} id - The user ID.
 * @returns {Promise<object>} User details.
 */
export const getUser = async (id) => {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
};

/**
 * Modify role of a user (Admin only).
 * @param {string} id - The user ID.
 * @param {string} role - The target role (ADMIN, AGENT, CUSTOMER).
 * @returns {Promise<object>} Response wrapper with updated user details.
 */
export const updateUserRole = async (id, role) => {
  const response = await apiClient.patch(`/users/${id}/role`, { role });
  return response.data;
};

/**
 * Modify status of a user (Admin only).
 * @param {string} id - The user ID.
 * @param {boolean} isActive - Target active status.
 * @returns {Promise<object>} Response wrapper with updated user status.
 */
export const updateUserStatus = async (id, isActive) => {
  const response = await apiClient.patch(`/users/${id}/status`, { isActive });
  return response.data;
};
