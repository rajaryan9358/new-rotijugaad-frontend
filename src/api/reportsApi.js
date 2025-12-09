import client from './client';

export const getReports = (params = {}) => client.get('/reports', { params });
export const getReportById = (id) => client.get(`/reports/${id}`);
export const markReportAsRead = (id) => client.put(`/reports/${id}/mark-read`);
export const deleteReport = (id) => client.delete(`/reports/${id}`);

export default {
  getReports,
  getReportById,
  markReportAsRead,
  deleteReport
};
