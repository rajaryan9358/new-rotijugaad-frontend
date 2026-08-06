import React from 'react';
import { useParams } from 'react-router-dom';
import paymentHistoryApi from '../api/paymentHistoryApi';

export default function InvoiceViewer() {
  const { invoiceNumber } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [blobUrl, setBlobUrl] = React.useState('');

  React.useEffect(() => {
    let alive = true;
    let currentUrl = '';

    const run = async () => {
      setLoading(true);
      setError('');
      setBlobUrl('');

      try {
        const inv = (invoiceNumber || '').toString().trim();
        if (!inv) throw new Error('Invoice number missing');

        const res = await paymentHistoryApi.getInvoicePdfByNumber(inv);
        const blob = res?.data;
        if (!blob) throw new Error('No PDF data received');

        currentUrl = window.URL.createObjectURL(blob);
        if (!alive) return;
        setBlobUrl(currentUrl);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to load invoice.';
        if (alive) setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();

    return () => {
      alive = false;
      if (currentUrl) window.URL.revokeObjectURL(currentUrl);
    };
  }, [invoiceNumber]);

  if (loading) {
    return (
      <div style={{ padding: '16px', fontSize: '14px' }}>
        Loading invoice...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', fontSize: '14px', color: '#b91c1c' }}>
        {error}
      </div>
    );
  }

  return (
    <iframe
      title="Invoice"
      src={blobUrl}
      style={{ width: '100%', height: '100vh', border: 'none' }}
    />
  );
}
