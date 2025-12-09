import client from './client';

export const getDashboardStats = () => client.get('/dashboard');

const dashboardApi = {
  getDashboardStats
};

export default dashboardApi;
