import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmployeeForm from '../../components/Forms/EmployeeForm';
import employeesApi from '../../api/employeesApi';
import { getStates } from '../../api/statesApi';
import { getCities } from '../../api/citiesApi';
import qualificationsApi from '../../api/masters/qualificationsApi';
import shiftsApi from '../../api/masters/shiftsApi';
import employeeSubscriptionPlansApi from '../../api/subscriptions/employeeSubscriptionPlansApi';
import jobProfilesApi from '../../api/masters/jobProfilesApi';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import '../Masters/MasterPage.css';

export default function EmployeesManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const recencyIsNew = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('recency') === 'new';
  }, [location.search]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [plans, setPlans] = useState([]);
  // new filters data
  const [jobProfiles, setJobProfiles] = useState([]);
  const [workNatures, setWorkNatures] = useState([]);
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [queryHydrated, setQueryHydrated] = useState(false);
  
  // Filters
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [prefStateFilter, setPrefStateFilter] = useState('');
  const [prefCityFilter, setPrefCityFilter] = useState('');
  const [qualificationFilter, setQualificationFilter] = useState('');
  const [salaryFreqFilter, setSalaryFreqFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [newEmployeeFilter, setNewEmployeeFilter] = useState(recencyIsNew ? 'new' : '');
  // new filters
  const [jobProfileFilter, setJobProfileFilter] = useState('');
  const [workNatureFilter, setWorkNatureFilter] = useState('');
  const [workDurationFilter, setWorkDurationFilter] = useState('');
  const [workDurationFreqFilter, setWorkDurationFreqFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '' });
  const [message, setMessage] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    stateFilter: '',
    cityFilter: '',
    prefStateFilter: '',
    prefCityFilter: '',
    qualificationFilter: '',
    salaryFreqFilter: '',
    shiftFilter: '',
    planFilter: '',
    genderFilter: '',
    verificationFilter: '',
    kycFilter: '',
    subscriptionStatusFilter: '',
    statusFilter: '',
    newEmployeeFilter: recencyIsNew ? 'new' : '',
    jobProfileFilter: '',
    workNatureFilter: '',
    workDurationFilter: '',
    workDurationFreqFilter: ''
  });
  const PAGE_SCROLL_KEY = 'employees-scroll';

  const employeePerms = React.useMemo(() => ({
    canView: hasPermission(PERMISSIONS.EMPLOYEES_VIEW),
    canManage: hasPermission(PERMISSIONS.EMPLOYEES_MANAGE),
    canDelete: hasPermission(PERMISSIONS.EMPLOYEES_DELETE),
    canVerify: hasPermission(PERMISSIONS.EMPLOYEES_VERIFY),
    canExport: hasPermission(PERMISSIONS.EMPLOYEES_EXPORT),
  }), []);
  const canViewEmployees = employeePerms.canView;

  const filterValues = React.useMemo(() => ({
    stateFilter,
    cityFilter,
    prefStateFilter,
    prefCityFilter,
    qualificationFilter,
    salaryFreqFilter,
    shiftFilter,
    planFilter,
    genderFilter,
    verificationFilter,
    kycFilter,
    subscriptionStatusFilter,
    statusFilter,
    newEmployeeFilter,
    search: searchTerm.trim(),
    jobProfileFilter,
    workNatureFilter,
    workDurationFilter,
    workDurationFreqFilter
  }), [
    stateFilter,
    cityFilter,
    prefStateFilter,
    prefCityFilter,
    qualificationFilter,
    salaryFreqFilter,
    shiftFilter,
    planFilter,
    genderFilter,
    verificationFilter,
    kycFilter,
    subscriptionStatusFilter,
    statusFilter,
    newEmployeeFilter,
    searchTerm,
    jobProfileFilter,
    workNatureFilter,
    workDurationFilter,
    workDurationFreqFilter
  ]);

  const buildQueryParams = React.useCallback((overrides = {}) => {
    const params = {
      page: overrides.page ?? currentPage,
      pageSize: overrides.pageSize ?? pageSize,
      sortField,
      sortDir
    };
    const push = (key, value) => {
      if (value !== undefined && value !== null && value !== '') params[key] = value;
    };
    push('search', filterValues.search);
    push('stateFilter', filterValues.stateFilter);
    push('cityFilter', filterValues.cityFilter);
    push('prefStateFilter', filterValues.prefStateFilter);
    push('prefCityFilter', filterValues.prefCityFilter);
    push('qualificationFilter', filterValues.qualificationFilter);
    push('salaryFreqFilter', filterValues.salaryFreqFilter);
    push('shiftFilter', filterValues.shiftFilter);
    push('planFilter', filterValues.planFilter);
    push('genderFilter', filterValues.genderFilter);
    push('verificationFilter', filterValues.verificationFilter);
    push('kycFilter', filterValues.kycFilter);
    push('subscriptionStatusFilter', filterValues.subscriptionStatusFilter);
    push('status', filterValues.statusFilter);
    push('newFilter', filterValues.newEmployeeFilter);
    push('jobProfileFilter', filterValues.jobProfileFilter);
    push('workNatureFilter', filterValues.workNatureFilter);
    push('workDurationFilter', filterValues.workDurationFilter);
    push('workDurationFreqFilter', filterValues.workDurationFreqFilter);
    return params;
  }, [currentPage, pageSize, sortField, sortDir, filterValues]);

  const fetchStates = React.useCallback(async () => {
    try {
      const res = await getStates();
      setStates(res.data?.data || []);
    } catch {}
  }, []);

  const fetchCities = React.useCallback(async () => {
    try {
      const res = await getCities();
      setCities(res.data?.data || []);
    } catch {}
  }, []);

  const fetchQualifications = React.useCallback(async () => {
    try {
      const res = await qualificationsApi.getAll();
      setQualifications(res.data?.data || []);
    } catch {}
  }, []);

  const fetchShifts = React.useCallback(async () => {
    try {
      const res = await shiftsApi.getAll();
      setShifts(res.data?.data || []);
    } catch {}
  }, []);

  const fetchPlans = React.useCallback(async () => {
    try {
      const res = await employeeSubscriptionPlansApi.getAll();
      setPlans(res.data?.data || []);
    } catch {}
  }, []);
  const fetchJobProfiles = React.useCallback(async () => { // added
    try {
      const res = await jobProfilesApi.getAll();
      setJobProfiles(res.data?.data || []);
    } catch {}
  }, []);
  const fetchWorkNatures = React.useCallback(async () => { // added
    try {
      const res = await employeesApi.getWorkNatures();
      setWorkNatures(res.data?.data || []);
    } catch {}
  }, []);

  const fetchEmployees = React.useCallback(async () => {
    if (!canViewEmployees) return;
    setLoading(true);
    try {
      const params = buildQueryParams();
      const res = await employeesApi.getEmployees(params);
      const payload = res.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const metaInfo = payload.meta || {};
      if (metaInfo.totalPages && metaInfo.totalPages > 0 && params.page > metaInfo.totalPages) {
        setCurrentPage(metaInfo.totalPages);
        return;
      }
      if ((metaInfo.total || 0) === 0 && params.page !== 1) {
        setCurrentPage(1);
        return;
      }
      const totalCount = metaInfo.total ?? rows.length;
      const effectivePageSize = metaInfo.pageSize ?? params.pageSize;
      setEmployees(rows);
      setMeta({
        page: metaInfo.page ?? params.page,
        pageSize: effectivePageSize,
        total: totalCount,
        totalPages: metaInfo.totalPages ?? Math.max(Math.ceil(totalCount / effectivePageSize) || 1, 1)
      });
    } catch (e) {
      console.error('[Employees list] fetch error:', e);
      setMessage({ type: 'error', text: 'Failed to fetch employees' });
    } finally {
      setLoading(false);
    }
  }, [canViewEmployees, buildQueryParams]);

  useEffect(() => {
    if (!canViewEmployees) {
      setSidebarOpen(getSidebarState());
      return;
    }
    setSidebarOpen(getSidebarState());
    fetchStates();
    fetchCities();
    fetchQualifications();
    fetchShifts();
    fetchPlans();
    fetchJobProfiles(); // added
    fetchWorkNatures(); // added
  }, [
    canViewEmployees,
    fetchStates,
    fetchCities,
    fetchQualifications,
    fetchShifts,
    fetchPlans,
    fetchJobProfiles,
    fetchWorkNatures
  ]);

  useEffect(() => {
    if (!canViewEmployees || showForm) return;
    const main = document.querySelector('.main-content');
    if (!main) return;
    const pos = getScrollPosition(PAGE_SCROLL_KEY);
    main.scrollTop = pos;
    const onScroll = () => saveScrollPosition(PAGE_SCROLL_KEY, main.scrollTop);
    main.addEventListener('scroll', onScroll);
    return () => main.removeEventListener('scroll', onScroll);
  }, [canViewEmployees, showForm]);

  const filtersSignature = React.useMemo(() => JSON.stringify(filterValues), [filterValues]);
  const lastFilterSignatureRef = React.useRef(filtersSignature);

  const queryFilters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const normalize = (value) => (value || '').trim().toLowerCase();
    return {
      status: normalize(params.get('status')),
      verification_status: normalize(params.get('verification_status')),
      kyc_status: normalize(params.get('kyc_status'))
    };
  }, [location.search]);

  const queryFiltersSignature = useMemo(
    () => JSON.stringify(queryFilters),
    [queryFilters]
  );

  useEffect(() => {
    if (!canViewEmployees) return;
    const normalizedStatus = ['active', 'inactive'].includes(queryFilters.status) ? queryFilters.status : '';
    const normalizedVerification = ['pending', 'verified', 'rejected'].includes(queryFilters.verification_status)
      ? queryFilters.verification_status
      : '';
    const normalizedKyc = ['pending', 'verified', 'rejected'].includes(queryFilters.kyc_status)
      ? queryFilters.kyc_status
      : '';
    setStatusFilter(normalizedStatus);
    setVerificationFilter(normalizedVerification);
    setKycFilter(normalizedKyc);
    setQueryHydrated(true);
  }, [canViewEmployees, queryFiltersSignature]);

  useEffect(() => {
    if (!canViewEmployees || showForm || !queryHydrated) return;
    if (filtersSignature !== lastFilterSignatureRef.current) {
      lastFilterSignatureRef.current = filtersSignature;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    fetchEmployees();
  }, [
    canViewEmployees,
    showForm,
    queryHydrated,
    filtersSignature,
    currentPage,
    fetchEmployees,
    queryFiltersSignature
  ]);

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
    return `employees_${dd}-${MM}-${yyyy}_${hh}_${mm}_${ss}_${suffix}_.csv`;
  };

  const exportToCSV = async () => {
    if (!employeePerms.canExport) {
      setMessage({ type: 'error', text: 'You do not have permission to export employees.' });
      return;
    }
    const baseParams = buildQueryParams({ page: 1 });
    const exportRows = [];
    let page = 1;
    let totalPagesFromServer = null;
    let totalRecordsFromServer = null;
    const requestedPageSize = baseParams.pageSize || pageSize || 25;

    try {
      while (true) {
        const res = await employeesApi.getEmployees({ ...baseParams, page });
        const payload = res.data || {};
        const batch = Array.isArray(payload.data) ? payload.data : [];
        exportRows.push(...batch);

        const metaInfo = payload.meta || {};
        if (typeof metaInfo.totalPages === 'number') totalPagesFromServer = metaInfo.totalPages;
        if (typeof metaInfo.total === 'number') totalRecordsFromServer = metaInfo.total;
        const serverPageSize = metaInfo.pageSize || requestedPageSize || batch.length || 1;

        const shouldContinue = (() => {
          if (totalRecordsFromServer !== null) return exportRows.length < totalRecordsFromServer;
          if (totalPagesFromServer !== null) return page < totalPagesFromServer;
          return batch.length === serverPageSize;
        })();

        if (!shouldContinue) break;
        page += 1;
      }
    } catch (e) {
      console.error('Export error:', e);
      setMessage({ type: 'error', text: 'Failed to export employees' });
      return;
    }

    if (!exportRows.length) {
      setMessage({ type: 'error', text: 'No employees found for current filters.' });
      return;
    }
    const headers = [
      'ID', 'Name', 'Email', 'DOB', 'Gender', 'State', 'City', 'Pref State', 'Pref City',
      'Qualification', 'Expected Salary', 'Salary Frequency', 'Preferred Shift',
      'Verification', 'KYC', 'Contact Credits', 'Interest Credits',
      'Credit Expiry', 'Subscription Plan', 'Created At'
    ];
    const escapeCell = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = exportRows.map(e => [
      e.id,
      e.name || '',
      e.email || '',
      formatExportDateTime(e.dob),
      formatGender(e.gender),
      e.State?.state_english || '',
      e.City?.city_english || '',
      e.PreferredState?.state_english || '',
      e.PreferredCity?.city_english || '',
      e.Qualification?.qualification_english || '',
      e.expected_salary || '',
      e.expected_salary_frequency || '',
      e.Shift?.shift_english || '',
      e.verification_status || '',
      e.kyc_status || '',
      `${e.contact_credit || 0}/${e.total_contact_credit || 0}`,
      `${e.interest_credit || 0}/${e.total_interest_credit || 0}`,
      formatExportDateTime(e.credit_expiry_at),
      e.SubscriptionPlan?.plan_name_english || '',
      formatExportDateTime(e.created_at)
    ]);
    const csv = [headers.map(escapeCell).join(','), ...rows.map(r => r.map(escapeCell).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildExportFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const confirmDelete = (id) => {
    if (!employeePerms.canDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete employees.' });
      return;
    }
    setConfirm({
      open: true,
      id,
      title: 'Delete Employee',
      message: 'Are you sure? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm({ ...confirm, open: false });
    try {
      await employeesApi.deleteEmployee(id);
      await fetchEmployees();
      setMessage({ type: 'success', text: 'Employee deleted' });
    } catch (e) {
      console.error('Delete error:', e);
      setMessage({ type: 'error', text: e.message || 'Failed to delete employee' });
    }
  };

  const handleFormClose = async () => {
    setShowForm(false);
    setEditingId(null);
    await fetchEmployees();
  };

  const updateVerificationStatus = async (id, status) => {
    if (!employeePerms.canVerify) {
      setMessage({ type: 'error', text: 'You do not have permission to verify employees.' });
      return;
    }
    try {
      await employeesApi.updateEmployee(id, { verification_status: status });
      await fetchEmployees();
      setMessage({ type: 'success', text: `Verification ${status}` });
    } catch (e) {
      console.error('Verification update error:', e);
      setMessage({ type: 'error', text: 'Failed to update verification status' });
    }
  };
  
  const handleRowClick = (id) => navigate(`/employees/${id}`);

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

  const handleHeaderClick = (field) => {
    if (sortField === field) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };
  const ind = (field) =>
    sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const openFilters = () => {
    if (showFilterPanel) {
      setShowFilterPanel(false);
      return;
    }
    setDraftFilters({
      stateFilter,
      cityFilter,
      prefStateFilter,
      prefCityFilter,
      qualificationFilter,
      salaryFreqFilter,
      shiftFilter,
      planFilter,
      genderFilter,
      verificationFilter,
      kycFilter,
      subscriptionStatusFilter,
      statusFilter,
      newEmployeeFilter,
      jobProfileFilter,       // added
      workNatureFilter,       // added
      workDurationFilter,     // added
      workDurationFreqFilter  // added
    });
    setShowFilterPanel(true);
  };

  const applyDraftFilters = () => {
    setStateFilter(draftFilters.stateFilter);
    setCityFilter(draftFilters.cityFilter);
    setPrefStateFilter(draftFilters.prefStateFilter);
    setPrefCityFilter(draftFilters.prefCityFilter);
    setQualificationFilter(draftFilters.qualificationFilter);
    setSalaryFreqFilter(draftFilters.salaryFreqFilter);
    setShiftFilter(draftFilters.shiftFilter);
    setPlanFilter(draftFilters.planFilter);
    setGenderFilter(draftFilters.genderFilter);
    setVerificationFilter(draftFilters.verificationFilter);
    setKycFilter(draftFilters.kycFilter);
    setSubscriptionStatusFilter(draftFilters.subscriptionStatusFilter);
    setStatusFilter(draftFilters.statusFilter);
    setNewEmployeeFilter(draftFilters.newEmployeeFilter);
    setJobProfileFilter(draftFilters.jobProfileFilter); // added
    setWorkNatureFilter(draftFilters.workNatureFilter); // added
    setWorkDurationFilter(draftFilters.workDurationFilter); // added
    setWorkDurationFreqFilter(draftFilters.workDurationFreqFilter); // added
    setShowFilterPanel(false);
  };

  const clearFilters = () => {
    setStateFilter('');
    setCityFilter('');
    setPrefStateFilter('');
    setPrefCityFilter('');
    setQualificationFilter('');
    setSalaryFreqFilter('');
    setShiftFilter('');
    setPlanFilter('');
    setGenderFilter('');
    setVerificationFilter('');
    setKycFilter('');
    setSubscriptionStatusFilter('');
    setStatusFilter('');
    setNewEmployeeFilter('');
    setSortField('id');
    setSortDir('asc');
    setShowFilterPanel(false);
    setJobProfileFilter(''); // added
    setWorkNatureFilter(''); // added
    setWorkDurationFilter(''); // added
    setWorkDurationFreqFilter(''); // added
  };

  const removeFilterChip = (key) => {
    const filterMap = {
      state: setStateFilter,
      city: setCityFilter,
      pref_state: setPrefStateFilter,
      pref_city: setPrefCityFilter,
      qualification: setQualificationFilter,
      salary_freq: setSalaryFreqFilter,
      shift: setShiftFilter,
      plan: setPlanFilter,
      gender: setGenderFilter,
      verification: setVerificationFilter,
      kyc: setKycFilter,
      search: setSearchTerm,
      status: setStatusFilter,
      subscription_status: setSubscriptionStatusFilter,
      new_employee: () => {
        setNewEmployeeFilter('');
        setDraftFilters((prev) => ({ ...prev, newEmployeeFilter: '' }));
      },
      job_profile: setJobProfileFilter,
      work_nature: setWorkNatureFilter,
      work_duration: setWorkDurationFilter,
      work_duration_freq: setWorkDurationFreqFilter
    };
    filterMap[key]?.('');
  };

  const activeFilterCount = [
    stateFilter, cityFilter, prefStateFilter, prefCityFilter,
    qualificationFilter, salaryFreqFilter, shiftFilter, planFilter,
    genderFilter, verificationFilter, kycFilter, searchTerm,
    statusFilter, subscriptionStatusFilter, newEmployeeFilter,
    jobProfileFilter, workNatureFilter, workDurationFilter, workDurationFreqFilter // added
  ].filter(Boolean).length;

  const hasEmployees = employees.length > 0;
  const perPage = meta.pageSize || pageSize;
  const totalPages = Math.max(meta.totalPages || 1, 1);
  const safePage = Math.min(currentPage, totalPages);
  const pageSummary = meta.total && hasEmployees
    ? { from: ((safePage - 1) * perPage) + 1, to: ((safePage - 1) * perPage) + employees.length, total: meta.total }
    : { from: 0, to: 0, total: meta.total || 0 };

  // Filter cities based on selected state in draft filters
  const getFilteredCitiesForState = (stateId) => {
    if (!stateId) return [];
    return cities.filter(c => c.state_id === parseInt(stateId));
  };

  const getFilteredCitiesForPrefState = (stateId) => {
    if (!stateId) return [];
    return cities.filter(c => c.state_id === parseInt(stateId));
  };

  // Reset dependent city filter when state changes
  const handleStateFilterChange = (stateId) => {
    setDraftFilters(f => ({ ...f, stateFilter: stateId, cityFilter: '' }));
  };

  const handlePrefStateFilterChange = (stateId) => {
    setDraftFilters(f => ({ ...f, prefStateFilter: stateId, prefCityFilter: '' }));
  };

  const chipBaseStyle = {
    display:'inline-flex',
    alignItems:'center',
    gap:'6px',
    background:'#e0edff',
    color:'#1d4ed8',
    padding:'6px 10px',
    fontSize:'12px',
    borderRadius:'20px',
    border:'1px solid #bfdbfe',
    boxShadow:'0 1px 2px rgba(37,99,235,0.15)',
    fontWeight:600
  };
  const chipCloseStyle = {
    background:'transparent',
    border:'none',
    color:'#1d4ed8',
    cursor:'pointer',
    width:'18px',
    height:'18px',
    lineHeight:'16px',
    borderRadius:'50%',
    fontSize:'12px',
    display:'flex',
    alignItems:'center',
    justifyContent:'center',
    transition:'background 0.2s'
  };

  const statusBadgePalette = {
    pending: { bg: '#fef3c7', color: '#b45309' },
    verified: { bg: '#dcfce7', color: '#15803d' },
    rejected: { bg: '#fee2e2', color: '#b91c1c' }
  };
  const formatGender = (value) => {
    if (!value) return '-';
    const normalized = value.toString().trim().toLowerCase();
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '-';
  };

  const renderStatusBadge = (status) => {
    if (!status) return '-';
    const palette = statusBadgePalette[status.toLowerCase()] || { bg: '#e2e8f0', color: '#475569' };
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 10px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'capitalize',
          backgroundColor: palette.bg,
          color: palette.color
        }}
      >
        {status}
      </span>
    );
  };

  const formatSubscriptionLabel = (employee) => {
    const planName = employee.SubscriptionPlan?.plan_name_english || 'No plan';
    const expiry = employee.credit_expiry_at || null;
    const isExpired = expiry ? new Date(expiry).getTime() < Date.now() : false;
    const colors = expiry
      ? (isExpired
          ? { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' }
          : { bg: '#dcfce7', color: '#166534', border: '#86efac' })
      : { bg: '#f3f4f6', color: '#1f2937', border: '#e5e7eb' };
    const expiryLabel = expiry
      ? new Date(expiry).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

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
          minWidth: '160px'
        }}
      >
        <strong style={{ fontSize: '12px' }}>{planName}</strong>
        {expiryLabel && (
          <span style={{ fontSize: '11px' }}>
            Expires: {expiryLabel}
          </span>
        )}
      </span>
    );
  };

  // Helper for export-friendly timestamps
  const formatExportDateTime = (value) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      const datePart = date.toLocaleDateString();
      const timePart = date.toLocaleTimeString();
      return `${datePart} ${timePart}`.trim();
    } catch {
      return value;
    }
  };
  const formatDisplayDateTime = (value) => {
    if (!value) return '-';
    try {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
    } catch {
      return '-';
    }
  };
  const getUserLifeDays = (value) => {
    if (!value) return '-';
    const createdTs = new Date(value).getTime();
    if (Number.isNaN(createdTs)) return '-';
    const days = Math.floor((Date.now() - createdTs) / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : '-';
  };

  if (!canViewEmployees) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view employees.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
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

            {!showForm ? (
              <>
                <div className="list-header">
                  <h1>Employees</h1>
                  {employeePerms.canManage && (
                    <button
                      className="btn-primary small"
                      onClick={() => { setEditingId(null); setShowForm(true); }}
                    >
                      + Add Employee
                    </button>
                  )}
                </div>

                <div className="search-filter-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:'1 1 auto' }}>
                    <label htmlFor="search-term" style={{ fontSize:'12px', fontWeight:600 }}>Search:</label>
                    <input
                      id="search-term"
                      type="text"
                      className="state-filter-select"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="id, name, email, state, city..."
                      style={{ maxWidth:'260px' }}
                    />
                  </div>
                  <div style={{ flex:'0 0 auto', display:'flex', gap:'8px' }}>
                    <button className="btn-secondary btn-small" onClick={openFilters}>
                      Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </button>
                    {employeePerms.canExport && (
                      <button className="btn-secondary btn-small" onClick={exportToCSV}>
                        Export CSV
                      </button>
                    )}
                  </div>
                </div>

                {/* Applied filter chips */}
                <div
                  className="applied-filters"
                  style={{
                    marginBottom:'12px',
                    display:'flex',
                    flexWrap:'wrap',
                    gap:'8px',
                    padding:'10px 12px',
                    border:'1px solid #e2e8f0',
                    background:'#ffffff',
                    borderRadius:'10px',
                    boxShadow:'0 2px 4px rgba(0,0,0,0.06)'
                  }}
                >
                  {searchTerm && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      Search: {searchTerm}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('search')}>×</button>
                    </span>
                  )}
                  {stateFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      State: {states.find(s => s.id === parseInt(stateFilter))?.state_english}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('state')}>×</button>
                    </span>
                  )}
                  {cityFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      City: {cities.find(c => c.id === parseInt(cityFilter))?.city_english}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('city')}>×</button>
                    </span>
                  )}
                  {prefStateFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      Pref State: {states.find(s => s.id === parseInt(prefStateFilter))?.state_english}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('pref_state')}>×</button>
                    </span>
                  )}
                  {prefCityFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      Pref City: {cities.find(c => c.id === parseInt(prefCityFilter))?.city_english}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('pref_city')}>×</button>
                    </span>
                  )}
                  {qualificationFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      Qualification: {qualifications.find(q => q.id === parseInt(qualificationFilter))?.qualification_english}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('qualification')}>×</button>
                    </span>
                  )}
                  {salaryFreqFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      Salary Freq: {salaryFreqFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('salary_freq')}>×</button>
                    </span>
                  )}
                  {shiftFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      Shift: {shifts.find(s => s.id === parseInt(shiftFilter))?.shift_english}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('shift')}>×</button>
                    </span>
                  )}
                  {planFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      Plan: {plans.find(p => p.id === parseInt(planFilter))?.plan_name_english}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('plan')}>×</button>
                    </span>
                  )}
                  {genderFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      Gender: {genderFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('gender')}>×</button>
                    </span>
                  )}
                  {verificationFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      Verification: {verificationFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('verification')}>×</button>
                    </span>
                  )}
                  {kycFilter && (
                    <span className="badge chip" style={chipBaseStyle /* modified */}>
                      KYC: {kycFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('kyc')}>×</button>
                    </span>
                  )}
                  {subscriptionStatusFilter && (
                    <span className="badge chip" style={chipBaseStyle} /* modified: removed conditional color */>
                      Subscription: {subscriptionStatusFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('subscription_status')}>×</button>
                    </span>
                  )}
                  {statusFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Status: {statusFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('status')}>×</button>
                    </span>
                  )}
                  {newEmployeeFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Employee Recency: New
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('new_employee')}>×</button>
                    </span>
                  )}
                  {jobProfileFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Job Profile: {jobProfiles.find(j => j.id === parseInt(jobProfileFilter))?.profile_english || jobProfileFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('job_profile')}>×</button>
                    </span>
                  )}
                  {workNatureFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Work Nature: {workNatures.find(w => w.id === parseInt(workNatureFilter))?.nature_english || workNatureFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('work_nature')}>×</button>
                    </span>
                  )}
                  {workDurationFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Work Duration: {workDurationFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('work_duration')}>×</button>
                    </span>
                  )}
                  {workDurationFreqFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Work Duration Freq: {workDurationFreqFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('work_duration_freq')}>×</button>
                    </span>
                  )}
                  {activeFilterCount === 0 && (
                    <span style={{ fontSize:'12px', color:'#64748b' }}>No filters applied</span>
                  )}
                </div>

                {/* Filter panel */}
                {showFilterPanel && (
                  <div className="filter-panel" style={{ position:'relative', marginBottom:'16px', padding:'16px', border:'1px solid #ddd', borderRadius:'10px', background:'#f8fafc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>State</label>
                        <select 
                          className="state-filter-select" 
                          value={draftFilters.stateFilter} 
                          onChange={e => handleStateFilterChange(e.target.value)}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          {states.map(s => <option key={s.id} value={s.id}>{s.state_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>City</label>
                        <select 
                          className="state-filter-select" 
                          value={draftFilters.cityFilter} 
                          onChange={e => setDraftFilters(f => ({ ...f, cityFilter: e.target.value }))}
                          style={{ width:'100%' }}
                          disabled={!draftFilters.stateFilter}
                        >
                          <option value="">All</option>
                          {getFilteredCitiesForState(draftFilters.stateFilter).map(c => <option key={c.id} value={c.id}>{c.city_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Pref State</label>
                        <select 
                          className="state-filter-select" 
                          value={draftFilters.prefStateFilter} 
                          onChange={e => handlePrefStateFilterChange(e.target.value)}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          {states.map(s => <option key={s.id} value={s.id}>{s.state_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Pref City</label>
                        <select 
                          className="state-filter-select" 
                          value={draftFilters.prefCityFilter} 
                          onChange={e => setDraftFilters(f => ({ ...f, prefCityFilter: e.target.value }))}
                          style={{ width:'100%' }}
                          disabled={!draftFilters.prefStateFilter}
                        >
                          <option value="">All</option>
                          {getFilteredCitiesForPrefState(draftFilters.prefStateFilter).map(c => <option key={c.id} value={c.id}>{c.city_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Qualification</label>
                        <select className="state-filter-select" value={draftFilters.qualificationFilter} onChange={e => setDraftFilters(f => ({ ...f, qualificationFilter: e.target.value }))} style={{ width:'100%' }}>
                          <option value="">All</option>
                          {qualifications.map(q => <option key={q.id} value={q.id}>{q.qualification_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Salary Freq</label>
                        <select className="state-filter-select" value={draftFilters.salaryFreqFilter} onChange={e => setDraftFilters(f => ({ ...f, salaryFreqFilter: e.target.value }))} style={{ width:'100%' }}>
                          <option value="">All</option>
                          <option value="daily">Daily</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Preferred Shift</label>
                        <select className="state-filter-select" value={draftFilters.shiftFilter} onChange={e => setDraftFilters(f => ({ ...f, shiftFilter: e.target.value }))} style={{ width:'100%' }}>
                          <option value="">All</option>
                          {shifts.map(s => <option key={s.id} value={s.id}>{s.shift_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Subscription Plan</label>
                        <select className="state-filter-select" value={draftFilters.planFilter} onChange={e => setDraftFilters(f => ({ ...f, planFilter: e.target.value }))} style={{ width:'100%' }}>
                          <option value="">All</option>
                          {plans.map(p => <option key={p.id} value={p.id}>{p.plan_name_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Gender</label>
                        <select className="state-filter-select" value={draftFilters.genderFilter} onChange={e => setDraftFilters(f => ({ ...f, genderFilter: e.target.value }))} style={{ width:'100%' }}>
                          <option value="">All</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Verification</label>
                        <select className="state-filter-select" value={draftFilters.verificationFilter} onChange={e => setDraftFilters(f => ({ ...f, verificationFilter: e.target.value }))} style={{ width:'100%' }}>
                          <option value="">All</option>
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>KYC</label>
                        <select className="state-filter-select" value={draftFilters.kycFilter} onChange={e => setDraftFilters(f => ({ ...f, kycFilter: e.target.value }))} style={{ width:'100%' }}>
                          <option value="">All</option>
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>Status</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.statusFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, statusFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>Subscription Status</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.subscriptionStatusFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, subscriptionStatusFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>Employee Type</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.newEmployeeFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, newEmployeeFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          <option value="new">New</option>
                        </select>
                      </div>
                      <div> {/* job profile filter */}
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>Job Profile</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.jobProfileFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, jobProfileFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          {jobProfiles.map(j => <option key={j.id} value={j.id}>{j.profile_english}</option>)}
                        </select>
                      </div>
                      <div> {/* work nature filter */}
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>Work Nature</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.workNatureFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, workNatureFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          {workNatures.map(w => <option key={w.id} value={w.id}>{w.nature_english}</option>)}
                        </select>
                      </div>
                      <div> {/* work duration filter */}
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>Work Duration</label>
                        <input
                          className="state-filter-select"
                          type="number"
                          value={draftFilters.workDurationFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, workDurationFilter: e.target.value }))}
                          placeholder="e.g. 12"
                          style={{ width:'100%' }}
                        />
                      </div>
                      <div> {/* work duration freq filter */}
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>Work Duration Freq</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.workDurationFreqFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, workDurationFreqFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          <option value="days">Days</option>
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                        </select>
                      </div>
                    </div>
                    <div className="filter-actions" style={{ marginTop:'20px', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                      <button type="button" className="btn-primary btn-small" onClick={applyDraftFilters}>Apply</button>
                      <button type="button" className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                      <button type="button" className="btn-secondary btn-small" onClick={() => setShowFilterPanel(false)}>Close</button>
                    </div>
                  </div>
                )}

                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ minWidth: '2000px' }}>
                    <thead>
                      <tr>
                        <th onClick={() => handleHeaderClick('id')} style={{ cursor:'pointer' }}>ID{ind('id')}</th>
                        <th onClick={() => handleHeaderClick('name')} style={{ cursor:'pointer' }}>Name{ind('name')}</th>
                        <th onClick={() => handleHeaderClick('email')} style={{ cursor:'pointer' }}>Email{ind('email')}</th>
                        <th onClick={() => handleHeaderClick('dob')} style={{ cursor:'pointer' }}>DOB{ind('dob')}</th>
                        <th onClick={() => handleHeaderClick('gender')} style={{ cursor:'pointer' }}>Gender{ind('gender')}</th>
                        <th onClick={() => handleHeaderClick('state')} style={{ cursor:'pointer' }}>State{ind('state')}</th>
                        <th onClick={() => handleHeaderClick('city')} style={{ cursor:'pointer' }}>City{ind('city')}</th>
                        <th>Pref State</th>
                        <th>Pref City</th>
                        <th onClick={() => handleHeaderClick('qualification')} style={{ cursor:'pointer' }}>Qualification{ind('qualification')}</th>
                        <th onClick={() => handleHeaderClick('expected_salary')} style={{ cursor:'pointer' }}>Salary{ind('expected_salary')}</th>
                        <th>Freq</th>
                        <th onClick={() => handleHeaderClick('shift')} style={{ cursor:'pointer' }}>Shift{ind('shift')}</th>
                        <th onClick={() => handleHeaderClick('verification_status')} style={{ cursor:'pointer' }}>Verification{ind('verification_status')}</th>
                        <th onClick={() => handleHeaderClick('kyc_status')} style={{ cursor: 'pointer' }}>KYC{ind('kyc_status')}</th>
                        <th style={{ cursor: 'pointer' }}>Subscription</th>
                        <th onClick={() => handleHeaderClick('is_active')} style={{ cursor:'pointer' }}>Status{ind('is_active')}</th>
                        <th>Job Profiles</th> {/* added */}
                        <th>Work Nature</th> {/* added */}
                        <th>Last Seen</th>
                        <th onClick={() => handleHeaderClick('created_at')} style={{ cursor:'pointer' }}>Created{ind('created_at')}</th>
                        <th>User Life (days)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasEmployees ? (
                        employees.map(e => {
                          const isInactive = e.User?.is_active === false;
                          const userCreatedAt = e.User?.created_at;
                          const isNewUser = userCreatedAt
                            ? (Date.now() - new Date(userCreatedAt).getTime()) <= 48 * 60 * 60 * 1000
                            : false;
                          const lastSeenLabel = formatDisplayDateTime(e.User?.last_active_at);
                          const userLifeDays = getUserLifeDays(userCreatedAt);
                          return (
                            <tr
                              key={e.id}
                              onClick={() => handleRowClick(e.id)}
                              style={{
                                cursor: 'pointer',
                                backgroundColor: isInactive ? '#f3f4f6' : '#ffffff',
                                color: isInactive ? '#94a3b8' : '#0f172a'
                              }}
                            >
                              <td>{e.id}</td>
                              <td>
                                {e.name || '-'}
                                {isNewUser && (
                                  <span
                                    style={{
                                      marginLeft: 6,
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
                              <td>{e.email || '-'}</td>
                              <td>{formatExportDateTime(e.dob) || '-'}</td>
                              <td>{formatGender(e.gender)}</td>
                              <td>{e.State?.state_english || '-'}</td>
                              <td>{e.City?.city_english || '-'}</td>
                              <td>{e.PreferredState?.state_english || '-'}</td>
                              <td>{e.PreferredCity?.city_english || '-'}</td>
                              <td>{e.Qualification?.qualification_english || '-'}</td>
                              <td>{e.expected_salary || '-'}</td>
                              <td>{e.expected_salary_frequency || '-'}</td>
                              <td>{e.Shift?.shift_english || '-'}</td>
                              <td>{renderStatusBadge(e.verification_status)}</td>
                              <td>{renderStatusBadge(e.kyc_status)}</td>
                              <td>{formatSubscriptionLabel(e)}</td>
                              <td>
                                <span className={`badge ${isInactive ? 'inactive' : 'active'}`}>
                                  {isInactive ? 'Inactive' : 'Active'}
                                </span>
                              </td>
                              <td>{e.job_profiles_display || '-'}</td> {/* added */}
                              <td>{e.work_natures_display || '-'}</td> {/* added */}
                              <td>{lastSeenLabel}</td>
                              <td>{e.created_at ? new Date(e.created_at).toLocaleDateString() : '-'}</td>
                              <td>{userLifeDays}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {(employeePerms.canVerify && (e.verification_status || '').toLowerCase() === 'pending') && (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        className="btn-small"
                                        style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none' }}
                                        onClick={(ev) => { ev.stopPropagation(); updateVerificationStatus(e.id, 'verified'); }}
                                      >
                                        Approve
                                      </button>
                                      <button
                                        className="btn-small"
                                        style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none' }}
                                        onClick={(ev) => { ev.stopPropagation(); updateVerificationStatus(e.id, 'rejected'); }}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      className="btn-small"
                                      style={{ flex: 1 }}
                                      onClick={(ev) => { ev.stopPropagation(); navigate(`/employees/${e.id}`); }}
                                    >
                                      View
                                    </button>
                                    {employeePerms.canManage && (
                                      <button
                                        className="btn-small btn-edit"
                                        style={{ flex: 1 }}
                                        onClick={(ev) => { ev.stopPropagation(); setEditingId(e.id); setShowForm(true); }}
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {employeePerms.canDelete && (
                                      <button
                                        className="btn-small btn-delete"
                                        style={{ flex: 1 }}
                                        onClick={(ev) => { ev.stopPropagation(); confirmDelete(e.id); }}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="20" className="no-data">
                            {loading ? 'Loading...' : meta.total ? 'No records on this page' : 'No employees found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div
                  className="table-footer"
                  style={{
                    marginTop: '12px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '12px',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#475569' }}>
                    Showing {pageSummary.from}-{pageSummary.to} of {pageSummary.total}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#475569' }}>Rows per page:</label>
                    <select
                      className="state-filter-select"
                      value={pageSize}
                      onChange={(e) => {
                        const nextSize = parseInt(e.target.value, 10) || 10;
                        setPageSize(nextSize);
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
                      disabled={safePage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <span style={{ fontSize: '12px', color: '#475569' }}>
                      Page {safePage} of {totalPages}
                    </span>
                    <button
                      className="btn-secondary btn-small"
                      disabled={!meta.total || safePage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <EmployeeForm
                employeeId={editingId}
                onClose={handleFormClose}
                onSuccess={(msg) => setMessage(msg)}
              />
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
