import apiClient from './apiClient';

const authService = {
  register: async (name, email, password) => {
    const response = await apiClient.post('/auth/register', { name, email, password });
    return response.data;
  },

  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  }
};

export default authService;
