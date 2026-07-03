import React, { useEffect, useState, useMemo } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import usersApi from '../../api/usersApi';
import logsApi from '../../api/logsApi';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { useLocation } from 'react-router-dom';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import { formatMobile } from '../../utils/formatters';
import { useResizableColumns } from '../../hooks/useResizableColumns';

const normalizeUserTypeParam = (value) => {
  const normalized = (value || '').trim().toLowerCase();
  return normalized === 'employee' || normalized === 'employer' ? normalized : '';
};

const DEFAULTS = {
  id: 60, name: 130, mobile: 110, referred_by: 120, deleted_by: 120, user_type: 90,
  deleted_at: 130, last_seen: 150, user_life: 90, org_type: 110, org_name: 140,
  business_category: 140, email: 160, created_at: 110
};

export default function DeletedUsers() {
  const { colWidths, rHandle } = useResizableColumns('deleted-users-col-widths', DEFAULTS);
  const location = useLocation();
  const normalizedUserTypeFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return normalizeUserTypeParam(params.get('user_type'));
  }, [location.search]);

  const [sidebarOpen, setSidebarOpen] = useState(getSidebarState());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [userTypeFilter, setUserTypeFilter] = useState(normalizedUserTypeFromQuery);
  const [newUserFilter, setNewUserFilter] = useState('');
  const [createdFromFilter, setCreatedFromFilter] = useState('');
  const [createdToFilter, setCreatedToFilter] = useState('');
  const [draftFilters, setDraftFilters] = useState({ searchTerm: '', userTypeFilter, newUserFilter: '', createdFromFilter: '', createdToFilter: '' });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const querySignature = useMemo(
    () => JSON.stringify({ user_type: normalizedUserTypeFromQuery }),
    [normalizedUserTypeFromQuery]
  );
  const [appliedQuerySignature, setAppliedQuerySignature] = useState('');
  const canView = hasPermission(PERMISSIONS.DELETED_USERS_VIEW);
  const canExport = hasPermission(PERMISSIONS.DELETED_USERS_EXPORT);

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

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


  const buildQueryParams = React.useCallback(() => {
    const params = { page: currentPage, limit: pageSize };
    if (userTypeFilter) params.user_type = userTypeFilter;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (newUserFilter) params.newFilter = newUserFilter;
    if (createdFromFilter) params.created_from = createdFromFilter;
    if (createdToFilter) params.created_to = createdToFilter;
    return params;
  }, [currentPage, pageSize, userTypeFilter, searchTerm, newUserFilter, createdFromFilter, createdToFilter]);

  const fetchRows = React.useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.getDeletedUsers(buildQueryParams());
      setRows(res.data?.data || []);
      const meta = res.data?.meta || {};
      if (typeof meta.total === 'number') setTotalCount(meta.total);
      if (typeof meta.totalPages === 'number') setTotalPages(meta.totalPages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deleted users');
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, canView]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  useEffect(() => {
    if (appliedQuerySignature === querySignature) return;
    setUserTypeFilter(normalizedUserTypeFromQuery);
    setDraftFilters((prev) => ({ ...prev, userTypeFilter: normalizedUserTypeFromQuery }));
    setAppliedQuerySignature(querySignature);
  }, [querySignature, normalizedUserTypeFromQuery, appliedQuerySignature]);

  const toggleFilterPanel = () => {
    if (showFilterPanel) return setShowFilterPanel(false);
    setDraftFilters({ searchTerm, userTypeFilter, newUserFilter, createdFromFilter, createdToFilter });
    setShowFilterPanel(true);
  };
  const applyFilters = () => {
    setSearchTerm(draftFilters.searchTerm);
    setUserTypeFilter(draftFilters.userTypeFilter);
    setNewUserFilter(draftFilters.newUserFilter);
    setCreatedFromFilter(draftFilters.createdFromFilter);
    setCreatedToFilter(draftFilters.createdToFilter);
    setCurrentPage(1);
    setSelectedIds(new Set());
    setShowFilterPanel(false);
  };
  const clearFilters = () => {
    setSearchTerm('');
    setUserTypeFilter('');
    setNewUserFilter('');
    setCreatedFromFilter('');
    setCreatedToFilter('');
    setCurrentPage(1);
    setSelectedIds(new Set());
    setDraftFilters({ searchTerm: '', userTypeFilter: '', newUserFilter: '', createdFromFilter: '', createdToFilter: '' });
    setShowFilterPanel(false);
  };
  const removeChip = (key) => {
    if (key === 'search') setSearchTerm('');
    if (key === 'user_type') setUserTypeFilter('');
    if (key === 'new_user') setNewUserFilter('');
    if (key === 'created_from') setCreatedFromFilter('');
    if (key === 'created_to') setCreatedToFilter('');
    setCurrentPage(1);
    setSelectedIds(new Set());
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
    return `deleted_users_${dd}-${MM}-${yyyy}_${hh}_${mm}_${ss}_${meridiem}_.csv`;
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

  const exportToCSV = async () => {
    try {
      const baseParams = { ...buildQueryParams(), page: 1, limit: 200 };
      const exportRows = [];
      let page = 1;
      let totalRecords = null;
      let totalPages = null;

      while (true) {
        const res = await usersApi.getDeletedUsers({ ...baseParams, page });
        const batch = Array.isArray(res.data?.data) ? res.data.data : [];
        exportRows.push(...batch);

        const meta = res.data?.meta || {};
        if (typeof meta.total === 'number') totalRecords = meta.total;
        if (typeof meta.totalPages === 'number') totalPages = meta.totalPages;
        const serverLimit = meta.limit || baseParams.limit || batch.length || 1;

        let shouldContinue = false;
        if (totalRecords !== null) {
          shouldContinue = exportRows.length < totalRecords;
        } else if (totalPages !== null) {
          shouldContinue = page < totalPages;
        } else {
          shouldContinue = batch.length === serverLimit && Boolean(baseParams.limit);
        }

        if (!shouldContinue) break;
        page += 1;
      }

      if (!exportRows.length) {
        setError('No deleted users found for current filters.');
        return;
      }

      const headers = ['ID','Name','Mobile','Referred By','Deleted By','User Type','Deleted At','Last Seen','User Life','Organization Type','Organization Name','Business Category','Email','Created At'];
      const escape = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const rows = exportRows.map((row) => [
        row.id,
        row.name || '',
        formatMobile(row.mobile),
        row.referred_by || '',
        (row.DeletedBy?.name || row.deleted_by_name || (row.deleted_by ?? '')),
        row.user_type || '',
        formatExportDateTime(row.deleted_at),
        formatExportDateTime(row.last_seen),
        row.user_life ?? '',
        row.organization_type || '',
        row.organization_name || '',
        row.business_category || '',
        row.email || '',
        formatExportDateTime(row.created_at)
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

      try {
        await logsApi.create({
          category: 'deleted users',
          type: 'export',
          log_text: `Exported deleted users (${exportRows.length})`,
          redirect_to: '/users/deleted'
        });
      } catch (e) {
        // ignore logging failures
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export deleted users');
    }
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={toggleSidebar} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content deleted-users-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            <div className="list-header">
              <h1>Deleted users</h1>
            </div>

            <div className="search-filter-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto' }}>
                <label htmlFor="deleted-users-search" style={{ fontSize: '12px', fontWeight: 600 }}>Search:</label>
                <input
                  id="deleted-users-search"
                  type="text"
                  className="state-filter-select"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setSelectedIds(new Set()); }}
                  placeholder="id, name, mobile..."
                  style={{ maxWidth: '260px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <LogsAction
                  category="deleted users"
                  title="Deleted Users Logs"
                  buttonLabel="Logs"
                  buttonClassName="btn-small"
                />
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
              {createdFromFilter && (
                <span style={chipBaseStyle}>
                  Created from: {createdFromFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('created_from')}>×</button>
                </span>
              )}
              {createdToFilter && (
                <span style={chipBaseStyle}>
                  Created to: {createdToFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('created_to')}>×</button>
                </span>
              )}
              {!searchTerm && !userTypeFilter && !newUserFilter && !createdFromFilter && !createdToFilter && (
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="filter-label">Created From</label>
                    <input
                      type="date"
                      className="state-filter-select"
                      value={draftFilters.createdFromFilter}
                      onChange={(e) => setDraftFilters(f => ({ ...f, createdFromFilter: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="filter-label">Created To</label>
                    <input
                      type="date"
                      className="state-filter-select"
                      value={draftFilters.createdToFilter}
                      onChange={(e) => setDraftFilters(f => ({ ...f, createdToFilter: e.target.value }))}
                    />
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
              <div className="inline-message error">You do not have permission to view deleted users.</div>
            ) : (
              <div className="table-container">
                <table className="data-table col-resizable" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 36, padding: '0 8px' }}>
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && rows.every(r => selectedIds.has(r.id))}
                          onChange={e => {
                            if (e.target.checked) setSelectedIds(new Set(rows.map(r => r.id)));
                            else setSelectedIds(new Set());
                          }}
                        />
                      </th>
                      <th style={{ width: colWidths.id }}>ID{rHandle('id')}</th>
                      <th style={{ width: colWidths.name }}>Name{rHandle('name')}</th>
                      <th style={{ width: colWidths.mobile }}>Mobile{rHandle('mobile')}</th>
                      <th style={{ width: colWidths.referred_by }}>Referred by{rHandle('referred_by')}</th>
                      <th style={{ width: colWidths.deleted_by }}>Deleted by{rHandle('deleted_by')}</th>
                      <th style={{ width: colWidths.user_type }}>User type{rHandle('user_type')}</th>
                      <th style={{ width: colWidths.deleted_at }}>Deleted at{rHandle('deleted_at')}</th>
                      <th style={{ width: colWidths.last_seen }}>Last seen{rHandle('last_seen')}</th>
                      <th style={{ width: colWidths.user_life }}>User life{rHandle('user_life')}</th>
                      <th style={{ width: colWidths.org_type }}>Organization type{rHandle('org_type')}</th>
                      <th style={{ width: colWidths.org_name }}>Organization name{rHandle('org_name')}</th>
                      <th style={{ width: colWidths.business_category }}>Business category{rHandle('business_category')}</th>
                      <th style={{ width: colWidths.email }}>Email{rHandle('email')}</th>
                      <th style={{ width: colWidths.created_at }}>Created at{rHandle('created_at')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map(row => (
                        <tr key={row.id}>
                          <td style={{ padding: '0 8px' }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(row.id)}
                              onChange={e => {
                                setSelectedIds(prev => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(row.id); else next.delete(row.id);
                                  return next;
                                });
                              }}
                              onClick={e => e.stopPropagation()}
                            />
                          </td>
                          <td>{row.id}</td>
                          <td>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:'6px' }}>
                              {row.name || '-'}
                              {isNewUser(row.created_at) && (
                                <span style={{ padding:'2px 8px', borderRadius:'999px', fontSize:'10px', fontWeight:700, textTransform:'uppercase', background:'#22c55e', color:'#fff' }}>
                                  New
                                </span>
                              )}
                            </span>
                          </td>
                          <td>{formatMobile(row.mobile)}</td>
                          <td>{row.referred_by || '-'}</td>
                          <td>{row.DeletedBy?.name || row.deleted_by_name || (row.deleted_by ?? '-') }</td>
                          <td style={{ textTransform: 'capitalize' }}>{row.user_type || '-'}</td>
                          <td>{formatDateTime(row.deleted_at)}</td>
                          <td>{formatDateTime(row.last_seen)}</td>
                          <td>{row.user_life ?? '-'}</td>
                          <td>{row.organization_type || '-'}</td>
                          <td>{row.organization_name || '-'}</td>
                          <td>{row.business_category || '-'}</td>
                          <td>{row.email || '-'}</td>
                          <td>{formatDateTime(row.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="15" className="no-data">No deleted users</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && canView && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '10px 4px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Showing {rows.length ? ((currentPage - 1) * pageSize + 1) : 0}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn-secondary btn-small"
                    disabled={currentPage <= 1}
                    onClick={() => { setCurrentPage(1); setSelectedIds(new Set()); }}
                  >«</button>
                  <button
                    className="btn-secondary btn-small"
                    disabled={currentPage <= 1}
                    onClick={() => { setCurrentPage(p => p - 1); setSelectedIds(new Set()); }}
                  >‹ Prev</button>
                  <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '80px', textAlign: 'center' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="btn-secondary btn-small"
                    disabled={currentPage >= totalPages}
                    onClick={() => { setCurrentPage(p => p + 1); setSelectedIds(new Set()); }}
                  >Next ›</button>
                  <button
                    className="btn-secondary btn-small"
                    disabled={currentPage >= totalPages}
                    onClick={() => { setCurrentPage(totalPages); setSelectedIds(new Set()); }}
                  >»</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

