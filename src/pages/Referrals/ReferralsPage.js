import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import referralsApi from '../../api/referralsApi';
import logsApi from '../../api/logsApi';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import '../Masters/MasterPage.css';

const headerCellStyle = { cursor: 'pointer' };
const linkButtonStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: '#1d4ed8',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontSize: 'inherit',
  fontFamily: 'inherit'
};
const getDetailRoute = (entityType, entityId) => {
  if (!entityId) return null;
  const normalized = (entityType || '').toString().toLowerCase();
  if (normalized.includes('employer')) return `/employers/${entityId}`;
  return `/employees/${entityId}`;
};

export default function ReferralsPage({ title, userType }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(getSidebarState());
  const [referrals, setReferrals] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const canView = hasPermission(PERMISSIONS.REFERRALS_VIEW);
  const canExport = hasPermission(PERMISSIONS.REFERRALS_EXPORT);
  const showAdsColumn = userType !== 'employee';

  const logsCategory = userType === 'employer' ? 'employer referrals' : 'employee referrals';
  const logsTitle = userType === 'employer' ? 'Employer Referrals Logs' : 'Employee Referrals Logs';
  const redirectTo = userType === 'employer' ? '/referrals/employers' : '/referrals/employees';

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        user_type: userType,
        page,
        pageSize,
        sortField,
        sortDir,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await referralsApi.list(params);
      const payload = res.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const metaInfo = payload.meta || {};
      setReferrals(rows);
      setMeta({
        page: metaInfo.page || page,
        pageSize: metaInfo.pageSize || pageSize,
        total: metaInfo.total ?? rows.length,
        totalPages: metaInfo.totalPages || 1,
      });
      if (metaInfo.page && metaInfo.page !== page) {
        setPage(metaInfo.page);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load referrals' });
    } finally {
      setLoading(false);
    }
  }, [userType, page, pageSize, sortField, sortDir, searchTerm]);

  useEffect(() => {
    if (!canView) return;
    setSidebarOpen(getSidebarState());
    fetchReferrals();
  }, [canView, fetchReferrals]);

  const handleMenuClick = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  const renderNameCell = (name, route) => (
    route ? (
      <button type="button" style={linkButtonStyle} onClick={(event) => { event.stopPropagation(); navigate(route); }}>
        {name || '-'}
      </button>
    ) : (
      <span>{name || '-'}</span>
    )
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortIndicator = (field) => (sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
  const formatCsvDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`.trim();
  };

  const handleExportCsv = async () => {
    if (!canExport) {
      setMessage({ type: 'error', text: 'You do not have permission to export referrals' });
      return;
    }
    if (exporting) return;
    setExporting(true);
    try {
      const params = {
        user_type: userType,
        sortField,
        sortDir,
        export: true,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await referralsApi.list(params);
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      if (!rows.length) {
        setMessage({ type: 'error', text: 'No referrals to export' });
        return;
      }
      const headers = [
        'ID',
        'Referrer',
        'User',
        'Referral Code',
        'Target',
        'Contact Credit',
        'Interest Credit',
        ...(showAdsColumn ? ['Ads Credit'] : []),
        'Created At'
      ];
      const escapeCell = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const exportRows = rows.map((ref) => [
        ref.id,
        ref.referrer_name || `#${ref.referral_id || ''}`,
        ref.user_name || `#${ref.user_id || ''}`,
        ref.referral_code || '',
        ref.user_type || '',
        ref.contact_credit ?? 0,
        ref.interest_credit ?? 0,
        ...(showAdsColumn ? [ref.ads_credit ?? 0] : []),
        formatCsvDateTime(ref.created_at)
      ]);
      const csv = [headers.map(escapeCell).join(','), ...exportRows.map((row) => row.map(escapeCell).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${title.toLowerCase().replace(/\s+/g, '_') || 'referrals'}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      // audit log: export
      logsApi
        .create({
          category: logsCategory,
          type: 'export',
          redirect_to: redirectTo,
          log_text: `Exported ${logsCategory} CSV${searchTerm.trim() ? ` (search: ${searchTerm.trim()})` : ''}`,
        })
        .catch(() => {});

      setMessage({ type: 'success', text: 'Export ready' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Export failed' });
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={() => setSidebarOpen((o) => !o)} onLogout={() => { localStorage.clear(); navigate('/login'); }} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view referrals.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const fromRecord = meta.total ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const toRecord = meta.total ? Math.min(meta.page * meta.pageSize, meta.total) : 0;

  return (
    <div className="dashboard-container">
      <Header
        onMenuClick={handleMenuClick}
        onLogout={() => {
          localStorage.clear();
          navigate('/login');
        }}
      />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            <div className="list-header" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1>{title}</h1>
            </div>

            <div className="search-filter-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Search:</label>
                <input
                  type="text"
                  className="state-filter-select"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="referrer, user, or code..."
                  style={{ maxWidth: '260px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LogsAction
                  category={logsCategory}
                  title={logsTitle}
                  sizeClassName="btn-small"
                  buttonStyle={{ marginRight: 0 }}
                />
                {canExport && (
                  <button
                    className="btn-secondary btn-small"
                    style={{ marginRight: 0 }}
                    onClick={handleExportCsv}
                    disabled={exporting || !meta.total}
                  >
                    {exporting ? 'Exporting...' : 'Export CSV'}
                  </button>
                )}
              </div>
            </div>

            <div className="data-card" style={{ padding: '0' }}>
              <div className="table-container" style={{ padding: '0', overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={headerCellStyle} onClick={() => handleSort('id')}>ID{sortIndicator('id')}</th>
                      <th style={headerCellStyle} onClick={() => handleSort('referrer')}>Referrer{sortIndicator('referrer')}</th>
                      <th style={headerCellStyle} onClick={() => handleSort('user')}>User{sortIndicator('user')}</th>
                      <th style={headerCellStyle} onClick={() => handleSort('referral_code')}>Referral Code{sortIndicator('referral_code')}</th>
                      <th style={headerCellStyle}>Target</th>
                      <th style={headerCellStyle}>Contact Credit</th>
                      <th style={headerCellStyle}>Interest Credit</th>
                      {showAdsColumn && <th style={headerCellStyle}>Ads Credit</th>}
                      <th style={headerCellStyle} onClick={() => handleSort('created_at')}>Created{sortIndicator('created_at')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={showAdsColumn ? 9 : 8} className="no-data">Loading...</td></tr>
                    ) : referrals.length ? (
                      referrals.map((referral) => (
                        <tr key={referral.id}>
                          <td>{referral.id}</td>
                          <td>{renderNameCell(referral.referrer_name || `#${referral.referral_id || '-'}`, getDetailRoute(referral.referrer_entity_type || referral.referrer_user_type, referral.referrer_entity_id || referral.referral_id))}</td>
                          <td>{renderNameCell(referral.user_name || `#${referral.user_id || '-'}`, getDetailRoute(referral.user_entity_type || referral.user_user_type, referral.user_entity_id || referral.user_id))}</td>
                          <td>{referral.referral_code || '-'}</td>
                          <td>{referral.user_type || '-'}</td>
                          <td>{referral.contact_credit ?? 0}</td>
                          <td>{referral.interest_credit ?? 0}</td>
                          {showAdsColumn && <td>{referral.ads_credit ?? 0}</td>}
                          <td>{formatDateTime(referral.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={showAdsColumn ? 9 : 8} className="no-data">No referrals found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className="table-footer"
              style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ fontSize: '12px', color: '#475569' }}>
                Showing {fromRecord}-{toRecord} of {meta.total}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: '#475569' }}>Rows:</label>
                <select
                  className="state-filter-select"
                  value={pageSize}
                  onChange={(e) => {
                    const nextSize = parseInt(e.target.value, 10) || 10;
                    setPageSize(nextSize);
                    setPage(1);
                  }}
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn-secondary btn-small"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span style={{ fontSize: '12px', color: '#475569' }}>
                  Page {meta.page} of {meta.totalPages || 1}
                </span>
                <button
                  className="btn-secondary btn-small"
                  disabled={!meta.total || meta.page >= (meta.totalPages || 1)}
                  onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
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
