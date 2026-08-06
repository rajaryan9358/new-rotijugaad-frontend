import client from './client';

// NOTE: Dashboard "KYC Verified Employers" uses Employer.kyc_verification_at; Employers table now also has verification_at for UI chips.
// returns metrics + recentWindow {from,to} (YYYY-MM-DD)
// metrics include: newKycVerifiedEmployees, newKycVerifiedEmployers (based on *.kyc_verification_at in last 48h)
export const getDashboardStats = () => client.get('/dashboard');

const dashboardApi = {
  getDashboardStats
};

export default dashboardApi;
