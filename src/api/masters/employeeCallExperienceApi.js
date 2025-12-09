import client from '../client';

const employeeCallExperienceApi = {
  getAll: () => client.get('/masters/employee-call-experience'),
  getById: (id) => client.get(`/masters/employee-call-experience/${id}`),
  create: (data) => client.post('/masters/employee-call-experience', data),
  update: (id, data) => client.put(`/masters/employee-call-experience/${id}`, data),
  delete: (id) => client.delete(`/masters/employee-call-experience/${id}`),
  updateSequence: (experiences) => client.put('/masters/employee-call-experience/bulk/sequence', { experiences }),
};

export default employeeCallExperienceApi;
