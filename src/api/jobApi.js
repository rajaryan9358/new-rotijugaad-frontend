import client from './client';

// NOTE: /jobs supports status filter: active|inactive|expired
// NOTE: "active" and "inactive" mean non-expired jobs (expired_at IS NULL).
// NOTE: "expired" means: status='expired' OR expired_at is non-null.
// NOTE: UI "Vacancies" renders hired_total/no_vacancy.
// NOTE: /jobs list now also returns: employer_phone, interviewer_contact, job_days, job_days_short, shift_timing_display (12h AM/PM), work_start_time, work_end_time
// NOTE: /jobs search supports employer phone and interviewer contact (phone).

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
  getRecommendedCandidates: async (id, params = {}) => {
    return client.get(`/jobs/${id}/recommended-candidates`, { params });
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

  // NEW
  setVerificationStatus: async (id, verification_status) =>
    client.patch(`/jobs/${id}/verification-status`, { verification_status }),
  approveJob: async (id) => client.patch(`/jobs/${id}/verification-status`, { verification_status: 'approved' }),
  rejectJob: async (id) => client.patch(`/jobs/${id}/verification-status`, { verification_status: 'rejected' }),

  searchEmployers: async (params = {}) => client.get('/employers', { params })
};

export default jobApi;
// (no changes needed; jobs search fix is backend-only)
