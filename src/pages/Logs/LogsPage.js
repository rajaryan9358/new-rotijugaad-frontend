import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import logsApi from '../../api/logsApi';
import '../Masters/MasterPage.css';

const toIsoStartOfDayUtc = (yyyyMmDd) => (yyyyMmDd ? `${yyyyMmDd}T00:00:00.000Z` : '');
const toIsoEndOfDayUtc = (yyyyMmDd) => (yyyyMmDd ? `${yyyyMmDd}T23:59:59.999Z` : '');

const buildFilterSummary = ({ category, adminId, dateFrom, dateTo }) => {
  const parts = [];
  if (category) parts.push(`category=${category}`);
  if (adminId) parts.push(`admin_id=${adminId}`);
  if (dateFrom) parts.push(`from=${dateFrom}`);
  if (dateTo) parts.push(`to=${dateTo}`);
  return parts.length ? parts.join(', ') : 'none';
};

const escapeCsv = (value) => {
  const s = value === null || value === undefined ? '' : String(value);
  const needsQuotes = s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r');
  if (!needsQuotes) return s;
  return `"${s.replace(/"/g, '""')}"`;
};
export default function LogsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => getSidebarState());

  const canView = hasPermission(PERMISSIONS.LOGS_VIEW);
  const canExport = hasPermission(PERMISSIONS.LOGS_EXPORT);

  const [categories, setCategories] = useState([]);
  const [admins, setAdmins] = useState([]);

  const [category, setCategory] = useState('');
  const [adminId, setAdminId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const limit = 20;

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit,
    };

    if (category) params.category = category;
    if (adminId) params.rj_employee_id = adminId;

    const createdFromIso = toIsoStartOfDayUtc(dateFrom);
    const createdToIso = toIsoEndOfDayUtc(dateTo);
    if (createdFromIso) params.created_from = createdFromIso;
    if (createdToIso) params.created_to = createdToIso;

    return params;
  }, [page, limit, category, adminId, dateFrom, dateTo]);

  useEffect(() => {
    setSidebarOpen(getSidebarState());
  }, []);

  useEffect(() => {
    if (!canView) return;

    const loadMeta = async () => {
      try {
        const [metaRes, adminsRes] = await Promise.all([logsApi.meta(), logsApi.admins()]);
        setCategories(metaRes.data?.data?.categories || []);
        setAdmins(adminsRes.data?.data || []);
      } catch (e) {
        // Non-blocking: page can still work with manual filters
        console.error('Failed to load logs meta/admins', e);
      }
    };

    loadMeta();
  }, [canView]);

  useEffect(() => {
    if (!canView) return;

    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await logsApi.list(queryParams);
        setLogs(res.data?.data || []);
        setMeta(res.data?.meta || { page, limit, total: 0, totalPages: 1 });
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [canView, queryParams, page, limit]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [category, adminId, dateFrom, dateTo]);

  const handleMenuClick = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  const downloadCsv = (filename, csvText) => {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!canExport) return;
    setExporting(true);
    setError('');

    try {
      const exportLimit = 100;
      let exportPage = 1;
      let allRows = [];
      let totalPages = 1;

      do {
        const res = await logsApi.list({ ...queryParams, page: exportPage, limit: exportLimit });
        const rows = res.data?.data || [];
        const m = res.data?.meta || { totalPages: 1 };
        totalPages = m.totalPages || 1;
        allRows = allRows.concat(rows);
        exportPage += 1;

        // Hard safety cap to avoid freezing the browser
        if (allRows.length >= 10000) break;
      } while (exportPage <= totalPages);

      const header = [
        'id',
        'created_at',
        'category',
        'type',
        'rj_employee_id',
        'admin_name',
        'admin_email',
        'redirect_to',
        'log_text',
      ];

      const lines = [header.join(',')].concat(
        allRows.map((r) => {
          const adminName = r.admin?.name || '';
          const adminEmail = r.admin?.email || '';
          return [
            escapeCsv(r.id),
            escapeCsv(r.created_at),
            escapeCsv(r.category),
            escapeCsv(r.type),
            escapeCsv(r.rj_employee_id),
            escapeCsv(adminName),
            escapeCsv(adminEmail),
            escapeCsv(r.redirect_to),
            escapeCsv(r.log_text),
          ].join(',');
        })
      );

      const csvText = lines.join('\n');
      downloadCsv('logs.csv', csvText);

      // Audit the export (non-blocking)
      try {
        await logsApi.create({
          category: 'logs',
          type: 'export',
          redirect_to: '/logs',
          log_text: `Exported logs CSV; filters: ${buildFilterSummary({ category, adminId, dateFrom, dateTo })}`,
        });
      } catch (_) {}
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view logs.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const totalPages = meta?.totalPages || 1;

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={() => { localStorage.clear(); navigate('/login'); }} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {error && <div className="inline-message error">{error}</div>}

            <div className="list-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ marginRight: 'auto' }}>Logs</h1>
              {canExport && (
                <button
                  className="btn-secondary small"
                  onClick={handleExport}
                  disabled={loading || exporting}
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              )}
            </div>

            <div className="data-card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Category</div>
                  <select className="state-filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">All</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Admin</div>
                  <select className="state-filter-select" value={adminId} onChange={(e) => setAdminId(e.target.value)}>
                    <option value="">All</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name || a.email || `Admin ${a.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Created date from</div>
                  <input
                    type="date"
                    className="state-filter-select"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Created date to</div>
                  <input
                    type="date"
                    className="state-filter-select"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="data-card" style={{ padding: 0 }}>
              <div className="table-container" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 170 }}>Date</th>
                      <th style={{ width: 160 }}>Category</th>
                      <th style={{ width: 180 }}>Admin</th>
                      <th style={{ width: 90 }}>Type</th>
                      <th>Log</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5}>Loading...</td></tr>
                    ) : logs.length ? (
                      logs.map((log) => (
                        <tr key={log.id}>
                          <td>{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                          <td>{log.category || '-'}</td>
                          <td>{log.admin?.name || log.admin?.email || '-'}</td>
                          <td>{log.type}</td>
                          <td>
                            {log.redirect_to ? (
                              <button
                                type="button"
                                onClick={() => navigate(log.redirect_to)}
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
                      ))
                    ) : (
                      <tr><td colSpan={5}>No logs found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                <button
                  className="btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={loading || page <= 1}
                >
                  Previous
                </button>

                <div style={{ fontSize: 13, color: '#374151' }}>
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
        </main>
      </div>
    </div>
  );
}
