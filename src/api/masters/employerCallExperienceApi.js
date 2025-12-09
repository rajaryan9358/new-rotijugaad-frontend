import client from '../client';

const employerCallExperienceApi = {
  getAll: () => client.get('/masters/employer-call-experience'),
  getById: (id) => client.get(`/masters/employer-call-experience/${id}`),
  create: (data) => client.post('/masters/employer-call-experience', data),
  update: (id, data) => client.put(`/masters/employer-call-experience/${id}`, data),
  delete: (id) => client.delete(`/masters/employer-call-experience/${id}`),
  updateSequence: (experiences) => client.put('/masters/employer-call-experience/bulk/sequence', { experiences }),
};

export default employerCallExperienceApi;
