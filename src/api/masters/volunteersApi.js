import client from '../client';

const volunteersApi = {
  getAll: () => client.get('/masters/volunteers'),
  getById: (id) => client.get(`/masters/volunteers/${id}`),
  create: (data) => client.post('/masters/volunteers', data),
  update: (id, data) => client.put(`/masters/volunteers/${id}`, data),
  delete: (id) => client.delete(`/masters/volunteers/${id}`),
};

export default volunteersApi;
