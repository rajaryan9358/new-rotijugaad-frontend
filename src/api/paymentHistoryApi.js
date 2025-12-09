import client from './client';

export const getPaymentHistory = (params = {}) =>
  client.get('/payment-history', { params });

export const getPaymentHistoryById = (id) =>
  client.get(`/payment-history/${id}`);

export const deletePaymentHistory = (id) =>
  client.delete(`/payment-history/${id}`);

export default {
  getPaymentHistory,
  getPaymentHistoryById,
  deletePaymentHistory
};
