import client from '../client';

const experiencesApi = {
  getAll: () => client.get('/masters/experiences'),
  getById: (id) => client.get(`/masters/experiences/${id}`),
  create: (data) => client.post('/masters/experiences', data),
  update: (id, data) => client.put(`/masters/experiences/${id}`, data),
  delete: (id) => client.delete(`/masters/experiences/${id}`),
  updateSequence: (experiences) => client.put('/masters/experiences/bulk/sequence', { experiences }),
};

export default experiencesApi;
