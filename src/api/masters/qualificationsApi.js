import client from '../client';

const qualificationsApi = {
  getAll: () => client.get('/masters/qualifications'),
  getById: (id) => client.get(`/masters/qualifications/${id}`),
  create: (data) => client.post('/masters/qualifications', data),
  update: (id, data) => client.put(`/masters/qualifications/${id}`, data),
  delete: (id) => client.delete(`/masters/qualifications/${id}`),
  updateSequence: (qualifications) => client.put('/masters/qualifications/bulk/sequence', { qualifications }),
};

export default qualificationsApi;
