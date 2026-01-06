import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import ConfirmDialog from '../../components/ConfirmDialog';
import usersApi from '../../api/usersApi';
import logsApi from '../../api/logsApi';
import EmployeeForm from '../../components/Forms/EmployeeForm';
import EmployerForm from '../../components/Forms/EmployerForm';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import '../Masters/MasterPage.css';

const DEFAULT_PAGE_SIZE = 25;
const LAST_ACTIVE_SINCE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '15', label: 'Last 15 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 180 days' },
  { value: '365', label: 'Last 365 days' }
];

export default function UsersManagement() {
  const location = useLocation();
  const recencyIsNew = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('recency') === 'new';
  }, [location.search]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState([]);
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [lastActiveSince, setLastActiveSince] = useState('');
  const [newUserFilter, setNewUserFilter] = useState(recencyIsNew ? 'new' : '');

  // NEW: created date range filter (YYYY-MM-DD)
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  // NEW: profile completion filter: '' | 'completed' | 'not_completed'
  const [profileCompletedFilter, setProfileCompletedFilter] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState({
    userTypeFilter: '',
    statusFilter: '',
    verificationFilter: '',
    kycFilter: '',
    lastActiveSince: '',
    newUserFilter: recencyIsNew ? 'new' : '',
    createdFrom: '',
    createdTo: '',
    // NEW
    profileCompletedFilter: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '' });
  // NEW: Deactivation reason modal state
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateSaving, setDeactivateSaving] = useState(false);
  const [deactivateError, setDeactivateError] = useState(null);
  const [deactivateUser, setDeactivateUser] = useState(null);
  const [message, setMessage] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [employeeModalUser, setEmployeeModalUser] = useState(null);
  const [employerModalUser, setEmployerModalUser] = useState(null);
  const [activeForm, setActiveForm] = useState(null);
  const [filterColumns, setFilterColumns] = useState(3);
  const navigate = useNavigate();
  const PAGE_SCROLL_KEY = 'users-scroll';

  const filterFieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
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
    justifyContent: 'center',
    transition: 'background 0.2s'
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

  const renderStatusBadge = (value) => {
    const normalized = (value || '').toLowerCase();
    const palette = {
      verified: { bg: '#dcfce7', color: '#166534', label: 'Verified' },
      approved: { bg: '#dcfce7', color: '#166534', label: 'Approved' },
      pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' }
    };
    const tone = palette[normalized] || { bg: '#e5e7eb', color: '#0f172a', label: value || '-' };
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '72px',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        background: tone.bg,
        color: tone.color,
        textTransform: 'capitalize'
      }}>
        {tone.label}
      </span>
    );
  };

  const userPerms = React.useMemo(() => ({
    canExport: hasPermission(PERMISSIONS.USERS_EXPORT),
    canActivate: hasPermission(PERMISSIONS.USERS_ACTIVATE),
    canDelete: hasPermission(PERMISSIONS.USERS_DELETE),
    canManageProfiles: hasPermission(PERMISSIONS.USERS_MANAGE_PROFILES)
  }), []);

  const canViewUsers = hasPermission(PERMISSIONS.USERS_VIEW);
  const canShowEmployeePhoneAddress = hasPermission(PERMISSIONS.EMPLOYEES_SHOW_PHONE_ADDRESS);
  const canShowEmployerPhoneAddress = hasPermission(PERMISSIONS.EMPLOYERS_SHOW_PHONE_ADDRESS);

  const buildQueryParams = React.useCallback((overrides = {}) => {
    const params = {
      page: currentPage,
      limit: pageSize,
      sortField,
      sortDir,
      search: searchTerm.trim() || undefined,
      user_type: userTypeFilter || undefined,
      status: statusFilter || undefined,
      verification_status: verificationFilter || undefined,
      kyc_status: kycFilter || undefined,
      lastActiveSinceDays: lastActiveSince || undefined,
      newFilter: newUserFilter || undefined,
      created_from: createdFrom || undefined,
      created_to: createdTo || undefined,
      // NEW (backend expects profile_completed)
      profile_completed: profileCompletedFilter || undefined
    };
    const merged = { ...params, ...overrides };
    return Object.fromEntries(
      Object.entries(merged).filter(([, value]) => value !== undefined && value !== '')
    );
  }, [
    currentPage,
    pageSize,
    sortField,
    sortDir,
    searchTerm,
    userTypeFilter,
    statusFilter,
    verificationFilter,
    kycFilter,
    lastActiveSince,
    newUserFilter,
    createdFrom,
    createdTo,
    profileCompletedFilter // NEW
  ]);

  const load = React.useCallback(async (overrides = {}) => {
    setLoading(true);
    try {
      const params = buildQueryParams(overrides);
      const res = await usersApi.getAll(params);
      const rows = res.data?.data || [];
      const meta = res.data?.meta || {};
      setUsers(rows);
      setTotalCount(Number(meta.total) || rows.length);
      setTotalPages(Number(meta.totalPages) || 1);
    } catch (error) {
      setUsers([]);
      setTotalCount(0);
      setTotalPages(1);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  useEffect(() => {
    if (!canViewUsers) return;
    setSidebarOpen(getSidebarState());
    load();
  }, [canViewUsers, load]);

  useEffect(() => {
    const updateFilterColumns = () => {
      const width = window.innerWidth;
      if (width >= 1200) setFilterColumns(3);
      else if (width >= 768) setFilterColumns(2);
      else setFilterColumns(1);
    };
    updateFilterColumns();
    window.addEventListener('resize', updateFilterColumns);
    return () => window.removeEventListener('resize', updateFilterColumns);
  }, []);

  useEffect(() => {
    if (!canViewUsers) return;
    const main = document.querySelector('.main-content');
    if (!main) return;
    const pos = getScrollPosition(PAGE_SCROLL_KEY);
    main.scrollTop = pos;
    const onScroll = () => saveScrollPosition(PAGE_SCROLL_KEY, main.scrollTop);
    main.addEventListener('scroll', onScroll);
    return () => main.removeEventListener('scroll', onScroll);
  }, [canViewUsers]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const handleMenuClick = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    saveSidebarState(newState);
  };

  const confirmDelete = (id) => {
    setConfirm({
      open: true,
      id,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm({ ...confirm, open: false });
    try {
      await usersApi.deleteUser(id);
      setMessage({ type: 'success', text: 'User deleted successfully' });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to delete user' });
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateUser) return;
    const reason = (deactivateReason || '').toString().trim();
    if (!reason) {
      setDeactivateError('Deactivation reason is required.');
      return;
    }
    setDeactivateSaving(true);
    setDeactivateError(null);
    try {
      await usersApi.updateUserStatus(deactivateUser.id, false, reason);
      setMessage({ type: 'success', text: 'User deactivated successfully' });
      setShowDeactivateDialog(false);
      setDeactivateUser(null);
      setDeactivateReason('');
      await load();
    } catch (e) {
      setDeactivateError(e.response?.data?.message || 'Failed to deactivate user');
    } finally {
      setDeactivateSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextActive = !user.is_active;
    if (nextActive === false) {
      setDeactivateUser(user);
      setDeactivateReason('');
      setDeactivateError(null);
      setShowDeactivateDialog(true);
      return;
    }
    try {
      await usersApi.updateUserStatus(user.id, true);
      setMessage({ type: 'success', text: 'User activated successfully' });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to update status' });
    }
  };

  const handleHeaderClick = (field) => {
    if (sortField === field) {
      setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const headerSortIndicator = (field) =>
    sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const toggleFilterPanel = () => {
    if (showFilterPanel) return setShowFilterPanel(false);
    setDraftFilters({
      userTypeFilter,
      statusFilter,
      verificationFilter,
      kycFilter,
      lastActiveSince,
      newUserFilter,
      createdFrom,
      createdTo,
      // NEW
      profileCompletedFilter
    });
    setShowFilterPanel(true);
  };

  const applyDraftFilters = () => {
    setUserTypeFilter(draftFilters.userTypeFilter);
    setStatusFilter(draftFilters.statusFilter);
    setVerificationFilter(draftFilters.verificationFilter);
    setKycFilter(draftFilters.kycFilter);
    setLastActiveSince(draftFilters.lastActiveSince);
    setNewUserFilter(draftFilters.newUserFilter);
    setCreatedFrom(draftFilters.createdFrom);
    setCreatedTo(draftFilters.createdTo);
    // NEW
    setProfileCompletedFilter(draftFilters.profileCompletedFilter);

    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const clearFilters = () => {
    setUserTypeFilter('');
    setStatusFilter('');
    setVerificationFilter('');
    setKycFilter('');
    setLastActiveSince('');
    setNewUserFilter('');
    setCreatedFrom('');
    setCreatedTo('');
    // NEW
    setProfileCompletedFilter('');

    setDraftFilters({
      userTypeFilter: '',
      statusFilter: '',
      verificationFilter: '',
      kycFilter: '',
      lastActiveSince: '',
      newUserFilter: '',
      createdFrom: '',
      createdTo: '',
      // NEW
      profileCompletedFilter: ''
    });
    setSortField('id');
    setSortDir('asc');
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const removeFilterChip = (key) => {
    if (key === 'user_type') setUserTypeFilter('');
    if (key === 'status') setStatusFilter('');
    if (key === 'verification') setVerificationFilter('');
    if (key === 'kyc') setKycFilter('');
    if (key === 'last_active_since') setLastActiveSince('');
    if (key === 'new_user') {
      setNewUserFilter('');
      setDraftFilters((prev) => ({ ...prev, newUserFilter: '' }));
    }
    if (key === 'created_from') {
      setCreatedFrom('');
      setDraftFilters((prev) => ({ ...prev, createdFrom: '' }));
    }
    if (key === 'created_to') {
      setCreatedTo('');
      setDraftFilters((prev) => ({ ...prev, createdTo: '' }));
    }
    if (key === 'search') setSearchTerm('');
    if (key === 'profile_completed') setProfileCompletedFilter(''); // NEW
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
    return `users_${dd}-${MM}-${yyyy}_${hh}_${mm}_${ss}_${suffix}_.csv`;
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
  const formatDisplayDateTime = (value) => {
    if (!value) return '-';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '-';
      return date.toLocaleString();
    } catch {
      return '-';
    }
  };
  // NEW: profile completion chip
  const renderProfileCompletedChip = (value) => {
    const d = value ? new Date(value) : null;
    const isValid = d && !Number.isNaN(d.getTime());
    if (!isValid) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          background: '#fee2e2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          whiteSpace: 'nowrap'
        }}>
          Incomplete
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '2px',
        padding: '6px 10px',
        borderRadius: '10px',
        background: '#dcfce7',
        color: '#166534',
        border: '1px solid #86efac',
        lineHeight: 1.2
      }}>
        <span style={{ fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap' }}>
          Profile Completed
        </span>
        <span style={{ fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {formatDisplayDateTime(value)}
        </span>
      </span>
    );
  };

  const getUserLifeDays = (value) => {
    if (!value) return '-';
    const createdTs = new Date(value).getTime();
    if (Number.isNaN(createdTs)) return '-';
    const days = Math.floor((Date.now() - createdTs) / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : '-';
  };

  const exportToCSV = async () => {
    const baseParams = buildQueryParams({ page: 1 });
    const exportRows = [];
    let page = 1;
    let totalPagesFromServer = null;
    let totalRecordsFromServer = null;
    const requestedLimit = baseParams.limit || pageSize || DEFAULT_PAGE_SIZE;

    try {
      while (true) {
        const res = await usersApi.getAll({ ...baseParams, page });
        const batch = Array.isArray(res.data?.data) ? res.data.data : [];
        exportRows.push(...batch);

        const metaInfo = res.data?.meta || {};
        if (typeof metaInfo.totalPages === 'number') totalPagesFromServer = metaInfo.totalPages;
        if (typeof metaInfo.total === 'number') totalRecordsFromServer = metaInfo.total;
        const serverLimit = metaInfo.limit || requestedLimit || batch.length || 1;

        // CHANGED: avoid function declared inside loop (no-loop-func)
        let shouldContinue = false;
        if (totalRecordsFromServer !== null) {
          shouldContinue = exportRows.length < totalRecordsFromServer;
        } else if (totalPagesFromServer !== null) {
          shouldContinue = page < totalPagesFromServer;
        } else {
          shouldContinue = batch.length === serverLimit;
        }

        if (!shouldContinue) break;
        page += 1;
      }
    } catch (error) {
      console.error('Export users error:', error);
      setMessage({ type: 'error', text: 'Failed to export users' });
      return;
    }

    if (!exportRows.length) {
      setMessage({ type: 'error', text: 'No users found for current filters.' });
      return;
    }

    const headers = [
      'ID',
      'Mobile',
      'Name',
      'User Type',
      'Referral Code',
      'Total Referred',
      'Verification Status',
      'KYC Status',
      'Status',
      'Deactivation Reason',
      // NEW
      'Status Changed By',
      'Last Seen',
      'Profile Completed',
      'Created At'
    ];
    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = exportRows.map(u => [
      u.id,
      u.mobile || '',
      u.name || '',
      u.user_type || '',
      u.referral_code || '',
      u.total_referred ?? '',
      u.verification_status || '',
      u.kyc_status || '',
      u.is_active ? 'Active' : 'Inactive',
      u.deactivation_reason || '',
      // NEW
      u.StatusChangedBy?.name || '',
      formatExportDateTime(u.last_active_at),
      formatExportDateTime(u.profile_completed_at),
      formatExportDateTime(u.created_at)
    ]);
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildExportFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    try {
      await logsApi.create({
        category: 'users',
        type: 'export',
        log_text: `Exported users (${exportRows.length})`,
        redirect_to: '/users'
      });
    } catch (e) {
      // ignore logging failures
    }
  };

  const openEmployeeCreate = (user) => {
    if (!userPerms.canManageProfiles) {
      setMessage({ type: 'error', text: 'Permission denied' });
      return;
    }
    setEmployeeModalUser({
      user_id: user.id,
      mobile: user.mobile || '',
      name: user.name || ''
    });
    setActiveForm('employee');
  };

  const openEmployerCreate = (user) => {
    if (!userPerms.canManageProfiles) {
      setMessage({ type: 'error', text: 'Permission denied' });
      return;
    }
    setEmployerModalUser({
      user_id: user.id,
      mobile: user.mobile || '',
      name: user.name || ''
    });
    setActiveForm('employer');
  };

  const closeActiveForm = () => {
    setActiveForm(null);
    setEmployeeModalUser(null);
    setEmployerModalUser(null);
  };

  const handleEmployeeFormSuccess = (msg) => {
    if (msg) setMessage(msg);
    closeActiveForm();
    load();
  };

  const handleEmployerFormSuccess = (msg) => {
    if (msg) setMessage(msg);
    closeActiveForm();
    load();
  };

  const handleEmployeeNameClick = (employeeId) => navigate(`/employees/${employeeId}`);
  const handleEmployerNameClick = (employerId) => navigate(`/employers/${employerId}`);

  useEffect(() => {
    const desired = recencyIsNew ? 'new' : '';
    setNewUserFilter((prev) => {
      if (prev === desired) return prev;
      setCurrentPage(1);
      return desired;
    });
    setDraftFilters((prev) =>
      prev.newUserFilter === desired ? prev : { ...prev, newUserFilter: desired }
    );
  }, [recencyIsNew]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasRecencyParam = params.get('recency') === 'new';
    if (newUserFilter === 'new' && !hasRecencyParam) {
      params.set('recency', 'new');
    } else if (newUserFilter !== 'new' && hasRecencyParam) {
      params.delete('recency');
    } else {
      return;
    }
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true }
    );
  }, [newUserFilter, location.pathname, location.search, navigate]);

  if (!canViewUsers) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content users-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view users.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const pageSummary = totalCount > 0
    ? {
        start: Math.min((currentPage - 1) * pageSize + 1, totalCount),
        end: Math.min((currentPage - 1) * pageSize + users.length, totalCount)
      }
    : { start: 0, end: 0 };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content users-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            {activeForm === 'employee' ? (
              <EmployeeForm
                presetUser={employeeModalUser}
                mobileLocked={!!employeeModalUser}
                onClose={closeActiveForm}
                onSuccess={handleEmployeeFormSuccess}
              />
            ) : activeForm === 'employer' ? (
              <EmployerForm
                presetUser={employerModalUser}
                userLocked={!!employerModalUser}
                onClose={closeActiveForm}
                onSuccess={handleEmployerFormSuccess}
              />
            ) : (
              <>
                <div className="list-header">
                  <h1>Users</h1>
                </div>
                <div
                  className="search-filter-row"
                  style={{
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:'1 1 auto' }}>
                    <label
                      htmlFor="search-term"
                      style={{ fontSize:'12px', fontWeight:600 }}
                    >Search:</label>
                    <input
                      id="search-term"
                      type="text"
                      className="state-filter-select"
                      value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      placeholder="id, mobile, name..."
                      style={{ maxWidth: '260px' }}
                    />
                  </div>
                  <div style={{ flex:'0 0 auto', display:'flex', gap:'8px' }}>
                    <button
                      className="btn-secondary btn-small"
                      onClick={toggleFilterPanel}
                      style={{ whiteSpace:'nowrap' }}
                    >
                      {showFilterPanel ? 'Hide Filters' : 'Filters'}
                    </button>
                    <LogsAction
                      category="users"
                      title="User Logs"
                      buttonLabel="Logs"
                      buttonStyle={{ whiteSpace: 'nowrap' }}
                    />
                    {userPerms.canExport && (
                      <button
                        className="btn-secondary btn-small"
                        onClick={exportToCSV}
                        style={{ whiteSpace:'nowrap' }}
                      >
                        Export CSV
                      </button>
                    )}
                  </div>
                </div>
                {/* Applied filter chips (unchanged) */}
                <div
                  className="applied-filters"
                  style={{
                    marginBottom: '12px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
                  }}
                >
                  {searchTerm && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Search: {searchTerm}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('search')}>×</button>
                    </span>
                  )}
                  {userTypeFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      User Type: {userTypeFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('user_type')}>×</button>
                    </span>
                  )}
                  {statusFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Status: {statusFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('status')}>×</button>
                    </span>
                  )}
                  {verificationFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Verification: {verificationFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('verification')}>×</button>
                    </span>
                  )}
                  {kycFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      KYC: {kycFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('kyc')}>×</button>
                    </span>
                  )}
                  {lastActiveSince && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Last Active: {LAST_ACTIVE_SINCE_OPTIONS.find(opt => opt.value === lastActiveSince)?.label || `${lastActiveSince} days`}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('last_active_since')}>×</button>
                    </span>
                  )}
                  {newUserFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      User Recency: New
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('new_user')}>×</button>
                    </span>
                  )}
                  {profileCompletedFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Profile Completed: {profileCompletedFilter === 'completed' ? 'Yes' : 'No'}
                      <button
                        className="chip-close"
                        style={chipCloseStyle}
                        onClick={() => removeFilterChip('profile_completed')}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {createdFrom && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Created From: {createdFrom}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('created_from')}>×</button>
                    </span>
                  )}
                  {createdTo && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Created To: {createdTo}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('created_to')}>×</button>
                    </span>
                  )}
                  {(!searchTerm && !userTypeFilter && !statusFilter && !verificationFilter && !kycFilter && !lastActiveSince && !newUserFilter && !profileCompletedFilter && !createdFrom && !createdTo) && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>No filters applied</span>
                  )}
                </div>
                {/* Filter panel (refactored layout) */}
                {showFilterPanel && (
                  <div
                    className="filter-panel"
                    style={{
                      position: 'relative',
                      marginBottom: '16px',
                      padding: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: '#fafafa'
                    }}
                  >
                    <div
                      className="filter-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${filterColumns}, minmax(0, 1fr))`,
                        gap: '16px'
                      }}
                    >
                      <div style={filterFieldStyle}>
                        <label className="filter-label">User Type</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.userTypeFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, userTypeFilter: e.target.value }))}
                          style={{ width: '100%' }}
                        >
                          <option value="">All</option>
                          <option value="employee">Employee</option>
                          <option value="employer">Employer</option>
                        </select>
                      </div>
                      <div style={filterFieldStyle}>
                        <label className="filter-label">Status</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.statusFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, statusFilter: e.target.value }))}
                          style={{ width: '100%' }}
                        >
                          <option value="">All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div style={filterFieldStyle}>
                        <label className="filter-label">Verification</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.verificationFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, verificationFilter: e.target.value }))}
                          style={{ width: '100%' }}
                        >
                          <option value="">All</option>
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div style={filterFieldStyle}>
                        <label className="filter-label">KYC</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.kycFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, kycFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div style={filterFieldStyle}>
                        <label className="filter-label">Last Active Since</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.lastActiveSince}
                          onChange={e => setDraftFilters(f => ({ ...f, lastActiveSince: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          {LAST_ACTIVE_SINCE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={filterFieldStyle}>
                        <label className="filter-label">User Recency</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.newUserFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, newUserFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          <option value="new">New</option>
                        </select>
                      </div>

                      {/* NEW: profile completed filter */}
                      <div style={filterFieldStyle}>
                        <label className="filter-label">Profile Completed</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.profileCompletedFilter}
                          onChange={(e) => setDraftFilters((f) => ({ ...f, profileCompletedFilter: e.target.value }))}
                          style={{ width: '100%' }}
                        >
                          <option value="">All</option>
                          <option value="completed">Completed</option>
                          <option value="not_completed">Not Completed</option>
                        </select>
                      </div>

                      {/* NEW: created date range */}
                      <div style={filterFieldStyle}>
                        <label className="filter-label">Created Date From</label>
                        <input
                          type="date"
                          className="state-filter-select"
                          value={draftFilters.createdFrom}
                          onChange={(e) => setDraftFilters((f) => ({ ...f, createdFrom: e.target.value }))}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={filterFieldStyle}>
                        <label className="filter-label">Created Date To</label>
                        <input
                          type="date"
                          className="state-filter-select"
                          value={draftFilters.createdTo}
                          onChange={(e) => setDraftFilters((f) => ({ ...f, createdTo: e.target.value }))}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <div className="filter-actions" style={{ marginTop:'18px', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                      <button type="button" className="btn-primary btn-small" onClick={applyDraftFilters}>Apply</button>
                      <button type="button" className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                      <button type="button" className="btn-secondary btn-small" onClick={() => setShowFilterPanel(false)}>Close</button>
                    </div>
                  </div>
                )}
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleHeaderClick('id')} style={{ cursor:'pointer' }}>
                          ID{headerSortIndicator('id')}
                        </th>
                        <th onClick={() => handleHeaderClick('mobile')} style={{ cursor:'pointer' }}>
                          Mobile{headerSortIndicator('mobile')}
                        </th>
                        <th onClick={() => handleHeaderClick('name')} style={{ cursor:'pointer' }}>
                          Name{headerSortIndicator('name')}
                        </th>
                        <th onClick={() => handleHeaderClick('user_type')} style={{ cursor:'pointer' }}>
                          User Type{headerSortIndicator('user_type')}
                        </th>
                        <th onClick={() => handleHeaderClick('referral_code')} style={{ cursor:'pointer' }}>
                          Referral Code{headerSortIndicator('referral_code')}
                        </th>
                        <th onClick={() => handleHeaderClick('total_referred')} style={{ cursor:'pointer' }}>
                          Referred{headerSortIndicator('total_referred')}
                        </th>
                        <th onClick={() => handleHeaderClick('verification_status')} style={{ cursor:'pointer' }}>
                          Verification{headerSortIndicator('verification_status')}
                        </th>
                        <th onClick={() => handleHeaderClick('kyc_status')} style={{ cursor:'pointer' }}>
                          KYC{headerSortIndicator('kyc_status')}
                        </th>
                        <th onClick={() => handleHeaderClick('is_active')} style={{ cursor:'pointer' }}>
                          Status{headerSortIndicator('is_active')}
                        </th>
                        <th>Deactivation Reason</th>

                        {/* NEW */}
                        <th>Status Changed By</th>

                        <th onClick={() => handleHeaderClick('last_active_at')} style={{ cursor:'pointer' }}>
                          Last Seen{headerSortIndicator('last_active_at')}
                        </th>

                        {/* NEW */}
                        <th onClick={() => handleHeaderClick('profile_completed_at')} style={{ cursor:'pointer' }}>
                          Profile Completed{headerSortIndicator('profile_completed_at')}
                        </th>

                        <th onClick={() => handleHeaderClick('created_at')} style={{ cursor:'pointer' }}>
                          Created{headerSortIndicator('created_at')}
                        </th>
                        <th>User Life (days)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          {/* CHANGED: colSpan +1 */}
                          <td colSpan="16" className="no-data">Loading...</td>
                        </tr>
                      ) : users.length ? (
                        users.map(u => {
                          const isInactive = !u.is_active;
                          const isEmployeeType = (u.user_type || '').toLowerCase() === 'employee';
                          const isEmployerType = (u.user_type || '').toLowerCase() === 'employer';
                          const employeeProfileId = u.employee_id || null;
                          const employerProfileId = u.employer_id || null;
                          const hasEmployeeProfile = Boolean(u.has_employee_profile && employeeProfileId);
                          const hasEmployerProfile = Boolean(u.has_employer_profile && employerProfileId);
                          const isNewUser = u.created_at ? (Date.now() - new Date(u.created_at).getTime()) <= (48 * 60 * 60 * 1000) : false;
                          const lastSeenLabel = formatDisplayDateTime(u.last_active_at);
                          const profileCompletedValue = u.profile_completed_at; // NEW
                          const userLifeDays = getUserLifeDays(u.created_at);
                          return (
                            <tr key={u.id} style={{
                              background: isInactive ? '#f3f4f6' : '#ffffff',
                              color: isInactive ? '#94a3b8' : '#0f172a'
                            }}>
                              <td>{u.id}</td>
                              <td>{(() => {
                                const type = (u.user_type || '').toLowerCase();
                                if (type === 'employee') return canShowEmployeePhoneAddress ? (u.mobile || '-') : '-';
                                if (type === 'employer') return canShowEmployerPhoneAddress ? (u.mobile || '-') : '-';
                                return u.mobile || '-';
                              })()}</td>
                              <td>
                                {isEmployeeType && hasEmployeeProfile ? (
                                  <button
                                    type="button"
                                    style={linkButtonStyle}
                                    onClick={() => employeeProfileId && handleEmployeeNameClick(employeeProfileId)}
                                  >
                                    {u.name || `Employee #${employeeProfileId}`}
                                  </button>
                                ) : isEmployerType && hasEmployerProfile ? (
                                  <button
                                    type="button"
                                    style={linkButtonStyle}
                                    onClick={() => employerProfileId && handleEmployerNameClick(employerProfileId)}
                                  >
                                    {u.name || `Employer #${employerProfileId}`}
                                  </button>
                                ) : (
                                  u.name || '-'
                                )}
                                {isNewUser && (
                                  <span
                                    style={{
                                      marginLeft: '6px',
                                      padding: '2px 8px',
                                      borderRadius: '999px',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      background: '#22c55e',
                                      color: '#fff'
                                    }}
                                  >
                                    New
                                  </span>
                                )}
                              </td>
                              <td>
                                {isEmployeeType ? (
                                  hasEmployeeProfile ? (
                                    u.user_type || '-'
                                  ) : (
                                    <button
                                      type="button"
                                      style={linkButtonStyle}
                                      onClick={() => openEmployeeCreate(u)}
                                      title="Create employee profile"
                                    >
                                      {u.user_type || 'employee'}
                                    </button>
                                  )
                                ) : isEmployerType ? (
                                  hasEmployerProfile ? (
                                    u.user_type || '-'
                                  ) : (
                                    <button
                                      type="button"
                                      style={linkButtonStyle}
                                      onClick={() => openEmployerCreate(u)}
                                      title="Create employer profile"
                                    >
                                      {u.user_type || 'employer'}
                                    </button>
                                  )
                                ) : (
                                  u.user_type || '-'
                                )}
                              </td>
                              <td>{u.referral_code || '-'}</td>
                              <td>{u.total_referred ?? '-'}</td>
                              <td>{renderStatusBadge(u.verification_status)}</td>
                              <td>{renderStatusBadge(u.kyc_status)}</td>
                              <td>
                                <span className={`badge ${u.is_active ? 'active' : 'inactive'}`}>
                                  {u.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>{u.deactivation_reason || '-'}</td>

                              {/* NEW */}
                              <td>{u.StatusChangedBy?.name || '-'}</td>

                              <td>{lastSeenLabel}</td>

                              {/* CHANGED: chip instead of plain text */}
                              <td>{renderProfileCompletedChip(profileCompletedValue)}</td>

                              <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                              <td>{userLifeDays}</td>
                              <td>
                                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                                  {userPerms.canActivate && (
                                    <button
                                      className="btn-small btn-secondary"
                                      onClick={() => handleToggleStatus(u)}
                                    >
                                      {u.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                  )}
                                  {userPerms.canDelete && (
                                    <button
                                      className="btn-small btn-delete"
                                      onClick={() => confirmDelete(u.id)}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          {/* CHANGED: colSpan +1 */}
                          <td colSpan="16" className="no-data">No users found</td>
                        </tr>
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
                        onChange={(e) => {
                          const next = parseInt(e.target.value, 10) || DEFAULT_PAGE_SIZE;
                          setPageSize(next);
                          setCurrentPage(1);
                        }}
                      >
                        {[10, 25, 50, 100].map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn-secondary btn-small"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Page {currentPage} of {totalPages}</span>
                      <button
                        className="btn-secondary btn-small"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {showDeactivateDialog && (
              <div
                className="form-container"
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.45)',
                  zIndex: 3200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{ width: '92%', maxWidth: '460px', background: '#fff', borderRadius: '10px', padding: '18px' }}>
                  <h2 style={{ marginTop: 0, fontSize: '16px' }}>Deactivate User</h2>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: 10 }}>
                    Deactivation reason is required.
                  </div>

                  {deactivateError && (
                    <div style={{ fontSize: '12px', color: '#b91c1c', marginBottom: 10 }}>
                      {deactivateError}
                    </div>
                  )}

                  <div className="form-group">
                    <label>Reason</label>
                    <textarea
                      value={deactivateReason}
                      onChange={(e) => setDeactivateReason(e.target.value)}
                      rows={4}
                      placeholder="Enter reason..."
                      disabled={deactivateSaving}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        if (deactivateSaving) return;
                        setShowDeactivateDialog(false);
                        setDeactivateUser(null);
                        setDeactivateReason('');
                        setDeactivateError(null);
                      }}
                      disabled={deactivateSaving}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={confirmDeactivate}
                      disabled={deactivateSaving}
                    >
                      {deactivateSaving ? 'Deactivating...' : 'Deactivate'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <ConfirmDialog
              open={confirm.open}
              title={confirm.title}
              message={confirm.message}
              onCancel={() => setConfirm({ ...confirm, open: false })}
              onConfirm={handleDeleteConfirmed}
              confirmLabel="Delete"
              cancelLabel="Cancel"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
