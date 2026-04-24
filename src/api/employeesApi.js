import axios from 'axios';
// NOTE: Employers now also show status timestamps similar to Employees (verification_at / kyc_verification_at).

import { getApiBaseUrl } from './baseUrl';

const api = axios.create({
	baseURL: getApiBaseUrl()
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem('token');
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

const employeesApi = {
	// list + CRUD
	// Supported list params include: kyc_verified_from (YYYY-MM-DD), kyc_verified_to (YYYY-MM-DD) (filters Employee.kyc_verification_at)
	getEmployees: (params = {}) => api.get('/employees', { params }),
	getEmployeeById: (id) => api.get(`/employees/${id}`),
	createEmployee: (payload) => api.post('/employees', payload),
	updateEmployee: (id, payload) => api.put(`/employees/${id}`, payload),
	deleteEmployee: (id) => api.delete(`/employees/${id}`),

	// status/actions
	activateEmployee: (id) => api.post(`/employees/${id}/activate`),
	deactivateEmployee: (id, payload = {}) => api.post(`/employees/${id}/deactivate`, payload),
	kycGrant: (id) => api.post(`/employees/${id}/kyc/grant`),
	kycReject: (id) => api.post(`/employees/${id}/kyc/reject`),
	changeSubscription: (id, subscription_plan_id) =>
		api.post(`/employees/${id}/change-subscription`, { subscription_plan_id }),
	addCredits: (id, { contact_credits, interest_credits, credit_expiry_at, reason } = {}) =>
		api.post(`/employees/${id}/add-credits`, { contact_credits, interest_credits, credit_expiry_at, reason }),

	// job profiles
	getEmployeeJobProfiles: (id) => api.get(`/employees/${id}/job-profiles`),
	setEmployeeJobProfiles: (id, job_profile_ids) => api.post(`/employees/${id}/job-profiles`, { job_profile_ids }),

	// experiences
	getEmployeeExperiences: (id) => api.get(`/employees/${id}/experiences`),
	createEmployeeExperience: (id, payload) => api.post(`/employees/${id}/experiences`, payload),
	updateEmployeeExperience: (id, expId, payload) => api.put(`/employees/${id}/experiences/${expId}`, payload),
	deleteEmployeeExperience: (id, expId) => api.delete(`/employees/${id}/experiences/${expId}`),
	uploadExperienceCertificate: (fileOrFormData) => {
		const form = fileOrFormData instanceof FormData ? fileOrFormData : new FormData();
		if (!(fileOrFormData instanceof FormData)) form.append('certificate', fileOrFormData);
		return api.post('/employees/experiences/upload/certificate', form, {
			headers: { 'Content-Type': 'multipart/form-data' }
		});
	},

	// documents
	getEmployeeDocuments: (id) => api.get(`/employees/${id}/documents`),
	uploadEmployeeDocument: (id, payloadOrType, maybeFile) => {
		const form = payloadOrType instanceof FormData ? payloadOrType : new FormData();
		let params = undefined;

		if (!(payloadOrType instanceof FormData)) {
			if (payloadOrType && typeof payloadOrType === 'object' && !Array.isArray(payloadOrType)) {
				if (payloadOrType.document_type_id != null) form.append('document_type_id', payloadOrType.document_type_id);
				if (payloadOrType.file) form.append('file', payloadOrType.file);
			} else {
				params = { type: payloadOrType };
				if (maybeFile) form.append('file', maybeFile);
			}
		}
		return api.post(`/employees/${id}/documents/upload`, form, {
			params,
			headers: { 'Content-Type': 'multipart/form-data' }
		});
	},
	deleteEmployeeDocument: (id, docId) => api.delete(`/employees/${id}/documents/${docId}`),

	// tabs
	getEmployeeApplications: (id) => api.get(`/employees/${id}/applications`),
	getEmployeeHiredJobs: (id) => api.get(`/employees/${id}/hired-jobs`),
	getEmployeeWishlist: (id) => api.get(`/employees/${id}/wishlist`),
	getEmployeeRecommendedJobs: (id) => api.get(`/employees/${id}/recommended-jobs`),


	// CHANGED: use the existing global payment-history API (fixes 404)
	getEmployeePaymentHistory: (id) =>
		api.get('/payment-history', { params: { user_type: 'employee', user_id: id } }),
	getEmployeeCreditHistory: (id) => api.get(`/employees/${id}/credit-history`),
	getEmployeeContactsUnlocked: (id) => api.get(`/employees/${id}/contacts-unlocked`),
	getEmployeeManualCreditHistory: (id) => api.get(`/employees/${id}/manual-credit-history`),
	getEmployeeCallExperiences: (id) => api.get(`/employees/${id}/call-experiences`),
	getEmployeeCallReviews: (id) => api.get(`/employees/${id}/call-reviews`),
	getEmployeeReferrals: (id) => api.get(`/employees/${id}/referrals`),

	// hired employees list
	// Supports: search (includes organization_name), status, job_profile_id, created_from, created_to, pagination
	getHiredEmployees: (params = {}) => api.get('/hired-employees', { params }),

	// masters/helpers (used by EmployeeDetail + EmployeesManagement)
	getWorkNatures: () => api.get('/masters/work-natures'),
	getDocumentTypes: () => api.get('/masters/document-types'),
	getAdditionalDocumentTypes: () => api.get('/masters/additional-document-types'),

	// verify/KYC (used by EmployeeDetail actions menu)
	approveEmployee: (id) => api.post(`/employees/${id}/approve`),
	rejectEmployee: (id) => api.post(`/employees/${id}/reject`),
	grantEmployeeKyc: (id) => api.post(`/employees/${id}/kyc/grant`),
	rejectEmployeeKyc: (id) => api.post(`/employees/${id}/kyc/reject`),

	// subscription/credits (match EmployeeDetail call sites)
	changeEmployeeSubscription: (id, { subscription_plan_id } = {}) =>
		api.post(`/employees/${id}/change-subscription`, { subscription_plan_id }),
	addEmployeeCredits: (id, { contact_credits, interest_credits, credit_expiry_at, reason } = {}) =>
		api.post(`/employees/${id}/add-credits`, { contact_credits, interest_credits, credit_expiry_at, reason }),

	// job profiles (alias used by EmployeeDetail)
	saveEmployeeJobProfiles: (id, job_profile_ids) => api.post(`/employees/${id}/job-profiles`, { job_profile_ids }),

	// violations reported (method referenced by EmployeeDetail; endpoint name may vary)
	getEmployeeVoilationsReported: async (id) => {
		try {
			return await api.get(`/employees/${id}/voilations-reported`);
		} catch (e) {
			if (e?.response?.status === 404) return api.get(`/employees/${id}/violations-reported`);
			throw e;
		}
	}
};

export const getHiredEmployees = (params = {}) => employeesApi.getHiredEmployees(params); // named export for HiredEmployees.js
export default employeesApi;

