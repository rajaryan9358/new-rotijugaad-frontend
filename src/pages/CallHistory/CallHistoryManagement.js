import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import callHistoryApi from '../../api/callHistoryApi';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import LogsAction from '../../components/LogsAction';
import logsApi from '../../api/logsApi';

export default function CallHistoryManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [fatalError, setFatalError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // NEW: wait until URL params are applied before first load
  const [urlFiltersReady, setUrlFiltersReady] = useState(false);

  // Global filter (mandatory) to control dataset + columns
  const [globalUserType, setGlobalUserType] = useState('employee');

  const [callExperienceFilter, setCallExperienceFilter] = useState('');
  const [readStatusFilter, setReadStatusFilter] = useState('');
  const [createdFromFilter, setCreatedFromFilter] = useState(''); // YYYY-MM-DD
  const [createdToFilter, setCreatedToFilter] = useState(''); // YYYY-MM-DD

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    callExperienceFilter: '',
    readStatusFilter: '',
    createdFromFilter: '',
    createdToFilter: ''
  });
  const [experienceCache, setExperienceCache] = useState({});
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

  const canViewCallHistory = hasPermission(PERMISSIONS.CALL_HISTORY_VIEW);
  const canManageCallHistory = hasPermission(PERMISSIONS.CALL_HISTORY_MANAGE);
  const canDeleteCallHistory = hasPermission(PERMISSIONS.CALL_HISTORY_DELETE);
  const canExportCallHistory = hasPermission(PERMISSIONS.CALL_HISTORY_EXPORT);

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

  const buildQueryParams = React.useCallback(() => ({
    page: currentPage,
    limit: pageSize,
    search: searchTerm.trim() || undefined,
    sortField,
    sortDir,
    user_type: globalUserType, // global filter drives dataset
    call_experience_id: callExperienceFilter || undefined,
    read_status: readStatusFilter || undefined,
    created_from: createdFromFilter || undefined,
    created_to: createdToFilter || undefined
  }), [
    currentPage, pageSize, searchTerm, sortField, sortDir, globalUserType,
    callExperienceFilter, readStatusFilter, createdFromFilter, createdToFilter
  ]);

  const load = React.useCallback(async () => {
    if (!canViewCallHistory) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await callHistoryApi.getCallHistory(buildQueryParams());
      const payload = res.data || {};
      setRows(Array.isArray(payload.data) ? payload.data : []);
      const meta = payload.meta || {};
      setTotalCount(meta.total ?? 0);
      setTotalPages(meta.totalPages ?? 1);
    } catch (e) {
      console.error('[call-history] fetch error', e);
      setMessage({ type: 'error', text: 'Failed to load call history' });
    } finally {
      setLoading(false);
    }
  }, [canViewCallHistory, buildQueryParams]);

  const fetchExperiences = React.useCallback(async (targetType) => {
    if (!targetType || experienceCache[targetType]) return;
    try {
      const res = await callHistoryApi.getCallExperiences(targetType);
      setExperienceCache(prev => ({ ...prev, [targetType]: res.data?.data || [] }));
    } catch {
      setExperienceCache(prev => ({ ...prev, [targetType]: [] }));
    }
  }, [experienceCache]);

  useEffect(() => { if (canViewCallHistory && urlFiltersReady) load(); }, [canViewCallHistory, urlFiltersReady, load]);
  useEffect(() => { fetchExperiences(globalUserType); }, [globalUserType, fetchExperiences]);

  // When global user type changes, reset dependent filters + pagination
  useEffect(() => {
    // IMPORTANT: don't clobber URL-initialized state during first hydration
    if (!urlFiltersReady) return;

    setCallExperienceFilter('');
    setDraftFilters(f => ({ ...f, callExperienceFilter: '' }));
    setCurrentPage(1);
  }, [globalUserType, urlFiltersReady]);

  const syncUrlWithFilters = React.useCallback((overrides = {}) => {
    const next = {
      // NOTE: user_type is intentionally NOT persisted in URL
      search: overrides.search ?? searchTerm,
      experience: overrides.experience ?? callExperienceFilter,
      readStatus: overrides.readStatus ?? readStatusFilter,
      createdFrom: overrides.createdFrom ?? createdFromFilter,
      createdTo: overrides.createdTo ?? createdToFilter
    };

    const qs = new URLSearchParams();

    // only include applied filters (but never user_type)
    if (next.search?.trim()) qs.set('search', next.search.trim());
    if (next.experience) qs.set('call_experience_id', String(next.experience));
    if (next.readStatus) qs.set('read_status', String(next.readStatus));
    if (next.createdFrom) qs.set('created_date_start', String(next.createdFrom).slice(0, 10));
    if (next.createdTo) qs.set('created_date_end', String(next.createdTo).slice(0, 10));

    const nextSearch = qs.toString() ? `?${qs.toString()}` : '';
    if ((location.search || '') === nextSearch) return;

    // SPA navigation; no page refresh
    navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
  }, [
    navigate,
    location.pathname,
    location.search,
    searchTerm,
    callExperienceFilter,
    readStatusFilter,
    createdFromFilter,
    createdToFilter
  ]);

  // Apply URL query params (created_from/created_to or created_date_start/created_date_end)
  useEffect(() => {
    const qs = new URLSearchParams(location.search || '');
    const createdFromRaw = qs.get('created_from') ?? qs.get('created_date_start') ?? '';
    const createdToRaw = qs.get('created_to') ?? qs.get('created_date_end') ?? '';
    const userType = (qs.get('user_type') || '').toLowerCase();

    let touched = false;

    // Apply user_type if present (but do NOT keep it in URL)
    if (userType === 'employee' || userType === 'employer') {
      setGlobalUserType(userType);
      touched = true;
    }

    if (createdFromRaw !== null && createdFromRaw !== '') {
      setCreatedFromFilter(String(createdFromRaw).slice(0, 10));
      setDraftFilters(f => ({ ...f, createdFromFilter: String(createdFromRaw).slice(0, 10) }));
      touched = true;
    } else if (qs.has('created_from') || qs.has('created_date_start')) {
      setCreatedFromFilter('');
      setDraftFilters(f => ({ ...f, createdFromFilter: '' }));
      touched = true;
    }

    if (createdToRaw !== null && createdToRaw !== '') {
      setCreatedToFilter(String(createdToRaw).slice(0, 10));
      setDraftFilters(f => ({ ...f, createdToFilter: String(createdToRaw).slice(0, 10) }));
      touched = true;
    } else if (qs.has('created_to') || qs.has('created_date_end')) {
      setCreatedToFilter('');
      setDraftFilters(f => ({ ...f, createdToFilter: '' }));
      touched = true;
    }

    const urlSearch = (qs.get('search') || '').trim();
    const urlReadStatus = (qs.get('read_status') || '').toLowerCase();
    const urlCallExp = qs.get('call_experience_id') || '';

    if (urlSearch) {
      setSearchTerm(urlSearch);
      touched = true;
    } else if (qs.has('search')) {
      setSearchTerm('');
      touched = true;
    }

    if (urlReadStatus === 'read' || urlReadStatus === 'unread') {
      setReadStatusFilter(urlReadStatus);
      setDraftFilters(f => ({ ...f, readStatusFilter: urlReadStatus }));
      touched = true;
    } else if (qs.has('read_status')) {
      setReadStatusFilter('');
      setDraftFilters(f => ({ ...f, readStatusFilter: '' }));
      touched = true;
    }

    if (urlCallExp) {
      setCallExperienceFilter(urlCallExp);
      setDraftFilters(f => ({ ...f, callExperienceFilter: urlCallExp }));
      touched = true;
    } else if (qs.has('call_experience_id')) {
      setCallExperienceFilter('');
      setDraftFilters(f => ({ ...f, callExperienceFilter: '' }));
      touched = true;
    }

    if (touched) setCurrentPage(1);
    setUrlFiltersReady(true);

    // NEW: strip user_type from URL after applying it (no refresh)
    if (qs.has('user_type')) {
      qs.delete('user_type');
      const cleaned = qs.toString();
      const nextSearch = cleaned ? `?${cleaned}` : '';
      if (nextSearch !== (location.search || '')) {
        navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
      }
    }
  }, [location.search, location.pathname, navigate]);

  const experiencesForApplied = experienceCache[globalUserType] || [];
  const experiencesForDraft = experienceCache[globalUserType] || [];
  const activeFilterCount = [
    searchTerm.trim(),
    callExperienceFilter,
    readStatusFilter,
    createdFromFilter,
    createdToFilter
  ].filter(Boolean).length;
  const pageSummary = totalCount > 0
    ? {
        start: Math.min((currentPage - 1) * pageSize + 1, totalCount),
        end: Math.min((currentPage - 1) * pageSize + rows.length, totalCount)
      }
    : { start: 0, end: 0 };

  const toggleFilterPanel = () => {
    if (showFilterPanel) return setShowFilterPanel(false);
    setDraftFilters({ callExperienceFilter, readStatusFilter, createdFromFilter, createdToFilter });
    setShowFilterPanel(true);
  };

  const applyFilters = () => {
    const nextExperience = draftFilters.callExperienceFilter;
    const nextReadStatus = draftFilters.readStatusFilter;
    const nextCreatedFrom = draftFilters.createdFromFilter;
    const nextCreatedTo = draftFilters.createdToFilter;

    setCallExperienceFilter(nextExperience);
    setReadStatusFilter(nextReadStatus);
    setCreatedFromFilter(nextCreatedFrom);
    setCreatedToFilter(nextCreatedTo);
    setCurrentPage(1);
    setShowFilterPanel(false);

    syncUrlWithFilters({
      experience: nextExperience,
      readStatus: nextReadStatus,
      createdFrom: nextCreatedFrom,
      createdTo: nextCreatedTo
    });
  };

  const clearFilters = () => {
    setCallExperienceFilter('');
    setReadStatusFilter('');
    setCreatedFromFilter('');
    setCreatedToFilter('');
    setDraftFilters({ callExperienceFilter: '', readStatusFilter: '', createdFromFilter: '', createdToFilter: '' });
    setSortField('id');
    setSortDir('desc');
    setCurrentPage(1);
    setShowFilterPanel(false);

    syncUrlWithFilters({ experience: '', readStatus: '', createdFrom: '', createdTo: '' });
  };

  const removeChip = (key) => {
    const next = {
      search: searchTerm,
      experience: callExperienceFilter,
      readStatus: readStatusFilter,
      createdFrom: createdFromFilter,
      createdTo: createdToFilter
    };

    if (key === 'search') { setSearchTerm(''); next.search = ''; }
    if (key === 'experience') { setCallExperienceFilter(''); next.experience = ''; }
    if (key === 'read_status') { setReadStatusFilter(''); next.readStatus = ''; }
    if (key === 'created_from') { setCreatedFromFilter(''); next.createdFrom = ''; }
    if (key === 'created_to') { setCreatedToFilter(''); next.createdTo = ''; }

    setCurrentPage(1);
    syncUrlWithFilters(next);
  };

  const calledIdLabel = globalUserType === 'employee' ? 'Job ID' : 'Employee ID';

  const getJobProfileLabel = (jp) =>
    jp?.profile_english || jp?.profile_hindi || (jp?.id ? `#${jp.id}` : '-');

  const getBusinessCategoryLabel = (bc) =>
    bc?.category_english || bc?.category_hindi || bc?.name_english || bc?.name_hindi || bc?.name || (bc?.id ? `#${bc.id}` : '-');

  const getStateLabel = (s) =>
    s?.state_english || s?.state_hindi || (s?.id ? `#${s.id}` : '');

  const getCityLabel = (c) =>
    c?.city_english || c?.city_hindi || (c?.id ? `#${c.id}` : '');

  const openJob = (row) => {
    if (!row?.called_id) return;
    navigate(`/jobs/${row.called_id}`);
  };

  const openCalledEmployee = (row) => {
    if (!row?.called_id) return; // called_id is employee_id when globalUserType === 'employer'
    navigate(`/employees/${row.called_id}`);
  };

  const buildExportFilename = () => {
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'); // YYYY-MM-DD-HH-mm-ss
    return `call-history_${globalUserType}_${ts}.csv`;
  };

  const exportToCSV = async () => {
    if (!canExportCallHistory) {
      setMessage({ type: 'error', text: 'You do not have permission to export call history.' });
      return;
    }
    const baseParams = { ...buildQueryParams(), page: 1 };
    const exportRows = [];
    let page = 1;
    let totalPagesFromServer = null;
    let totalRecordsFromServer = null;
    const requestedLimit = baseParams.limit || pageSize || 25;

    try {
      while (true) {
        const res = await callHistoryApi.getCallHistory({ ...baseParams, page });
        const payload = res.data || {};
        const batch = Array.isArray(payload.data) ? payload.data : [];
        exportRows.push(...batch);

        const meta = payload.meta || {};
        if (typeof meta.totalPages === 'number') totalPagesFromServer = meta.totalPages;
        if (typeof meta.total === 'number') totalRecordsFromServer = meta.total;
        const serverLimit = meta.limit || requestedLimit || batch.length || 1;

        const shouldContinue = (() => {
          if (totalRecordsFromServer !== null) return exportRows.length < totalRecordsFromServer;
          if (totalPagesFromServer !== null) return page < totalPagesFromServer;
          return batch.length === serverLimit;
        })();

        if (!shouldContinue) break;
        page += 1;
      }
    } catch (e) {
      console.error('[call-history] export error', e);
      setMessage({ type: 'error', text: 'Failed to export call history' });
      return;
    }

    if (!exportRows.length) {
      setMessage({ type: 'error', text: 'No call history found for current filters.' });
      return;
    }

    const baseHeaders = ['ID','User Type','User ID', calledIdLabel,'Name','Mobile','Experience','Review','Read At','Created At'];

    const extraHeaders = globalUserType === 'employee'
      ? ['Job Profile','Organization Name','Organization Category','Organization Contact']
      : ['Employee Name','Preferred State','Preferred City','Employee Mobile','Employee Job Profile'];

    const headers = [...baseHeaders, ...extraHeaders];

    const escapeCell = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
    const rows = exportRows.map((r) => {
      const base = [
        r.id,
        r.user_type || '',
        r.user_id || '',
        r.called_id || '',
        r.user_name || r.entity?.name || r.user?.name || '',
        r.user_mobile || r.user?.mobile || '',
        r.experience
          ? (r.experience.experience_english || r.experience.experience_hindi || r.call_experience_id || '')
          : (r.call_experience_id || ''),
        r.review || '',
        formatExportDateTime(r.read_at),
        formatExportDateTime(r.created_at)
      ];

      const extra = (globalUserType === 'employee')
        ? [
            getJobProfileLabel(r.called_job_profile),
            (r.called_employer?.organization_name || r.called_employer?.name || ''),
            getBusinessCategoryLabel(r.called_business_category),
            (r.called_employer_user?.mobile || '')
          ]
        : [
            (r.called_employee?.name || r.called_employee_user?.name || ''),
            getStateLabel(r.preferred_state),
            getCityLabel(r.preferred_city),
            (r.called_employee_user?.mobile || ''),
            getJobProfileLabel(r.called_employee_job_profile)
          ];

      return [...base, ...extra];
    });
    const csv = [headers.map(escapeCell).join(','), ...rows.map((row) => row.map(escapeCell).join(','))].join('\n');
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
        category: 'call history',
        type: 'export',
        redirect_to: '/call-history',
        log_text: `Exported call history (${globalUserType})`,
      });
    } catch (e) {
      // do not break export flow if logging fails
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const headerIndicator = (field) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const markRead = async (id) => {
    if (!canManageCallHistory) {
      setMessage({ type: 'error', text: 'You do not have permission to mark as read.' });
      return;
    }
    try {
      await callHistoryApi.markRead(id);
      const timestamp = new Date().toISOString();
      setRows(r => r.map(row => row.id === id ? { ...row, read_at: timestamp } : row));
      setViewItem(prev => (prev?.id === id ? { ...prev, read_at: timestamp } : prev));
    } catch (e) {
      setMessage({ type: 'error', text: 'Mark read failed' });
    }
  };

  const deleteRow = async (id) => {
    if (!canDeleteCallHistory) {
      setMessage({ type: 'error', text: 'You do not have permission to delete call history.' });
      return;
    }
    if (!window.confirm('Delete this call history item?')) return;
    try {
      await callHistoryApi.deleteCallHistory(id);
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Delete failed' });
    }
  };

  const viewRow = async (id) => {
    try {
      const res = await callHistoryApi.getCallHistoryById(id);
      setViewItem(res.data?.data || null);
    } catch (e) {
      console.error('[call-history] viewRow error', e);
      setMessage({ type: 'error', text: 'View failed' });
    }
  };

  const closeView = () => setViewItem(null);

  const openProfile = (row) => {
    if (!row?.user_id || !row?.user_type) return;
    const path = row.user_type === 'employee'
      ? `/employees/${row.user_id}`
      : row.user_type === 'employer'
        ? `/employers/${row.user_id}`
        : null;
    if (path) navigate(path);
  };

  if (fatalError) {
    return <div style={{ padding:40 }}>Error loading Call History: {fatalError}</div>;
  }

  if (!canViewCallHistory) {
    return <div style={{ padding:40 }}>You do not have permission to view this page.</div>;
  }

  const tableColCount = 10 + (globalUserType === 'employee' ? 4 : 5);

  return (
    <div className="dashboard-container">
      <Header onMenuClick={() => setSidebarOpen(o => !o)} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            <div className="list-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <h1 style={{ margin: 0 }}>Call History</h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>View:</label>
                <select
                  className="state-filter-select"
                  value={globalUserType}
                  onChange={(e) => {
                    const nextType = e.target.value;

                    setGlobalUserType(nextType);
                    // keep URL in sync (but user_type is never written); also clear experience across types
                    syncUrlWithFilters({ experience: '' });
                  }}
                  style={{ maxWidth: '180px' }}
                >
                  <option value="employee">Employee</option>
                  <option value="employer">Employer</option>
                </select>
              </div>
            </div>

            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            <div className="search-filter-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto' }}>
                <label htmlFor="call-history-search" style={{ fontSize: '12px', fontWeight: 600 }}>Search:</label>
                <input
                  id="call-history-search"
                  type="text"
                  className="state-filter-select"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="id, name, mobile, review..."
                  style={{ maxWidth: '260px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button className="btn-secondary btn-small" onClick={toggleFilterPanel}>
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
                <LogsAction category="call history" />
                {canExportCallHistory && (
                  <button className="btn-secondary btn-small" onClick={exportToCSV}>
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            <div className="applied-filters" style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 12px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
              {searchTerm && (
                <span className="badge chip" style={chipBaseStyle}>
                  Search: {searchTerm}
                  <button style={chipCloseStyle} onClick={() => removeChip('search')}>×</button>
                </span>
              )}
              {callExperienceFilter && (
                <span className="badge chip" style={chipBaseStyle}>
                  Experience: {experiencesForApplied.find(exp => exp.id === Number(callExperienceFilter))?.experience_english || callExperienceFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('experience')}>×</button>
                </span>
              )}
              {readStatusFilter && (
                <span className="badge chip" style={chipBaseStyle}>
                  Read: {readStatusFilter === 'read' ? 'Read' : 'Unread'}
                  <button style={chipCloseStyle} onClick={() => removeChip('read_status')}>×</button>
                </span>
              )}
              {createdFromFilter && (
                <span className="badge chip" style={chipBaseStyle}>
                  Created From: {createdFromFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('created_from')}>×</button>
                </span>
              )}
              {createdToFilter && (
                <span className="badge chip" style={chipBaseStyle}>
                  Created To: {createdToFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('created_to')}>×</button>
                </span>
              )}
              {!activeFilterCount && <span style={{ fontSize: '12px', color: '#64748b' }}>No filters applied</span>}
            </div>

            {showFilterPanel && (
              <div className="filter-panel" style={{ marginBottom: '16px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px', background: '#f8fafc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="filter-label">Call Experience</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.callExperienceFilter}
                      onChange={(e) => setDraftFilters(f => ({ ...f, callExperienceFilter: e.target.value }))}
                    >
                      <option value="">All</option>
                      {experiencesForDraft.map(exp => (
                        <option key={exp.id} value={exp.id}>
                          {exp.experience_english || exp.experience_hindi || exp.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="filter-label">Read Status</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.readStatusFilter}
                      onChange={(e) => setDraftFilters(f => ({ ...f, readStatusFilter: e.target.value }))}
                    >
                      <option value="">All</option>
                      <option value="unread">Unread</option>
                      <option value="read">Read</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="filter-label">Created Date From</label>
                    <input
                      type="date"
                      className="state-filter-select"
                      value={draftFilters.createdFromFilter}
                      onChange={(e) => setDraftFilters(f => ({ ...f, createdFromFilter: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="filter-label">Created Date To</label>
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

            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: '1200px' }}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>ID{headerIndicator('id')}</th>
                    <th onClick={() => handleSort('user_type')} style={{ cursor: 'pointer' }}>User Type{headerIndicator('user_type')}</th>
                    <th>Name</th>
                    <th>Mobile</th>

                    {globalUserType === 'employee' ? (
                      <>
                        <th>Job Profile</th>
                        <th>Organization Name</th>
                        <th>Organization Category</th>
                        <th>Organization Contact</th>
                      </>
                    ) : (
                      <>
                        <th>Employee Name</th>
                        <th>Preferred State</th>
                        <th>Preferred City</th>
                        <th>Employee Mobile</th>
                        <th>Employee Job Profile</th>
                      </>
                    )}

                    <th>Experience</th>
                    <th>{calledIdLabel}</th>
                    <th>Review</th>
                    <th onClick={() => handleSort('read_at')} style={{ cursor: 'pointer' }}>Read At{headerIndicator('read_at')}</th>
                    <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Created{headerIndicator('created_at')}</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={tableColCount}>Loading...</td></tr>
                  ) : rows.length ? (
                    rows.map(r => {
                      const isRead = !!r.read_at;
                      return (
                        <tr
                          key={r.id}
                          style={{
                            background: isRead ? '#f3f4f6' : '#ffffff',
                            color: isRead ? '#94a3b8' : '#0f172a'
                          }}
                        >
                          <td>{r.id}</td>
                          <td>{r.user_type}</td>

                          <td>
                            {r.user_id && r.user_type ? (
                              <button type="button" style={linkButtonStyle} onClick={() => openProfile(r)}>
                                {r.user_name || r.entity?.name || r.user?.name || '-'}
                              </button>
                            ) : (
                              r.user_name || r.entity?.name || r.user?.name || '-'
                            )}
                          </td>

                          <td>{r.user_mobile || r.user?.mobile || '-'}</td>

                          {globalUserType === 'employee' ? (
                            <>
                              <td>
                                {r.called_id ? (
                                  <button type="button" style={linkButtonStyle} onClick={() => openJob(r)}>
                                    {getJobProfileLabel(r.called_job_profile)}
                                  </button>
                                ) : (
                                  getJobProfileLabel(r.called_job_profile)
                                )}
                              </td>
                              <td>{r.called_employer?.organization_name || r.called_employer?.name || '-'}</td>
                              <td>{getBusinessCategoryLabel(r.called_business_category)}</td>
                              <td>{r.called_employer_user?.mobile || '-'}</td>
                            </>
                          ) : (
                            <>
                              <td>
                                {r.called_id ? (
                                  <button type="button" style={linkButtonStyle} onClick={() => openCalledEmployee(r)}>
                                    {r.called_employee?.name || r.called_employee_user?.name || '-'}
                                  </button>
                                ) : (
                                  r.called_employee?.name || r.called_employee_user?.name || '-'
                                )}
                              </td>
                              <td>{getStateLabel(r.preferred_state) || '-'}</td>
                              <td>{getCityLabel(r.preferred_city) || '-'}</td>
                              <td>{r.called_employee_user?.mobile || '-'}</td>
                              <td>{getJobProfileLabel(r.called_employee_job_profile)}</td>
                            </>
                          )}

                          <td>
                            {r.experience
                              ? (r.experience.experience_english || r.experience.experience_hindi || r.call_experience_id)
                              : (r.call_experience_id || '-')}
                          </td>

                          <td>{r.called_id || '-'}</td>

                          <td style={{ maxWidth:'260px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {r.review || '-'}
                          </td>

                          <td>{r.read_at ? new Date(r.read_at).toLocaleString() : '-'}</td>
                          <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>

                          <td>
                            <button
                              className="btn-small"
                              onClick={() => viewRow(r.id)}
                              style={{ marginRight:4 }}
                            >View</button>
                            {canManageCallHistory && (
                              <button
                                className="btn-small"
                                disabled={!!r.read_at}
                                onClick={() => markRead(r.id)}
                                style={{ marginRight:4, background: r.read_at ? '#9ca3af' : '#16a34a', color:'#fff' }}
                              >Mark Read</button>
                            )}
                            {canDeleteCallHistory && (
                              <button
                                className="btn-small btn-delete"
                                onClick={() => deleteRow(r.id)}
                              >Delete</button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={tableColCount}>No data</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalCount > 0 && (
              <div className="pagination-bar" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#475569' }}>
                  Showing {pageSummary.start}-{pageSummary.end} of {totalCount}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#475569' }}>Rows per page:</label>
                  <select
                    className="state-filter-select"
                    value={pageSize}
                    onChange={(e) => { setPageSize(parseInt(e.target.value, 10) || 25); setCurrentPage(1); }}
                  >
                    {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button className="btn-secondary btn-small" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                    Previous
                  </button>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Page {currentPage} of {totalPages}</span>
                  <button className="btn-secondary btn-small" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                    Next
                  </button>
                </div>
              </div>
            )}

            {viewItem && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  padding: '24px'
                }}
                onClick={closeView}
              >
                <div
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    padding: 0,
                    borderRadius: '18px',
                    width: '520px',
                    maxWidth: '100%',
                    boxShadow: '0 20px 45px rgba(15,23,42,0.25)',
                    border: '1px solid rgba(226,232,240,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '85vh',
                    overflow: 'hidden'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                      color: '#fff',
                      padding: '18px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 20px rgba(37,99,235,0.25)'
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Call History #{viewItem.id}</h3>
                    <button
                      onClick={closeView}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.35)',
                        color: '#fff',
                        cursor: 'pointer',
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        fontSize: '16px',
                        lineHeight: '32px',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ padding: '22px 26px', overflowY: 'auto', background: '#ffffff' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '16px', columnGap: '18px', fontSize: '14px' }}>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>User Type:</strong>
                      <span>{viewItem.user_type}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Name:</strong>
                      <span>{viewItem.user_name || viewItem.entity?.name || viewItem.user?.name || '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Mobile:</strong>
                      <span>{viewItem.user_mobile || viewItem.user?.mobile || '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Experience:</strong>
                      <span>
                        {viewItem.experience
                          ? (viewItem.experience.experience_english || viewItem.experience.experience_hindi || viewItem.experience.id)
                          : (viewItem.call_experience_id || '—')}
                      </span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Called ID:</strong>
                      <span>{viewItem.called_id || '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b', alignSelf: 'start' }}>Review:</strong>
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '12px',
                          borderRadius: '10px',
                          fontSize: '14px',
                          lineHeight: 1.5,
                          border: '1px solid rgba(148,163,184,0.4)'
                        }}
                      >
                        {viewItem.review || '—'}
                      </div>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Read At:</strong>
                      <span>{viewItem.read_at ? new Date(viewItem.read_at).toLocaleString() : '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Created:</strong>
                      <span>{viewItem.created_at ? new Date(viewItem.created_at).toLocaleString() : '—'}</span>
                    </div>
                    <div style={{ marginTop: '26px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      {!viewItem.read_at && canManageCallHistory && (
                        <button
                          className="btn-small btn-secondary"
                          onClick={(e) => { e.stopPropagation(); markRead(viewItem.id); }}
                          style={{
                            padding: '10px 20px',
                            fontSize: '13px',
                            borderRadius: '10px',
                            background: '#16a34a',
                            border: 'none',
                            color: '#fff',
                            boxShadow: '0 10px 18px rgba(22,163,74,0.25)'
                          }}
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        className="btn-small btn-secondary"
                        onClick={closeView}
                        style={{
                          padding: '10px 20px',
                          fontSize: '13px',
                          borderRadius: '10px',
                          background: '#1d4ed8',
                          border: 'none',
                          color: '#fff',
                          boxShadow: '0 10px 18px rgba(29,78,216,0.3)'
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
