import apiClient from '../utils/apiClient';

const notificationsApi = {
  list: (params = {}) => apiClient.get('/notifications', { params }),
  create: (payload) => apiClient.post('/notifications', payload),
  delete: (id) => apiClient.delete(`/notifications/${id}`),
};

export default notificationsApi;
