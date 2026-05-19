import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import contactUnlocksApi from '../../api/contactUnlocksApi';
import callHistoryApi from '../../api/callHistoryApi';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import { useResizableColumns } from '../../hooks/useResizableColumns';
import { formatMobile } from '../../utils/formatters';
import '../Masters/MasterPage.css';

const TAB_OPTIONS = [
  { key: 'employee', label: 'Employee' },
  { key: 'employer', label: 'Employer' },
];

const baseChipStyle = {
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
  fontWeight: 600,
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
  justifyContent: 'center',
};

const linkStyle = { color: '#2563eb', textDecoration: 'underline' };

const DEFAULTS = {
  id: 60, unlocked_at: 130,
  employee: 130, employee_mobile: 120, employer: 130, organization: 140, employer_mobile: 120, job: 120, verification: 110, kyc: 80,
  employer2: 130, org2: 140, employer_mobile2: 120, employee2: 130, employee_mobile2: 120, job_profiles: 150, location: 120, verification2: 110, kyc2: 80,
  actions: 120,
};

export default function ContactUnlocksManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [userType, setUserType] = useState('employee');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [createdFromFilter, setCreatedFromFilter] = useState('');
  const [createdToFilter, setCreatedToFilter] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [draftFilters, setDraftFilters] = useState({ createdFromFilter: '', createdToFilter: '' });

  const [callExpItem, setCallExpItem] = useState(null);
  const [callExpLoading, setCallExpLoading] = useState(false);

  const openCallExp = async (callExpId) => {
    setCallExpLoading(true);
    setCallExpItem(null);
    try {
      const res = await callHistoryApi.getCallHistoryById(callExpId);
      setCallExpItem(res.data?.data || null);
    } catch {
      setCallExpItem({ _error: true });
    } finally {
      setCallExpLoading(false);
    }
  };

  const canView = hasPermission(PERMISSIONS.CONTACT_UNLOCKS_VIEW);
  const canExport = hasPermission(PERMISSIONS.CONTACT_UNLOCKS_EXPORT);
  const canShowEmployeePhone = hasPermission(PERMISSIONS.EMPLOYEES_SHOW_PHONE_ADDRESS);
  const canShowEmployerPhone = hasPermission(PERMISSIONS.EMPLOYERS_SHOW_PHONE_ADDRESS);

  const { colWidths, rHandle } = useResizableColumns('contact-unlocks-col-widths', DEFAULTS);

  const buildQueryParams = useCallback(() => ({
    page: currentPage,
    limit: pageSize,
    search: searchTerm.trim() || undefined,
    sortField,
    sortDir,
    user_type: userType,
    created_from: createdFromFilter || undefined,
    created_to: createdToFilter || undefined,
  }), [currentPage, pageSize, searchTerm, sortField, sortDir, userType, createdFromFilter, createdToFilter]);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await contactUnlocksApi.getContactUnlocks(buildQueryParams());
      const payload = res.data || {};
      setRows(Array.isArray(payload.data) ? payload.data : []);
      const meta = payload.meta || {};
      setTotalCount(meta.total ?? 0);
      setTotalPages(meta.totalPages ?? 1);
    } catch (error) {
      console.error('[contact-unlocks] load error', error);
      setRows([]);
      setMessage({ type: 'error', text: 'Failed to load contact unlocks' });
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, canView]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [userType]);

  const activeFilterCount = [searchTerm.trim(), createdFromFilter, createdToFilter].filter(Boolean).length;

  const pageSummary = useMemo(() => (
    totalCount > 0
      ? {
          start: Math.min((currentPage - 1) * pageSize + 1, totalCount),
          end: Math.min((currentPage - 1) * pageSize + rows.length, totalCount),
        }
      : { start: 0, end: 0 }
  ), [currentPage, pageSize, rows.length, totalCount]);

  const formatDateTime = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const renderStatusBadge = (status) => {
    const normalized = (status || '').toString().trim().toLowerCase();
    const palette = {
      init: { bg: '#e0f2fe', color: '#075985' },
      verified: { bg: '#16a34a', color: '#fff' },
      approved: { bg: '#16a34a', color: '#fff' },
      pending: { bg: '#f59e0b', color: '#1f2937' },
      rejected: { bg: '#dc2626', color: '#fff' },
    };
    const tone = palette[normalized] || { bg: '#e5e7eb', color: '#1f2937' };
    const label = normalized === 'init' ? 'Not submitted for review' : (status || '-');
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize', background: tone.bg, color: tone.color }}>
        {label}
      </span>
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const headerIndicator = (field) => (sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const toggleFilterPanel = () => {
    if (showFilterPanel) {
      setShowFilterPanel(false);
      return;
    }
    setDraftFilters({ createdFromFilter, createdToFilter });
    setShowFilterPanel(true);
  };

  const applyFilters = () => {
    setCreatedFromFilter(draftFilters.createdFromFilter);
    setCreatedToFilter(draftFilters.createdToFilter);
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const clearFilters = () => {
    setCreatedFromFilter('');
    setCreatedToFilter('');
    setDraftFilters({ createdFromFilter: '', createdToFilter: '' });
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const removeChip = (key) => {
    if (key === 'search') setSearchTerm('');
    if (key === 'created_from') setCreatedFromFilter('');
    if (key === 'created_to') setCreatedToFilter('');
    setCurrentPage(1);
  };

  const buildExportFilename = () => {
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return `contact-unlocks_${userType}_${ts}.csv`;
  };

  const exportToCSV = async () => {
    if (!canExport) {
      setMessage({ type: 'error', text: 'You do not have permission to export contact unlocks.' });
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
        const res = await contactUnlocksApi.getContactUnlocks({ ...baseParams, page });
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
    } catch (error) {
      console.error('[contact-unlocks] export error', error);
      setMessage({ type: 'error', text: 'Failed to export contact unlocks' });
      return;
    }

    if (!exportRows.length) {
      setMessage({ type: 'error', text: 'No contact unlocks found for current filters.' });
      return;
    }

    const headers = userType === 'employee'
      ? [
          'ID', 'Unlocked At', 'Employee', 'Employee Mobile', 'Employer', 'Organization', 'Employer Mobile', 'Job Profile', 'Job Designation', 'Job Status', 'Verification', 'KYC'
        ]
      : [
          'ID', 'Unlocked At', 'Employer', 'Organization', 'Employer Mobile', 'Employee', 'Employee Mobile', 'Job Profiles', 'Location', 'Verification', 'KYC'
        ];

    const escapeCell = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csvRows = exportRows.map((row) => {
      if (userType === 'employee') {
        return [
          row.id,
          formatDateTime(row.created_at),
          row.employee_name || '',
          canShowEmployeePhone ? formatMobile(row.employee_mobile) : '',
          row.employer_name || '',
          row.organization_name || '',
          canShowEmployerPhone ? formatMobile(row.employer_mobile) : '',
          row.job_profile || '',
          row.job_designation || '',
          row.job_status || '',
          row.verification_status || '',
          row.kyc_status || '',
        ];
      }

      return [
        row.id,
        formatDateTime(row.created_at),
        row.employer_name || '',
        row.organization_name || '',
        canShowEmployerPhone ? formatMobile(row.employer_mobile) : '',
        row.employee_name || '',
        canShowEmployeePhone ? formatMobile(row.employee_mobile) : '',
        Array.isArray(row.employee_job_profiles) ? row.employee_job_profiles.join(', ') : '',
        [row.current_city, row.current_state].filter(Boolean).join(', '),
        row.verification_status || '',
        row.kyc_status || '',
      ];
    });

    const csv = [headers.map(escapeCell).join(','), ...csvRows.map((row) => row.map(escapeCell).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildExportFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!canView) {
    return <div style={{ padding: 40 }}>You do not have permission to view this page.</div>;
  }

  const tableColCount = userType === 'employee'
    ? 9 + (canShowEmployeePhone ? 1 : 0) + (canShowEmployerPhone ? 1 : 0)
    : 10 + (canShowEmployeePhone ? 1 : 0) + (canShowEmployerPhone ? 1 : 0);

  return (
    <div className="dashboard-container">
      <Header onMenuClick={() => setSidebarOpen((prev) => !prev)} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            <div className="list-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <h1 style={{ margin: 0 }}>Contact Unlocks</h1>
            </div>

            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setUserType(tab.key); setCurrentPage(1); }}
                  className={`tab-btn${userType === tab.key ? ' active' : ''}`}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    border: '1px solid #ccc',
                    background: userType === tab.key ? '#2563eb' : '#fff',
                    color: userType === tab.key ? '#fff' : '#333',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="search-filter-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto' }}>
                <label htmlFor="contact-unlocks-search" style={{ fontSize: '12px', fontWeight: 600 }}>Search:</label>
                <input
                  id="contact-unlocks-search"
                  type="text"
                  className="state-filter-select"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder={userType === 'employee' ? 'employee, employer, job...' : 'employer, employee, location...'}
                  style={{ maxWidth: '280px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button className="btn-secondary btn-small" onClick={toggleFilterPanel}>
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
                {canExport && (
                  <button className="btn-secondary btn-small" onClick={exportToCSV}>Export</button>
                )}
              </div>
            </div>

            {(searchTerm.trim() || createdFromFilter || createdToFilter) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {searchTerm.trim() && (
                  <span style={baseChipStyle}>
                    Search: {searchTerm.trim()}
                    <button style={chipCloseStyle} onClick={() => removeChip('search')}>✕</button>
                  </span>
                )}
                {createdFromFilter && (
                  <span style={baseChipStyle}>
                    From: {createdFromFilter}
                    <button style={chipCloseStyle} onClick={() => removeChip('created_from')}>✕</button>
                  </span>
                )}
                {createdToFilter && (
                  <span style={baseChipStyle}>
                    To: {createdToFilter}
                    <button style={chipCloseStyle} onClick={() => removeChip('created_to')}>✕</button>
                  </span>
                )}
              </div>
            )}

            {showFilterPanel && (
              <div style={{ background: '#fff', border: '1px solid #dbe3f0', borderRadius: '10px', padding: '16px', marginBottom: '12px', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Unlocked from</label>
                    <input
                      type="date"
                      className="state-filter-select"
                      value={draftFilters.createdFromFilter}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, createdFromFilter: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Unlocked to</label>
                    <input
                      type="date"
                      className="state-filter-select"
                      value={draftFilters.createdToFilter}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, createdToFilter: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                  <button className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                  <button className="btn-primary btn-small" onClick={applyFilters}>Apply</button>
                </div>
              </div>
            )}

            <div className="table-container">
              <table className="data-table col-resizable" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer', width: colWidths.id }} onClick={() => handleSort('id')}>ID{headerIndicator('id')}{rHandle('id')}</th>
                    <th style={{ cursor: 'pointer', width: colWidths.unlocked_at }} onClick={() => handleSort('created_at')}>Unlocked At{headerIndicator('created_at')}{rHandle('unlocked_at')}</th>
                    {userType === 'employee' ? (
                      <>
                        <th style={{ width: colWidths.employee }}>Employee{rHandle('employee')}</th>
                        {canShowEmployeePhone && <th style={{ width: colWidths.employee_mobile }}>Employee Mobile{rHandle('employee_mobile')}</th>}
                        <th style={{ width: colWidths.employer }}>Employer{rHandle('employer')}</th>
                        <th style={{ width: colWidths.organization }}>Organization{rHandle('organization')}</th>
                        {canShowEmployerPhone && <th style={{ width: colWidths.employer_mobile }}>Employer Mobile{rHandle('employer_mobile')}</th>}
                        <th style={{ width: colWidths.job }}>Job{rHandle('job')}</th>
                        <th style={{ width: colWidths.verification }}>Verification{rHandle('verification')}</th>
                        <th style={{ width: colWidths.kyc }}>KYC{rHandle('kyc')}</th>
                        <th style={{ width: 'auto', whiteSpace: 'nowrap' }}>Actions</th>
                      </>
                    ) : (
                      <>
                        <th style={{ width: colWidths.employer2 }}>Employer{rHandle('employer2')}</th>
                        <th style={{ width: colWidths.org2 }}>Organization{rHandle('org2')}</th>
                        {canShowEmployerPhone && <th style={{ width: colWidths.employer_mobile2 }}>Employer Mobile{rHandle('employer_mobile2')}</th>}
                        <th style={{ width: colWidths.employee2 }}>Employee{rHandle('employee2')}</th>
                        {canShowEmployeePhone && <th style={{ width: colWidths.employee_mobile2 }}>Employee Mobile{rHandle('employee_mobile2')}</th>}
                        <th style={{ width: colWidths.job_profiles }}>Job Profiles{rHandle('job_profiles')}</th>
                        <th style={{ width: colWidths.location }}>Location{rHandle('location')}</th>
                        <th style={{ width: colWidths.verification2 }}>Verification{rHandle('verification2')}</th>
                        <th style={{ width: colWidths.kyc2 }}>KYC{rHandle('kyc2')}</th>
                        <th style={{ width: 'auto', whiteSpace: 'nowrap' }}>Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={tableColCount} style={{ textAlign: 'center', padding: '18px' }}>Loading...</td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={tableColCount} style={{ textAlign: 'center', padding: '18px' }}>No contact unlocks found.</td>
                    </tr>
                  ) : rows.map((row) => {
                    if (userType === 'employee') {
                      const jobLabel = row.job_designation ? `${row.job_profile || '-'} (${row.job_designation})` : (row.job_profile || '-');
                      return (
                        <tr key={`${row.user_type}-${row.id}`}>
                          <td>{row.id}</td>
                          <td>{formatDateTime(row.created_at)}</td>
                          <td>
                            {row.employee_id ? <Link to={`/employees/${row.employee_id}`} style={linkStyle}>{row.employee_name || '-'}</Link> : (row.employee_name || '-')}
                          </td>
                          {canShowEmployeePhone && <td>{formatMobile(row.employee_mobile)}</td>}
                          <td>
                            {row.employer_id ? <Link to={`/employers/${row.employer_id}`} style={linkStyle}>{row.employer_name || '-'}</Link> : (row.employer_name || '-')}
                          </td>
                          <td>{row.organization_name || '-'}</td>
                          {canShowEmployerPhone && <td>{formatMobile(row.employer_mobile)}</td>}
                          <td>
                            {row.job_id ? <Link to={`/jobs/${row.job_id}`} style={linkStyle}>{jobLabel}</Link> : jobLabel}
                          </td>
                          <td>{renderStatusBadge(row.verification_status)}</td>
                          <td>{renderStatusBadge(row.kyc_status)}</td>
                          <td>
                            {row.call_experience_id && (
                              <button
                                className="btn-small btn-secondary"
                                style={{ fontSize: '12px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                                onClick={(e) => { e.stopPropagation(); openCallExp(row.call_experience_id); }}
                              >
                                Call experience
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }

                    const profiles = Array.isArray(row.employee_job_profiles) && row.employee_job_profiles.length
                      ? row.employee_job_profiles.join(', ')
                      : '-';
                    const location = [row.current_city, row.current_state].filter(Boolean).join(', ') || '-';
                    return (
                      <tr key={`${row.user_type}-${row.id}`}>
                        <td>{row.id}</td>
                        <td>{formatDateTime(row.created_at)}</td>
                        <td>
                          {row.employer_id ? <Link to={`/employers/${row.employer_id}`} style={linkStyle}>{row.employer_name || '-'}</Link> : (row.employer_name || '-')}
                        </td>
                        <td>{row.organization_name || '-'}</td>
                        {canShowEmployerPhone && <td>{formatMobile(row.employer_mobile)}</td>}
                        <td>
                          {row.employee_id ? <Link to={`/employees/${row.employee_id}`} style={linkStyle}>{row.employee_name || '-'}</Link> : (row.employee_name || '-')}
                        </td>
                        {canShowEmployeePhone && <td>{formatMobile(row.employee_mobile)}</td>}
                        <td>{profiles}</td>
                        <td>{location}</td>
                        <td>{renderStatusBadge(row.verification_status)}</td>
                        <td>{renderStatusBadge(row.kyc_status)}</td>
                        <td>
                          {row.call_experience_id && (
                            <button
                              className="btn-small btn-secondary"
                              style={{ fontSize: '12px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                              onClick={(e) => { e.stopPropagation(); openCallExp(row.call_experience_id); }}
                            >
                              Call experience
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-footer" style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {pageSummary.start}-{pageSummary.end} of {totalCount}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px' }}>Rows:</label>
                <select
                  className="state-filter-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) || 25);
                    setCurrentPage(1);
                  }}
                  style={{ width: '84px' }}
                >
                  {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
                <button className="btn-secondary btn-small" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage <= 1}>Prev</button>
                <span style={{ fontSize: '12px' }}>Page {currentPage} of {Math.max(totalPages, 1)}</span>
                <button className="btn-secondary btn-small" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.max(totalPages, 1)))} disabled={currentPage >= totalPages}>Next</button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {(callExpLoading || callExpItem) && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
          onClick={() => setCallExpItem(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: '10px', width: '480px', maxWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: '#0098DB', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                {callExpLoading ? 'Loading…' : callExpItem?._error ? 'Error' : `Call History #${callExpItem?.id}`}
              </h3>
              <button
                onClick={() => setCallExpItem(null)}
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '6px', fontSize: '14px', lineHeight: '28px', padding: 0 }}
              >✕</button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
              {callExpLoading && <div style={{ textAlign: 'center', color: '#555', padding: '24px 0' }}>Loading call experience…</div>}
              {!callExpLoading && callExpItem?._error && <div style={{ color: '#c0392b', fontSize: '14px' }}>Failed to load call experience details.</div>}
              {!callExpLoading && callExpItem && !callExpItem._error && (
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', rowGap: '12px', columnGap: '16px', fontSize: '13px' }}>
                  <strong style={{ textAlign: 'right', color: '#666' }}>User Type:</strong>
                  <span style={{ color: '#333' }}>{callExpItem.user_type || '—'}</span>
                  <strong style={{ textAlign: 'right', color: '#666' }}>Name:</strong>
                  <span style={{ color: '#333' }}>{callExpItem.user_name || callExpItem.entity?.name || callExpItem.user?.name || '—'}</span>
                  <strong style={{ textAlign: 'right', color: '#666' }}>Mobile:</strong>
                  <span style={{ color: '#333' }}>{formatMobile(callExpItem.user_mobile ?? callExpItem.user?.mobile)}</span>
                  <strong style={{ textAlign: 'right', color: '#666' }}>Experience:</strong>
                  <span style={{ color: '#333' }}>
                    {callExpItem.experience
                      ? (callExpItem.experience.experience_english || callExpItem.experience.experience_hindi || callExpItem.experience.id)
                      : (callExpItem.call_experience_id || '—')}
                  </span>
                  <strong style={{ textAlign: 'right', color: '#666' }}>Called ID:</strong>
                  <span style={{ color: '#333' }}>{callExpItem.called_id || '—'}</span>
                  <strong style={{ textAlign: 'right', color: '#666', alignSelf: 'start' }}>Review:</strong>
                  <div style={{ background: '#f5f5f5', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', lineHeight: 1.5, border: '1px solid #e0e0e0', color: '#333' }}>
                    {callExpItem.review || '—'}
                  </div>
                  <strong style={{ textAlign: 'right', color: '#666' }}>Read At:</strong>
                  <span style={{ color: '#333' }}>{callExpItem.read_at ? new Date(callExpItem.read_at).toLocaleString() : '—'}</span>
                  <strong style={{ textAlign: 'right', color: '#666' }}>Created:</strong>
                  <span style={{ color: '#333' }}>{callExpItem.created_at ? new Date(callExpItem.created_at).toLocaleString() : '—'}</span>
                </div>
              )}
              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button className="btn-small btn-secondary" onClick={() => setCallExpItem(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
