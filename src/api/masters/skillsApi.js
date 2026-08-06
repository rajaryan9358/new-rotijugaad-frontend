import client from '../client';

const skillsApi = {
  getAll: () => client.get('/masters/skills'),
  getById: (id) => client.get(`/masters/skills/${id}`),
  create: (data) => client.post('/masters/skills', data),
  update: (id, data) => client.put(`/masters/skills/${id}`, data),
  delete: (id) => client.delete(`/masters/skills/${id}`),
  updateSequence: (skills) => client.put('/masters/skills/bulk/sequence', { skills }),
};

export default skillsApi;
