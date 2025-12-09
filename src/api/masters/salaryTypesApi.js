import client from '../client';

const salaryTypesApi = {
  getAll: () => client.get('/masters/salary-types'),
  getById: (id) => client.get(`/masters/salary-types/${id}`),
  create: (data) => client.post('/masters/salary-types', data),
  update: (id, data) => client.put(`/masters/salary-types/${id}`, data),
  delete: (id) => client.delete(`/masters/salary-types/${id}`),
  updateSequence: (types) => client.put('/masters/salary-types/bulk/sequence', { types }),
};

export default salaryTypesApi;
