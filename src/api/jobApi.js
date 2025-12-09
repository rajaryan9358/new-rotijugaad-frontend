import client from './client';

const jobApi = {
  getAll: async (params = {}) => {
    return client.get('/jobs', { params });
  },
  getById: async (id) => {
    return client.get(`/jobs/${id}`);
  },
  create: async (data) => {
    return client.post('/jobs', data);
  },
  update: async (id, data) => {
    return client.put(`/jobs/${id}`, data);
  },
  delete: async (id) => {
    return client.delete(`/jobs/${id}`);
  },
  getApplicants: async (id, params = {}) => {
    return client.get(`/jobs/${id}/applicants`, { params });
  },
  getEmployers: async (params = {}) => {
    return client.get('/employers', { params });
  },
  getStates: async (params = {}) => {
    return client.get('/masters/states', { params });
  },
  getCities: async (params = {}) => {
    return client.get('/masters/cities', { params });
  },
  toggleStatus: async (id, status) => client.patch(`/jobs/${id}/status`, { status }),
  searchEmployers: async (params = {}) => client.get('/employers', { params }) // new helper for live search
};

export default jobApi;
