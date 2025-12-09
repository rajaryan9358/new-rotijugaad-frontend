import client from '../client';

const citiesApi = {
  getAll: () => client.get('/masters/cities'),
  getByStateId: (stateId) => client.get(`/masters/cities?state_id=${stateId}`),
  getById: (id) => client.get(`/masters/cities/${id}`),
  create: (data) => client.post('/masters/cities', data),
  update: (id, data) => client.put(`/masters/cities/${id}`, data),
  delete: (id) => client.delete(`/masters/cities/${id}`),
  updateSequence: (cities) => client.put('/masters/cities/bulk/sequence', { cities }),
};

export default citiesApi;
