import client from '../client';

const vacancyNumbersApi = {
  getAll: () => client.get('/masters/vacancy-numbers'),
  getById: (id) => client.get(`/masters/vacancy-numbers/${id}`),
  create: (data) => client.post('/masters/vacancy-numbers', data),
  update: (id, data) => client.put(`/masters/vacancy-numbers/${id}`, data),
  delete: (id) => client.delete(`/masters/vacancy-numbers/${id}`),
  updateSequence: (numbers) => client.put('/masters/vacancy-numbers/bulk/sequence', { numbers }),
};

export default vacancyNumbersApi;
