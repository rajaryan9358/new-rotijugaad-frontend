import client from '../client';

const workNaturesApi = {
  getAll: () => client.get('/masters/work-natures'),
  getById: (id) => client.get(`/masters/work-natures/${id}`),
  create: (data) => client.post('/masters/work-natures', data),
  update: (id, data) => client.put(`/masters/work-natures/${id}`, data),
  delete: (id) => client.delete(`/masters/work-natures/${id}`),
  updateSequence: (natures) => client.put('/masters/work-natures/bulk/sequence', { natures }),
};

export default workNaturesApi;
