import client from '../client';

const employerReportReasonsApi = {
  getAll: () => client.get('/masters/employer-report-reasons'),
  getById: (id) => client.get(`/masters/employer-report-reasons/${id}`),
  create: (data) => client.post('/masters/employer-report-reasons', data),
  update: (id, data) => client.put(`/masters/employer-report-reasons/${id}`, data),
  delete: (id) => client.delete(`/masters/employer-report-reasons/${id}`),
  updateSequence: (reasons) => client.put('/masters/employer-report-reasons/bulk/sequence', { reasons }),
};

export default employerReportReasonsApi;
