import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import { getHiredEmployees } from '../../api/employeesApi';
import jobProfilesApi from '../../api/masters/jobProfilesApi';
import logsApi from '../../api/logsApi';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import '../Masters/MasterPage.css';

const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Hired', value: 'hired' },
];

const statusBadgeStyles = {
  hired: { background: '#dcfce7', color: '#15803d' },
  shortlisted: { background: '#e0f2fe', color: '#0369a1' },
  rejected: { background: '#fee2e2', color: '#b91c1c' },
  pending: { background: '#fef3c7', color: '#b45309' },
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

// NEW: compact chip style for table cells
const tableChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 600,
  border: '1px solid rgba(148,163,184,0.55)',
  background: '#f1f5f9',
  color: '#334155',
  textTransform: 'capitalize',
  whiteSpace: 'nowrap'
};

const jobStatusChip = (statusRaw) => {
  const s = (statusRaw || '').toString().trim().toLowerCase();
  const palette =
    s === 'active' ? { background: '#dcfce7', color: '#15803d', borderColor: '#86efac' } :
    s === 'inactive' ? { background: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc' } :
    s === 'expired' ? { background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' } :
    { background: '#f1f5f9', color: '#334155', borderColor: 'rgba(148,163,184,0.55)' };

  return <span style={{ ...tableChipStyle, ...palette }}>{s || '-'}</span>;
};

const profileStatusChip = (statusRaw) => {
  const s = (statusRaw || '').toString().trim().toLowerCase();
  const palette =
    s === 'verified' ? { background: '#dcfce7', color: '#15803d', borderColor: '#86efac' } :
    s === 'pending' ? { background: '#fef3c7', color: '#b45309', borderColor: '#fcd34d' } :
    s === 'rejected' ? { background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' } :
    { background: '#f1f5f9', color: '#334155', borderColor: 'rgba(148,163,184,0.55)' };

  return <span style={{ ...tableChipStyle, ...palette }}>{s || '-'}</span>;
};

// NEW
const senderTypeOptions = [
  { label: 'All', value: '' },
  { label: 'Employee to Employer', value: 'employee' },
  { label: 'Employer to Employee', value: 'employer' },
];
const senderTypeLabel = (v) => senderTypeOptions.find(o => o.value === v)?.label || 'All';

export default function HiredEmployees() {
  const navigate = useNavigate();
  const location = useLocation();

  // CHANGED: accept all known statuses from URL (not only hired/shortlisted)
  const normalizedStatusFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const status = (params.get('status') || '').trim().toLowerCase();
    return ['pending', 'shortlisted', 'rejected', 'hired'].includes(status) ? status : '';
  }, [location.search]);

  // NEW: read other filters from URL (created_from/created_to are the main ones for Dashboard deep-link)
  const queryFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const ymd = (v) => String(v || '').slice(0, 10);
    return {
      status: normalizedStatusFromQuery,
      search: (params.get('search') || '').trim(),
      jobProfile: params.get('job_profile_id') || '',
      senderType: params.get('sender_type') || '',
      createdFrom: ymd(params.get('created_from') || ''),
      createdTo: ymd(params.get('created_to') || '')
    };
  }, [location.search, normalizedStatusFromQuery]);

  const querySignature = useMemo(() => JSON.stringify(queryFromUrl), [queryFromUrl]);

  // =========================
  // RESTORED missing state/hooks
  // =========================
  const [sidebarOpen, setSidebarOpen] = useState(getSidebarState());
  const [records, setRecords] = useState([]);
  const [statusFilter, setStatusFilter] = useState(normalizedStatusFromQuery);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [jobProfiles, setJobProfiles] = useState([]);
  const [jobProfileFilter, setJobProfileFilter] = useState('');
  const [senderTypeFilter, setSenderTypeFilter] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  const [draftFilters, setDraftFilters] = useState({
    senderType: '',
    status: normalizedStatusFromQuery,
    jobProfile: '',
    createdFrom: '',
    createdTo: ''
  });

  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const canView = hasPermission(PERMISSIONS.HIRED_EMPLOYEES_VIEW);
  const canExport = hasPermission(PERMISSIONS.HIRED_EMPLOYEES_EXPORT);

  const [queryHydrated, setQueryHydrated] = useState(false);
  const [appliedQuerySignature, setAppliedQuerySignature] = useState('');

  // =========================
  // RESTORED: load masters
  // =========================
  useEffect(() => {
    jobProfilesApi.getAll()
      .then(res => setJobProfiles(res.data?.data || []))
      .catch(() => setJobProfiles([]));
  }, []);

  // =========================
  // RESTORED: query builder + fetch
  // =========================
  const jobProfileParam = jobProfileFilter ? Number(jobProfileFilter) : undefined;

  const buildQueryParams = React.useCallback((overrides = {}) => ({
    status: statusFilter || undefined,
    job_profile_id: jobProfileParam,
    sender_type: senderTypeFilter || undefined,
    search: search.trim() || undefined,
    created_from: createdFrom || undefined,
    created_to: createdTo || undefined,
    sortField,
    sortDir,
    page: overrides.page ?? currentPage,
    limit: overrides.limit ?? pageSize,
    ...overrides
  }), [
    statusFilter,
    jobProfileParam,
    senderTypeFilter,
    search,
    createdFrom,
    createdTo,
    sortField,
    sortDir,
    currentPage,
    pageSize
  ]);

  const fetchHires = React.useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const params = buildQueryParams();
      const res = await getHiredEmployees(params);
      const payload = res.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const meta = payload.meta || {};
      setRecords(rows);
      setTotalCount(meta.total ?? rows.length ?? 0);
      setTotalPages(meta.totalPages ?? 1);
    } catch (error) {
      setRecords([]);
      setTotalCount(0);
      setTotalPages(1);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load hired employees' });
    } finally {
      setLoading(false);
    }
  }, [canView, buildQueryParams]);

  // =========================
  // KEEP: hydrate from URL (your existing logic)
  // =========================
  useEffect(() => {
    if (appliedQuerySignature === querySignature) {
      if (!queryHydrated) setQueryHydrated(true);
      return;
    }

    setStatusFilter(queryFromUrl.status);
    setSearch(queryFromUrl.search);
    setJobProfileFilter(queryFromUrl.jobProfile);
    setSenderTypeFilter(queryFromUrl.senderType);
    setCreatedFrom(queryFromUrl.createdFrom);
    setCreatedTo(queryFromUrl.createdTo);

    setDraftFilters((prev) => ({
      ...prev,
      senderType: queryFromUrl.senderType,
      status: queryFromUrl.status,
      jobProfile: queryFromUrl.jobProfile,
      createdFrom: queryFromUrl.createdFrom,
      createdTo: queryFromUrl.createdTo
    }));

    setCurrentPage(1);
    setAppliedQuerySignature(querySignature);
    setQueryHydrated(true);
  }, [appliedQuerySignature, querySignature, queryFromUrl, queryHydrated]);

  useEffect(() => {
    if (!canView || !queryHydrated) return;
    fetchHires();
  }, [canView, queryHydrated, fetchHires]);

  // =========================
  // RESTORED: derived UI values + filter panel toggles
  // =========================
  const resolvedStatusLabel = useMemo(
    () => statusFilters.find((s) => s.value === statusFilter)?.label || 'All',
    [statusFilter]
  );

  const activeFilterCount = [
    search.trim(),
    statusFilter,
    jobProfileFilter,
    senderTypeFilter,
    createdFrom,
    createdTo
  ].filter(Boolean).length;

  const pageSummary = totalCount > 0
    ? {
        start: Math.min((currentPage - 1) * pageSize + 1, totalCount),
        end: Math.min((currentPage - 1) * pageSize + records.length, totalCount)
      }
    : { start: 0, end: 0 };

  const toggleFilterPanel = () => {
    if (showFilterPanel) return setShowFilterPanel(false);
    setDraftFilters({
      senderType: senderTypeFilter,
      status: statusFilter,
      jobProfile: jobProfileFilter,
      createdFrom,
      createdTo
    });
    setShowFilterPanel(true);
  };

  // =========================
  // RESTORED: sidebar handler used by Header
  // =========================
  const handleMenuClick = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  // NEW: build URL from applied filters (no refresh) and omit empty params
  const syncUrlWithFilters = React.useCallback((overrides = {}) => {
    const next = {
      status: overrides.status ?? statusFilter,
      search: overrides.search ?? search,
      jobProfile: overrides.jobProfile ?? jobProfileFilter,
      senderType: overrides.senderType ?? senderTypeFilter,
      createdFrom: overrides.createdFrom ?? createdFrom,
      createdTo: overrides.createdTo ?? createdTo
    };

    const qs = new URLSearchParams();
    if (next.search?.trim()) qs.set('search', next.search.trim());
    if (next.status) qs.set('status', next.status);
    if (next.jobProfile) qs.set('job_profile_id', String(next.jobProfile));
    if (next.senderType) qs.set('sender_type', String(next.senderType));
    if (next.createdFrom) qs.set('created_from', String(next.createdFrom).slice(0, 10));
    if (next.createdTo) qs.set('created_to', String(next.createdTo).slice(0, 10));

    const nextSearch = qs.toString() ? `?${qs.toString()}` : '';
    if ((location.search || '') === nextSearch) return;
    navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
  }, [
    navigate,
    location.pathname,
    location.search,
    statusFilter,
    search,
    jobProfileFilter,
    senderTypeFilter,
    createdFrom,
    createdTo
  ]);

  // NEW: keep URL in sync after user changes filters (so removing filters removes params)
  useEffect(() => {
    if (!queryHydrated) return;
    syncUrlWithFilters();
  }, [queryHydrated, statusFilter, search, jobProfileFilter, senderTypeFilter, createdFrom, createdTo, syncUrlWithFilters]);

  const applyFilters = () => {
    setStatusFilter(draftFilters.status);
    setJobProfileFilter(draftFilters.jobProfile);
    setSenderTypeFilter(draftFilters.senderType);
    setCreatedFrom(draftFilters.createdFrom);
    setCreatedTo(draftFilters.createdTo);
    setCurrentPage(1);
    setShowFilterPanel(false);

    // ensure URL updates immediately (no refresh)
    syncUrlWithFilters({
      status: draftFilters.status,
      jobProfile: draftFilters.jobProfile,
      senderType: draftFilters.senderType,
      createdFrom: draftFilters.createdFrom,
      createdTo: draftFilters.createdTo
    });
  };

  const clearFilters = () => {
    setStatusFilter('');
    setJobProfileFilter('');
    setSenderTypeFilter('');
    setCreatedFrom('');
    setCreatedTo('');
    setDraftFilters({ senderType: '', status: '', jobProfile: '', createdFrom: '', createdTo: '' });
    setSortField('id');
    setSortDir('desc');
    setCurrentPage(1);
    setShowFilterPanel(false);

    // remove params from URL (no refresh)
    syncUrlWithFilters({ status: '', jobProfile: '', senderType: '', createdFrom: '', createdTo: '' });
  };

  const removeChip = (key) => {
    const next = {
      status: statusFilter,
      search,
      jobProfile: jobProfileFilter,
      senderType: senderTypeFilter,
      createdFrom,
      createdTo
    };

    if (key === 'search') { setSearch(''); next.search = ''; }
    if (key === 'status') { setStatusFilter(''); next.status = ''; }
    if (key === 'job_profile') { setJobProfileFilter(''); next.jobProfile = ''; }
    if (key === 'sender_type') { setSenderTypeFilter(''); next.senderType = ''; }
    if (key === 'created_from') { setCreatedFrom(''); next.createdFrom = ''; }
    if (key === 'created_to') { setCreatedTo(''); next.createdTo = ''; }

    setCurrentPage(1);

    // remove params from URL (no refresh)
    syncUrlWithFilters(next);
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const headerIndicator = (field) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const handlePageChange = (delta) => {
    setCurrentPage(p => Math.min(Math.max(1, p + delta), totalPages));
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const formatExportDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`.trim();
  };

  const formatSalaryRange = (min, max) => {
    const toNum = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const nMin = toNum(min);
    const nMax = toNum(max);

    const fmt = (n) => n.toLocaleString('en-IN');
    if (nMin !== null && nMax !== null) return `₹${fmt(nMin)} - ₹${fmt(nMax)}`;
    if (nMin !== null) return `₹${fmt(nMin)}`;
    if (nMax !== null) return `₹${fmt(nMax)}`;
    return '-';
  };

  const exportToCSV = async () => {
    if (!canExport) {
      setMessage({ type: 'error', text: 'You do not have permission to export hiring history.' });
      return;
    }
    try {
      const params = buildQueryParams({ page: 1, all: true });
      delete params.limit;
      const res = await getHiredEmployees(params);
      const dataset = res.data?.data || [];
      if (!dataset.length) return;

      const csvRows = [];
      const headers = [
        'Employee Name', 'Employee Mobile',
        'Employer Name', 'Employer Mobile',
        'Organization Name',
        'Job Profile', 'Job Status', 'Employee Profile Status', 'Interviewer Mobile',
        'Salary Range',
        'Status', 'OTP', 'Contact At'
      ];
      csvRows.push(headers.join(','));

      dataset.forEach(row => {
        const csvRow = [
          row.employee?.name || '',
          row.employee?.mobile || '',
          row.employer?.name || '',
          row.employer?.mobile || '',
          row.job?.employer_organization_name || '',
          row.job?.profile_name || '',
          row.job?.status || '',
          row.employee?.profile_status || '',
          row.job?.interviewer_mobile || '',
          formatSalaryRange(row.job?.salary_min, row.job?.salary_max),
          row.status || 'hired',
          row.otp || '',
          formatExportDateTime(row.contact_date)
        ];
        csvRows.push(csvRow.join(','));
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `hired_employees_${new Date().toISOString().slice(0, 10)}.csv`);
      a.click();
      URL.revokeObjectURL(url);

      try {
        const parts = [];
        if (search.trim()) parts.push(`search="${search.trim()}"`);
        if (statusFilter) parts.push(`status="${statusFilter}"`);
        if (jobProfileFilter) parts.push(`job_profile_id=${jobProfileFilter}`);
        if (senderTypeFilter) parts.push(`sender_type="${senderTypeFilter}"`);
        if (createdFrom) parts.push(`created_from=${createdFrom}`);
        if (createdTo) parts.push(`created_to=${createdTo}`);

        await logsApi.create({
          category: 'hiring history',
          type: 'export',
          redirect_to: '/hired-employees',
          log_text: parts.length ? `Exported hiring history (filters: ${parts.join(', ')})` : 'Exported hiring history'
        });
      } catch {
        // ignore log failure
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to export hired employees' });
    }
  };

  if (!canView) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content hired-employees-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view hired employees.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content hired-employees-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            <div className="list-header">
              <h1>Hiring History</h1>
            </div>

            <div className="search-filter-row" style={{ marginBottom:'10px', display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:'1 1 auto' }}>
                <label htmlFor="hiring-search" style={{ fontSize:'12px', fontWeight:600 }}>Search:</label>
                <input
                  id="hiring-search"
                  type="text"
                  className="state-filter-select"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="employee, employer, job..."
                  style={{ maxWidth:'260px' }}
                />
              </div>
              <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
                <button className="btn-secondary btn-small" onClick={toggleFilterPanel}>
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
                <LogsAction category="hiring history" />
                {canExport && (
                  <button className="btn-secondary btn-small" onClick={exportToCSV}>
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            <div className="applied-filters" style={{ marginBottom:'12px', display:'flex', flexWrap:'wrap', gap:'8px', padding:'10px 12px', border:'1px solid #e2e8f0', background:'#fff', borderRadius:'10px', boxShadow:'0 2px 4px rgba(0,0,0,0.06)' }}>
              {search && (
                <span style={chipBaseStyle}>
                  Search: {search}
                  <button style={chipCloseStyle} onClick={() => removeChip('search')}>×</button>
                </span>
              )}
              {statusFilter && (
                <span style={chipBaseStyle}>
                  Status: {resolvedStatusLabel}
                  <button style={chipCloseStyle} onClick={() => removeChip('status')}>×</button>
                </span>
              )}
              {jobProfileFilter && (
                <span style={chipBaseStyle}>
                  Job Profile: {jobProfiles.find(p => String(p.id) === String(jobProfileFilter))?.profile_english || jobProfileFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('job_profile')}>×</button>
                </span>
              )}
              {senderTypeFilter && ( // NEW
                <span style={chipBaseStyle}>
                  Sender Type: {senderTypeLabel(senderTypeFilter)}
                  <button style={chipCloseStyle} onClick={() => removeChip('sender_type')}>×</button>
                </span>
              )}
              {createdFrom && (
                <span style={chipBaseStyle}>
                  Created From: {createdFrom}
                  <button style={chipCloseStyle} onClick={() => removeChip('created_from')}>×</button>
                </span>
              )}
              {createdTo && (
                <span style={chipBaseStyle}>
                  Created To: {createdTo}
                  <button style={chipCloseStyle} onClick={() => removeChip('created_to')}>×</button>
                </span>
              )}
              {!activeFilterCount && <span style={{ fontSize:'12px', color:'#64748b' }}>No filters applied</span>}
            </div>

            {showFilterPanel && (
              <div className="filter-panel" style={{ marginBottom:'16px', padding:'16px', border:'1px solid #ddd', borderRadius:'8px', background:'#f8fafc' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
                  {/* Sender Type FIRST */}
                  <div>
                    <label className="filter-label">Sender Type</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.senderType}
                      onChange={(e) => setDraftFilters(f => ({ ...f, senderType: e.target.value }))}
                      style={{ width:'100%', minWidth:0 }}
                    >
                      {senderTypeOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="filter-label">Status</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.status}
                      onChange={(e) => setDraftFilters(f => ({ ...f, status: e.target.value }))}
                      style={{ width:'100%', minWidth:0 }}
                    >
                      {statusFilters.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="filter-label">Job Profile</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.jobProfile}
                      onChange={(e) => setDraftFilters(f => ({ ...f, jobProfile: e.target.value }))}
                      style={{ width:'100%', minWidth:0 }}
                    >
                      <option value="">All</option>
                      {jobProfiles.map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.profile_english || profile.profile_hindi || profile.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="filter-label">Created Date From</label>
                    <input
                      type="date"
                      className="state-filter-select"
                      value={draftFilters.createdFrom}
                      onChange={(e) => setDraftFilters(f => ({ ...f, createdFrom: e.target.value }))}
                      style={{ width:'100%', minWidth:0 }}
                    />
                  </div>
                  <div>
                    <label className="filter-label">Created Date To</label>
                    <input
                      type="date"
                      className="state-filter-select"
                      value={draftFilters.createdTo}
                      onChange={(e) => setDraftFilters(f => ({ ...f, createdTo: e.target.value }))}
                      style={{ width:'100%', minWidth:0 }}
                    />
                  </div>
                </div>
                <div style={{ marginTop:'18px', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                  <button className="btn-primary btn-small" onClick={applyFilters}>Apply</button>
                  <button className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                  <button className="btn-secondary btn-small" onClick={() => setShowFilterPanel(false)}>Close</button>
                </div>
              </div>
            )}

            <div className="table-container">
              <table className="data-table" style={{ minWidth:'1500px' }}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('employee_name')} style={{ cursor:'pointer' }}>Employee{headerIndicator('employee_name')}</th>
                    <th onClick={() => handleSort('employer_name')} style={{ cursor:'pointer' }}>Employer{headerIndicator('employer_name')}</th>
                    <th>Organization</th>
                    <th onClick={() => handleSort('job_profile')} style={{ cursor:'pointer' }}>Job (Profile){headerIndicator('job_profile')}</th>
                    <th>Job Status</th>
                    <th>Profile Status</th>
                    <th>Salary</th>
                    <th onClick={() => handleSort('status')} style={{ cursor:'pointer' }}>Status{headerIndicator('status')}</th>
                    <th>OTP</th>
                    <th>Contact At</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10">Loading...</td></tr>
                  ) : records.length ? (
                    records.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {row.employee?.id ? (
                            <Link to={`/employees/${row.employee.id}`} className="table-link">
                              {row.employee.name || '-'}
                            </Link>
                          ) : (
                            row.employee?.name || '-'
                          )}
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {row.employee?.mobile || '-'}
                          </div>
                        </td>
                        <td>
                          {row.employer?.id ? (
                            <Link to={`/employers/${row.employer.id}`} className="table-link">
                              {row.employer.name || '-'}
                            </Link>
                          ) : (
                            row.employer?.name || '-'
                          )}
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {row.employer?.mobile || '-'}
                          </div>
                        </td>
                        <td>
                          {row.job?.employer_organization_name || '-'}
                        </td>
                        <td>
                          {row.job?.id ? (
                            <Link to={`/jobs/${row.job.id}`} className="table-link">
                              {row.job?.profile_name || '-'}
                            </Link>
                          ) : (
                            row.job?.profile_name || '-'
                          )}
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {row.job?.interviewer_mobile || '-'}
                          </div>
                        </td>

                        <td>{jobStatusChip(row.job?.status)}</td>
                        <td>{profileStatusChip(row.employee?.profile_status)}</td>

                        <td>{formatSalaryRange(row.job?.salary_min, row.job?.salary_max)}</td>

                        <td>
                          {(() => {
                            const key = (row.status || '').toLowerCase();
                            const palette = statusBadgeStyles[key] || { background: '#e2e8f0', color: '#475569' };
                            return (
                              <span
                                className="badge"
                                style={{
                                  ...palette,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '2px 10px',
                                  borderRadius: '999px',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {row.status || 'hired'}
                              </span>
                            );
                          })()}
                        </td>

                        <td>{row.otp || '-'}</td>
                        <td>{row.contact_date ? new Date(row.contact_date).toLocaleString() : '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10">
                        {resolvedStatusLabel === 'All'
                          ? 'No hiring records found'
                          : `No ${resolvedStatusLabel.toLowerCase()} records found`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalCount > 0 && (
              <div className="pagination-bar" style={{ marginTop:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
                <span style={{ fontSize:'12px', color:'#475569' }}>
                  Showing {pageSummary.start}-{pageSummary.end} of {totalCount}
                </span>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <label style={{ fontSize:'12px', color:'#475569' }}>Rows per page:</label>
                  <select
                    className="state-filter-select"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10) || 25)}
                  >
                    {[10,25,50,100].map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <button className="btn-secondary btn-small" disabled={currentPage === 1} onClick={() => handlePageChange(-1)}>Previous</button>
                  <span style={{ fontSize:'12px', fontWeight:600 }}>Page {currentPage} of {totalPages}</span>
                  <button className="btn-secondary btn-small" disabled={currentPage === totalPages} onClick={() => handlePageChange(1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
