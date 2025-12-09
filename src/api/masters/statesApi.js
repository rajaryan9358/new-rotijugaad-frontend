import client from '../client';

const statesApi = {
  getAll: () => client.get('/masters/states'),
  getById: (id) => client.get(`/masters/states/${id}`),
  create: (data) => client.post('/masters/states', data),
  update: (id, data) => client.put(`/masters/states/${id}`, data),
  delete: (id) => client.delete(`/masters/states/${id}`),
  updateSequence: (states) => client.put('/masters/states/bulk/sequence', { states }),
};

export default statesApi;
