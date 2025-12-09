import client from '../client';

const jobBenefitsApi = {
  getAll: () => client.get('/masters/job-benefits'),
  getById: (id) => client.get(`/masters/job-benefits/${id}`),
  create: (data) => client.post('/masters/job-benefits', data),
  update: (id, data) => client.put(`/masters/job-benefits/${id}`, data),
  delete: (id) => client.delete(`/masters/job-benefits/${id}`),
  updateSequence: (benefits) => client.put('/masters/job-benefits/bulk/sequence', { benefits }),
};

export default jobBenefitsApi;
