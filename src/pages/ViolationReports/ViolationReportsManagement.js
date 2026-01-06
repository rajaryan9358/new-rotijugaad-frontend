import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import reportsApi from '../../api/reportsApi';
import employeeReportReasonsApi from '../../api/masters/employeeReportReasonsApi';
import employerReportReasonsApi from '../../api/masters/employerReportReasonsApi';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import LogsAction from '../../components/LogsAction';
import logsApi from '../../api/logsApi';
import '../Masters/MasterPage.css';

export default function ViolationReportsManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedReportTypeFromQuery = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = (params.get('report_type') || '').trim().toLowerCase();
    if (raw === 'ads' || raw === 'job') return 'job';
    if (raw === 'employee') return 'employee';
    return '';
  }, [location.search]);
  const querySignature = React.useMemo(
    () => JSON.stringify({ report_type: normalizedReportTypeFromQuery }),
    [normalizedReportTypeFromQuery]
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportTypeFilter, setReportTypeFilter] = useState(normalizedReportTypeFromQuery);
  const [reasonFilter, setReasonFilter] = useState('');
  const [readStatusFilter, setReadStatusFilter] = useState('');
  const [reasons, setReasons] = useState([]);
  const [message, setMessage] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    reportTypeFilter: normalizedReportTypeFromQuery,
    reasonFilter: '',
    readStatusFilter: ''
  });
  const [queryHydrated, setQueryHydrated] = useState(false);
  const [appliedQuerySignature, setAppliedQuerySignature] = useState('');
  const [reasonOptions, setReasonOptions] = useState({});

  const canViewViolations = hasPermission(PERMISSIONS.VIOLATIONS_VIEW);
  const canManageViolations = hasPermission(PERMISSIONS.VIOLATIONS_MANAGE);
  const canDeleteViolations = hasPermission(PERMISSIONS.VIOLATIONS_DELETE);
  const canExportViolations = hasPermission(PERMISSIONS.VIOLATIONS_EXPORT);

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

  useEffect(() => {
    if (!canViewViolations) return;
    loadReasons(reportTypeFilter);
  }, [canViewViolations, reportTypeFilter]);

  const loadReasons = React.useCallback(async (type) => {
    if (!type || reasonOptions[type]) return;
    try {
      const res = type === 'employee'
        ? await employerReportReasonsApi.getAll()
        : await employeeReportReasonsApi.getAll();
      setReasonOptions(prev => ({ ...prev, [type]: res.data?.data || [] }));
    } catch {
      setReasonOptions(prev => ({ ...prev, [type]: [] }));
    }
  }, [reasonOptions]);

  useEffect(() => {
    if (reportTypeFilter) loadReasons(reportTypeFilter);
  }, [reportTypeFilter, loadReasons]);
  useEffect(() => {
    if (showFilterPanel && draftFilters.reportTypeFilter) loadReasons(draftFilters.reportTypeFilter);
  }, [showFilterPanel, draftFilters.reportTypeFilter, loadReasons]);

  const reasonsForApplied = reportTypeFilter ? (reasonOptions[reportTypeFilter] || []) : [];
  const reasonsForDraft = draftFilters.reportTypeFilter ? (reasonOptions[draftFilters.reportTypeFilter] || []) : [];

  const buildQueryParams = React.useCallback(() => ({
    page: currentPage,
    limit: pageSize,
    search: searchTerm.trim() || undefined,
    sortField,
    sortDir,
    report_type: reportTypeFilter || undefined,
    reason_id: reasonFilter || undefined,
    read_status: readStatusFilter || undefined
  }), [currentPage, pageSize, searchTerm, sortField, sortDir, reportTypeFilter, reasonFilter, readStatusFilter]);

  const fetchRows = React.useCallback(async () => {
    if (!canViewViolations) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await reportsApi.getReports(buildQueryParams());
      const payload = res.data || {};
      setRows(Array.isArray(payload.data) ? payload.data : []);
      const meta = payload.meta || {};
      setTotalCount(meta.total ?? 0);
      setTotalPages(meta.totalPages ?? 1);
    } catch (e) {
      console.error('[violation-reports] fetchRows error', e);
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
      setMessage({ type: 'error', text: 'Failed to load reports' });
    } finally {
      setLoading(false);
    }
  }, [canViewViolations, buildQueryParams]);

  useEffect(() => { if (canViewViolations && queryHydrated) fetchRows(); }, [canViewViolations, fetchRows, queryHydrated]);

  const toggleFilterPanel = () => {
    if (showFilterPanel) return setShowFilterPanel(false);
    setDraftFilters({
      reportTypeFilter,
      reasonFilter,
      readStatusFilter
    });
    setShowFilterPanel(true);
  };

  const applyFilters = () => {
    setReportTypeFilter(draftFilters.reportTypeFilter);
    setReasonFilter(draftFilters.reasonFilter);
    setReadStatusFilter(draftFilters.readStatusFilter);
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const clearFilters = () => {
    setReportTypeFilter('');
    setReasonFilter('');
    setReadStatusFilter('');
    setDraftFilters({ reportTypeFilter: '', reasonFilter: '', readStatusFilter: '' });
    setSortField('id');
    setSortDir('desc');
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const removeChip = (key) => {
    if (key === 'search') setSearchTerm('');
    if (key === 'report_type') setReportTypeFilter('');
    if (key === 'reason') setReasonFilter('');
    if (key === 'read_status') setReadStatusFilter('');
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (delta) => {
    setCurrentPage(p => Math.min(Math.max(1, p + delta), totalPages));
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const headerIndicator = (field) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const activeFilterCount = [searchTerm.trim(), reportTypeFilter, reasonFilter, readStatusFilter].filter(Boolean).length;
  const pageSummary = totalCount > 0
    ? { start: Math.min((currentPage - 1) * pageSize + 1, totalCount), end: Math.min((currentPage - 1) * pageSize + rows.length, totalCount) }
    : { start: 0, end: 0 };

  const canViewDetail = (report) => {
    if (report.report_type === 'job') {
      return !!(report.reported_entity?.id || report.report_id);
    }
    if (report.report_type === 'employee') {
      return !!(report.reporter_entity?.id || report.user_id);
    }
    return false;
  };

  const openReporterProfile = (report) => {
    let path = null;
    if (report.report_type === 'job') {
      const employeeId = report.reporter_entity?.id || report.user_id;
      if (employeeId) path = `/employees/${employeeId}`;
    } else if (report.report_type === 'employee') {
      const employerId = report.reporter_entity?.id || report.user_id;
      if (employerId) path = `/employers/${employerId}`;
    }
    if (path) navigate(path);
  };
  const openReportedProfile = (report) => {
    let path = null;
    if (report.report_type === 'job') {
      if (report.report_id) path = `/jobs/${report.report_id}`;
    } else if (report.report_type === 'employee') {
      const employeeId = report.reported_entity?.id || report.report_id;
      if (employeeId) path = `/employees/${employeeId}`;
    }
    if (path) navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const viewRow = async (id) => {
    try {
      const res = await reportsApi.getReportById(id);
      setViewItem(res.data?.data || null);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load report details' });
    }
  };

  const markRead = async (id) => {
    if (!canManageViolations) return;
    try {
      await reportsApi.markReportAsRead(id);
      const timestamp = new Date().toISOString();
      setRows(rows => rows.map(r => (r.id === id ? { ...r, read_at: timestamp } : r)));
      setViewItem(prev => (prev?.id === id ? { ...prev, read_at: timestamp } : prev));
    } catch {
      setMessage({ type: 'error', text: 'Failed to mark as read' });
    }
  };

  const deleteRow = async (id) => {
    if (!canDeleteViolations) return;
    if (!window.confirm('Delete this report?')) return;
    try {
      await reportsApi.deleteReport(id);
      setRows(rows => rows.filter(r => r.id !== id));
      setMessage({ type: 'success', text: 'Report deleted' });
    } catch {
      setMessage({ type: 'error', text: 'Delete failed' });
    }
  };

  const closeView = () => setViewItem(null);

  const buildExportFilename = () => {
    const pad = (val) => String(val).padStart(2, '0');
    const now = new Date();
    const dd = pad(now.getDate());
    const MM = pad(now.getMonth() + 1);
    const yyyy = now.getFullYear();
    let hours = now.getHours();
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hh = pad(hours);
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `violation_reports_${dd}-${MM}-${yyyy}_${hh}_${mm}_${ss}_${suffix}_.csv`;
  };

  const exportToCSV = async () => {
    if (!canExportViolations) return;
    const baseParams = buildQueryParams();
    const exportRows = [];
    let page = 1;
    let totalPagesFromServer = null;
    let totalRecordsFromServer = null;
    const requestedLimit = baseParams.limit || pageSize || 25;

    try {
      while (true) {
        const res = await reportsApi.getReports({ ...baseParams, page });
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
      console.error('[violation-reports] export error', e);
      setMessage({ type: 'error', text: 'Failed to export reports' });
      return;
    }

    if (!exportRows.length) {
      setMessage({ type: 'error', text: 'No violation reports found for current filters.' });
      return;
    }

    const headers = ['ID','Report Type','Reporter','Reported Entity','Reason','Status','Created At'];
    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
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
    const rowsCsv = exportRows.map((row) => [
      row.id,
      row.report_type || '',
      row.reporter_entity?.name || row.user_id || '',
      row.report_type === 'job'
        ? (row.reported_entity?.JobProfile?.profile_english || row.reported_entity?.job_profile_name || row.report_id || '')
        : (row.reported_entity?.name || row.report_id || ''),
      row.reason?.reason_english || row.reason?.reason_hindi || row.reason_id || '',
      row.read_at ? 'Read' : 'Unread',
      formatExportDateTime(row.created_at)
    ]);
    const csv = [headers.map(escape).join(','), ...rowsCsv.map(r => r.map(escape).join(','))].join('\n');
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
      const typeLabel = reportTypeFilter || 'all';
      const selectedReason = reasonFilter
        ? (reasonsForApplied || []).find(r => String(r.id) === String(reasonFilter))
        : null;
      const reasonLabel = selectedReason
        ? (selectedReason.reason_english || selectedReason.reason_hindi || reasonFilter)
        : (reasonFilter || 'all');
      const readLabel = readStatusFilter || 'all';
      await logsApi.create({
        category: 'voilation reports',
        type: 'export',
        redirect_to: '/violation-reports',
        log_text: `Exported violation reports (type=${typeLabel}, reason=${reasonLabel}, read=${readLabel})`,
      });
    } catch (e) {
      // do not break export flow if logging fails
    }
  };

  useEffect(() => {
    if (appliedQuerySignature === querySignature) {
      if (!queryHydrated) setQueryHydrated(true);
      return;
    }
    setReportTypeFilter(normalizedReportTypeFromQuery);
    setReasonFilter('');
    setDraftFilters(prev => ({
      ...prev,
      reportTypeFilter: normalizedReportTypeFromQuery,
      reasonFilter: ''
    }));
    setAppliedQuerySignature(querySignature);
    setQueryHydrated(true);
  }, [appliedQuerySignature, querySignature, normalizedReportTypeFromQuery, queryHydrated]);

  if (!canViewViolations) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={() => setSidebarOpen(o => !o)} onLogout={handleLogout} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content violation-reports-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="list-header">
                <h1>Violation Reports</h1>
              </div>

              <div className="inline-message error">
                You do not have access to view violation reports.
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header onMenuClick={() => setSidebarOpen(o => !o)} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content violation-reports-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            <div className="list-header">
              <h1>Violation Reports</h1>
            </div>

            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            <div className="search-filter-row" style={{ marginBottom:'10px', display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:'1 1 auto' }}>
                <label htmlFor="violation-search" style={{ fontSize:'12px', fontWeight:600 }}>Search:</label>
                <input
                  id="violation-search"
                  type="text"
                  className="state-filter-select"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="id, reporter, description..."
                  style={{ maxWidth:'260px' }}
                />
              </div>
              <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
                <button className="btn-secondary btn-small" onClick={toggleFilterPanel}>
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
                <LogsAction category="voilation reports" />
                {canExportViolations && (
                  <button className="btn-secondary btn-small" onClick={exportToCSV}>
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            <div className="applied-filters" style={{ marginBottom:'12px', display:'flex', flexWrap:'wrap', gap:'8px', padding:'10px 12px', border:'1px solid #e2e8f0', background:'#fff', borderRadius:'10px', boxShadow:'0 2px 4px rgba(0,0,0,0.06)' }}>
              {searchTerm && (
                <span style={chipBaseStyle}>
                  Search: {searchTerm}
                  <button style={chipCloseStyle} onClick={() => removeChip('search')}>×</button>
                </span>
              )}
              {reportTypeFilter && (
                <span style={chipBaseStyle}>
                  Type: {reportTypeFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('report_type')}>×</button>
                </span>
              )}
              {reasonFilter && (
                <span style={chipBaseStyle}>
                  Reason: {reasonsForApplied.find(r => String(r.id) === String(reasonFilter))?.reason_english || reasonFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('reason')}>×</button>
                </span>
              )}
              {readStatusFilter && (
                <span style={chipBaseStyle}>
                  Status: {readStatusFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('read_status')}>×</button>
                </span>
              )}
              {!activeFilterCount && <span style={{ fontSize:'12px', color:'#64748b' }}>No filters applied</span>}
            </div>

            {showFilterPanel && (
              <div
                className="filter-panel"
                style={{
                  position: 'relative',
                  marginBottom: '16px',
                  padding: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  background: '#fafafa',
                  width: '100%'
                }}
              >
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'18px' }}>
                  {/* Report type select */}
                  <div>
                    <label className="filter-label">Report Type</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.reportTypeFilter}
                      onChange={(e) => setDraftFilters(f => ({ ...f, reportTypeFilter: e.target.value, reasonFilter: '' }))}
                      style={{ width: '100%', minWidth: 0 }}
                    >
                      <option value="">All</option>
                      <option value="job">Job</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>
                  {/* Reason select */}
                  <div>
                    <label className="filter-label">Reason</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.reasonFilter}
                      onChange={(e) => setDraftFilters(f => ({ ...f, reasonFilter: e.target.value }))}
                      disabled={!draftFilters.reportTypeFilter}
                      style={{ width: '100%', minWidth: 0 }}
                    >
                      <option value="">All</option>
                      {reasonsForDraft.map(reason => (
                        <option key={reason.id} value={reason.id}>
                          {reason.reason_english || reason.reason_hindi || reason.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Read status select */}
                  <div>
                    <label className="filter-label">Read Status</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.readStatusFilter}
                      onChange={(e) => setDraftFilters(f => ({ ...f, readStatusFilter: e.target.value }))}
                      style={{ width: '100%', minWidth: 0 }}
                    >
                      <option value="">All</option>
                      <option value="unread">Unread</option>
                      <option value="read">Read</option>
                    </select>
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
              <table className="data-table" style={{ minWidth:'1400px' }}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} style={{ cursor:'pointer' }}>ID{headerIndicator('id')}</th>
                    <th onClick={() => handleSort('report_type')} style={{ cursor:'pointer' }}>Report Type{headerIndicator('report_type')}</th>
                    <th>Reporter Name</th>
                    <th>Reported Entity</th>
                    <th>Reason</th>
                    <th>Description</th>
                    <th onClick={() => handleSort('created_at')} style={{ cursor:'pointer' }}>Created{headerIndicator('created_at')}</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10">Loading...</td></tr>
                  ) : rows.length ? (
                    rows.map(r => {
                      const reasonText = r.reason
                        ? (r.reason.reason_english || r.reason.reason_hindi || r.reason_id)
                        : r.reason_id;
                      const reporterName = r.reporter_entity?.name || '-';
                      const reportedName = r.report_type === 'job'
                        ? (r.reported_entity?.JobProfile?.profile_english || r.reported_entity?.job_profile_name || `Job #${r.report_id}`)
                        : (r.reported_entity?.name || `ID: ${r.report_id}`);
                      const reportType = r.report_type;
                      const isRead = !!r.read_at;
                      return (
                        <tr
                          key={r.id}
                          style={{
                            background: isRead ? '#f3f4f6' : '#ffffff',
                            color: isRead ? '#94a3b8' : '#0f172a'
                          }}
                        >
                          {/* ID, type, reporter, reported, reason, description */}
                          <td>{r.id}</td>
                          <td>{r.report_type}</td>
                          <td>
                            {(() => {
                              const canLink = (reportType === 'job' && (r.reporter_entity?.id || r.user_id)) ||
                                              (reportType === 'employee' && (r.reporter_entity?.id || r.user_id));
                              return canLink ? (
                                <button
                                  type="button"
                                  style={linkButtonStyle}
                                  onClick={() => openReporterProfile(r)}
                                >
                                  {reporterName}
                                </button>
                              ) : reporterName;
                            })()}
                          </td>
                          <td>
                            {(() => {
                              const shouldLinkJob = reportType === 'job' && r.report_id;
                              const shouldLinkEmployee = reportType === 'employee' && (r.reported_entity?.id || r.report_id);
                              return (shouldLinkJob || shouldLinkEmployee) ? (
                                <button
                                  type="button"
                                  style={linkButtonStyle}
                                  onClick={() => openReportedProfile(r)}
                                >
                                  {reportedName}
                                </button>
                              ) : reportedName;
                            })()}
                          </td>
                          <td>{reasonText}</td>
                          <td style={{ maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {r.description || '-'}
                          </td>
                          <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                          <td>
                            <button className="btn-small" onClick={() => viewRow(r.id)} style={{ marginRight: 4 }}>
                              View
                            </button>
                            {canManageViolations && (
                              <button
                                className="btn-small"
                                disabled={isRead}
                                onClick={() => markRead(r.id)}
                                style={{
                                  marginRight: 4,
                                  background: isRead ? '#9ca3af' : '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: isRead ? 'not-allowed' : 'pointer'
                                }}
                              >
                                Mark Read
                              </button>
                            )}
                            {canDeleteViolations && (
                              <button className="btn-small btn-delete" onClick={() => deleteRow(r.id)}>
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="10">No data</td></tr>
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
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Report #{viewItem.id}</h3>
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
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 1fr',
                        rowGap: '16px',
                        columnGap: '18px',
                        fontSize: '14px'
                      }}
                    >
                      <strong style={{ textAlign:'right', color:'#64748b' }}>Report Type:</strong><span>{viewItem.report_type}</span>
                      <strong style={{ textAlign:'right', color:'#64748b' }}>Reporter Name:</strong><span>{viewItem.reporter_entity?.name || '—'}</span>
                      <strong style={{ textAlign:'right', color:'#64748b' }}>Reported Entity:</strong>
                      <span>
                        {viewItem.report_type === 'job'
                          ? (viewItem.reported_entity?.JobProfile?.profile_english || viewItem.reported_entity?.job_profile_name || `Job #${viewItem.report_id}`)
                          : (viewItem.reported_entity?.name || viewItem.report_id || '—')}
                      </span>
                      <strong style={{ textAlign:'right', color:'#64748b' }}>Reason:</strong><span>{viewItem.reason
                        ? (viewItem.reason.reason_english || viewItem.reason.reason_hindi || viewItem.reason_id)
                        : viewItem.reason_id}</span>
                      <strong style={{ textAlign:'right', color:'#64748b', alignSelf:'start' }}>Description:</strong>
                      <div
                        style={{
                          background:'#f8fafc',
                          padding:'12px',
                          borderRadius:'10px',
                          fontSize:'14px',
                          lineHeight:1.5,
                          border:'1px solid rgba(148,163,184,0.4)'
                        }}
                      >
                        {viewItem.description || '—'}
                      </div>
                      <strong style={{ textAlign:'right', color:'#64748b' }}>Created:</strong><span>{viewItem.created_at ? new Date(viewItem.created_at).toLocaleString() : '—'}</span>
                      {viewItem.read_at && (
                        <>
                          <strong style={{ textAlign:'right', color:'#64748b' }}>Read At:</strong>
                          <span>{new Date(viewItem.read_at).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                    <div style={{ marginTop:'26px', textAlign:'right', display:'flex', justifyContent:'flex-end', gap:'10px' }}>
                      {!viewItem.read_at && canManageViolations && (
                        <button
                          className="btn-small btn-secondary"
                          onClick={(e) => { e.stopPropagation(); markRead(viewItem.id); }}
                          style={{
                            padding:'10px 20px',
                            fontSize:'13px',
                            borderRadius:'10px',
                            background:'#16a34a',
                            border:'none',
                            color:'#fff',
                            boxShadow:'0 10px 18px rgba(22,163,74,0.25)'
                          }}
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        className="btn-small btn-secondary"
                        onClick={closeView}
                        style={{
                          padding:'10px 20px',
                          fontSize:'13px',
                          borderRadius:'10px',
                          background:'#1d4ed8',
                          border:'none',
                          color:'#fff',
                          boxShadow:'0 10px 18px rgba(29,78,216,0.3)'
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
