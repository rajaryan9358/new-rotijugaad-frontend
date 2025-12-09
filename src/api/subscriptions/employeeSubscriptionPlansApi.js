import client from '../client';

const employeeSubscriptionPlansApi = {
  getAll: () => client.get('/subscriptions/employee-plans'),
  getById: (id) => client.get(`/subscriptions/employee-plans/${id}`),
  create: (data) => client.post('/subscriptions/employee-plans', data),
  update: (id, data) => client.put(`/subscriptions/employee-plans/${id}`, data),
  delete: (id) => client.delete(`/subscriptions/employee-plans/${id}`),
  updateSequence: (plans) => client.put('/subscriptions/employee-plans/sequence', { plans }),
};

export default employeeSubscriptionPlansApi;
