import client from './client';

export const getCallHistory = (params = {}) => client.get('/call-history', { params });
export const getCallHistoryById = (id) => client.get(`/call-history/${id}`);
export const markRead = (id) => client.put(`/call-history/${id}/read`);
export const deleteCallHistory = (id) => client.delete(`/call-history/${id}`);
export const getCallExperiences = (userType) => {
  const path = userType === 'employee'
    ? '/masters/employee-call-experience'
    : '/masters/employer-call-experience';
  return client.get(path);
};

export default {
  getCallHistory,
  getCallHistoryById,
  markRead,
  deleteCallHistory,
  getCallExperiences
};
