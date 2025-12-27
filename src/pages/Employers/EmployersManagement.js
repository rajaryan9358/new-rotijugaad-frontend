import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import logsApi from '../../api/logsApi';
import employersApi from '../../api/employersApi';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { getStates } from '../../api/statesApi';
import { getCities } from '../../api/citiesApi';
import businessCategoriesApi from '../../api/masters/businessCategoriesApi';
import employerSubscriptionPlansApi from '../../api/subscriptions/employerSubscriptionPlansApi';
import EmployerForm from '../../components/Forms/EmployerForm'; // added
import VolunteerForm from '../../components/Forms/VolunteerForm'; // NEW
import '../Masters/MasterPage.css';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import volunteersApi from '../../api/masters/volunteersApi'; // NEW

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SCROLL_KEY = 'employers-scroll';

export default function EmployersManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const recencyIsNew = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('recency') === 'new';
  }, [location.search]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [employers, setEmployers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [message, setMessage] = useState(null); // already exists
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('');
  const [newEmployerFilter, setNewEmployerFilter] = useState(recencyIsNew ? 'new' : '');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    stateFilter: '',
    cityFilter: '',
    categoryFilter: '',
    planFilter: '',
    verificationFilter: '',
    kycFilter: '',
    activeFilter: '',
    subscriptionStatusFilter: '',
    newEmployerFilter: recencyIsNew ? 'new' : '',
    assistedByFilter: '',

    // FIX: these are used later; keep them initialized
    organizationTypeFilter: '',
    createdFromFilter: '',
    createdToFilter: '',
    kycVerifiedFromFilter: '',
    kycVerifiedToFilter: ''
  });
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false); // added
  const [editingId, setEditingId] = useState(null); // added
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [appliedQuerySignature, setAppliedQuerySignature] = useState('');
  const [volunteers, setVolunteers] = useState([]); // NEW
  const [assistedByFilter, setAssistedByFilter] = useState(''); // NEW
  const [showVolunteerForm, setShowVolunteerForm] = useState(false); // NEW
  const [editingVolunteerId, setEditingVolunteerId] = useState(null); // NEW

  // NEW: Organization Type filter (domestic|firm)
  const [organizationTypeFilter, setOrganizationTypeFilter] = useState('');

  // NEW
  const [createdFromFilter, setCreatedFromFilter] = useState('');
  const [createdToFilter, setCreatedToFilter] = useState('');

  // NEW: KYC verified date range (for Dashboard deep-link + filtering)
  const [kycVerifiedFromFilter, setKycVerifiedFromFilter] = useState('');
  const [kycVerifiedToFilter, setKycVerifiedToFilter] = useState('');

  const employerPerms = React.useMemo(() => ({
    canView: hasPermission(PERMISSIONS.EMPLOYERS_VIEW),
    canCreate: hasPermission(PERMISSIONS.EMPLOYERS_MANAGE),
    canEdit: hasPermission(PERMISSIONS.EMPLOYERS_MANAGE),
    canDelete: hasPermission(PERMISSIONS.EMPLOYERS_DELETE),
    canExport: hasPermission(PERMISSIONS.EMPLOYERS_EXPORT),
    canVerify: hasPermission(PERMISSIONS.EMPLOYERS_VERIFY),

    // Sensitive fields
    canShowPhoneAddress: hasPermission(PERMISSIONS.EMPLOYERS_SHOW_PHONE_ADDRESS),
  }), []);
  const canViewEmployers = employerPerms.canView;

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

  const fetchCategories = React.useCallback(async () => {
    try {
      const res = await businessCategoriesApi.getAll();
      setCategories(res.data?.data || []);
    } catch {
      const derived = Array.from(new Set(
        employers.map(getBusinessCategoryName).filter((c) => c && c !== '-')
      )).map((c, i) => ({ id: i + 1, category_english: c }));
      setCategories(derived);
    }
  }, [employers]);

  const fetchPlans = React.useCallback(async () => {
    try {
      const res = await employerSubscriptionPlansApi.getAll();
      setPlans(res.data?.data || []);
    } catch {
      const derived = employers
        .map((e) => e.SubscriptionPlan)
        .filter(Boolean)
        .reduce((acc, p) => (acc.find((x) => x.id === p.id) ? acc : [...acc, p]), []);
      setPlans(derived);
    }
  }, [employers]);

  const fetchVolunteers = React.useCallback(async () => {
    try {
      const res = await volunteersApi.getAll();
      const rows = res.data?.data || [];
      setVolunteers(Array.isArray(rows) ? rows : []);
    } catch {
      setVolunteers([]);
    }
  }, []);

  const getVolunteerByAssistantCode = React.useCallback((code) => {
    const key = (code || '').toString().trim().toLowerCase();
    if (!key) return null;
    return volunteers.find(v => (v.assistant_code || '').toString().trim().toLowerCase() === key) || null;
  }, [volunteers]);

  const openVolunteerEditor = React.useCallback((volunteerId) => {
    if (!volunteerId) return;
    setEditingVolunteerId(volunteerId);
    setShowVolunteerForm(true);
  }, []);

  // NEW: URL query param sync (delete when cleared)
  const updateUrlParams = React.useCallback((updates = {}) => {
    const params = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null || value === '') params.delete(key);
      else params.set(key, String(value));
    }
    const next = params.toString();
    const current = (location.search || '').replace(/^\?/, '');
    if (next === current) return;
    navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const buildQueryParams = React.useCallback((overrides = {}) => {
    const base = {
      page: currentPage,
      limit: pageSize,
      sortField,
      sortDir,
      search: searchTerm.trim() || undefined,
      state_id: stateFilter || undefined,
      city_id: cityFilter || undefined,
      category: categoryFilter || undefined,
      subscription_plan_id: planFilter || undefined,
      verification_status: verificationFilter || undefined,
      kyc_status: kycFilter || undefined,
      active_status: activeFilter || undefined,
      subscription_status: subscriptionStatusFilter || undefined,
      newFilter: newEmployerFilter || undefined,
      assisted_by: assistedByFilter || undefined, // NEW

      // FIX: this was in deps but not being sent
      organization_type: organizationTypeFilter || undefined,

      createdFrom: createdFromFilter || undefined,
      createdTo: createdToFilter || undefined,

      // NEW: KYC verified date range (sent as snake_case)
      kyc_verified_from: kycVerifiedFromFilter || undefined,
      kyc_verified_to: kycVerifiedToFilter || undefined
    };
    const merged = { ...base, ...overrides };
    return Object.fromEntries(
      Object.entries(merged).filter(([, value]) => value !== undefined && value !== '')
    );
  }, [
    currentPage,
    pageSize,
    sortField,
    sortDir,
    searchTerm,
    stateFilter,
    cityFilter,
    categoryFilter,
    planFilter,
    verificationFilter,
    kycFilter,
    activeFilter,
    subscriptionStatusFilter,
    newEmployerFilter,
    assistedByFilter, // NEW
    organizationTypeFilter, // NEW
    createdFromFilter,
    createdToFilter,
    // NEW
    kycVerifiedFromFilter,
    kycVerifiedToFilter
  ]);

  const load = React.useCallback(async (overrides = {}) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = buildQueryParams(overrides);
      const res = await employersApi.getAll(params);
      const rows = res.data?.data || [];
      const meta = res.data?.meta || {};
      const total = Number.isFinite(Number(meta.total)) ? Number(meta.total) : rows.length;
      const limitForMeta = Number.isFinite(Number(meta.limit)) ? Number(meta.limit) : params.limit;
      const metaPages = Number.isFinite(Number(meta.totalPages)) ? Number(meta.totalPages) : undefined;
      const computedPages = params.all ? 1 : (metaPages || (limitForMeta ? Math.max(Math.ceil(total / limitForMeta), 1) : 1));
      setEmployers(rows);
      setTotalCount(total);
      setTotalPages(computedPages);
    } catch (e) {
      setEmployers([]);
      setTotalCount(0);
      setTotalPages(1);
      setMessage({ type:'error', text: e.response?.data?.message || 'Failed to load employers' });
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  const handleMenuClick = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  const getBusinessCategoryName = (e) =>
    e.BusinessCategory?.category_english ||
    e.category_english ||
    e.category_name ||
    '-';

  useEffect(() => {
    const main = document.querySelector('.main-content');
    if (!main) return;
    const pos = Number(localStorage.getItem(PAGE_SCROLL_KEY) || 0);
    main.scrollTop = pos;
    const onScroll = () => localStorage.setItem(PAGE_SCROLL_KEY, main.scrollTop);
    main.addEventListener('scroll', onScroll);
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const getSubscriptionStatus = (e) => {
    const expiry =
      e.credit_expiry_at ||
      e.subscription_expiry_at ||
      e.plan_expiry_at ||
      e.subscription_end_date;
    if (!expiry) return 'active';
    return new Date(expiry).getTime() < Date.now() ? 'expired' : 'active';
  };
  const isEmployerActive = (employer) => Boolean(employer?.User?.is_active);

  const renderStatusBadge = (value, at) => {
    const normalized = (value || '').toLowerCase();
    const palette = {
      approved: { bg: '#dcfce7', color: '#166534', label: 'Approved' },
      verified: { bg: '#dcfce7', color: '#166534', label: 'Verified' },
      pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' }
    };
    const tone = palette[normalized] || { bg: '#e5e7eb', color: '#0f172a', label: value || '-' };
    const atLabel = at ? formatDisplayDateTime(at) : null;

    return (
      <span style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '2px',
        padding: '6px 10px',
        borderRadius: '10px',
        fontSize: '12px',
        fontWeight: 800,
        background: tone.bg,
        color: tone.color,
        border: '1px solid rgba(0,0,0,0.06)',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        textTransform: 'capitalize'
      }}>
        <span>{tone.label}</span>
        {atLabel && <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.95 }}>{atLabel}</span>}
      </span>
    );
  };

  const formatSubscriptionLabel = (employer) => {
    const planName = employer.SubscriptionPlan?.plan_name_english || employer.subscription_plan_name || 'No plan';
    const expiry =
      employer.credit_expiry_at ||
      employer.subscription_expiry_at ||
      employer.plan_expiry_at ||
      employer.subscription_end_date ||
      null;
    const isExpired = expiry ? new Date(expiry).getTime() < Date.now() : false;
    const colors = expiry
      ? (isExpired
          ? { bg:'#fee2e2', color:'#b91c1c', border:'#fecaca' }
          : { bg:'#dcfce7', color:'#166534', border:'#86efac' })
      : { bg:'#f3f4f6', color:'#1f2937', border:'#e5e7eb' };
    return (
      <span style={{
        display:'inline-flex', flexDirection:'column', alignItems:'flex-start',
        border:`1px solid ${colors.border}`, background:colors.bg, color:colors.color,
        padding:'6px 10px', borderRadius:'8px', fontSize:'11px', minWidth:'160px'
      }}>
        <strong style={{ fontSize:'12px' }}>{planName}</strong>
        {expiry && (
          <span style={{ fontSize:'11px' }}>
            {isExpired ? 'Expired: ' : 'Expires: '}
            {new Date(expiry).toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' })}
          </span>
        )}
      </span>
    );
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

  const handleApprove = async (employerId) => {
    try {
      // FIX: use dedicated endpoint so backend can stamp verification_at
      await employersApi.approve(employerId);
      setMessage({ type: 'success', text: 'Employer approved' });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Approve failed' });
    }
  };

  const handleReject = async (employerId) => {
    try {
      // FIX: use dedicated endpoint so backend can stamp verification_at
      await employersApi.reject(employerId);
      setMessage({ type: 'success', text: 'Employer rejected' });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Reject failed' });
    }
  };

  const handleEdit = (id) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employer?')) return;
    try {
      await employersApi.delete(id);
      setMessage({ type: 'success', text: 'Employer deleted' });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Delete failed' });
    }
  };

  const handleFormClose = () => { // modified
    setShowForm(false);
    setEditingId(null);
    load();
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
    transition:'background 0.2s',
  };

  // NEW: date-only formatter (chips)
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

  const openFilters = () => {
    if (showFilterPanel) return setShowFilterPanel(false);
    setDraftFilters({
      stateFilter,
      cityFilter,
      categoryFilter,
      planFilter,
      verificationFilter,
      kycFilter,
      activeFilter,
      subscriptionStatusFilter,
      newEmployerFilter,
      assistedByFilter, // NEW
      organizationTypeFilter, // NEW

      // NEW
      createdFromFilter,
      createdToFilter,

      // NEW
      kycVerifiedFromFilter,
      kycVerifiedToFilter
    });
    setShowFilterPanel(true);
  };

  const applyDraftFilters = () => {
    setStateFilter(draftFilters.stateFilter);
    setCityFilter(draftFilters.cityFilter);
    setCategoryFilter(draftFilters.categoryFilter);
    setPlanFilter(draftFilters.planFilter);
    setVerificationFilter(draftFilters.verificationFilter);
    setKycFilter(draftFilters.kycFilter);
    setActiveFilter(draftFilters.activeFilter);
    setSubscriptionStatusFilter(draftFilters.subscriptionStatusFilter);
    setNewEmployerFilter(draftFilters.newEmployerFilter);
    setAssistedByFilter(draftFilters.assistedByFilter); // NEW
    setOrganizationTypeFilter(draftFilters.organizationTypeFilter); // NEW

    // NEW
    setCreatedFromFilter(draftFilters.createdFromFilter);
    setCreatedToFilter(draftFilters.createdToFilter);

    // NEW
    setKycVerifiedFromFilter(draftFilters.kycVerifiedFromFilter);
    setKycVerifiedToFilter(draftFilters.kycVerifiedToFilter);
    updateUrlParams({
      kyc_verified_from: draftFilters.kycVerifiedFromFilter,
      kyc_verified_to: draftFilters.kycVerifiedToFilter
    });

    setShowFilterPanel(false);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setStateFilter('');
    setCityFilter('');
    setCategoryFilter('');
    setPlanFilter('');
    setVerificationFilter('');
    setKycFilter('');
    setActiveFilter('');
    setSubscriptionStatusFilter('');
    setNewEmployerFilter('');
    setAssistedByFilter(''); // NEW
    setOrganizationTypeFilter(''); // NEW

    // NEW
    setCreatedFromFilter('');
    setCreatedToFilter('');

    // NEW
    setKycVerifiedFromFilter('');
    setKycVerifiedToFilter('');
    updateUrlParams({ kyc_verified_from: '', kyc_verified_to: '' });

    setSortField('id');
    setSortDir('asc');
    setShowFilterPanel(false);
    setCurrentPage(1);
  };

  const removeFilterChip = (key) => {
    const map = {
      state: () => setStateFilter(''),
      city: () => setCityFilter(''),
      category: () => setCategoryFilter(''),
      plan: () => setPlanFilter(''),
      verification: () => setVerificationFilter(''),
      kyc: () => setKycFilter(''),
      active: () => setActiveFilter(''),
      subscription_status: () => setSubscriptionStatusFilter(''),
      new_employer: () => {
        setNewEmployerFilter('');
        setDraftFilters((prev) => ({ ...prev, newEmployerFilter: '' }));
      },
      search: () => setSearchTerm(''),
      assisted_by: () => setAssistedByFilter(''), // NEW
      organization_type: () => setOrganizationTypeFilter(''), // NEW

      // NEW
      created_from: () => setCreatedFromFilter(''),
      created_to: () => setCreatedToFilter(''),

      // NEW
      kyc_verified_from: () => { setKycVerifiedFromFilter(''); updateUrlParams({ kyc_verified_from: '' }); },
      kyc_verified_to: () => { setKycVerifiedToFilter(''); updateUrlParams({ kyc_verified_to: '' }); }
    };
    map[key]?.();
  };

  const categoriesSource = categories.length
    ? categories
    : Array.from(
        new Set(
          employers.map(getBusinessCategoryName).filter((c) => c && c !== '-')
        )
      ).map((c, i) => ({ id: i + 1, category_english: c }));

  const plansSource = plans.length
    ? plans
    : employers
        .map((e) => e.SubscriptionPlan)
        .filter(Boolean)
        .reduce((acc, p) => (acc.find((x) => x.id === p.id) ? acc : [...acc, p]), []);

  const queryFilters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const normalize = (value) => (value || '').trim().toLowerCase();
    const raw = (value) => (value || '').trim();
    return {
      active_status: normalize(params.get('active_status')),
      verification_status: normalize(params.get('verification_status')),
      kyc_status: normalize(params.get('kyc_status')),
      // NEW (do not lowercase)
      kyc_verified_from: raw(params.get('kyc_verified_from')),
      kyc_verified_to: raw(params.get('kyc_verified_to'))
    };
  }, [location.search]);

  const queryFiltersSignature = useMemo(
    () => JSON.stringify(queryFilters),
    [queryFilters]
  );

  useEffect(() => {
    if (!canViewEmployers) return;
    const normalizedActive = ['active', 'inactive'].includes(queryFilters.active_status)
      ? queryFilters.active_status
      : '';
    const normalizedVerification = ['pending', 'verified', 'rejected'].includes(queryFilters.verification_status)
      ? queryFilters.verification_status
      : '';
    const normalizedKyc = ['pending', 'verified', 'rejected'].includes(queryFilters.kyc_status)
      ? queryFilters.kyc_status
      : '';

    setActiveFilter(normalizedActive);
    setVerificationFilter(normalizedVerification);
    setKycFilter(normalizedKyc);

    // NEW: hydrate from URL (Dashboard deep-link)
    setKycVerifiedFromFilter(queryFilters.kyc_verified_from || '');
    setKycVerifiedToFilter(queryFilters.kyc_verified_to || '');

    setAppliedQuerySignature(queryFiltersSignature);
  }, [canViewEmployers, queryFiltersSignature]);

  const fetchData = React.useCallback(async () => {
    if (!canViewEmployers || !appliedQuerySignature) return;
    load();
  }, [canViewEmployers, appliedQuerySignature, load]);

  useEffect(() => {
    fetchStates();
    fetchCities();
    fetchCategories();
    fetchPlans();
    fetchVolunteers(); // NEW
  }, [fetchStates, fetchCities, fetchCategories, fetchPlans, fetchVolunteers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const headerClick = (field) => {
    if (sortField === field) setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };
  const ind = (field) => (sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const pageSummary = totalCount > 0
    ? {
        start: Math.min((currentPage - 1) * pageSize + 1, totalCount),
        end: Math.min((currentPage - 1) * pageSize + employers.length, totalCount)
      }
    : { start: 0, end: 0 };

  const filters = useMemo(() => ({
    stateFilter,
    cityFilter,
    categoryFilter,
    planFilter,
    verificationFilter,
    kycFilter,
    activeFilter,
    subscriptionStatusFilter,
    search: searchTerm.trim(),
    ...queryFilters
  }), [stateFilter, cityFilter, categoryFilter, planFilter, verificationFilter, kycFilter, activeFilter, subscriptionStatusFilter, searchTerm, queryFilters]);

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
    return `employers_${dd}-${MM}-${yyyy}_${hh}_${mm}_${ss}_${suffix}_.csv`;
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

  // NEW: render credit balances (same style as EmployeesManagement)
  const renderCreditBalances = React.useCallback((e) => {
    const c = `${Number(e.contact_credit || 0)}/${Number(e.total_contact_credit || 0)}`;
    const i = `${Number(e.interest_credit || 0)}/${Number(e.total_interest_credit || 0)}`;
    const a = `${Number(e.ad_credit || 0)}/${Number(e.total_ad_credit || 0)}`;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, lineHeight: 1.2 }}>
        <span><strong>Contact:</strong> {c}</span>
        <span><strong>Interest:</strong> {i}</span>
        <span><strong>Ads:</strong> {a}</span>
      </div>
    );
  }, []);

  const exportToCSV = async () => {
    const baseParams = buildQueryParams({ page: 1 });
    const exportRows = [];
    let page = 1;
    let totalPagesFromServer = null;
    let totalRecordsFromServer = null;
    const requestedLimit = baseParams.limit || pageSize || DEFAULT_PAGE_SIZE;

    try {
      while (true) {
        const res = await employersApi.getAll({ ...baseParams, page });
        const batch = Array.isArray(res.data?.data) ? res.data.data : [];
        exportRows.push(...batch);

        const metaInfo = res.data?.meta || {};
        if (typeof metaInfo.totalPages === 'number') totalPagesFromServer = metaInfo.totalPages;
        if (typeof metaInfo.total === 'number') totalRecordsFromServer = metaInfo.total;
        const serverLimit = metaInfo.limit || requestedLimit || batch.length || 1;

        // CHANGED: avoid no-loop-func
        let shouldContinue = false;
        if (totalRecordsFromServer !== null) shouldContinue = exportRows.length < totalRecordsFromServer;
        else if (totalPagesFromServer !== null) shouldContinue = page < totalPagesFromServer;
        else shouldContinue = batch.length === serverLimit;

        if (!shouldContinue) break;
        page += 1;
      }
    } catch (e) {
      console.error('Export employers error:', e);
      setMessage({ type: 'error', text: 'Failed to export employers' });
      return;
    }

    if (!exportRows.length) {
      setMessage({ type: 'error', text: 'No employers found for current filters.' });
      return;
    }

    const headers = [
      'ID',
      'Name',
      'Organization',
      'Email',
      'State',
      'City',
      'Verification',
      'KYC',
      'Subscription Plan',
      'Active',
      'Status Changed By', // NEW
      'Last Seen',
      'Profile Completed',
      // NEW: credit balances
      'Contact Credit (used/total)',
      'Interest Credit (used/total)',
      'Ads Credit (used/total)',
      'Credit Expiry',
      'Created At'
    ];
    const escape = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = exportRows.map((e) => [
      e.id,
      e.name || '',
      e.organization_name || '',
      e.email || '',
      e.State?.state_english || '',
      e.City?.city_english || '',
      e.verification_status || '',
      e.kyc_status || '',
      e.SubscriptionPlan?.plan_name_english || '',
      e.User?.is_active ? 'Active' : 'Inactive',
      e.User?.StatusChangedBy?.name || '', // NEW
      formatExportDateTime(e.User?.last_active_at) || '',
      formatExportDateTime(e.User?.profile_completed_at) || '',
      // NEW: credit balances
      `${e.contact_credit || 0}/${e.total_contact_credit || 0}`,
      `${e.interest_credit || 0}/${e.total_interest_credit || 0}`,
      `${e.ad_credit || 0}/${e.total_ad_credit || 0}`,
      formatExportDateTime(e.credit_expiry_at) || '',
      formatExportDateTime(e.created_at) || ''
    ]);

    const csv = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
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
        category: 'employer',
        type: 'export',
        redirect_to: '/employers',
        log_text: `Employers exported to CSV (${exportRows.length} rows)`,
      });
    } catch (e) {
      // never block export on logging
    }

  };

  if (!canViewEmployers) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view employers.</div>
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
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div
                className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}
                style={{ marginBottom:'12px' }}
              >
                {message.text}
                <button
                  className="msg-close"
                  onClick={() => setMessage(null)}
                  style={{ marginLeft:'8px' }}
                >✕</button>
              </div>
            )}
            {/* message block added */}
            {/* List header */}
            {!showForm && !showVolunteerForm ? (
              <>
                <div className="list-header">
                  <h1>Employers</h1>
                  {employerPerms.canCreate && (
                    <button
                      className="btn-primary small"
                      onClick={() => { setEditingId(null); setShowForm(true); }}
                    >
                      + Add Employer
                    </button>
                  )}
                </div>

                {/* Search + actions row */}
                <div className="search-filter-row" style={{ marginBottom:'10px', display:'flex', alignItems:'center', gap:'16px' }}>

                  <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:'1 1 auto' }}>
                    <label htmlFor="employer-search" style={{ fontSize:'12px', fontWeight:600 }}>Search:</label>
                    <input
                      id="employer-search"
                      type="text"
                      className="state-filter-select"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      // CHANGED: mention org name is searchable too
                      placeholder="name, organization, phone, email, state, city..."
                      style={{ maxWidth:'260px' }}
                    />
                  </div>
                  <div style={{ flex:'0 0 auto', display:'flex', gap:'8px' }}>
                    <LogsAction category="employer" title="Employer Logs" buttonStyle={{ padding:'4px 10px' }} />
                    <button className="btn-secondary btn-small" onClick={openFilters}>
                      Filters {( [
                        stateFilter, cityFilter, categoryFilter, planFilter,
                        verificationFilter, kycFilter, activeFilter, subscriptionStatusFilter, newEmployerFilter, searchTerm,
                        assistedByFilter, organizationTypeFilter, // NEW (already present elsewhere)
                        createdFromFilter, createdToFilter // NEW
                      ].filter(Boolean).length) > 0 &&
                        `(${
                          [
                            stateFilter, cityFilter, categoryFilter, planFilter,
                            verificationFilter, kycFilter, activeFilter, subscriptionStatusFilter, newEmployerFilter, searchTerm,
                            assistedByFilter, organizationTypeFilter,
                            createdFromFilter, createdToFilter
                          ].filter(Boolean).length
                        })`}
                    </button>
                    {employerPerms.canExport && (
                      <button className="btn-secondary btn-small" onClick={exportToCSV}>Export CSV</button>
                    )}
                  </div>
                </div>

                {/* Applied filter chips */}
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
                      <button className="chip-close" style={chipCloseStyle} onClick={()=>removeFilterChip('search')}>×</button>
                    </span>
                  )}
                  {stateFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      State: {states.find(s=>s.id===parseInt(stateFilter))?.state_english || stateFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={()=>removeFilterChip('state')}>×</button>
                    </span>
                  )}
                  {cityFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      City: {cities.find(c=>c.id===parseInt(cityFilter))?.city_english || cityFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={()=>removeFilterChip('city')}>×</button>
                    </span>
                  )}
                  {categoryFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Category: {categoryFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={()=>removeFilterChip('category')}>×</button>
                    </span>
                  )}
                  {planFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Plan: {plans.find(p=>p.id===parseInt(planFilter))?.plan_name_english || planFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={()=>removeFilterChip('plan')}>×</button>
                    </span>
                  )}
                  {verificationFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Verification: {verificationFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={()=>removeFilterChip('verification')}>×</button>
                    </span>
                  )}
                  {kycFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      KYC: {kycFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={()=>removeFilterChip('kyc')}>×</button>
                    </span>
                  )}
                  {activeFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Active: {activeFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={()=>removeFilterChip('active')}>×</button>
                    </span>
                  )}
                  {subscriptionStatusFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Sub Status: {subscriptionStatusFilter}
                      <button className="chip-close" style={chipCloseStyle} onClick={()=>removeFilterChip('subscription_status')}>×</button>
                    </span>
                  )}
                  {newEmployerFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Employer Recency: New
                      <button className="chip-close" style={chipCloseStyle} onClick={()=>removeFilterChip('new_employer')}>×</button>
                    </span>
                  )}
                  {assistedByFilter && (() => {
                    const v = getVolunteerByAssistantCode(assistedByFilter);
                    const label = v?.name ? `${assistedByFilter} (${v.name})` : assistedByFilter;
                    return (
                      <span className="badge chip" style={chipBaseStyle}>
                        Assisted By: {label}
                        <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('assisted_by')}>×</button>
                      </span>
                    );
                  })()}
                  {organizationTypeFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Org Type: {organizationTypeFilter}
                      <button
                        className="chip-close"
                        style={chipCloseStyle}
                        onClick={() => removeFilterChip('organization_type')}
                      >
                        ×
                      </button>
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
                  {[stateFilter, cityFilter, categoryFilter, planFilter, verificationFilter, kycFilter, activeFilter, subscriptionStatusFilter, newEmployerFilter, searchTerm, assistedByFilter, organizationTypeFilter, createdFromFilter, createdToFilter, kycVerifiedFromFilter, kycVerifiedToFilter].filter(Boolean).length === 0 && (
                    <span style={{ fontSize:'12px', color:'#64748b' }}>No filters applied</span>
                  )}
                </div>

                {/* Filter panel */}
                {showFilterPanel && (
                  <div className="filter-panel" style={{ position:'relative', marginBottom:'16px', padding:'16px', border:'1px solid #ddd', borderRadius:'6px', background:'#fafafa' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'20px' }}>
                      <div>
                        <label className="filter-label">State</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.stateFilter}
                          onChange={e=>setDraftFilters(f=>({...f,stateFilter:e.target.value, cityFilter:''}))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          {states.map(s=> <option key={s.id} value={s.id}>{s.state_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label">City</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.cityFilter}
                          onChange={e=>setDraftFilters(f=>({...f,cityFilter:e.target.value}))}
                          disabled={!draftFilters.stateFilter}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          {cities.filter(c=>String(c.state_id)===draftFilters.stateFilter).map(c=> <option key={c.id} value={c.id}>{c.city_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label">Category</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.categoryFilter}
                          onChange={e=>setDraftFilters(f=>({...f,categoryFilter:e.target.value}))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          {categoriesSource.map(cat=> <option key={cat.id} value={cat.category_english}>{cat.category_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label">Plan</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.planFilter}
                          onChange={e=>setDraftFilters(f=>({...f,planFilter:e.target.value}))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          {plansSource.map(p=> <option key={p.id} value={p.id}>{p.plan_name_english}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label">Verification</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.verificationFilter}
                          onChange={e=>setDraftFilters(f=>({...f,verificationFilter:e.target.value}))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="filter-label">KYC</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.kycFilter}
                          onChange={e=>setDraftFilters(f=>({...f,kycFilter:e.target.value}))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="filter-label">Active</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.activeFilter}
                          onChange={e=>setDraftFilters(f=>({...f,activeFilter:e.target.value}))}
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
                        <label className="filter-label" style={{ display:'block', marginBottom:'6px', fontSize:'13px', fontWeight:600 }}>Employer Recency</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.newEmployerFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, newEmployerFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          <option value="new">New</option>
                        </select>
                      </div>

                      {/* NEW: Assistant (Volunteer) */}
                      <div>
                        <label className="filter-label">Assistant (Volunteer)</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.assistedByFilter}
                          onChange={(e) => setDraftFilters(f => ({ ...f, assistedByFilter: e.target.value }))}
                          style={{ width: '100%' }}
                        >
                          <option value="">All</option>
                          {volunteers
                            .filter(v => (v.assistant_code || '').toString().trim())
                            .slice()
                            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
                            .map(v => (
                              <option key={v.id} value={v.assistant_code}>
                                {v.assistant_code} — {v.name || 'Unnamed'}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* NEW: Organization Type */}
                      <div>
                        <label className="filter-label">Organization Type</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.organizationTypeFilter}
                          onChange={(e) => setDraftFilters((f) => ({ ...f, organizationTypeFilter: e.target.value }))}
                          style={{ width:'100%' }}
                        >
                          <option value="">All</option>
                          <option value="domestic">Domestic</option>
                          <option value="firm">Firm</option>
                        </select>
                      </div>

                      {/* NEW: Created date range */}
                      <div>
                        <label className="filter-label">Created Date From</label>
                        <input
                          className="state-filter-select"
                          type="date"
                          value={draftFilters.createdFromFilter}
                          onChange={(e) => setDraftFilters((f) => ({ ...f, createdFromFilter: e.target.value }))}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label className="filter-label">Created Date To</label>
                        <input
                          className="state-filter-select"
                          type="date"
                          value={draftFilters.createdToFilter}
                          onChange={(e) => setDraftFilters((f) => ({ ...f, createdToFilter: e.target.value }))}
                          min={draftFilters.createdFromFilter || undefined}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* NEW: KYC verification date range */}
                      <div>
                        <label className="filter-label">KYC Verified Date From</label>
                        <input
                          className="state-filter-select"
                          type="date"
                          value={draftFilters.kycVerifiedFromFilter}
                          onChange={(e) => setDraftFilters((f) => ({ ...f, kycVerifiedFromFilter: e.target.value }))}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label className="filter-label">KYC Verified Date To</label>
                        <input
                          className="state-filter-select"
                          type="date"
                          value={draftFilters.kycVerifiedToFilter}
                          onChange={(e) => setDraftFilters((f) => ({ ...f, kycVerifiedToFilter: e.target.value }))}
                          min={draftFilters.kycVerifiedFromFilter || undefined}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <div className="filter-actions" style={{ marginTop:'20px', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                      <button type="button" className="btn-primary btn-small" onClick={applyDraftFilters}>Apply</button>
                      <button type="button" className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                      <button type="button" className="btn-secondary btn-small" onClick={()=>setShowFilterPanel(false)}>Close</button>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="table-container" style={{ overflowX:'auto' }}>
                  <table className="data-table" style={{ minWidth:'1900px' }}>
                    <thead>
                      <tr>
                        <th onClick={()=>headerClick('id')} style={{ cursor:'pointer' }}>ID{ind('id')}</th>
                        <th onClick={()=>headerClick('name')} style={{ cursor:'pointer' }}>Name{ind('name')}</th>

                        {/* NEW */}
                        {employerPerms.canShowPhoneAddress && <th>Phone</th>}

                        <th onClick={()=>headerClick('organization_type')} style={{ cursor:'pointer' }}>Org Type{ind('organization_type')}</th>
                        <th onClick={()=>headerClick('organization_name')} style={{ cursor:'pointer' }}>Org Name{ind('organization_name')}</th>
                        <th>Assisted By</th> {/* MOVED: was later (e.g. after Email) */}
                        <th onClick={()=>headerClick('email')} style={{ cursor:'pointer' }}>Email{ind('email')}</th>
                        <th onClick={()=>headerClick('businessCategoryName')} style={{ cursor:'pointer' }}>Business Category{ind('businessCategoryName')}</th>
                        {employerPerms.canShowPhoneAddress && <th>Address</th>}
                        {employerPerms.canShowPhoneAddress && <th>State</th>}
                        {employerPerms.canShowPhoneAddress && <th>City</th>}
                        <th onClick={()=>headerClick('verification_status')} style={{ cursor:'pointer' }}>Verification{ind('verification_status')}</th>
                        <th onClick={()=>headerClick('kyc_status')} style={{ cursor:'pointer' }}>KYC{ind('kyc_status')}</th>
                        <th>Subscription</th>
                        <th onClick={()=>headerClick('is_active')} style={{ cursor:'pointer' }}>Active{ind('is_active')}</th>
                        <th>Status Changed By</th> {/* NEW */}
                        <th>Deactivation Reason</th>
                        <th>Last Seen</th>
                        <th>Profile Completed</th>
                        <th onClick={()=>headerClick('created_at')} style={{ cursor:'pointer' }}>Created At{ind('created_at')}</th>
                        <th>User Life (days)</th>
                        <th>Credit Balances</th> {/* NEW */}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={employerPerms.canShowPhoneAddress ? 23 : 19}>Loading...</td></tr>
                      ) : totalCount > 0 ? (
                        employers.map(e => {
                          const isActive = isEmployerActive(e);
                          const userCreatedAt = e.User?.created_at;
                          const isNewUser = userCreatedAt
                            ? (Date.now() - new Date(userCreatedAt).getTime()) <= 48 * 60 * 60 * 1000
                            : false;
                          const lastSeenLabel = formatDisplayDateTime(e.User?.last_active_at);
                          const profileCompletedLabel = formatDisplayDateTime(e.User?.profile_completed_at);
                          const userLifeDays = getUserLifeDays(userCreatedAt);
                          const profileCompletedValue = e.User?.profile_completed_at; // NEW
                          const assistedBy = e.assisted_by || '';
                          const v = assistedBy ? getVolunteerByAssistantCode(assistedBy) : null;

                          return (
                            <tr
                              key={e.id}
                              onClick={()=>navigate(`/employers/${e.id}`)}
                              style={{
                                cursor:'pointer',
                                background: isActive ? '#fff' : '#f3f4f6',
                                color: isActive ? 'inherit' : '#9ca3af'
                              }}
                            >
                              <td>{e.id}</td>
                              <td>
                                {e.name || '-'}
                                {isNewUser && (
                                  <span
                                    style={{
                                      marginLeft:6,
                                      padding:'2px 8px',
                                      borderRadius:'999px',
                                      fontSize:'10px',
                                      fontWeight:700,
                                      textTransform:'uppercase',
                                      background:'#22c55e',
                                      color:'#fff'
                                    }}
                                  >
                                    New
                                  </span>
                                )}
                              </td>

                              {/* NEW */}
                              {employerPerms.canShowPhoneAddress && (<td>{e.User?.mobile || '-'}</td>)}

                              <td>{e.organization_type || '-'}</td>
                              <td>{e.organization_name || '-'}</td>
                              <td>
                                <div style={{ display:'flex', flexDirection:'column', gap:2, lineHeight:1.15 }}>
                                  <span>{assistedBy || '-'}</span>
                                  {v?.name && (
                                    <button
                                      type="button"
                                      onClick={(ev) => { ev.stopPropagation(); openVolunteerEditor(v.id); }}
                                      style={{
                                        border:'none',
                                        background:'transparent',
                                        padding:0,
                                        textAlign:'left',
                                        color:'#2563eb',
                                        fontSize:12,
                                        fontWeight:600,
                                        cursor:'pointer'
                                      }}
                                      title="Edit Volunteer"
                                    >
                                      {v.name}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td>{e.email || '-'}</td>
                              <td>{getBusinessCategoryName(e)}</td>
                              {employerPerms.canShowPhoneAddress && (<td>{e.address || '-'}</td>)}
                              {employerPerms.canShowPhoneAddress && (<td>{e.State?.state_english || '-'}</td>)}
                              {employerPerms.canShowPhoneAddress && (<td>{e.City?.city_english || '-'}</td>)}
                              <td>{renderStatusBadge(e.verification_status, e.verification_at)}</td>
                              <td>{renderStatusBadge(e.kyc_status, e.kyc_verification_at)}</td>
                              <td>{formatSubscriptionLabel(e)}</td>
                              <td>
                                <span className={`badge ${isActive ? 'active':'inactive'}`}>
                                  {isActive ? 'Active':'Inactive'}
                                </span>
                              </td>
                              <td>{e.User?.StatusChangedBy?.name || '-'}</td> {/* NEW */}
                              <td>{e.User?.deactivation_reason || '-'}</td>
                              <td>{lastSeenLabel}</td>

                              {/* CHANGED: chip instead of plain text */}
                              <td>{renderProfileCompletedChip(profileCompletedValue)}</td>

                              <td>{e.created_at ? new Date(e.created_at).toLocaleDateString() : '-'}</td>
                              <td>{userLifeDays}</td>
                              <td>{renderCreditBalances(e)}</td>
                              <td>
                                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                                  {(employerPerms.canVerify && (e.verification_status || '').toLowerCase() === 'pending') && (
                                    <div style={{ display:'flex', gap:'6px' }}>
                                      <button
                                        className="btn-small"
                                        style={{ flex:1, background:'#16a34a', color:'#fff', border:'none' }}
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          handleApprove(e.id);
                                        }}
                                      >
                                        Approve
                                      </button>
                                      <button
                                        className="btn-small"
                                        style={{ flex:1, background:'#dc2626', color:'#fff', border:'none' }}
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          handleReject(e.id);
                                        }}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  <div style={{ display:'flex', gap:'6px' }}>
                                    <button
                                      className="btn-small"
                                      onClick={(ev)=>{ev.stopPropagation();navigate(`/employers/${e.id}`);}}
                                      style={{ flex:1 }}
                                    >View</button>
                                    {employerPerms.canEdit && (
                                      <button
                                        className="btn-small btn-edit"
                                        onClick={(ev)=>{ev.stopPropagation();handleEdit(e.id);}}
                                        style={{ flex:1 }}
                                      >Edit</button>
                                    )}
                                    {employerPerms.canDelete && (
                                      <button
                                        className="btn-small btn-delete"
                                        onClick={(ev)=>{ev.stopPropagation();handleDelete(e.id);}}
                                        style={{ flex:1 }}
                                      >Delete</button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={employerPerms.canShowPhoneAddress ? 23 : 19}>No employers found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!loading && totalCount > 0 && (
                  <div className="pagination-bar" style={{ marginTop:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
                    <span style={{ fontSize:'12px', color:'#475569' }}>
                      Showing {pageSummary.start}-{pageSummary.end} of {totalCount}
                    </span>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <label style={{ fontSize:'12px', color:'#475569' }}>Rows per page:</label>
                      <select
                        className="state-filter-select"
                        value={pageSize}
                        onChange={e => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        style={{ width:'auto', minWidth:'80px' }}
                      >
                        {[5, 10, 25, 50, 100].map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            ) : showForm ? (
              // Employer form
              <div style={{ marginBottom:'24px' }}>
                <EmployerForm
                  employerId={editingId}
                  onClose={handleFormClose}
                />
              </div>
            ) : (
              // Volunteer form
              <VolunteerForm
                volunteerId={editingVolunteerId}
                onClose={() => { setShowVolunteerForm(false); setEditingVolunteerId(null); }}
                onSuccess={(msg) => { setMessage(msg); fetchVolunteers(); }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
