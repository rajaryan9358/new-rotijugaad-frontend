import apiClient from './client';

export const reviewsApi = {
  list: (params = {}) => apiClient.get('/reviews', { params }),
  markRead: (id) => apiClient.patch(`/reviews/${id}/read`, {}),
  exportCsv: (params = {}) =>
    apiClient.get('/reviews/export/csv', { params, responseType: 'blob' }),
};
