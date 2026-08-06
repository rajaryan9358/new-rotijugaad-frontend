import client from '../client';

const businessCategoriesApi = {
  getAll: () => client.get('/masters/business-categories'),
  getById: (id) => client.get(`/masters/business-categories/${id}`),
  create: (data) => client.post('/masters/business-categories', data),
  update: (id, data) => client.put(`/masters/business-categories/${id}`, data),
  delete: (id) => client.delete(`/masters/business-categories/${id}`),
  updateSequence: (categories) => client.put('/masters/business-categories/bulk/sequence', { categories }),
};

export default businessCategoriesApi;
