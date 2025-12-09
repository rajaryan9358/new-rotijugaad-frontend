import React, { useEffect, useState, useMemo } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import usersApi from '../../api/usersApi';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { useNavigate, useLocation } from 'react-router-dom';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const normalizeUserTypeParam = (value) => {
  const normalized = (value || '').trim().toLowerCase();
  return normalized === 'employee' || normalized === 'employer' ? normalized : '';
};

export default function PendingDeletionUsers() {
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedUserTypeFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return normalizeUserTypeParam(params.get('user_type'));
  }, [location.search]);

  const [sidebarOpen, setSidebarOpen] = useState(getSidebarState());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState(normalizedUserTypeFromQuery);
  const [newUserFilter, setNewUserFilter] = useState('');
  const [draftFilters, setDraftFilters] = useState({ searchTerm: '', userTypeFilter, newUserFilter: '' });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const querySignature = useMemo(
    () => JSON.stringify({ user_type: normalizedUserTypeFromQuery }),
    [normalizedUserTypeFromQuery]
  );
  const [appliedQuerySignature, setAppliedQuerySignature] = useState('');
  const canView = hasPermission(PERMISSIONS.PENDING_DELETION_USERS_VIEW);
  const canDelete = hasPermission(PERMISSIONS.PENDING_DELETION_USERS_DELETE);
  const canExport = hasPermission(PERMISSIONS.PENDING_DELETION_USERS_EXPORT);

  const chipBaseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#e0edff',
    color: '#1d4ed8',
    padding: '6px 10px',
    fontSize: '12px',
    borderRadius: '20px',
    border: '1px solid #bfdbfe',
    boxShadow: '0 1px 2px rgba(37,99,235,0.15)',
    fontWeight: 600
  };
  const chipCloseStyle = {
    background: 'transparent',
    border: 'none',
    color: '#1d4ed8',
    cursor: 'pointer',
    width: '18px',
    height: '18px',
    lineHeight: '16px',
    borderRadius: '50%',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  const NEW_WINDOW_MS = 48 * 60 * 60 * 1000;
  const isNewUser = (createdAt) => {
    if (!createdAt) return false;
    const ts = new Date(createdAt).getTime();
    return Number.isFinite(ts) && (Date.now() - ts) <= NEW_WINDOW_MS;
  };
  const getUserLifeDays = (createdAt) => {
    if (!createdAt) return '-';
    const ts = new Date(createdAt).getTime();
    if (Number.isNaN(ts)) return '-';
    const diff = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : '-';
  };

  const buildQueryParams = React.useCallback(() => {
    const params = {};
    if (userTypeFilter) params.user_type = userTypeFilter;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (newUserFilter) params.newFilter = newUserFilter;
    return params;
  }, [userTypeFilter, searchTerm, newUserFilter]);

  const fetchRows = React.useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.getPendingDeletionUsers(buildQueryParams());
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending deletions');
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, canView]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  const handlePurge = async (userId) => {
    if (!window.confirm('Accept deletion and delete related data?')) return;
    setActionId(userId);
    try {
      await usersApi.purgeUserData(userId);
      await fetchRows();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete data');
    } finally {
      setActionId(null);
    }
  };

  const handleCancelDeletionRequest = async (userId) => {
    if (!window.confirm('Revoke this deletion request?')) return;
    setCancelId(userId);
    try {
      await usersApi.updateUser(userId, {
        deletion_pending: 0,
        delete_pending: 0,
        deletion_requested_at: null,
        delete_requested_at: null
      });
      await fetchRows();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove deletion request');
    } finally {
      setCancelId(null);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    try { return new Date(value).toLocaleString(); } catch { return value; }
  };

  const formatExportDateTime = (value) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`.trim();
    } catch {
      return '';
    }
  };

  const linkButtonStyle = {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: 'inherit'
  };

  const handleEmployeeNameClick = (employeeId) => navigate(`/employees/${employeeId}`);
  const handleEmployerNameClick = (employerId) => navigate(`/employers/${employerId}`);
  const renderNameCell = (row) => {
    const userType = (row.user_type || '').toLowerCase();
    const employeeProfileId = userType === 'employee' ? (row.employee_id || row.entity?.id) : null;
    const employerProfileId = userType === 'employer' ? (row.employer_id || row.entity?.id) : null;
    const base = employeeProfileId ? (
      <button
        type="button"
        style={linkButtonStyle}
        onClick={() => handleEmployeeNameClick(employeeProfileId)}
      >
        {row.name || `Employee #${employeeProfileId}`}
      </button>
    ) : employerProfileId ? (
      <button
        type="button"
        style={linkButtonStyle}
        onClick={() => handleEmployerNameClick(employerProfileId)}
      >
        {row.name || `Employer #${employerProfileId}`}
      </button>
    ) : (row.name || '-');
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:'6px' }}>
        {base}
        {isNewUser(row.created_at) && (
          <span style={{ padding:'2px 8px', borderRadius:'999px', fontSize:'10px', fontWeight:700, textTransform:'uppercase', background:'#22c55e', color:'#fff' }}>
            New
          </span>
        )}
      </span>
    );
  };

  useEffect(() => {
    if (appliedQuerySignature === querySignature) return;
    setUserTypeFilter(normalizedUserTypeFromQuery);
    setDraftFilters((prev) => ({ ...prev, userTypeFilter: normalizedUserTypeFromQuery }));
    setAppliedQuerySignature(querySignature);
  }, [querySignature, normalizedUserTypeFromQuery, appliedQuerySignature]);

  const toggleFilterPanel = () => {
    if (showFilterPanel) return setShowFilterPanel(false);
    setDraftFilters({ searchTerm, userTypeFilter, newUserFilter });
    setShowFilterPanel(true);
  };
  const applyFilters = () => {
    setSearchTerm(draftFilters.searchTerm);
    setUserTypeFilter(draftFilters.userTypeFilter);
    setNewUserFilter(draftFilters.newUserFilter);
    setShowFilterPanel(false);
  };
  const clearFilters = () => {
    setSearchTerm('');
    setUserTypeFilter('');
    setNewUserFilter('');
    setDraftFilters({ searchTerm: '', userTypeFilter: '', newUserFilter: '' });
    setShowFilterPanel(false);
  };
  const removeChip = (key) => {
    if (key === 'search') setSearchTerm('');
    if (key === 'user_type') setUserTypeFilter('');
    if (key === 'new_user') setNewUserFilter('');
  };

  const buildExportFilename = () => {
    const pad = (val) => String(val).padStart(2, '0');
    const now = new Date();
    const dd = pad(now.getDate());
    const MM = pad(now.getMonth() + 1);
    const yyyy = now.getFullYear();
    let hours = now.getHours();
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hh = pad(hours);
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `pending_deletions_${dd}-${MM}-${yyyy}_${hh}_${mm}_${ss}_${meridiem}_.csv`;
  };

  const exportToCSV = async () => {
    try {
      const baseParams = { ...buildQueryParams(), page: 1, limit: 200 };
      const exportRows = [];
      let page = 1;
      let totalRecords = null;
      let totalPages = null;

      while (true) {
        const res = await usersApi.getPendingDeletionUsers({ ...baseParams, page });
        const batch = Array.isArray(res.data?.data) ? res.data.data : [];
        exportRows.push(...batch);

        const meta = res.data?.meta || {};
        if (typeof meta.total === 'number') totalRecords = meta.total;
        if (typeof meta.totalPages === 'number') totalPages = meta.totalPages;
        const serverLimit = meta.limit || baseParams.limit || batch.length || 1;

        const shouldContinue = (() => {
          if (totalRecords !== null) return exportRows.length < totalRecords;
          if (totalPages !== null) return page < totalPages;
          return batch.length === serverLimit && Boolean(baseParams.limit);
        })();

        if (!shouldContinue) break;
        page += 1;
      }

      if (!exportRows.length) {
        setError('No pending deletions found for current filters.');
        return;
      }

      const headers = ['ID', 'Name', 'Mobile', 'Type', 'Entity', 'Requested At'];
      const escape = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const rows = exportRows.map((row) => [
        row.id,
        row.name || '',
        row.mobile || '',
        row.user_type || '',
        row.entity?.name || '',
        formatExportDateTime(row.deletion_requested_at || row.delete_requested_at)
      ]);
      const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildExportFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export pending deletions');
    }
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={toggleSidebar} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            <div className="list-header">
              <h1>Pending user deletions</h1>
            </div>

            <div className="search-filter-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto' }}>
                <label htmlFor="pending-users-search" style={{ fontSize: '12px', fontWeight: 600 }}>Search:</label>
                <input
                  id="pending-users-search"
                  type="text"
                  className="state-filter-select"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="id, name, mobile..."
                  style={{ maxWidth: '260px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button className="btn-secondary btn-small" onClick={toggleFilterPanel}>
                  Filters
                </button>
                {canExport && (
                  <button className="btn-secondary btn-small" onClick={exportToCSV}>
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            <div
              className="applied-filters"
              style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 12px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}
            >
              {searchTerm && (
                <span style={chipBaseStyle}>
                  Search: {searchTerm}
                  <button style={chipCloseStyle} onClick={() => removeChip('search')}>×</button>
                </span>
              )}
              {userTypeFilter && (
                <span style={chipBaseStyle}>
                  Type: {userTypeFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('user_type')}>×</button>
                </span>
              )}
              {newUserFilter && (
                <span style={chipBaseStyle}>
                  Recency: New
                  <button style={chipCloseStyle} onClick={() => removeChip('new_user')}>×</button>
                </span>
              )}
              {!searchTerm && !userTypeFilter && !newUserFilter && (
                <span style={{ fontSize: '12px', color: '#64748b' }}>No filters applied</span>
              )}
            </div>

            {showFilterPanel && (
              <div className="filter-panel" style={{ marginBottom: '16px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px', background: '#f8fafc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="filter-label">User Type</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.userTypeFilter}
                      onChange={(e) => setDraftFilters(f => ({ ...f, userTypeFilter: e.target.value }))}
                    >
                      <option value="">All</option>
                      <option value="employee">Employee</option>
                      <option value="employer">Employer</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="filter-label">User Recency</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.newUserFilter}
                      onChange={(e) => setDraftFilters(f => ({ ...f, newUserFilter: e.target.value }))}
                    >
                      <option value="">All</option>
                      <option value="new">New</option>
                    </select>
                  </div>
                </div>
                <div className="filter-actions" style={{ marginTop: '18px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button className="btn-primary btn-small" onClick={applyFilters}>Apply</button>
                  <button className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                  <button className="btn-secondary btn-small" onClick={() => setShowFilterPanel(false)}>Close</button>
                </div>
              </div>
            )}

            {error && (
              <div className="inline-message error">
                {error}
                <button className="msg-close" onClick={() => setError(null)}>✕</button>
              </div>
            )}

            {loading ? (
              <div className="inline-message">Loading...</div>
            ) : !canView ? (
              <div className="inline-message error">You do not have permission to view pending deletions.</div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Mobile</th>
                      <th>Type</th>
                      <th>Entity</th>
                      <th>Requested at</th>
                      <th>Last seen</th>
                      <th>User life (days)</th>
                      <th style={{ width: 160 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map(row => (
                        <tr key={row.id}>
                          <td>{renderNameCell(row)}</td>
                          <td>{row.mobile || '-'}</td>
                          <td style={{ textTransform: 'capitalize' }}>{row.user_type || '-'}</td>
                          <td>{row.entity?.name || '-'}</td>
                          <td>{formatDateTime(row.deletion_requested_at || row.delete_requested_at)}</td>
                          <td>{formatDateTime(row.last_active_at)}</td>
                          <td>{getUserLifeDays(row.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
                              <button
                                className="btn-small"
                                style={{ background: '#f59e0b', color: '#fff', border: 'none' }}
                                onClick={() => handleCancelDeletionRequest(row.id)}
                                disabled={cancelId === row.id}
                              >
                                {cancelId === row.id ? 'Revoking...' : 'Revoke'}
                              </button>
                              <button
                                className="btn-small"
                                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                                onClick={() => handlePurge(row.id)}
                                disabled={actionId === row.id || !canDelete}
                              >
                                {actionId === row.id ? 'Accepting...' : 'Accept'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="no-data">
                          No pending requests
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
