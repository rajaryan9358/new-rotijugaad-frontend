import React, { useEffect, useState, useMemo } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import paymentHistoryApi from '../../api/paymentHistoryApi';
import employeeSubscriptionPlansApi from '../../api/subscriptions/employeeSubscriptionPlansApi'; // added
import employerSubscriptionPlansApi from '../../api/subscriptions/employerSubscriptionPlansApi'; // added
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

export default function PaymentHistoryManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedStatusFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const status = (params.get('status') || '').trim().toLowerCase();
    return ['active', 'pending', 'completed', 'failed'].includes(status) ? status : '';
  }, [location.search]);
  const querySignature = useMemo(
    () => JSON.stringify({ status: normalizedStatusFromQuery }),
    [normalizedStatusFromQuery]
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('');
  const [plans, setPlans] = useState([]);
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(normalizedStatusFromQuery);
  const [expiryStatus, setExpiryStatus] = useState('');
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
    userType: '',
    plan: '',
    status: normalizedStatusFromQuery,
    expiryStatus: ''
  });
  const [planOptions, setPlanOptions] = useState({});
  const [queryHydrated, setQueryHydrated] = useState(false);
  const [appliedQuerySignature, setAppliedQuerySignature] = useState('');

  const canViewPayments = hasPermission(PERMISSIONS.PAYMENT_HISTORY_VIEW);
  const canDeletePayments = hasPermission(PERMISSIONS.PAYMENT_HISTORY_DELETE);
  const canExportPayments = hasPermission(PERMISSIONS.PAYMENT_HISTORY_EXPORT);

  useEffect(() => {
    if (appliedQuerySignature === querySignature) {
      if (!queryHydrated) setQueryHydrated(true);
      return;
    }
    if (normalizedStatusFromQuery === 'active') {
      setExpiryStatus('active');
      setStatusFilter('');
      setDraftFilters((prev) => ({ ...prev, status: '', expiryStatus: 'active' }));
    } else {
      setExpiryStatus('');
      setStatusFilter(normalizedStatusFromQuery);
      setDraftFilters((prev) => ({ ...prev, status: normalizedStatusFromQuery, expiryStatus: '' }));
    }
    setAppliedQuerySignature(querySignature);
    setQueryHydrated(true);
  }, [appliedQuerySignature, querySignature, normalizedStatusFromQuery, queryHydrated]);

  useEffect(() => {
    if (!canViewPayments) return;
    fetchPlans();
  }, [canViewPayments, userType]);

  const fetchPlans = async () => { // modified
    if (!userType) {
      setPlans([]);
      return;
    }
    try {
      const res = userType === 'employee'
        ? await employeeSubscriptionPlansApi.getAll()
        : await employerSubscriptionPlansApi.getAll();
      setPlans(res.data?.data || []);
    } catch (e) {
      console.error('[payment-history] fetchPlans error', e);
      setPlans([]);
    }
  };

  const ensurePlans = React.useCallback(async (targetType) => {
    if (!targetType || planOptions[targetType]) return;
    try {
      const res = targetType === 'employee'
        ? await employeeSubscriptionPlansApi.getAll()
        : await employerSubscriptionPlansApi.getAll();
      setPlanOptions(prev => ({ ...prev, [targetType]: res.data?.data || [] }));
    } catch (e) {
      console.error('[payment-history] ensurePlans error', e);
      setPlanOptions(prev => ({ ...prev, [targetType]: [] }));
    }
  }, [planOptions]);

  useEffect(() => { ensurePlans(userType); }, [userType, ensurePlans]);
  useEffect(() => {
    if (showFilterPanel) ensurePlans(draftFilters.userType);
  }, [showFilterPanel, draftFilters.userType, ensurePlans]);

  const plansForApplied = userType ? (planOptions[userType] || []) : [];
  const plansForDraft = draftFilters.userType ? (planOptions[draftFilters.userType] || []) : [];

  const buildQueryParams = React.useCallback((overrides = {}) => ({
    page: overrides.page ?? currentPage,
    limit: overrides.limit ?? pageSize,
    sortField,
    sortDir,
    search: searchTerm.trim() || undefined,
    user_type: userType || undefined,
    plan_id: planFilter || undefined,
    status: statusFilter || undefined,
    expiry_status: expiryStatus || undefined
  }), [currentPage, pageSize, sortField, sortDir, searchTerm, userType, planFilter, statusFilter, expiryStatus]);

  const fetchRows = React.useCallback(async () => {
    if (!canViewPayments) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await paymentHistoryApi.getPaymentHistory(buildQueryParams());
      const payload = res.data || {};
      setRows(Array.isArray(payload.data) ? payload.data : []);
      const meta = payload.meta || {};
      setTotalCount(meta.total ?? (payload.data?.length || 0));
      setTotalPages(meta.totalPages ?? 1);
    } catch (e) {
      console.error('[payment-history] fetch error', e);
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
      setMessage({ type: 'error', text: 'Failed to load payment history' });
    } finally {
      setLoading(false);
    }
  }, [canViewPayments, buildQueryParams]);

  useEffect(() => {
    if (canViewPayments && queryHydrated) fetchRows();
  }, [canViewPayments, fetchRows, queryHydrated]);

  const toggleFilterPanel = () => {
    if (showFilterPanel) return setShowFilterPanel(false);
    setDraftFilters({ userType, plan: planFilter, status: statusFilter, expiryStatus });
    setShowFilterPanel(true);
  };

  const applyFilters = () => {
    setUserType(draftFilters.userType);
    setPlanFilter(draftFilters.userType ? draftFilters.plan : '');
    setStatusFilter(draftFilters.status);
    setExpiryStatus(draftFilters.expiryStatus);
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const clearFilters = () => {
    setUserType('');
    setPlanFilter('');
    setStatusFilter('');
    setExpiryStatus('');
    setDraftFilters({ userType: '', plan: '', status: '', expiryStatus: '' });
    setSortField('id');
    setSortDir('desc');
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const removeChip = (key) => {
    if (key === 'search') setSearchTerm('');
    if (key === 'user_type') setUserType('');
    if (key === 'plan') setPlanFilter('');
    if (key === 'status') setStatusFilter('');
    if (key === 'expiry') setExpiryStatus('');
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
    return `payment_history_${dd}-${MM}-${yyyy}_${hh}_${mm}_${ss}_${suffix}_.csv`;
  };

  const exportToCSV = async () => {
    if (!canExportPayments) {
      setMessage({ type: 'error', text: 'You do not have permission to export payment history.' });
      return;
    }
    const baseParams = buildQueryParams({ page: 1 });
    const exportRows = [];
    let page = 1;
    let totalPagesFromServer = null;
    let totalRecordsFromServer = null;
    const requestedLimit = baseParams.limit || pageSize || 25;

    try {
      while (true) {
        const res = await paymentHistoryApi.getPaymentHistory({ ...baseParams, page });
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
      console.error('[payment-history] export error', error);
      setMessage({ type: 'error', text: 'Failed to export payment history' });
      return;
    }

    if (!exportRows.length) {
      setMessage({ type: 'error', text: 'No payment records found for current filters.' });
      return;
    }

    const headers = ['ID','User Type','User','Plan','Total Price','Status','Order ID','Payment ID','Expiry','Created At'];
    const escapeCsv = (val) => {
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
      row.user_type || '',
      row.entity?.name || row.user?.name || '',
      row.plan?.plan_name_english || row.plan?.plan_name_hindi || row.plan_id || '',
      row.price_total ?? '',
      row.status || '',
      row.order_id || '',
      row.payment_id || '',
      formatExportDateTime(row.expiry_at),
      formatExportDateTime(row.created_at)
    ]);
    const csv = [headers.map(escapeCsv).join(','), ...rowsCsv.map((r) => r.map(escapeCsv).join(','))].join('\n');
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

  const activeFilterCount = [searchTerm.trim(), userType, planFilter, statusFilter, expiryStatus].filter(Boolean).length;
  const pageSummary = totalCount > 0
    ? {
        start: Math.min((currentPage - 1) * pageSize + 1, totalCount),
        end: Math.min((currentPage - 1) * pageSize + rows.length, totalCount)
      }
    : { start: 0, end: 0 };

  useEffect(() => { setCurrentPage(1); }, [userType, planFilter, statusFilter, expiryStatus, pageSize]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (delta) => {
    setCurrentPage(p => Math.min(Math.max(1, p + delta), totalPages));
  };

  const viewRow = async (id) => {
    try {
      const res = await paymentHistoryApi.getPaymentHistoryById(id);
      setViewItem(res.data?.data || null);
    } catch {
      setMessage({ type: 'error', text: 'View failed' });
    }
  };

  const deleteRow = async (id) => {
    if (!canDeletePayments) {
      setMessage({ type: 'error', text: 'You do not have permission to delete payment history.' });
      return;
    }
    if (!window.confirm('Delete this payment history item?')) return;
    try {
      await paymentHistoryApi.deletePaymentHistory(id);
      setRows(r => r.filter(row => row.id !== id));
    } catch {
      setMessage({ type: 'error', text: 'Delete failed' });
    }
  };

  const closeView = () => setViewItem(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const linkButtonStyle = {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontWeight: 600,
    fontSize: 'inherit'
  };
  const statusBadgePalette = {
    completed: { bg: '#dcfce7', color: '#166534' },
    failed: { bg: '#fee2e2', color: '#b91c1c' },
    pending: { bg: '#fef3c7', color: '#92400e' }
  };
  const renderStatusBadge = (status) => {
    if (!status) return '—';
    const tone = statusBadgePalette[status.toLowerCase()] || { bg: '#e2e8f0', color: '#475569' };
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '72px',
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 700,
          background: tone.bg,
          color: tone.color,
          textTransform: 'capitalize'
        }}
      >
        {status}
      </span>
    );
  };
  const formatSubscriptionLabel = (payment) => {
    const planName = payment.plan
      ? (payment.plan.plan_name_english || payment.plan.plan_name_hindi || payment.plan.id)
      : (payment.plan_id || 'No plan');
    const expiryDate = payment.expiry_at ? new Date(payment.expiry_at) : null;
    const isActive = expiryDate ? expiryDate.getTime() >= Date.now() : false;
    const colors = expiryDate
      ? (isActive
          ? { bg: '#dcfce7', color: '#166534', border: '#86efac', caption: 'Active' }
          : { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', caption: 'Expired' })
      : { bg: '#f3f4f6', color: '#1f2937', border: '#e5e7eb', caption: 'No expiry' };
    return (
      <span
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          border: `1px solid ${colors.border}`,
          background: colors.bg,
          color: colors.color,
          padding: '6px 10px',
          borderRadius: '8px',
          fontSize: '11px',
          minWidth: '180px'
        }}
      >
        <strong style={{ fontSize: '12px' }}>{planName}</strong>
        <span style={{ fontSize: '11px' }}>
          {colors.caption}
          {expiryDate ? ` • ${expiryDate.toLocaleDateString()}` : ''}
        </span>
      </span>
    );
  };
  const openProfile = (path) => {
    if (!path) return;
    window.open(path, '_blank', 'noopener');
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

  if (!canViewPayments) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={() => setSidebarOpen(o => !o)} onLogout={handleLogout} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="list-header">
                <h1>Payment History</h1>
              </div>

              <div className="no-access-message">
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Access Denied</h2>
                <p>You do not have permission to view the payment history.</p>
                <button
                  onClick={handleLogout}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Logout
                </button>
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
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            <div className="list-header">
              <h1>Payment History</h1>
            </div>

            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            <div className="search-filter-row" style={{ marginBottom:'10px', display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:'1 1 auto' }}>
                <label htmlFor="payment-history-search" style={{ fontSize:'12px', fontWeight:600 }}>Search:</label>
                <input
                  id="payment-history-search"
                  type="text"
                  className="state-filter-select"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="id, order id, payment id..."
                  style={{ maxWidth:'260px' }}
                />
              </div>
              <div style={{ display:'flex', gap:'8px', marginLeft:'auto' }}>
                <button className="btn-secondary btn-small" onClick={toggleFilterPanel}>
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
                {canExportPayments && (
                  <button className="btn-secondary btn-small" onClick={exportToCSV}>
                    Export CSV
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize:'11px', color:'#64748b', marginBottom:'12px' }}>
              Tip: search by user name, order ID, or payment ID.
            </div>

            <div className="applied-filters" style={{ marginBottom:'12px', display:'flex', flexWrap:'wrap', gap:'8px', padding:'10px 12px', border:'1px solid #e2e8f0', background:'#fff', borderRadius:'10px', boxShadow:'0 2px 4px rgba(0,0,0,0.06)' }}>
              {searchTerm && (
                <span className="badge chip" style={chipBaseStyle}>
                  Search: {searchTerm}
                  <button style={chipCloseStyle} onClick={() => removeChip('search')}>×</button>
                </span>
              )}
              {userType && (
                <span className="badge chip" style={chipBaseStyle}>
                  User Type: {userType}
                  <button style={chipCloseStyle} onClick={() => removeChip('user_type')}>×</button>
                </span>
              )}
              {planFilter && (
                <span className="badge chip" style={chipBaseStyle}>
                  Plan: {plansForApplied.find(p => String(p.id) === String(planFilter))?.plan_name_english || planFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('plan')}>×</button>
                </span>
              )}
              {statusFilter && (
                <span className="badge chip" style={chipBaseStyle}>
                  Status: {statusFilter}
                  <button style={chipCloseStyle} onClick={() => removeChip('status')}>×</button>
                </span>
              )}
              {expiryStatus && (
                <span className="badge chip" style={chipBaseStyle}>
                  Expiry: {expiryStatus}
                  <button style={chipCloseStyle} onClick={() => removeChip('expiry')}>×</button>
                </span>
              )}
              {!activeFilterCount && <span style={{ fontSize:'12px', color:'#64748b' }}>No filters applied</span>}
            </div>

            {showFilterPanel && (
              <div
                className="filter-panel"
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  background: '#f8fafc'
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '18px'
                  }}
                >
                  <div>
                    <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>User Type</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.userType}
                      onChange={(e) => setDraftFilters(f => ({ ...f, userType: e.target.value, plan: '' }))}
                      style={{ width:'100%', minWidth:0 }}
                    >
                      <option value="">All</option>
                      <option value="employee">Employee</option>
                      <option value="employer">Employer</option>
                    </select>
                  </div>
                  <div>
                    <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Plan</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.plan}
                      onChange={(e) => setDraftFilters(f => ({ ...f, plan: e.target.value }))}
                      disabled={!draftFilters.userType}
                      style={{ width:'100%', minWidth:0 }}
                    >
                      <option value="">All</option>
                      {plansForDraft.map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.plan_name_english || plan.plan_name_hindi || plan.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Status</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.status}
                      onChange={(e) => setDraftFilters(f => ({ ...f, status: e.target.value }))}
                      style={{ width:'100%', minWidth:0 }}
                    >
                      <option value="">All</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Expiry Status</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.expiryStatus}
                      onChange={(e) => setDraftFilters(f => ({ ...f, expiryStatus: e.target.value }))}
                      style={{ width:'100%', minWidth:0 }}
                    >
                      <option value="">All</option>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>
                <div
                  className="filter-actions"
                  style={{ marginTop: '18px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}
                >
                  <button className="btn-primary btn-small" onClick={applyFilters}>Apply</button>
                  <button className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                  <button className="btn-secondary btn-small" onClick={() => setShowFilterPanel(false)}>Close</button>
                </div>
              </div>
            )}

            <div className="table-container" style={{ overflowX:'auto' }}>
              <table className="data-table" style={{ minWidth:'1300px' }}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} style={{ cursor:'pointer' }}>ID{sortField === 'id' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th onClick={() => handleSort('user_type')} style={{ cursor:'pointer' }}>User Type{sortField === 'user_type' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th>User</th>
                    <th>Plan</th>
                    <th onClick={() => handleSort('price_total')} style={{ cursor:'pointer' }}>Total Price{sortField === 'price_total' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th onClick={() => handleSort('status')} style={{ cursor:'pointer' }}>Status{sortField === 'status' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th>Order ID</th>
                    <th>Payment ID</th>
                    <th onClick={() => handleSort('created_at')} style={{ cursor:'pointer' }}>Created{sortField === 'created_at' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10">Loading...</td></tr>
                  ) : rows.length ? (
                    rows.map(r => {
                      const entityName = r.user?.name || r.entity?.name || '—';
                      const detailPath = r.user_type === 'employee'
                        ? `/employees/${r.user_id}`
                        : `/employers/${r.user_id}`;
                      return (
                        <tr key={r.id}>
                          <td>{r.id}</td>
                          <td>{r.user_type || '-'}</td>
                          <td>
                            {entityName === '—' ? '—' : (
                              <button type="button" style={linkButtonStyle} onClick={() => openProfile(detailPath)}>
                                {entityName}
                              </button>
                            )}
                          </td>
                          <td>{formatSubscriptionLabel(r)}</td>
                          <td>{r.price_total ?? '-'}</td>
                          <td>{renderStatusBadge(r.status)}</td>
                          <td>{r.order_id || '-'}</td>
                          <td>{r.payment_id || '-'}</td>
                          <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                          <td>
                            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                              <button className="btn-small" onClick={() => viewRow(r.id)}>View</button>
                              {canDeletePayments && (
                                <button className="btn-small btn-delete" onClick={() => deleteRow(r.id)}>Delete</button>
                              )}
                            </div>
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
                    onChange={(e) => { setPageSize(parseInt(e.target.value, 10) || 25); setCurrentPage(1); }}
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
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Payment #{viewItem.id}</h3>
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
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>User Type:</strong>
                      <span>{viewItem.user_type}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>User ID:</strong>
                      <span>{viewItem.user_id}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Name:</strong>
                      <span>{viewItem.entity?.name || viewItem.user?.name || '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Plan:</strong>
                      <span>
                        {viewItem.plan
                          ? (viewItem.plan.plan_name_english || viewItem.plan.plan_name_hindi || viewItem.plan.id)
                          : (viewItem.plan_id || '—')}
                      </span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Total Price:</strong>
                      <span>{viewItem.price_total}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Status:</strong>
                      <span>{renderStatusBadge(viewItem.status)}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Order ID:</strong>
                      <span>{viewItem.order_id || '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Payment ID:</strong>
                      <span>{viewItem.payment_id || '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Signature:</strong>
                      <span style={{ wordBreak: 'break-all', lineHeight: '1.3' }}>{viewItem.payment_signature || '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Contact Credit:</strong>
                      <span>{viewItem.contact_credit ?? '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Interest Credit:</strong>
                      <span>{viewItem.interest_credit ?? '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Ads Credit:</strong>
                      <span>{viewItem.ads_credit ?? '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Created:</strong>
                      <span>{viewItem.created_at ? new Date(viewItem.created_at).toLocaleString() : '—'}</span>
                    </div>
                    <div style={{ marginTop: '26px', textAlign: 'right' }}>
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
