import client from '../client';

const shiftsApi = {
  getAll: () => client.get('/masters/shifts'),
  getById: (id) => client.get(`/masters/shifts/${id}`),
  create: (data) => client.post('/masters/shifts', data),
  update: (id, data) => client.put(`/masters/shifts/${id}`, data),
  delete: (id) => client.delete(`/masters/shifts/${id}`),
  updateSequence: (shifts) => client.put('/masters/shifts/bulk/sequence', { shifts }),
};

export default shiftsApi;
