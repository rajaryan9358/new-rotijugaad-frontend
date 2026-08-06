import client from '../client';

const reportReasonsApi = {
  getAll: () => client.get('/masters/report-reasons'),
  getById: (id) => client.get(`/masters/report-reasons/${id}`),
  create: (data) => client.post('/masters/report-reasons', data),
  update: (id, data) => client.put(`/masters/report-reasons/${id}`, data),
  delete: (id) => client.delete(`/masters/report-reasons/${id}`),
  updateSequence: (reasons) => client.put('/masters/report-reasons/bulk/sequence', { reasons }),
};

export default reportReasonsApi;
