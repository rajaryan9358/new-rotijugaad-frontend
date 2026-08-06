import client from '../client';

const employeeReportReasonsApi = {
  getAll: () => client.get('/masters/employee-report-reasons'),
  getById: (id) => client.get(`/masters/employee-report-reasons/${id}`),
  create: (data) => client.post('/masters/employee-report-reasons', data),
  update: (id, data) => client.put(`/masters/employee-report-reasons/${id}`, data),
  delete: (id) => client.delete(`/masters/employee-report-reasons/${id}`),
  updateSequence: (reasons) => client.put('/masters/employee-report-reasons/bulk/sequence', { reasons }),
};

export default employeeReportReasonsApi;
