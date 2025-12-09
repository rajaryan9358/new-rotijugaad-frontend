import client from '../client';

const jobProfilesApi = {
  getAll: () => client.get('/masters/job-profiles'),
  getById: (id) => client.get(`/masters/job-profiles/${id}`),
  create: (data) => client.post('/masters/job-profiles', data),
  update: (id, data) => client.put(`/masters/job-profiles/${id}`, data),
  delete: (id) => client.delete(`/masters/job-profiles/${id}`),
  updateSequence: (profiles) => client.put('/masters/job-profiles/bulk/sequence', { profiles }),
};

export default jobProfilesApi;
