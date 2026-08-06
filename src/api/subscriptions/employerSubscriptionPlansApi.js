import client from '../client';

const employerSubscriptionPlansApi = {
  getAll: () => client.get('/subscriptions/employer-plans'),
  getById: (id) => client.get(`/subscriptions/employer-plans/${id}`),
  create: (data) => client.post('/subscriptions/employer-plans', data),
  update: (id, data) => client.put(`/subscriptions/employer-plans/${id}`, data),
  delete: (id) => client.delete(`/subscriptions/employer-plans/${id}`),
  updateSequence: (plans) => client.put('/subscriptions/employer-plans/sequence', { plans }),
};

export default employerSubscriptionPlansApi;
