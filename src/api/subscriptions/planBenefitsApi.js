import client from '../client';

const planBenefitsApi = {
  getAll: (params) => client.get('/subscriptions/plan-benefits', { params }),
  getById: (id) => client.get(`/subscriptions/plan-benefits/${id}`),
  create: (data) => client.post('/subscriptions/plan-benefits', data),
  update: (id, data) => client.put(`/subscriptions/plan-benefits/${id}`, data),
  delete: (id) => client.delete(`/subscriptions/plan-benefits/${id}`),
  updateSequence: (benefits) => client.put('/subscriptions/plan-benefits/sequence', { benefits }),
};

export default planBenefitsApi;
