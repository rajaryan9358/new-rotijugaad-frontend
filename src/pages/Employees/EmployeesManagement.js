import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ConfirmDialog from '../../components/ConfirmDialog';
import LogsAction from '../../components/LogsAction';
import EmployeeForm from '../../components/Forms/EmployeeForm';
import employeesApi from '../../api/employeesApi';
import logsApi from '../../api/logsApi';
import { getStates } from '../../api/statesApi';
import { getCities } from '../../api/citiesApi';
import qualificationsApi from '../../api/masters/qualificationsApi';
import shiftsApi from '../../api/masters/shiftsApi';
import employeeSubscriptionPlansApi from '../../api/subscriptions/employeeSubscriptionPlansApi';
import jobProfilesApi from '../../api/masters/jobProfilesApi';
import volunteersApi from '../../api/masters/volunteersApi'; // NEW
import VolunteerForm from '../../components/Forms/VolunteerForm'; // NEW
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import '../Masters/MasterPage.css';

// HOISTED helpers (fixes runtime ReferenceError during render/HMR)
function formatDisplayDateTime(value) {
	if (!value) return '-';
	try {
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
	} catch {
		return '-';
	}
}

function getUserLifeDays(value) {
	if (!value) return '-';
	const createdTs = new Date(value).getTime();
	if (Number.isNaN(createdTs)) return '-';
	const days = Math.floor((Date.now() - createdTs) / (1000 * 60 * 60 * 24));
	return days >= 0 ? days : '-';
}

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
  const [volunteers, setVolunteers] = useState([]); // NEW: for assistant_code filter + display
  const [showVolunteerForm, setShowVolunteerForm] = useState(false); // NEW
  const [editingVolunteerId, setEditingVolunteerId] = useState(null); // NEW
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
  const [assistantCodeFilter, setAssistantCodeFilter] = useState('');
  const [createdFromFilter, setCreatedFromFilter] = useState(''); // NEW
  const [createdToFilter, setCreatedToFilter] = useState('');     // NEW
  const [kycVerifiedFromFilter, setKycVerifiedFromFilter] = useState(''); // NEW
  const [kycVerifiedToFilter, setKycVerifiedToFilter] = useState('');     // NEW
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
    workDurationFreqFilter: '',
    assistantCodeFilter: '',
    createdFromFilter: '', // NEW
    createdToFilter: '',   // NEW
    kycVerifiedFromFilter: '', // NEW
    kycVerifiedToFilter: ''    // NEW
  });
  const PAGE_SCROLL_KEY = 'employees-scroll';

  const employeePerms = React.useMemo(() => ({
    canView: hasPermission(PERMISSIONS.EMPLOYEES_VIEW),
    canManage: hasPermission(PERMISSIONS.EMPLOYEES_MANAGE),
    canDelete: hasPermission(PERMISSIONS.EMPLOYEES_DELETE),
    canVerify: hasPermission(PERMISSIONS.EMPLOYEES_VERIFY),
    canExport: hasPermission(PERMISSIONS.EMPLOYEES_EXPORT),

    // Sensitive fields
    canShowPhoneAddress: hasPermission(PERMISSIONS.EMPLOYEES_SHOW_PHONE_ADDRESS),
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
    workDurationFreqFilter,
    assistantCodeFilter,
    createdFromFilter, // NEW
    createdToFilter,   // NEW
    kycVerifiedFromFilter, // NEW
    kycVerifiedToFilter    // NEW
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
    workDurationFreqFilter,
    assistantCodeFilter,
    createdFromFilter, // NEW
    createdToFilter,   // NEW
    kycVerifiedFromFilter, // NEW
    kycVerifiedToFilter    // NEW
  ]);

  const buildQueryParams = React.useCallback((overrides = {}) => {
    const params = {
      page: overrides.page ?? currentPage,
      pageSize: overrides.pageSize ?? pageSize,
      limit: overrides.pageSize ?? pageSize, // added: compatibility with backends using limit
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
    push('assistantCode', filterValues.assistantCodeFilter);

    // NEW: created date range
    push('createdFrom', filterValues.createdFromFilter);
    push('createdTo', filterValues.createdToFilter);

    // NEW: KYC verification date range (for Dashboard deep-link)
    push('kyc_verified_from', filterValues.kycVerifiedFromFilter);
    push('kyc_verified_to', filterValues.kycVerifiedToFilter);

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
  const fetchVolunteers = React.useCallback(async () => {
    try {
      const res = await volunteersApi.getAll();
      const rows = res.data?.data || [];
      setVolunteers(Array.isArray(rows) ? rows : []);
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
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.message;
      const detail = serverMsg ? `: ${serverMsg}` : (status ? ` (HTTP ${status})` : '');
      setMessage({ type: 'error', text: `Failed to fetch employees${detail}` });
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
    fetchJobProfiles();
    fetchWorkNatures();
    fetchVolunteers(); // NEW
  }, [
    canViewEmployees,
    fetchStates,
    fetchCities,
    fetchQualifications,
    fetchShifts,
    fetchPlans,
    fetchJobProfiles,
    fetchWorkNatures,
    fetchVolunteers // NEW
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

  // ✅ Ensure these exist ONCE (if you already added them earlier, keep the first copy and delete the later copy)
  const [deactivateDialog, setDeactivateDialog] = useState({ open: false, employeeId: null });
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateError, setDeactivateError] = useState(null);
  const [deactivateSaving, setDeactivateSaving] = useState(false);

  // FIRST (valid) copy
  const filtersSignature = React.useMemo(() => JSON.stringify(filterValues), [filterValues]);
  const lastFilterSignatureRef = React.useRef(filtersSignature);

  const queryFilters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const normalize = (value) => (value || '').trim().toLowerCase();
    const raw = (value) => (value || '').trim();
    return {
      status: normalize(params.get('status')),
      verification_status: normalize(params.get('verification_status')),
      kyc_status: normalize(params.get('kyc_status')),
      // NEW: date params (do not lowercase)
      kyc_verified_from: raw(params.get('kyc_verified_from')),
      kyc_verified_to: raw(params.get('kyc_verified_to'))
    };
  }, [location.search]);

  const queryFiltersSignature = useMemo(() => JSON.stringify(queryFilters), [queryFilters]);

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

    // NEW: hydrate KYC verification date range (YYYY-MM-DD expected)
    setKycVerifiedFromFilter(queryFilters.kyc_verified_from || '');
    setKycVerifiedToFilter(queryFilters.kyc_verified_to || '');

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
      'ID',
      'Name',
      'Email',
      'Assistant Code', // NEW
      'DOB',
      'Gender',
      'Age',
      'State',
      'City',
      'Pref State',
      'Pref City',
      'Qualification',
      'Expected Salary',
      'Salary Frequency',
      'Preferred Shift',
      'Verification',
      'KYC',
      'Subscription Plan',
      'Subscription Expiry',
      'Status',
      'Job Profiles',
      'Work Nature',
      'Last Seen',
      'Employee Created At',
      'User Created At',
      'User Life (days)',
      'Contact Credit (used/total)',
      'Interest Credit (used/total)',
      'Credit Expiry'
    ];
    const escapeCell = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = exportRows.map(e => {
      const userCreatedAt = e.User?.created_at || null;
      const isActive = e.User?.is_active === true;

      const verificationExport = e.verification_at
        ? `${e.verification_status || ''} (${formatExportDateTime(e.verification_at)})`
        : (e.verification_status || '');

      const kycExport = e.kyc_verification_at
        ? `${e.kyc_status || ''} (${formatExportDateTime(e.kyc_verification_at)})`
        : (e.kyc_status || '');

      return [
        e.id,
        e.name || '',
        e.email || '',
        e.assistant_code || '', // NEW
        formatDateOnly(e.dob) || '',
        formatGender(e.gender),
        calculateAge(e.dob),

        e.State?.state_english || '',
        e.City?.city_english || '',
        e.PreferredState?.state_english || '',
        e.PreferredCity?.city_english || '',
        e.Qualification?.qualification_english || '',

        e.expected_salary ?? '',
        e.expected_salary_frequency || '',
        e.Shift?.shift_english || '',

        verificationExport, // CHANGED (was e.verification_status)
        kycExport,          // CHANGED (was e.kyc_status)

        e.SubscriptionPlan?.plan_name_english || '',
        formatExportDateTime(e.credit_expiry_at),

        isActive ? 'Active' : 'Inactive',

        e.job_profiles_display || '',
        e.work_natures_display || '',

        formatExportDateTime(e.User?.last_active_at),

        formatExportDateTime(e.created_at),
        formatExportDateTime(userCreatedAt),
        getUserLifeDays(userCreatedAt),

        `${e.contact_credit || 0}/${e.total_contact_credit || 0}`,
        `${e.interest_credit || 0}/${e.total_interest_credit || 0}`,
        formatExportDateTime(e.credit_expiry_at)
      ];
    });
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

    try {
      await logsApi.create({
        category: 'employee',
        type: 'export',
        redirect_to: '/employees',
        log_text: `Employees exported to CSV (${exportRows.length} rows)`,
      });
    } catch (e) {
      // never block export on logging
    }
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

  // NEW: date-only formatter (DOB, filter chips)
  const formatDateOnly = (val) => {
    if (!val) return '';
    try {
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
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
      jobProfileFilter,
      workNatureFilter,
      workDurationFilter,
      workDurationFreqFilter,
      assistantCodeFilter,
      createdFromFilter,
      createdToFilter,
      // FIX: keep current values instead of clearing
      kycVerifiedFromFilter,
      kycVerifiedToFilter
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
    setJobProfileFilter(draftFilters.jobProfileFilter);
    setWorkNatureFilter(draftFilters.workNatureFilter);
    setWorkDurationFilter(draftFilters.workDurationFilter);
    setWorkDurationFreqFilter(draftFilters.workDurationFreqFilter);
    setAssistantCodeFilter(draftFilters.assistantCodeFilter);
    setCreatedFromFilter(draftFilters.createdFromFilter);
    setCreatedToFilter(draftFilters.createdToFilter);

    // NEW
    setKycVerifiedFromFilter(draftFilters.kycVerifiedFromFilter);
    setKycVerifiedToFilter(draftFilters.kycVerifiedToFilter);

    // NEW: keep URL in sync (delete params when cleared)
    updateUrlParams({
      kyc_verified_from: draftFilters.kycVerifiedFromFilter,
      kyc_verified_to: draftFilters.kycVerifiedToFilter
    });

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
    setAssistantCodeFilter('');

    // NEW
    setCreatedFromFilter('');
    setCreatedToFilter('');
    setKycVerifiedFromFilter('');
    setKycVerifiedToFilter('');

    // NEW: remove from URL as well
    updateUrlParams({ kyc_verified_from: '', kyc_verified_to: '' });
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
      work_duration_freq: setWorkDurationFreqFilter,
      assistant_code: setAssistantCodeFilter,
      created_from: setCreatedFromFilter,
      created_to: setCreatedToFilter,
      // NEW
      kyc_verified_from: () => {
        setKycVerifiedFromFilter('');
        updateUrlParams({ kyc_verified_from: '' });
      },
      kyc_verified_to: () => {
        setKycVerifiedToFilter('');
        updateUrlParams({ kyc_verified_to: '' });
      }
    };
    filterMap[key]?.('');
  };

  const activeFilterCount = [
    stateFilter, cityFilter, prefStateFilter, prefCityFilter,
    qualificationFilter, salaryFreqFilter, shiftFilter, planFilter,
    genderFilter, verificationFilter, kycFilter, searchTerm,
    statusFilter, subscriptionStatusFilter, newEmployeeFilter,
    jobProfileFilter, workNatureFilter, workDurationFilter, workDurationFreqFilter, assistantCodeFilter,
    createdFromFilter, createdToFilter, // NEW
    kycVerifiedFromFilter, kycVerifiedToFilter // NEW
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

  // NEW: open VolunteerForm from employee table
  const openVolunteerEditor = React.useCallback((volunteerId) => {
    if (!volunteerId) return;
    setEditingVolunteerId(volunteerId);
    setShowVolunteerForm(true);
  }, []);

  // NEW: helper (fixes no-undef + enables name lookup)
  const getVolunteerByAssistantCode = React.useCallback((code) => {
    const key = (code || '').toString().trim().toLowerCase();
    if (!key) return null;
    return volunteers.find(v => (v.assistant_code || '').toString().trim().toLowerCase() === key) || null;
  }, [volunteers]);

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

  const renderStatusBadge = (status, at) => {
    if (!status) return '-';
    const palette = statusBadgePalette[status.toLowerCase()] || { bg: '#e2e8f0', color: '#475569' };
    const atLabel = at ? formatDisplayDateTime(at) : null;

    return (
      <span
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '2px',
          padding: '6px 10px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'capitalize',
          backgroundColor: palette.bg,
          color: palette.color,
          border: '1px solid rgba(0,0,0,0.06)',
          lineHeight: 1.2,
          whiteSpace: 'nowrap'
        }}
      >
        <span>{status}</span>
        {atLabel && <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.95 }}>{atLabel}</span>}
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

  // NEW: compute age (years) from DOB
  const calculateAge = React.useCallback((dob) => {
    if (!dob) return '-';
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0) && today.getDate() < d.getDate()) age -= 1;
    return age >= 0 ? age : '-';
  }, []);

  // NEW: render credit balances
  const renderCreditBalances = React.useCallback((e) => {
    const c = `${Number(e.contact_credit || 0)}/${Number(e.total_contact_credit || 0)}`;
    const i = `${Number(e.interest_credit || 0)}/${Number(e.total_interest_credit || 0)}`;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, lineHeight: 1.2 }}>
        <span><strong>Contact:</strong> {c}</span>
        <span><strong>Interest:</strong> {i}</span>
      </div>
    );
  }, []);

  // NEW: share employee link (copy to clipboard)
  const handleShareEmployee = React.useCallback(async (employeeId) => {
    const link = `${window.location.origin}/employees/${employeeId}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setMessage({ type: 'success', text: 'Share link copied to clipboard.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to copy share link.' });
    }
  }, []);

  // NEW: use this wherever you currently call employeesApi.deactivateEmployee(...)
  const deactivateEmployeeWithReason = React.useCallback(async (employeeId) => {
    setDeactivateDialog({ open: true, employeeId });
    setDeactivateReason('');
    setDeactivateError(null);
  }, []);

  // NEW: submit handler for modal
  const confirmDeactivate = React.useCallback(async () => {
    const employeeId = deactivateDialog.employeeId;
    const reason = (deactivateReason || '').toString().trim();
    if (!employeeId) return;
    if (!reason) { setDeactivateError('Deactivation reason is required.'); return; }

    setDeactivateSaving(true);
    setDeactivateError(null);
    try {
      await employeesApi.deactivateEmployee(employeeId, { deactivation_reason: reason });
      setDeactivateDialog({ open: false, employeeId: null });
      setMessage({ type: 'success', text: 'Employee deactivated.' });
      await fetchEmployees();
    } catch (e) {
      setDeactivateError(e?.response?.data?.message || 'Failed to deactivate employee.');
    } finally {
      setDeactivateSaving(false);
    }
  }, [deactivateDialog.employeeId, deactivateReason, fetchEmployees]);

  // NEW: minimal URL query param sync (used only for KYC verified date range)
  const updateUrlParams = React.useCallback((updates = {}) => {
    const params = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null || value === '') params.delete(key);
      else params.set(key, String(value));
    }
    const next = params.toString();
    const current = (location.search || '').replace(/^\?/, '');
    if (next === current) return;
    navigate(
      { pathname: location.pathname, search: next ? `?${next}` : '' },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate]);

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
    fetchJobProfiles();
    fetchWorkNatures();
    fetchVolunteers(); // NEW
  }, [
    canViewEmployees,
    fetchStates,
    fetchCities,
    fetchQualifications,
    fetchShifts,
    fetchPlans,
    fetchJobProfiles,
    fetchWorkNatures,
    fetchVolunteers // NEW
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

  /**
   * FIX: You have a duplicated pasted block below that redeclares filtersSignature (and many other consts).
   * Wrap the duplicate in a dead block so it doesn't redeclare in the same scope and doesn't run hooks.
   * (Long-term: delete the duplicate block entirely.)
   */

  // --- ADD THIS LINE immediately BEFORE the SECOND occurrence of:
  // const filtersSignature = React.useMemo(() => JSON.stringify(filterValues), [filterValues]);
  if (false) {
    // ...existing duplicated code block (leave it as-is inside this block)...
    // const filtersSignature = React.useMemo(() => JSON.stringify(filterValues), [filterValues]);
    // ...existing duplicated code block...
  }

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content employees-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            {/* CHANGED: allow opening VolunteerForm from this page */}
            {!showForm && !showVolunteerForm ? (
              <>
                <div className="list-header">
                  <h1>Employees</h1>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {employeePerms.canManage && (
                    <button
                      className="btn-primary small"
                      onClick={() => { setEditingId(null); setShowForm(true); }}
                    >
                      + Add Employee
                    </button>
                  )}
                  {canViewEmployees && (
                    <LogsAction category="employee" title="Employee Logs" />
                  )}
                  </div>
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
                      // CHANGED: include phone
                      placeholder="name, phone, email, state, city..."
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
                  {assistantCodeFilter && (() => {
                    const v = getVolunteerByAssistantCode(assistantCodeFilter);
                    const label = v?.name ? `${assistantCodeFilter} (${v.name})` : assistantCodeFilter;
                    return (
                      <span className="badge chip" style={chipBaseStyle}>
                        Assistant: {label}
                        <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('assistant_code')}>×</button>
                      </span>
                    );
                  })()}
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
                  {createdFromFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Created From: {formatDateOnly(createdFromFilter)}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('created_from')}>×</button>
                    </span>
                  )}
                  {createdToFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Created To: {formatDateOnly(createdToFilter)}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('created_to')}>×</button>
                    </span>
                  )}
                  {kycVerifiedFromFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      KYC Verified From: {formatDateOnly(kycVerifiedFromFilter)}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('kyc_verified_from')}>×</button>
                    </span>
                  )}
                  {kycVerifiedToFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      KYC Verified To: {formatDateOnly(kycVerifiedToFilter)}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('kyc_verified_to')}>×</button>
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
                      <div> {/* created date from filter */}
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>Created Date From</label>
                        <input
                          className="state-filter-select"
                          type="date"
                          value={draftFilters.createdFromFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, createdFromFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        />
                      </div>
                      <div> {/* created date to filter */}
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>Created Date To</label>
                        <input
                          className="state-filter-select"
                          type="date"
                          value={draftFilters.createdToFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, createdToFilter: e.target.value }))}
                          style={{ width:'100%' }}
                          min={draftFilters.createdFromFilter || undefined}
                        />
                      </div>

                      {/* NEW: KYC verification date range */}
                      <div>
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>
                          KYC Verified Date From
                        </label>
                        <input
                          className="state-filter-select"
                          type="date"
                          value={draftFilters.kycVerifiedFromFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, kycVerifiedFromFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        />
                      </div>
                      <div>
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>
                          KYC Verified Date To
                        </label>
                        <input
                          className="state-filter-select"
                          type="date"
                          value={draftFilters.kycVerifiedToFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, kycVerifiedToFilter: e.target.value }))}
                          style={{ width:'100%' }}
                          min={draftFilters.kycVerifiedFromFilter || undefined}
                        />
                      </div>

                      {/* ADD: Assistant filter (Volunteer master) */}
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                          Assistant (Volunteer)
                        </label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.assistantCodeFilter}
                          onChange={(e) => setDraftFilters((f) => ({ ...f, assistantCodeFilter: e.target.value }))}
                          style={{ width: '100%' }}
                        >
                          <option value="">All</option>
                          {volunteers
                            .filter((v) => (v.assistant_code || '').toString().trim())
                            .slice()
                            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
                            .map((v) => (
                              <option key={v.id} value={v.assistant_code}>
                                {v.assistant_code} — {v.name || 'Unnamed'}
                              </option>
                            ))}
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

                <div className="table-container">
                  <table className="data-table" style={{ minWidth: '2000px' }}>
                    <thead>
                      <tr>
                        <th onClick={() => handleHeaderClick('id')} style={{ cursor:'pointer' }}>ID{ind('id')}</th>
                        <th onClick={() => handleHeaderClick('name')} style={{ cursor:'pointer' }}>Name{ind('name')}</th>

                        {/* NEW */}
                        {employeePerms.canShowPhoneAddress && <th>Phone</th>}

                        <th onClick={() => handleHeaderClick('email')} style={{ cursor:'pointer' }}>Email{ind('email')}</th>
                        <th onClick={() => handleHeaderClick('assistant_code')} style={{ cursor:'pointer' }}>Assistant Code{ind('assistant_code')}</th>
                        <th onClick={() => handleHeaderClick('dob')} style={{ cursor:'pointer' }}>DOB{ind('dob')}</th>
                        <th onClick={() => handleHeaderClick('gender')} style={{ cursor:'pointer' }}>Gender{ind('gender')}</th>

                        <th>Age</th> {/* MOVED: after Gender */}

                        {employeePerms.canShowPhoneAddress && (
                          <th onClick={() => handleHeaderClick('state')} style={{ cursor:'pointer' }}>State{ind('state')}</th>
                        )}
                        {employeePerms.canShowPhoneAddress && (
                          <th onClick={() => handleHeaderClick('city')} style={{ cursor:'pointer' }}>City{ind('city')}</th>
                        )}
                        {employeePerms.canShowPhoneAddress && <th>Pref State</th>}
                        {employeePerms.canShowPhoneAddress && <th>Pref City</th>}
                        <th onClick={() => handleHeaderClick('qualification')} style={{ cursor:'pointer' }}>Qualification{ind('qualification')}</th>
                        <th onClick={() => handleHeaderClick('expected_salary')} style={{ cursor:'pointer' }}>Salary{ind('expected_salary')}</th>
                        <th>Freq</th>
                        <th onClick={() => handleHeaderClick('shift')} style={{ cursor:'pointer' }}>Shift{ind('shift')}</th>
                        <th onClick={() => handleHeaderClick('verification_status')} style={{ cursor:'pointer' }}>Verification{ind('verification_status')}</th>
                        <th onClick={() => handleHeaderClick('kyc_status')} style={{ cursor: 'pointer' }}>KYC{ind('kyc_status')}</th>
                        <th style={{ cursor: 'pointer' }}>Subscription</th>
                        <th onClick={() => handleHeaderClick('is_active')} style={{ cursor:'pointer' }}>Status{ind('is_active')}</th>
                        <th>Deactivation Reason</th>
                        <th>Status Changed By</th> {/* NEW */}
                        <th>Job Profiles</th>
                        <th>Work Nature</th> {/* added */}
                        <th>Last Seen</th>
                        <th onClick={() => handleHeaderClick('created_at')} style={{ cursor:'pointer' }}>Created{ind('created_at')}</th>
                        <th>User Life (days)</th>
                        <th>Credit Balances</th> {/* NEW */}
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
                          const volunteerName = e.volunteer_name || getVolunteerByAssistantCode(e.assistant_code)?.name || null;
                          const volunteerId = e.volunteer_id || getVolunteerByAssistantCode(e.assistant_code)?.id || null;

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

                              {/* NEW */}
                              {employeePerms.canShowPhoneAddress && (<td>{e.User?.mobile || '-'}</td>)}

                              <td>{e.email || '-'}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: 1.15 }}>
                                  <span>{e.assistant_code || '-'}</span>

                                  {/* CHANGED: open VolunteerForm here */}
                                  {volunteerName && (
                                    <button
                                      type="button"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        openVolunteerEditor(volunteerId);
                                      }}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        padding: 0,
                                        textAlign: 'left',
                                        color: '#2563eb',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                      title="Edit Volunteer"
                                    >
                                      {volunteerName}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td>{formatDateOnly(e.dob) || '-'}</td>
                              <td>{formatGender(e.gender)}</td>
                              <td>{calculateAge(e.dob)}</td> {/* MOVED: after Gender */}
                              {employeePerms.canShowPhoneAddress && (<td>{e.State?.state_english || '-'}</td>)}
                              {employeePerms.canShowPhoneAddress && (<td>{e.City?.city_english || '-'}</td>)}
                              {employeePerms.canShowPhoneAddress && (<td>{e.PreferredState?.state_english || '-'}</td>)}
                              {employeePerms.canShowPhoneAddress && (<td>{e.PreferredCity?.city_english || '-'}</td>)}
                              <td>{e.Qualification?.qualification_english || '-'}</td>
                              <td>{e.expected_salary || '-'}</td>
                              <td>{e.expected_salary_frequency || '-'}</td>
                              <td>{e.Shift?.shift_english || '-'}</td>
                              <td>{renderStatusBadge(e.verification_status, e.verification_at)}</td> {/* CHANGED */}
                              <td>{renderStatusBadge(e.kyc_status, e.kyc_verification_at)}</td>       {/* CHANGED */}
                              <td>{formatSubscriptionLabel(e)}</td>
                              <td>
                                <span className={`badge ${isInactive ? 'inactive' : 'active'}`}>
                                  {isInactive ? 'Inactive' : 'Active'}
                                </span>
                              </td>
                              <td>{e.User?.deactivation_reason || '-'}</td>
                              <td>{e.User?.StatusChangedBy?.name || '-'}</td> {/* NEW */}
                              <td>{e.job_profiles_display || '-'}</td> {/* added */}
                              <td>{e.work_natures_display || '-'}</td> {/* added */}
                              <td>{lastSeenLabel}</td>


                              <td>{e.created_at ? new Date(e.created_at).toLocaleDateString() : '-'}</td>
                              <td>{userLifeDays}</td>
                              <td>{renderCreditBalances(e)}</td> {/* NEW */}
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
                                    {/* NEW: Share button in Actions */}
                                    <button
                                      className="btn-small"
                                      type="button"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        handleShareEmployee(e.id);
                                      }}
                                      title="Copy share link"
                                    >
                                      Share
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          {/* CHANGED: update colSpan (+1 for Status Changed By) */}
                          <td colSpan="29" className="no-data">
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
            ) : showForm ? (
              <EmployeeForm
                employeeId={editingId}
                onClose={handleFormClose}
                onSuccess={(msg) => setMessage(msg)}
              />
            ) : (
              <VolunteerForm
                volunteerId={editingVolunteerId}
                onClose={() => { setShowVolunteerForm(false); setEditingVolunteerId(null); }}
                onSuccess={(msg) => {
                  setMessage(msg);
                  fetchVolunteers(); // refresh names/codes used by filter + table
                }}
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

            {/* NEW: Deactivation reason modal */}
            {deactivateDialog.open && (
              <div
                className="form-container"
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.45)',
                  zIndex: 5000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{ width: '92%', maxWidth: '440px', background: '#fff', borderRadius: '10px', padding: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '16px' }}>Deactivate User</h2>
                  <div style={{ marginTop: 6, fontSize: '12px', color: '#475569' }}>
                    Deactivation reason is required.
                  </div>

                  {deactivateError && (
                    <div style={{ marginTop: 10, fontSize: '12px', color: '#b91c1c' }}>
                      {deactivateError}
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: 6 }}>
                      Reason
                    </label>
                    <textarea
                      className="state-filter-select"
                      value={deactivateReason}
                      onChange={(e) => setDeactivateReason(e.target.value)}
                      rows={4}
                      placeholder="Enter reason..."
                      disabled={deactivateSaving}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => { setDeactivateDialog({ open: false, employeeId: null }); setDeactivateError(null); }}
                      disabled={deactivateSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary btn-small"
                      onClick={confirmDeactivate}
                      disabled={deactivateSaving}
                    >
                      {deactivateSaving ? 'Deactivating...' : 'Deactivate'}
                    </button>
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
