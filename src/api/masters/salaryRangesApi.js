import client from '../client';

const salaryRangesApi = {
  getAll: () => client.get('/masters/salary-ranges'),
  getById: (id) => client.get(`/masters/salary-ranges/${id}`),
  create: (data) => client.post('/masters/salary-ranges', data),
  update: (id, data) => client.put(`/masters/salary-ranges/${id}`, data),
  delete: (id) => client.delete(`/masters/salary-ranges/${id}`),
  updateSequence: (ranges) => client.put('/masters/salary-ranges/bulk/sequence', { ranges }),
};

export default salaryRangesApi;
