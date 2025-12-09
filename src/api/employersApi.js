import client from './client';

export const getVoilationReports = (id) => client.get(`/employers/${id}/voilation-reports`);
export const getVoilationsReported = (id) => client.get(`/employers/${id}/voilations-reported`);
export const getEmployerReferrals = (id) => client.get(`/employers/${id}/referrals`);

const employersApi = {
  getAll: (params = {}) => client.get('/employers', { params }),
  getById: (id) => client.get(`/employers/${id}`),
  create: (data) => client.post('/employers', data),
  update: (id, data) => client.put(`/employers/${id}`, data),
  delete: (id) => client.delete(`/employers/${id}`),
  activate: (id) => client.post(`/employers/${id}/activate`),
  deactivate: (id) => client.post(`/employers/${id}/deactivate`),
  approve: (id) => client.post(`/employers/${id}/approve`),
  reject: (id) => client.post(`/employers/${id}/reject`),
  grantKyc: (id) => client.post(`/employers/${id}/kyc/grant`),
  rejectKyc: (id) => client.post(`/employers/${id}/kyc/reject`),
  changeSubscription: (id, payload) => client.post(`/employers/${id}/change-subscription`, payload),
  addCredits: (id, payload) => client.post(`/employers/${id}/add-credits`, payload),
  getApplicants: (id, params) => client.get(`/employers/${id}/applicants`, { params }),
  getCreditHistory: (id, params) => client.get(`/employers/${id}/credit-history`, { params }),
  getSubscriptionHistory: (id) =>
    client.get('/payment-history', { params: { user_type: 'employer', user_id: id } }),
  getCallExperiences: (id) => client.get(`/employers/${id}/call-experiences`),
  getCallReviews: (id) => client.get(`/employers/${id}/call-reviews`),
  getVoilationReports,
  getVoilationsReported,
  getEmployerReferrals
};

export default employersApi;
