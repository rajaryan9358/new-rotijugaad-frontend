import client from './client';

// NOTE: Employer list rows may include verification_at + kyc_verification_at for UI chips.
// NOTE: Employer list/getById may include User.StatusChangedBy (Admin) for "Status changed by".
export const EMPLOYER_ORG_TYPES = Object.freeze(['domestic', 'firm']);
export const EMPLOYER_ORG_TYPE_OPTIONS = Object.freeze([
  { value: 'domestic', label: 'Domestic' },
  { value: 'firm', label: 'Firm' }
]);

export const getVoilationReports = (id) => client.get(`/employers/${id}/voilation-reports`);
export const getVoilationsReported = (id) => client.get(`/employers/${id}/voilations-reported`);
export const getEmployerReferrals = (id) => client.get(`/employers/${id}/referrals`);

// Supported list params include: kyc_verified_from (YYYY-MM-DD), kyc_verified_to (YYYY-MM-DD)
const employersApi = {
  getAll: (params = {}) => client.get('/employers', { params }),
  getById: (id) => client.get(`/employers/${id}`),
  create: (data) => client.post('/employers', data),
  update: (id, data) => client.put(`/employers/${id}`, data),
  delete: (id) => client.delete(`/employers/${id}`),
  activate: (id) => client.post(`/employers/${id}/activate`),
  deactivate: (id, payload = {}) => client.post(`/employers/${id}/deactivate`, payload),
  approve: (id) => client.post(`/employers/${id}/approve`),
  reject: (id) => client.post(`/employers/${id}/reject`),
  grantKyc: (id) => client.post(`/employers/${id}/kyc/grant`),
  rejectKyc: (id) => client.post(`/employers/${id}/kyc/reject`),
  changeSubscription: (id, payload) => client.post(`/employers/${id}/change-subscription`, payload),
  addCredits: (id, payload) => client.post(`/employers/${id}/add-credits`, payload),
  getApplicants: (id, params) => client.get(`/employers/${id}/applicants`, { params }),
  getCreditHistory: (id, params) => client.get(`/employers/${id}/credit-history`, { params }),
  getManualCreditHistory: (id, params) => client.get(`/employers/${id}/manual-credit-history`, { params }),
  getSubscriptionHistory: (id) =>
    client.get('/payment-history', { params: { user_type: 'employer', user_id: id } }),
  getCallExperiences: (id) => client.get(`/employers/${id}/call-experiences`),
  getCallReviews: (id) => client.get(`/employers/${id}/call-reviews`),
  getVoilationReports,
  getVoilationsReported,
  getEmployerReferrals
};

export default employersApi;
