import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logsApi from '../api/logsApi';
import './LogsDialog.css';

export default function LogsDialog({ open, onClose, category, title = 'Logs' }) {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const limit = 10;

  useEffect(() => {
    if (open) {
      setPage(1);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!open) return;
      setLoading(true);
      setError('');
      try {
        const response = await logsApi.list({ category, page, limit });
        setLogs(response.data?.data || []);
        setMeta(response.data?.meta || { page, limit, total: 0, totalPages: 1 });
      } catch (e) {
        console.error('Error fetching logs:', e);
        setError(e.response?.data?.message || 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [open, category, page]);

  if (!open) return null;

  const totalPages = meta?.totalPages || 1;

  return (
    <div className="logs-overlay">
      <div className="logs-box">
        <div className="logs-header">
          <h3 className="logs-title">{title}</h3>
          <button className="logs-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="inline-message error">{error}</div>}

        <div className="logs-content">
          {loading ? (
            <div className="logs-empty">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="logs-empty">No logs found</div>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  <th style={{ width: 170 }}>Date</th>
                  <th style={{ width: 180 }}>Admin</th>
                  <th style={{ width: 90 }}>Type</th>
                  <th>Log</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                    <td>{log.admin?.name || log.admin?.email || '-'}</td>
                    <td>{log.type}</td>
                    <td>
                      {log.redirect_to ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate(log.redirect_to);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            margin: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontWeight: 600,
                            textDecoration: 'underline',
                          }}
                        >
                          {log.log_text || '(view)'}
                        </button>
                      ) : (
                        (log.log_text || '-')
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="logs-footer">
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
          >
            Previous
          </button>

          <div className="logs-page-info">
            Page {page} of {totalPages} • Total {meta?.total || 0}
          </div>

          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
