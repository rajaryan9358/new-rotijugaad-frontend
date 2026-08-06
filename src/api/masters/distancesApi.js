import client from '../client';

const distancesApi = {
  getAll: () => client.get('/masters/distances'),
  getById: (id) => client.get(`/masters/distances/${id}`),
  create: (data) => client.post('/masters/distances', data),
  update: (id, data) => client.put(`/masters/distances/${id}`, data),
  delete: (id) => client.delete(`/masters/distances/${id}`),
  updateSequence: (distances) => client.put('/masters/distances/bulk/sequence', { distances }),
};

export default distancesApi;
