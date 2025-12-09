import client from './client';

export const getEmployees = async (params = {}) => {
  return client.get('/employees', { params });
};

export const getEmployeeById = async (id) => {
  return client.get(`/employees/${id}`);
};

export const createEmployee = async (data) => {
  return client.post('/employees', data);
};

export const updateEmployee = async (id, data) => {
  return client.put(`/employees/${id}`, data);
};

export const deleteEmployee = async (id) => {
  return client.delete(`/employees/${id}`);
};

export const getEmployeeHiredJobs = async (id) => {
  return client.get(`/employees/${id}/hired-jobs`);
};

export const getEmployeeWishlist = async (id) => {
  return client.get(`/employees/${id}/wishlist`);
};

export const getEmployeePaymentHistory = async (employeeId) => {
  return client.get('/payment-history', {
    params: { user_type: 'employee', user_id: employeeId }
  });
};

export const activateEmployee = (id) => client.post(`/employees/${id}/activate`);
export const deactivateEmployee = (id) => client.post(`/employees/${id}/deactivate`);
export const approveEmployee = (id) => client.post(`/employees/${id}/approve`);
export const rejectEmployee = (id) => client.post(`/employees/${id}/reject`);
export const grantEmployeeKyc = (id) => client.post(`/employees/${id}/kyc/grant`);
export const rejectEmployeeKyc = (id) => client.post(`/employees/${id}/kyc/reject`);
export const changeEmployeeSubscription = (id, payload) => client.post(`/employees/${id}/change-subscription`, payload);
export const addEmployeeCredits = (id, payload) => client.post(`/employees/${id}/add-credits`, payload);
export const getEmployeeJobProfiles = (id) => client.get(`/employees/${id}/job-profiles`);
export const saveEmployeeJobProfiles = (id, job_profile_ids) => client.post(`/employees/${id}/job-profiles`, { job_profile_ids });
export const getEmployeeExperiences = (id) => client.get(`/employees/${id}/experiences`);
export const createEmployeeExperience = (id, data) => client.post(`/employees/${id}/experiences`, data);
export const updateEmployeeExperience = (id, expId, data) => client.put(`/employees/${id}/experiences/${expId}`, data);
export const deleteEmployeeExperience = (id, expId) => client.delete(`/employees/${id}/experiences/${expId}`);
export const uploadExperienceCertificate = (formData) =>
  client.post('/employees/experiences/upload/certificate', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getDocumentTypes = () => client.get('/masters/document-types');
export const getWorkNatures = () => client.get('/masters/work-natures');
export const getEmployeeDocuments = (id) => client.get(`/employees/${id}/documents`);
export const uploadEmployeeDocument = (id, type, formData) =>
  client.post(`/employees/${id}/documents/upload?type=${type}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteEmployeeDocument = (id, docId) => client.delete(`/employees/${id}/documents/${docId}`);
export const getEmployeeApplications = (id) => client.get(`/employees/${id}/applications`);
export const getEmployeeCreditHistory = (id) => client.get(`/employees/${id}/credit-history`);
export const getEmployeeCallExperiences = (id) => client.get(`/employees/${id}/call-experiences`);
export const getEmployeeCallReviews = (id) => client.get(`/employees/${id}/call-reviews`);
export const getEmployeeVoilationsReported = (id) => client.get(`/employees/${id}/voilations-reported`);
export const getEmployeeReferrals = (id, params = {}) => client.get(`/employees/${id}/referrals`, { params });
export const getHiredEmployees = (params = {}) => client.get('/hired-employees', { params });
export const uploadEmployeeSelfie = (formData) =>
  client.post('/subscriptions/upload/selfie', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

const employeesApi = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeHiredJobs,
  getEmployeeWishlist,
  getEmployeePaymentHistory,
  activateEmployee,
  deactivateEmployee,
  approveEmployee,
  rejectEmployee,
  grantEmployeeKyc,
  rejectEmployeeKyc,
  changeEmployeeSubscription,
  addEmployeeCredits,
  getEmployeeJobProfiles,
  saveEmployeeJobProfiles,
  getEmployeeExperiences,
  createEmployeeExperience,
  updateEmployeeExperience,
  deleteEmployeeExperience,
  uploadExperienceCertificate,
  getDocumentTypes,
  getWorkNatures,
  getEmployeeDocuments,
  uploadEmployeeDocument,
  deleteEmployeeDocument,
  getEmployeeApplications,
  getEmployeeCreditHistory,
  getEmployeeCallExperiences,
  getEmployeeCallReviews,
  getEmployeeVoilationsReported,
  getEmployeeReferrals,
  getHiredEmployees,
  uploadEmployeeSelfie
};

export default employeesApi;
