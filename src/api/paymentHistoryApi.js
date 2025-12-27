import client from './client';

export const getPaymentHistory = (params = {}) =>
  client.get('/payment-history', { params });

export const getPaymentHistoryById = (id) =>
  client.get(`/payment-history/${id}`);

export const deletePaymentHistory = (id) =>
  client.delete(`/payment-history/${id}`);

// Fetch invoice PDF as blob (ensures auth header is sent)
export const getInvoicePdf = (id) =>
  client.get(`/payment-history/${id}/invoice`, { responseType: 'blob' });

// Fetch invoice PDF by invoice number as blob (auth header is sent)
export const getInvoicePdfByNumber = (invoiceNumber) =>
  client.get(`/payment-history/invoice/${encodeURIComponent(String(invoiceNumber || '').trim())}`, { responseType: 'blob' });

// Get a signed URL that opens the invoice PDF in a new tab
export const getInvoiceOpenUrl = async (id) => {
  const res = await client.get(`/payment-history/${id}/invoice-link`);
  return res.data?.data?.url || '';
};

// Invoice URL for a payment history row (backend returns PDF inline)
export const buildInvoiceUrl = (paymentHistoryId) => {
  const id = (paymentHistoryId || '').toString().trim();
  if (!id) return '';
  const base = (client?.defaults?.baseURL || '/api').toString().replace(/\/$/, '');
  // If baseURL is absolute (e.g. http://localhost:5001/api), open that directly.
  // If it's relative (/api), this still works in prod where backend serves /api.
  return `${base}/payment-history/${encodeURIComponent(id)}/invoice`;
};

export default {
  getPaymentHistory,
  getPaymentHistoryById,
  deletePaymentHistory,
  getInvoicePdf,
  getInvoicePdfByNumber,
  getInvoiceOpenUrl,
  buildInvoiceUrl
};
