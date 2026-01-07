import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import employersApi from '../../api/employersApi';
import reportsApi from '../../api/reportsApi'; // add this import
import callHistoryApi from '../../api/callHistoryApi'; // added
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import EmployerForm from '../../components/Forms/EmployerForm';
import employerSubscriptionPlansApi from '../../api/subscriptions/employerSubscriptionPlansApi';
import JobDetail from '../Jobs/JobDetail'; // add if not present
import jobApi from '../../api/jobApi'; // add if not present
import JobForm from '../../components/Forms/JobForm'; // add if not present
import '../Masters/MasterPage.css';
import jobProfilesApi from '../../api/masters/jobProfilesApi'; // add
import statesApi from '../../api/masters/statesApi'; // add
import citiesApi from '../../api/masters/citiesApi'; // add
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const TABS = [
  'Basic details',
  'Jobs',
  'Applicants',
  'Credit history',
  'Subscription history',
  'Call experiences',
  'Call review by employee',       // <- added
  'Referrals',
  'Voilations reported'
];

const APPLICANT_TABS = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent Interest' },
  { key: 'received', label: 'Received Interest' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' }
];

const CREDIT_HISTORY_TABS = [
  { key: 'contact', label: 'Contact Credits' },
  { key: 'interest', label: 'Interest Credits' },
  { key: 'job', label: 'Job Credits' },
  { key: 'admin', label: 'Admin Credits' },
];

// Job status / Interest status chips (module-scope so they are always in scope)
const JOB_STATUS_CHIP_PALETTE = {
  active: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  open: { bg: '#dcfce7', color: '#166534', border: '#86efac' },

  paused: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  pending: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },

  closed: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
  inactive: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },

  draft: { bg: '#e5e7eb', color: '#0f172a', border: '#d1d5db' }
};

function renderJobStatusChip(value) {
  const raw = (value || '').toString().trim();
  const v = raw.toLowerCase();
  if (!v) return <span>-</span>;
  const tone = JOB_STATUS_CHIP_PALETTE[v] || { bg: '#e5e7eb', color: '#0f172a', border: '#d1d5db' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'capitalize',
        background: tone.bg,
        color: tone.color,
        border: `1px solid ${tone.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {raw}
    </span>
  );
}

const INTEREST_STATUS_CHIP_PALETTE = {
  pending: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  shortlisted: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  hired: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  rejected: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' }
};

function renderInterestStatusChip(value) {
  const raw = (value || '').toString().trim();
  const v = raw.toLowerCase();
  if (!v) return <span>-</span>;
  const tone = INTEREST_STATUS_CHIP_PALETTE[v] || { bg: '#e5e7eb', color: '#0f172a', border: '#d1d5db' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'capitalize',
        background: tone.bg,
        color: tone.color,
        border: `1px solid ${tone.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {raw}
    </span>
  );
}


const PANEL_STYLE = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '540px',
  maxWidth: '100vw',
  height: '100vh',
  background: '#fff',
  zIndex: 4000,
  boxShadow: '-2px 0 16px rgba(0,0,0,0.13)',
  overflowY: 'auto',
  transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
  borderTopLeftRadius: '12px',
  borderBottomLeftRadius: '12px',
  display: 'flex',
  flexDirection: 'column'
};
const PANEL_OVERLAY_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.18)',
  zIndex: 3999
};

const referralLinkButtonStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: '#1d4ed8',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontSize: 'inherit',
  fontFamily: 'inherit'
};

const getReferralDetailRoute = (entityType, entityId) => {
  if (!entityId) return null;
  const normalized = (entityType || '').toString().toLowerCase();
  if (normalized.includes('employer')) return `/employers/${entityId}`;
  return `/employees/${entityId}`;
};

// FIXED: non-hook helper for heading suffix (matches EmployeeDetail UX)
function getEmployerHeadingSuffix(employer, canShowPhoneAddress) {
  const name = (employer?.name || employer?.User?.name || '').toString().trim();
  const mobile = (employer?.User?.mobile || '').toString().trim();

  if (!name && !mobile) return '';

  if (!canShowPhoneAddress) {
    return name || '';
  }

  if (name && mobile) return `${name} (${mobile})`;
  return name || mobile;
}


// NOTE: keep helper valid even if employer DOB isn't present/used
const calculateAge = (dob) => {
  if (!dob) return '-';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : '-';
};

export default function EmployerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [employer, setEmployer] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const actionMenuRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [jobLoading, setJobLoading] = useState(false); // add
  const [jobError, setJobError] = useState(null); // add
  const [showJobForm, setShowJobForm] = useState(false); // add
  const [editingJob, setEditingJob] = useState(null); // add
  const [viewJobId, setViewJobId] = useState(null); // add

  const [applicants, setApplicants] = useState([]);
  const [creditHistory, setCreditHistory] = useState([]);
  const [manualCreditHistory, setManualCreditHistory] = useState([]);
  const [manualCreditHistoryLoading, setManualCreditHistoryLoading] = useState(false);
  const [manualCreditHistoryError, setManualCreditHistoryError] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false); // added
  const [subscriptionError, setSubscriptionError] = useState(null); // added
  const [callExperiences, setCallExperiences] = useState([]);
  const [callExpLoading, setCallExpLoading] = useState(false);
  const [callExpError, setCallExpError] = useState(null);
  const [callReviews, setCallReviews] = useState([]); // NEW
  const [callReviewsLoading, setCallReviewsLoading] = useState(false); // NEW
  const [callReviewsError, setCallReviewsError] = useState(null); // NEW
  const [applicantTab, setApplicantTab] = useState('all'); // add for tab switching if needed
  const [creditHistoryTab, setCreditHistoryTab] = useState('contact'); // add for sub-tabs
  const [voilationReports, setVoilationReports] = useState([]); // add
  const [voilationLoading, setVoilationLoading] = useState(false); // add
  const [voilationError, setVoilationError] = useState(null); // add
  const [voilationsReported, setVoilationsReported] = useState([]);
  const [voilationsReportedLoading, setVoilationsReportedLoading] = useState(false);
  const [voilationsReportedError, setVoilationsReportedError] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralsError, setReferralsError] = useState(null);

  // Add master data for JobForm
  const [employersList, setEmployersList] = useState([]);
  const [jobProfiles, setJobProfiles] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // Subscription plans state
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [changeSubSaving, setChangeSubSaving] = useState(false);
  const [changeSubError, setChangeSubError] = useState(null);
  const [showChangeSubscriptionDialog, setShowChangeSubscriptionDialog] = useState(false);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [addCreditsForm, setAddCreditsForm] = useState({ contact: '', interest: '', ad: '', expiry: '' });
  const [addCreditsSaving, setAddCreditsSaving] = useState(false);
  const [addCreditsError, setAddCreditsError] = useState(null);

  // NEW: Deactivate dialog state (match EmployeeDetail)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateSaving, setDeactivateSaving] = useState(false);
  const [deactivateError, setDeactivateError] = useState(null);

  const employerPerms = React.useMemo(() => ({
    canView: hasPermission(PERMISSIONS.EMPLOYERS_VIEW),
    canManage: hasPermission(PERMISSIONS.EMPLOYERS_MANAGE),
    canStatusToggle: hasPermission(PERMISSIONS.EMPLOYERS_STATUS_TOGGLE),
    canVerify: hasPermission(PERMISSIONS.EMPLOYERS_VERIFY),
    canKycGrant: hasPermission(PERMISSIONS.EMPLOYERS_KYC_GRANT),
    canChangeSub: hasPermission(PERMISSIONS.EMPLOYERS_CHANGE_SUBSCRIPTION),
    canAddCredit: hasPermission(PERMISSIONS.EMPLOYERS_ADD_CREDIT),

    // Sensitive fields
    canShowPhoneAddress: hasPermission(PERMISSIONS.EMPLOYERS_SHOW_PHONE_ADDRESS),
  }), []);
  const canViewEmployees = hasPermission(PERMISSIONS.EMPLOYEES_VIEW);
  const canShowEmployeePhoneAddress = hasPermission(PERMISSIONS.EMPLOYEES_SHOW_PHONE_ADDRESS);
  const hasAnyActionPerm = employerPerms.canStatusToggle
    || employerPerms.canVerify
    || employerPerms.canKycGrant
    || employerPerms.canChangeSub
    || employerPerms.canAddCredit;

  useEffect(() => {
    setSidebarOpen(getSidebarState());
    load();
  }, [id]);

  useEffect(() => {
    if (!employer) return;
    switch (activeTab) {
      case 'Jobs': fetchJobs(); break;
      case 'Applicants': fetchApplicants(); break;
      case 'Credit history': fetchCreditHistory(); break;
      case 'Subscription history': fetchSubscriptionHistory(); break;
      case 'Call experiences': fetchCallExperiences(); break;
      case 'Call review by employee': fetchCallReviews(); break; // CHANGED (was 'Call reviews')
      case 'Referrals': fetchReferralsForEmployer(); break;
      case 'Voilations reported': fetchVoilationsReported(); break;
      default: break;
    }
  }, [activeTab, employer]);

  useEffect(() => {
    if (activeTab !== 'Credit history') return;
    if (creditHistoryTab !== 'job') return;
    // Jobs are also shown in the Jobs tab; reuse the same fetch here
    fetchJobs();
  }, [activeTab, creditHistoryTab]);

  useEffect(() => {
    if (activeTab !== 'Credit history') return;
    if (creditHistoryTab !== 'admin') return;
    fetchManualCreditHistory();
  }, [activeTab, creditHistoryTab]);

  // Close action menu on outside click
  useEffect(() => {
    if (!actionMenuOpen) return;
    const handler = (evt) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(evt.target)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [actionMenuOpen]);

  // Fetch master data for JobForm on mount
  useEffect(() => {
    async function fetchMasters() {
      try {
        const [emps, profiles, sts, cts] = await Promise.all([
          employersApi.getAll(),
          jobProfilesApi.getAll(),
          statesApi.getAll(),
          citiesApi.getAll()
        ]);
        setEmployersList(emps.data?.data || []);
        setJobProfiles(profiles.data?.data || []);
        setStates(sts.data?.data || []);
        setCities(cts.data?.data || []);
      } catch (e) {
        // Optionally handle error
      }
    }
    fetchMasters();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employersApi.getById(id);
      setEmployer(res.data?.data || null);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load employer');
      setEmployer(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    setJobLoading(true);
    setJobError(null);
    try {
      // Only fetch jobs for this employer
      const res = await jobApi.getAll({ employer_id: id, all: true });
      setJobs(res.data?.data || []);
    } catch (e) {
      setJobError('Failed to load jobs');
      setJobs([]);
    } finally {
      setJobLoading(false);
    }
  };
  const fetchApplicants = async () => {
    try {
      const res = await employersApi.getApplicants(id);
      setApplicants(res.data?.data || []);
    } catch {}
  };
  const fetchCreditHistory = async () => {
    try {
      const res = await employersApi.getCreditHistory(id);
      setCreditHistory(res.data?.data || []);
    } catch {}
  };
  const fetchManualCreditHistory = async () => {
    setManualCreditHistoryLoading(true);
    setManualCreditHistoryError(null);
    try {
      const res = await employersApi.getManualCreditHistory(id);
      setManualCreditHistory(res.data?.data || []);
    } catch (e) {
      setManualCreditHistoryError('Failed to load admin credit history');
      setManualCreditHistory([]);
    } finally {
      setManualCreditHistoryLoading(false);
    }
  };
  const fetchSubscriptionHistory = async () => {
    setSubscriptionLoading(true);
    setSubscriptionError(null);
    try {
      const res = await employersApi.getSubscriptionHistory(employer.id);
      setSubscriptionHistory(res.data?.data || []);
    } catch (e) {
      setSubscriptionError('Failed to load subscription history');
      setSubscriptionHistory([]);
    } finally {
      setSubscriptionLoading(false);
    }
  };
  const fetchCallExperiences = async () => {
    setCallExpLoading(true);
    setCallExpError(null);
    try {
      const res = await employersApi.getCallExperiences(id);
      setCallExperiences(res.data?.data || []);
    } catch (e) {
      setCallExpError('Failed to load call experiences');
      setCallExperiences([]);
    } finally {
      setCallExpLoading(false);
    }
  };
  const fetchCallReviews = async () => { // NEW
    setCallReviewsLoading(true);
    setCallReviewsError(null);
    try {
      const res = await employersApi.getCallReviews(id);
      setCallReviews(res.data?.data || []);
    } catch (e) {
      setCallReviewsError('Failed to load call reviews');
      setCallReviews([]);
    } finally {
      setCallReviewsLoading(false);
    }
  };
  const fetchVoilationReports = async () => {
    setVoilationLoading(true);
    setVoilationError(null);
    try {
      const res = await employersApi.getVoilationReports(id);
      setVoilationReports(res.data?.data || []);
    } catch (e) {
      setVoilationError('Failed to load voilation reports');
      setVoilationReports([]);
    } finally {
      setVoilationLoading(false);
    }
  };
  const fetchVoilationsReported = async () => {
    setVoilationsReportedLoading(true);
    setVoilationsReportedError(null);
    try {
      const res = await employersApi.getVoilationsReported(id);
      setVoilationsReported(res.data?.data || []);
    } catch (e) {
      setVoilationsReportedError('Failed to load voilations reported');
      setVoilationsReported([]);
    } finally {
      setVoilationsReportedLoading(false);
    }
  };
  const fetchReferralsForEmployer = async () => {
    if (!employer) return;
    setReferralsLoading(true);
    setReferralsError(null);
    try {
      const res = await employersApi.getEmployerReferrals(employer.id);
      setReferrals(res.data?.data || []);
    } catch (e) {
      setReferralsError(e.response?.data?.message || 'Failed to load referrals');
      setReferrals([]);
    } finally {
      setReferralsLoading(false);
    }
  };

  const renderReferralNameCell = (name, route) => {
    const canNavigate = route && (!route.startsWith('/employees') || canViewEmployees);
    return canNavigate ? (
      <button
        type="button"
        style={referralLinkButtonStyle}
        onClick={(event) => { event.stopPropagation(); navigate(route); }}
      >
        {name || '-'}
      </button>
    ) : (
      <span>{name || '-'}</span>
    );
  };

  const loadSubscriptionPlans = async () => {
    if (subscriptionPlans.length) return;
    setPlansLoading(true);
    try {
      const res = await employerSubscriptionPlansApi.getAll();
      setSubscriptionPlans(res.data?.data || []);
    } catch (e) {
      console.warn('Failed to load employer plans', e);
    } finally {
      setPlansLoading(false);
    }
  };

  const openChangeSubscriptionDialog = () => {
    setSelectedPlanId(employer?.subscription_plan_id || '');
    setChangeSubError(null);
    setShowChangeSubscriptionDialog(true);
    loadSubscriptionPlans();
  };

  const handleChangeSubscriptionSave = async () => {
    if (!selectedPlanId) {
      setChangeSubError('Select a subscription plan');
      return;
    }
    setChangeSubSaving(true);
    setChangeSubError(null);
    try {
      await employersApi.changeSubscription(employer.id, { subscription_plan_id: selectedPlanId });
      await load();
      setShowChangeSubscriptionDialog(false);
    } catch (e) {
      setChangeSubError(e.response?.data?.message || 'Failed to change subscription');
    } finally {
      setChangeSubSaving(false);
    }
  };

  const openAddCreditsDialog = () => {
    setAddCreditsForm({
      contact: '',
      interest: '',
      ad: '',
      expiry: employer?.credit_expiry_at ? employer.credit_expiry_at.split('T')[0] : ''
    });
    setAddCreditsError(null);
    setShowAddCreditsDialog(true);
  };

  const handleAddCreditsSave = async () => {
    const payload = {
      contact_credits: Number(addCreditsForm.contact) || 0,
      interest_credits: Number(addCreditsForm.interest) || 0,
      ad_credits: Number(addCreditsForm.ad) || 0,
      credit_expiry_at: addCreditsForm.expiry || null
    };
    if (payload.contact_credits <= 0 && payload.interest_credits <= 0 && payload.ad_credits <= 0) {
      setAddCreditsError('Enter credits to add');
      return;
    }
    setAddCreditsSaving(true);
    setAddCreditsError(null);
    try {
      await employersApi.addCredits(employer.id, payload);
      await load();
      setShowAddCreditsDialog(false);
    } catch (e) {
      setAddCreditsError(e.response?.data?.message || 'Failed to add credits');
    } finally {
      setAddCreditsSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!employer) return;
    const reason = (deactivateReason || '').toString().trim();
    if (!reason) {
      setDeactivateError('Deactivation reason is required.');
      return;
    }

    setDeactivateSaving(true);
    setDeactivateError(null);
    try {
      await employersApi.deactivate(employer.id, { deactivation_reason: reason });
      await load();
      setShowDeactivateDialog(false);
      setActionMenuOpen(false);
    } catch (e) {
      setDeactivateError(e?.response?.data?.message || 'Failed to deactivate employer.');
    } finally {
      setDeactivateSaving(false);
    }
  };


  const handleEmployerAction = async (actionKey) => {
    if (!employer) return;
    const permissionMap = {
      activate: employerPerms.canStatusToggle,
      deactivate: employerPerms.canStatusToggle,
      approve: employerPerms.canVerify,
      reject: employerPerms.canVerify,
      grantKyc: employerPerms.canKycGrant,
      rejectKyc: employerPerms.canKycGrant,
    };
    if (actionKey in permissionMap && !permissionMap[actionKey]) {
      setError('You do not have permission to perform this action.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      switch (actionKey) {
        case 'activate':
          await employersApi.activate(employer.id);
          break;
        case 'deactivate':
          // Open dialog to collect deactivation reason (required)
          setActionMenuOpen(false);
          setShowDeactivateDialog(true);
          setDeactivateReason('');
          setDeactivateError(null);
          return;
        case 'approve':
          await employersApi.approve(employer.id);
          break;
        case 'reject':
          await employersApi.reject(employer.id);
          break;
        case 'grantKyc':
          await employersApi.grantKyc(employer.id);
          break;
        case 'rejectKyc':
          await employersApi.rejectKyc(employer.id);
          break;
        default:
          break;
      }
      await load();
      setActionMenuOpen(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMenuSelection = (key) => {
    if (key === 'changeSubscription') {
      if (!employerPerms.canChangeSub) return setError('You do not have permission to change subscription.');
      return openChangeSubscriptionDialog();
    }
    if (key === 'addCredits') {
      if (!employerPerms.canAddCredit) return setError('You do not have permission to add credits.');
      return openAddCreditsDialog();
    }
    if (key === 'deactivate') {
      if (!employerPerms.canStatusToggle) return setError('You do not have permission to change status.');
      setActionMenuOpen(false);
      setShowDeactivateDialog(true);
      setDeactivateReason('');
      setDeactivateError(null);
      return;
    }
    handleEmployerAction(key);
  };

  const onEditSuccess = () => {
    setShowEditForm(false);
    load();
  };

  const handleMarkReportAsRead = async (reportId) => {
    if (!employerPerms.canManage) {
      setError('You do not have permission to manage employers.');
      return;
    }
    try {
      await reportsApi.markReportAsRead(reportId);
      setVoilationReports(reports =>
        reports.map(r =>
          r.id === reportId ? { ...r, read_at: new Date().toISOString() } : r
        )
      );
    } catch (e) {
      alert('Failed to mark as read');
    }
  };

  const handleMarkCallHistoryRead = async (callHistoryId) => {
    if (!employerPerms.canManage) {
      setError('You do not have permission to manage employers.');
      return;
    }
    try {
      await callHistoryApi.markRead(callHistoryId);
      setCallExperiences(list =>
        list.map(r => r.id === callHistoryId ? { ...r, read_at: new Date().toISOString() } : r)
      );
      setCallReviews(list => // also update reviews
        list.map(r => r.id === callHistoryId ? { ...r, read_at: new Date().toISOString() } : r)
      );
    } catch {
      alert('Failed to mark as read');
    }
  };

  const formatDateTime = (val) => {
    if (!val) return '-';
    try { return new Date(val).toLocaleString(); } catch { return val; }
  };

  const getJobLifeDays = (createdAt) => {
    if (!createdAt) return '-';
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return '-';
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Number.isFinite(days) ? `${Math.max(days, 0)} day(s)` : '-';
  };

  const renderStatusBadge = (status) => {
    const tone = {
      approved: { bg: '#dcfce7', color: '#166534' },
      verified: { bg: '#dcfce7', color: '#166534' },
      pending: { bg: '#fef3c7', color: '#92400e' },
      rejected: { bg: '#fee2e2', color: '#b91c1c' },
      active: { bg: '#dcfce7', color: '#166534' },
      inactive: { bg: '#fee2e2', color: '#b91c1c' },
      expired: { bg: '#fef3c7', color: '#92400e' },
      shortlisted: { bg: '#fef3c7', color: '#92400e' },
      hired: { bg: '#dcfce7', color: '#166534' }
    }[(status || '').toLowerCase()] || { bg: '#e5e7eb', color: '#0f172a' };
    return (
      <span style={{
        display:'inline-flex',
        alignItems:'center',
        padding:'2px 10px',
        borderRadius:'999px',
        fontSize:'11px',
        fontWeight:600,
        background:tone.bg,
        color:tone.color,
        textTransform:'capitalize'
      }}>
        {status || '-'}
      </span>
    );
  };

  const renderActiveBadge = (flag) => {
    const isActive = Boolean(flag);
    return (
      <span style={{
        display:'inline-flex',
        alignItems:'center',
        padding:'2px 10px',
        borderRadius:'999px',
        fontSize:'11px',
        fontWeight:600,
        background: isActive ? '#16a34a' : '#dc2626',
        color:'#fff'
      }}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const basic = employer || {};
  const renderBasicDetails = () => (
    <div className="detail-section">
      <div className="grid-2col" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'12px' }}>
        <Detail label="ID" value={basic.id} />
        <Detail label="Name" value={basic.name} />
        <Detail label="User ID" value={basic.user_id} />
        {employerPerms.canShowPhoneAddress && (
          <Detail label="Mobile" value={basic.User?.mobile || '-'} />
        )}
        <Detail label="Referred By" value={basic.User?.referred_by || '-'} />
        <Detail label="Preferred Language" value={basic.User?.preferred_language || '-'} />
        <Detail label="User Status" value={renderActiveBadge(basic.User?.is_active)} />
        <Detail label="Status Changed By" value={basic.User?.StatusChangedBy?.name || '-'} /> {/* NEW */}
        <Detail label="Deactivation Reason" value={basic.User?.deactivation_reason || '-'} />
        <Detail label="Delete Status" value={basic.User?.delete_pending ? 'Pending deletion' : 'Active'} />
        <Detail label="Delete Requested At" value={formatDateTime(basic.User?.delete_requested_at)} />
        <Detail label="Referral Code" value={basic.User?.referral_code || '-'} />
        <Detail label="Total Referrals" value={basic.User?.total_referred ?? '-'} />
        <Detail label="Email" value={basic.email || basic.User?.email} />
        <Detail label="Organization Type" value={basic.organization_type} />
        <Detail label="Organization Name" value={basic.organization_name} />
        <Detail label="Business Category" value={basic.BusinessCategory?.category_english} />
        <Detail label="Assisted By" value={basic.assisted_by} />
        {employerPerms.canShowPhoneAddress && (
          <Detail label="Address" value={basic.address || '-'} />
        )}
        {employerPerms.canShowPhoneAddress && (
          <Detail label="State" value={basic.State?.state_english || '-'} />
        )}
        {employerPerms.canShowPhoneAddress && (
          <Detail label="City" value={basic.City?.city_english || '-'} />
        )}
        <Detail label="Aadhar Number" value={basic.aadhar_number} />
        <Detail label="Aadhar Verified At" value={formatDateTime(basic.aadhar_verified_at)} />
        <Detail label="Document Link" value={basic.document_link} />
        <Detail label="Verification" value={renderStatusBadge(basic.verification_status)} />
        <Detail label="KYC" value={renderStatusBadge(basic.kyc_status)} />
        <Detail label="Contact Credits (used/total)" value={`${basic.contact_credit||0}/${basic.total_contact_credit||0}`} />
        <Detail label="Interest Credits (used/total)" value={`${basic.interest_credit||0}/${basic.total_interest_credit||0}`} />
        <Detail label="Ad Credits (used/total)" value={`${basic.ad_credit||0}/${basic.total_ad_credit||0}`} />
        <Detail label="Credit Expiry" value={formatDateTime(basic.credit_expiry_at)} />
        <Detail label="Plan Name" value={basic.SubscriptionPlan?.plan_name_english} />
        <Detail label="Created At" value={formatDateTime(basic.created_at)} />
        <Detail label="Updated At" value={formatDateTime(basic.updated_at)} />
      </div>
      {basic.document_link && (
        <div style={{ marginTop:'16px' }}>
          <strong>Document:</strong><br />
          <a href={basic.document_link} target="_blank" rel="noreferrer" style={{ fontSize:'12px', color:'#2563eb' }}>
            View Document
          </a>
        </div>
      )}
      {basic.logo_link && (
        <div style={{ marginTop:'16px' }}>
          <strong>Logo:</strong><br />
          <img
            src={basic.logo_link}
            alt="Logo"
            style={{ maxWidth:'160px', borderRadius:'6px', border:'1px solid #ddd' }}
          />
        </div>
      )}
      {basic.about_business && (
        <div style={{ marginTop:'16px' }}>
          <strong>About:</strong>
          <div style={{ fontSize:'13px', lineHeight:'1.4', marginTop:'4px' }}>{basic.about_business}</div>
        </div>
      )}
    </div>
  );

  const placeholderTable = (cols, rows) => (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
      <thead>
        <tr style={{ background:'#f5f5f5' }}>
          {cols.map(c => <th key={c} style={{ textAlign:'left', padding:'6px', border:'1px solid #ddd' }}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((r,i) => (
          <tr key={i}>
            {cols.map(c => (
              <td key={c} style={{ padding:'6px', border:'1px solid #eee' }}>
                {r[c] ?? '-'}
              </td>
            ))}
          </tr>
        )) : (
          <tr><td colSpan={cols.length} style={{ padding:'8px' }}>No data</td></tr>
        )}
      </tbody>
    </table>
  );

  // Add Job
  const handleAddJob = () => {
    if (!employerPerms.canManage) {
      setError('You do not have permission to manage employers.');
      return;
    }
    setEditingJob(null);
    setShowJobForm(true);
  };

  // Edit Job
  const handleEditJob = async (job) => {
    // Fetch latest job data before opening JobForm
    try {
      const res = await jobApi.getById(job.id);
      setEditingJob(res.data?.data || job);
      setShowJobForm(true);
    } catch (e) {
      setEditingJob(job); // fallback to passed job if fetch fails
      setShowJobForm(true);
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Delete this job?')) return;
    try {
      await jobApi.delete(jobId);
      setJobs(jobs => jobs.filter(j => j.id !== jobId));
    } catch (e) {
      alert('Failed to delete job');
    }
  };

  // On Job Form Success
  const handleJobFormSuccess = () => {
    setShowJobForm(false);
    setEditingJob(null);
    fetchJobs();
  };

  // Helper to get employer info for JobForm
  const employerForJobForm = employer
    ? { id: employer.id, name: employer.name }
    : null;

  const renderJobs = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: '16px' }}>Jobs</h2>
        <div style={{ marginLeft: 'auto' }}>
          {employerPerms.canManage && (
            <button
              className="btn-primary small"
              onClick={handleAddJob}
              style={{ padding:'4px 10px', fontSize: '12px', width:'auto', minWidth:'unset' }}
            >+ Add Job</button>
          )}
        </div>
      </div>
      {jobError && <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{jobError}</div>}
      {jobLoading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : jobs.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No jobs found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'left' }}>Job</th>
              {employerPerms.canShowPhoneAddress && (
                <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'left' }}>Pref. State</th>
              )}
              {employerPerms.canShowPhoneAddress && (
                <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'left' }}>Pref. City</th>
              )}
              <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'left' }}>Salary</th>
              <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'left' }}>Vacancy</th>
              <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'left' }}>Verification Status</th>
              <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'left' }}>Created At</th>
              {employerPerms.canManage && (
                <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id}>
                <td style={{ padding: '4px', border: '1px solid #eee' }}>
                  <Link
                    to={`/jobs/${job.id}`}
                    style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px' }}
                  >
                    {job.job_profile || '-'}
                  </Link>
                </td>
                {employerPerms.canShowPhoneAddress && (
                  <td style={{ padding: '4px', border: '1px solid #eee' }}>{job.job_state || '-'}</td>
                )}
                {employerPerms.canShowPhoneAddress && (
                  <td style={{ padding: '4px', border: '1px solid #eee' }}>{job.job_city || '-'}</td>
                )}
                <td style={{ padding: '4px', border: '1px solid #eee' }}>
                  {job.salary_min && job.salary_max
                    ? `${job.salary_min} - ${job.salary_max}`
                    : (job.salary_min || job.salary_max || '-')}
                </td>
                <td style={{ padding: '4px', border: '1px solid #eee' }}>
                  {job.hired_total || 0}/{job.no_vacancy || 0}
                </td>
                <td style={{ padding: '4px', border: '1px solid #eee' }}>{renderStatusBadge(job.status)}</td>
                <td style={{ padding: '4px', border: '1px solid #eee' }}>{renderStatusBadge(job.verification_status)}</td>
                <td style={{ padding: '4px', border: '1px solid #eee' }}>{formatDateTime(job.created_at)}</td>
                {employerPerms.canManage && (
                  <td style={{ padding: '4px', border: '1px solid #eee' }}>
                    <button
                      className="btn-small btn-edit"
                      style={{ marginRight: 4, padding: '2px 8px', fontSize: '11px', height: 22 }}
                      onClick={() => handleEditJob(job)}
                    >Edit</button>
                    <button
                      className="btn-small btn-delete"
                      style={{ padding: '2px 8px', fontSize: '11px', height: 22 }}
                      onClick={() => handleDeleteJob(job.id)}
                    >Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showJobForm && (
        <div style={{ marginTop: 24 }}>
          <JobForm
            open={showJobForm}
            jobId={editingJob ? editingJob.id : null}
            employers={employersList}
            jobProfiles={jobProfiles}
            states={states}
            cities={cities}
            onClose={() => { setShowJobForm(false); setEditingJob(null); }}
            onSuccess={handleJobFormSuccess}
          />
        </div>
      )}
      {/* Remove JobDetail dialog usage */}
    </div>
  );
  const renderApplicants = () => {
    // Group applicants by rules
    const grouped = {
      all: applicants,
      sent: [],
      received: [],
      shortlisted: [],
      hired: [],
      rejected: []
    };

    (applicants || []).forEach(a => {
      if (a.status === 'shortlisted') grouped.shortlisted.push(a);
      else if (a.status === 'hired') grouped.hired.push(a);
      else if (a.status === 'rejected') grouped.rejected.push(a);
      else if (a.status === 'pending' && a.sender_type === 'employer') grouped.sent.push(a);
      else if (a.status === 'pending' && a.sender_type === 'employee') grouped.received.push(a);
    });

    return (
      <div>
        <h2 style={{ marginTop: 0, fontSize: '16px' }}>Applicants</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {APPLICANT_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setApplicantTab(tab.key)}
              className={`tab-btn${applicantTab === tab.key ? ' active' : ''}`}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid #ccc',
                background: applicantTab === tab.key ? '#2563eb' : '#fff',
                color: applicantTab === tab.key ? '#fff' : '#333',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {tab.label} ({grouped[tab.key]?.length || 0})
            </button>
          ))}
        </div>
        {grouped[applicantTab].length === 0 ? (
          <div style={{ fontSize: '13px', color: '#666' }}>No applicants found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                {canShowEmployeePhoneAddress && (
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Phone</th>
                )}
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Gender</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Profile Status</th>
                
                
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Preferred Salary</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Preferred State</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Preferred City</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Profiles</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>OTP</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Status</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>
                  {(() => {
                    switch (applicantTab) {
                      case 'sent': return 'Interest Sent Time';
                      case 'received': return 'Applied Time';
                      case 'shortlisted': return 'Shortlisted Time';
                      case 'hired': return 'Hired Time';
                      case 'rejected': return 'Rejected Time';
                      default: return 'Applied At';
                    }
                  })()}
                </th>
              </tr>
            </thead>
            <tbody>
              {grouped[applicantTab].map(a => {
                const emp = a.employee || {};
                const name = emp.name || a.name || '-';
                const gender = emp.gender || '-';
                const profileStatus = (emp.is_active === undefined || emp.is_active === null) ? null : emp.is_active;
                const salary = emp.expected_salary ? `${emp.expected_salary}` : '-';
                const state = emp.PreferredState?.state_english || emp.preferred_state || '-';
                const city = emp.PreferredCity?.city_english || emp.preferred_city || '-';
                const profiles = Array.isArray(emp.JobProfiles)
                  ? emp.JobProfiles.map(jp => jp.profile_english || jp.profile_hindi).join(', ')
                  : (emp.job_profiles || '-');
                const jobName = a.job_profile || a.job_name || '-';
                const jobId = a.job_id;
                const status = a.status;
                let timeValue = '-';
                if (['sent', 'received'].includes(applicantTab)) {
                  timeValue = a.applied_at ? new Date(a.applied_at).toLocaleString() : '-';
                } else if (['shortlisted', 'hired', 'rejected'].includes(applicantTab)) {
                  timeValue = a.updated_at ? new Date(a.updated_at).toLocaleString() : '-';
                } else {
                  timeValue = a.applied_at ? new Date(a.applied_at).toLocaleString() : '-';
                }
                const employeeId = emp.id;

                return (
                  <tr key={a.id}>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{a.id}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>
                      {employeeId && canViewEmployees ? (
                        <Link
                          to={`/employees/${employeeId}`}
                          style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {name}
                        </Link>
                      ) : name}
                    </td>
                    {canShowEmployeePhoneAddress && (
                      <td style={{ padding: '6px', border: '1px solid #eee' }}>{emp.mobile || emp.User?.mobile || '-'}</td>
                    )}
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{gender}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>
                      {profileStatus === null ? '-' : renderActiveBadge(profileStatus)}
                    </td>
                    
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{salary}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{state}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{city}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{profiles}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{a.otp || '-'}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>
                      {jobId ? (
                        <Link
                          to={`/jobs/${jobId}`}
                          style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {jobName}
                        </Link>
                      ) : jobName}
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>
                      {a.job_status ? renderStatusBadge(a.job_status) : '-'}
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{renderStatusBadge(status)}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{timeValue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  };
  const renderCreditHistory = () => {
    // Filter creditHistory based on selected sub-tab
    let filtered = [];
    if (creditHistoryTab === 'contact') {
      filtered = creditHistory.filter(row => row.type === 'contact');
      return (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {CREDIT_HISTORY_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setCreditHistoryTab(tab.key)}
                className={`tab-btn${creditHistoryTab === tab.key ? ' active' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  background: creditHistoryTab === tab.key ? '#2563eb' : '#fff',
                  color: creditHistoryTab === tab.key ? '#fff' : '#333',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
            <thead>
              <tr style={{ background:'#f5f5f5' }}>
                <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Employee Name</th>
                <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Verification</th>
                <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>KYC</th>
                {canShowEmployeePhoneAddress && (
                  <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Mobile</th>
                )}
                <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Call Experience</th>
                <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>
                    {(row.employee_id && row.employee_name && canViewEmployees) ? (
                      <Link
                        to={`/employees/${row.employee_id}`}
                        style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {row.employee_name}
                      </Link>
                    ) : (row.employee_name || '-')}
                  </td>
                  <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{row.verification_status}</td>
                  <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{row.kyc_status}</td>
                  {canShowEmployeePhoneAddress && (
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{row.mobile}</td>
                  )}
                  <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{row.call_experience}</td>
                  <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{formatDateTime(row.date)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={canShowEmployeePhoneAddress ? 6 : 5} style={{ padding:'8px', textAlign: 'left' }}>No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    } else if (creditHistoryTab === 'interest') {
      filtered = creditHistory.filter(row => row.type === 'interest');
      return (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {CREDIT_HISTORY_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setCreditHistoryTab(tab.key)}
                className={`tab-btn${creditHistoryTab === tab.key ? ' active' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  background: creditHistoryTab === tab.key ? '#2563eb' : '#fff',
                  color: creditHistoryTab === tab.key ? '#fff' : '#333',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Profile</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employee Name</th>
                {canShowEmployeePhoneAddress && (
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employee Mobile</th>
                )}
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Status</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Interest Status</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>
                    {row.job_id ? (
                      <Link to={`/jobs/${row.job_id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        {row.job_profile || '-'}
                      </Link>
                    ) : (row.job_profile || '-')}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>
                    {(row.employee_id && row.employee_name && canViewEmployees) ? (
                      <Link to={`/employees/${row.employee_id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        {row.employee_name}
                      </Link>
                    ) : (row.employee_name || '-')}
                  </td>
                  {canShowEmployeePhoneAddress && (
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>
                      {row.employee_mobile || row.mobile || '-'}
                    </td>
                  )}
                  <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>
                    {renderJobStatusChip(row.job_status)}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>
                    {renderInterestStatusChip(row.job_interest_status || row.interest_status || row.status)}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>
                    {formatDateTime(row.created_at || row.date)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={canShowEmployeePhoneAddress ? 6 : 5} style={{ padding: '8px', textAlign: 'left' }}>No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    } else if (creditHistoryTab === 'admin') {
      return (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {CREDIT_HISTORY_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setCreditHistoryTab(tab.key)}
                className={`tab-btn${creditHistoryTab === tab.key ? ' active' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  background: creditHistoryTab === tab.key ? '#2563eb' : '#fff',
                  color: creditHistoryTab === tab.key ? '#fff' : '#333',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {manualCreditHistoryError && (
            <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{manualCreditHistoryError}</div>
          )}
          {manualCreditHistoryLoading ? (
            <div style={{ fontSize: '13px' }}>Loading...</div>
          ) : manualCreditHistory.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#666' }}>No admin credit history found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Admin</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Contact Credits</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Interest Credits</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Ad Credits</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Expiry Date</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {manualCreditHistory.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{row.admin_name || '-'}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{row.contact_credit ?? '-'}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{row.interest_credit ?? '-'}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{row.ad_credit ?? '-'}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{formatDateTime(row.expiry_date)}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{formatDateTime(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    } else if (creditHistoryTab === 'job') {
      return (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {CREDIT_HISTORY_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setCreditHistoryTab(tab.key)}
                className={`tab-btn${creditHistoryTab === tab.key ? ' active' : ''}`}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  background: creditHistoryTab === tab.key ? '#2563eb' : '#fff',
                  color: creditHistoryTab === tab.key ? '#fff' : '#333',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {jobLoading ? (
            <div style={{ fontSize: '13px' }}>Loading...</div>
          ) : jobs.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#666' }}>No jobs found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Profile</th>
                  {employerPerms.canShowPhoneAddress && (
                    <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Interviewer Contact</th>
                  )}
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Shift Timing</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Vacancy</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Verification Status</th>
                  {employerPerms.canShowPhoneAddress && (
                    <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>City</th>
                  )}
                  {employerPerms.canShowPhoneAddress && (
                    <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>State</th>
                  )}
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Salary</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Life</th>
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>
                      {job.id ? (
                        <Link to={`/jobs/${job.id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                          {job.job_profile || '-'}
                        </Link>
                      ) : (job.job_profile || '-')}
                    </td>
                    {employerPerms.canShowPhoneAddress && (
                      <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{job.interviewer_contact || '-'}</td>
                    )}
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{job.shift_timing_display || '-'}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{job.hired_total || 0}/{job.no_vacancy || 0}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{renderStatusBadge(job.verification_status)}</td>
                    {employerPerms.canShowPhoneAddress && (
                      <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{job.job_city || '-'}</td>
                    )}
                    {employerPerms.canShowPhoneAddress && (
                      <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{job.job_state || '-'}</td>
                    )}
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>
                      {job.salary_min && job.salary_max
                        ? `${job.salary_min} - ${job.salary_max}`
                        : (job.salary_min || job.salary_max || '-')}
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{getJobLifeDays(job.created_at)}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee', textAlign: 'left' }}>{formatDateTime(job.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {CREDIT_HISTORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setCreditHistoryTab(tab.key)}
              className={`tab-btn${creditHistoryTab === tab.key ? ' active' : ''}`}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid #ccc',
                background: creditHistoryTab === tab.key ? '#2563eb' : '#fff',
                color: creditHistoryTab === tab.key ? '#fff' : '#333',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {placeholderTable(['Type','Amount','Date'], filtered)}
      </div>
    );
  };
  const renderSubscriptionHistory = () => (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Subscription History</h2>
      {subscriptionError && (
        <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{subscriptionError}</div>
      )}
      {subscriptionLoading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : subscriptionHistory.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No subscription history found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Plan</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Price</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Order ID</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Payment ID</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Contact Credit</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Interest Credit</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Ad Credit</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Started At</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Expires At</th>
            </tr>
          </thead>
          <tbody>
            {subscriptionHistory.map(row => (
              <tr key={row.id}>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  {row.plan ? (row.plan.plan_name_english || '-') : '-'}
                </td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.price_total}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.order_id || '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.payment_id || '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.status}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.contact_credit ?? '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.interest_credit ?? '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.ads_credit ?? '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(row.updated_at)}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(row.expiry_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
  const renderCallExperiences = () => ( // replaced
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Call Experiences</h2>
      {callExpError && (
        <div style={{ color:'#b91c1c', fontSize:'12px', marginBottom:'8px' }}>{callExpError}</div>
      )}
      {callExpLoading ? (
        <div style={{ fontSize:'13px' }}>Loading...</div>
      ) : callExperiences.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No call experiences found.</div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
          <thead>
            <tr style={{ background:'#f5f5f5' }}>
              <th style={{ padding:'6px', border:'1px solid #ddd', textAlign:'left' }}>Employee</th>
              <th style={{ padding:'6px', border:'1px solid #ddd', textAlign:'left' }}>Call Experience</th>
              <th style={{ padding:'6px', border:'1px solid #ddd', textAlign:'left' }}>Review</th>
              <th style={{ padding:'6px', border:'1px solid #ddd', textAlign:'left' }}>Date/Time</th>
              {employerPerms.canManage && <th style={{ padding:'6px', border:'1px solid #ddd', textAlign:'left' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {callExperiences.map(r => (
              <tr key={r.id}>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>
                  {r.employee_id ? (
                    <Link
                      to={`/employees/${r.employee_id}`}
                      style={{ color:'#2563eb', textDecoration:'underline', cursor:'pointer' }}
                    >
                      {r.employee_name || '-'}
                    </Link>
                  ) : (r.employee_name || '-')}
                </td>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>{r.call_experience || '-'}</td>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>{r.review || '-'}</td>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>{formatDateTime(r.created_at)}</td>
                {employerPerms.canManage && (
                  <td style={{ padding:'6px', border:'1px solid #eee' }}>
                    {/* Mark as Read / Read badge */}
                    {employerPerms.canManage && !r.read_at && (
                      <button
                        className="btn-small"
                        onClick={() => handleMarkCallHistoryRead(r.id)}
                        style={{ fontSize:'12px', padding:'4px 10px', background:'#16a34a', color:'#fff', cursor:'pointer' }}
                      >
                        Mark as Read
                      </button>
                    )}
                    {r.read_at && <span style={{ fontSize:'12px', color:'#16a34a', fontWeight:600 }}>Read</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
  const renderCallReviews = () => ( // NEW
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Call Reviews</h2>
      {callReviewsError && (
        <div style={{ color:'#b91c1c', fontSize:'12px', marginBottom:'8px' }}>{callReviewsError}</div>
      )}
      {callReviewsLoading ? (
        <div style={{ fontSize:'13px' }}>Loading...</div>
      ) : callReviews.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No call reviews found.</div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
          <thead>
            <tr style={{ background:'#f5f5f5' }}>
              <th style={{ padding:'6px', border:'1px solid #ddd', textAlign:'left' }}>Employee</th>
              <th style={{ padding:'6px', border:'1px solid #ddd', textAlign:'left' }}>Job</th>
              <th style={{ padding:'6px', border:'1px solid #ddd', textAlign:'left' }}>Call Experience</th>
              <th style={{ padding:'6px', border:'1px solid #ddd', textAlign:'left' }}>Review</th>
              <th style={{ padding:'6px', border:'1px solid #ddd', textAlign:'left' }}>Date/Time</th>
            </tr>
          </thead>
          <tbody>
            {callReviews.map(r => (
              <tr key={r.id}>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>
                  {r.employee_id ? (
                    <Link to={`/employees/${r.employee_id}`} style={{ color:'#2563eb', textDecoration:'underline' }}>
                      {r.employee_name || '-'}
                    </Link>
                  ) : (r.employee_name || '-')}
                </td>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>
                  {r.job_id ? (
                    <Link to={`/jobs/${r.job_id}`} style={{ color:'#2563eb', textDecoration:'underline' }}>
                      {r.job_name || '-'}
                    </Link>
                  ) : (r.job_name || '-')}
                </td>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>{r.call_experience || '-'}</td>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>{r.review || '-'}</td>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>{formatDateTime(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderReferrals = () => (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Referrals</h2>
      {referralsError && <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{referralsError}</div>}
      {referralsLoading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : referrals.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No referrals found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>User</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Target</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Contact Credit</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Interest Credit</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((referral) => {
              const targetType = (
                referral.resolved_target_type ||
                referral.user_type ||
                referral.user_entity_type ||
                ''
              ).toString().toLowerCase();
              const targetId = referral.resolved_target_id || referral.user_entity_id || referral.user_id;
              const userRoute = getReferralDetailRoute(targetType, targetId);
              const userName = referral.user_name || referral.User?.name || '-';
              return (
                <tr key={referral.id}>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{referral.id}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {renderReferralNameCell(userName, userRoute)}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{referral.user_type || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{referral.contact_credit ?? 0}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{referral.interest_credit ?? 0}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(referral.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderVoilationReports = () => (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Voilation Reports</h2>
      {voilationError && (
        <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{voilationError}</div>
      )}
      {voilationLoading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : voilationReports.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No voilation reports found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employee Name</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Profile</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Status</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Reason</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Date/Time</th>
              {employerPerms.canManage && <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {voilationReports.map(r => {
              const employeeId = r.user?.id || r.user_id;
              const employeeName = r.user?.name || r.employee_name || '-';
              const jobId = r.reported_entity?.id || r.job_id;
              const jobProfile = r.reported_entity?.JobProfile?.profile_english || r.job_profile || '-';
              const reason = r.reason?.reason_english || r.reason_english || '-';
              return (
                <tr key={r.id}>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {employeeId ? (
                      <Link
                        to={`/employees/${employeeId}`}
                        style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {employeeName}
                      </Link>
                    ) : employeeName}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {jobId ? (
                      <Link
                        to={`/jobs/${jobId}`}
                        style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {jobProfile}
                      </Link>
                    ) : jobProfile}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{renderStatusBadge(r.reported_entity?.status || r.job_status)}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{reason}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.description || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(r.created_at)}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {employerPerms.canManage && !r.read_at && (
                      <button
                        className="btn-small"
                        onClick={() => handleMarkReportAsRead(r.id)}
                        style={{ fontSize: '12px', padding: '4px 10px', background: '#16a34a', color: '#fff', cursor: 'pointer' }}
                      >
                        Mark as Read
                      </button>
                    )}
                    {r.read_at && <span style={{ fontSize:'12px', color:'#16a34a', fontWeight:600 }}>Read</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
  const renderVoilationsReported = () => (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Voilations Reported</h2>
      {voilationsReportedError && (
        <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{voilationsReportedError}</div>
      )}
      {voilationsReportedLoading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : voilationsReported.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No voilations reported.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employee</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employee Status</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Reason</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Date/Time</th>
            </tr>
          </thead>
          <tbody>
            {voilationsReported.map(r => (
              <tr key={r.id}>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  {r.employee_id ? (
                    <Link to={`/employees/${r.employee_id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                      {r.employee_name || '-'}
                    </Link>
                  ) : (r.employee_name || '-')}
                </td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  {r.employee_is_active === null || r.employee_is_active === undefined ? '-' : renderActiveBadge(r.employee_is_active)}
                </td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.reason_english || '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.description || '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Basic details': return renderBasicDetails();
      case 'Jobs': return renderJobs();
      case 'Applicants': return renderApplicants();
      case 'Credit history': return renderCreditHistory();
      case 'Subscription history': return renderSubscriptionHistory();
      case 'Call experiences': return renderCallExperiences();
      case 'Call review by employee': return renderCallReviews(); // CHANGED (was 'Call reviews')
      case 'Referrals': return renderReferrals();      case 'Voilations reported': return renderVoilationsReported();
      default: return null;
    }
  };

  if (loading) return (
    <div className="dashboard-container">
      <Header onMenuClick={()=>{}} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">Loading...</div>
        </main>
      </div>
    </div>
  );

  if (!employerPerms.canView) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={() => { const n = !sidebarOpen; setSidebarOpen(n); saveSidebarState(n); }} />
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

  const employerHeadingSuffix = getEmployerHeadingSuffix(employer, employerPerms.canShowPhoneAddress);

  return (
    <div className="dashboard-container">
      <Header onMenuClick={() => { const n = !sidebarOpen; setSidebarOpen(n); saveSidebarState(n); }} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {error && (
              <div className="inline-message error">
                {error}
                <button className="msg-close" onClick={() => setError(null)}>✕</button>
              </div>
            )}
            {!employer ? (
              <div style={{ padding:'12px', fontSize:'13px' }}>Employer not found.</div>
            ) : showEditForm ? (
              <EmployerForm
                employerId={employer.id}
                onClose={() => setShowEditForm(false)}
                onSuccess={onEditSuccess}
              />
            ) : (activeTab === 'Jobs' && showJobForm) ? (
              // Replace entire content (header, tabs, details) with JobForm, no bordered background
              <div style={{ padding: 0, margin: 0 }}>
                <JobForm
                  open={showJobForm}
                  jobId={editingJob ? editingJob.id : null}
                  employers={employersList}
                  jobProfiles={jobProfiles}
                  states={states}
                  cities={cities}
                  // Pass presetEmployer only for add (not edit)
                  presetEmployer={!editingJob && employerForJobForm ? employerForJobForm : undefined}
                  onClose={() => { setShowJobForm(false); setEditingJob(null); }}
                  onSuccess={handleJobFormSuccess}
                />
              </div>
            ) : (
              <>
                <div className="list-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <h1 style={{ margin: 0 }}>Employer Detail
                    {employerHeadingSuffix ? (
                      <span style={{ marginLeft: 10, fontSize: '0.95em', fontWeight: 600, color: '#475569' }}>
                        {employerHeadingSuffix}
                      </span>
                    ) : null}
                  </h1>
                  {employer && !showEditForm && (
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <button
                        className="btn-secondary small"
                        onClick={() => navigate(-1)}
                        style={{ padding:'4px 10px' }}
                      >
                        Back
                      </button>
                      {employerPerms.canManage && (
                        <button
                          className="btn-primary small"
                          onClick={() => setShowEditForm(true)}
                          style={{ padding:'4px 10px' }}
                        >
                          Edit
                        </button>
                      )}
                      {hasAnyActionPerm && (
                        <div ref={actionMenuRef} style={{ position:'relative' }}>
                          <button
                            className="btn-secondary small"
                            onClick={() => setActionMenuOpen((v) => !v)}
                            disabled={actionLoading}
                            title="Actions"
                            style={{ padding:'4px 10px' }}
                          >
                            ⋮
                          </button>
                          {actionMenuOpen && (
                            <div style={{ position:'absolute', right:0, top:'calc(100% + 4px)', background:'#fff', border:'1px solid #ddd', borderRadius:'6px', boxShadow:'0 6px 18px rgba(0,0,0,0.12)', minWidth:'170px', zIndex:20 }}>
                              {(() => {
                                const opts = [];
                                if (employer?.User && employerPerms.canStatusToggle) {
                                  opts.push({
                                    key: employer.User.is_active ? 'deactivate' : 'activate',
                                    label: employer.User.is_active ? 'Deactivate' : 'Activate'
                                  });
                                }
                                if (employerPerms.canVerify) {
                                  const vStatus = (employer?.verification_status || '').toString().trim().toLowerCase();
                                  if (vStatus === 'pending') {
                                    opts.push({ key: 'approve', label: 'Approve' }, { key: 'reject', label: 'Reject' });
                                  } else if (vStatus === 'verified') {
                                    opts.push({ key: 'reject', label: 'Reject Verification' });
                                  } else if (vStatus === 'rejected') {
                                    opts.push({ key: 'approve', label: 'Approve Status' });
                                  }
                                }

                                if (employerPerms.canKycGrant) {
                                  const kStatus = (employer?.kyc_status || '').toString().trim().toLowerCase();
                                  if (kStatus === 'pending') {
                                    opts.push({ key: 'grantKyc', label: 'Grant KYC' }, { key: 'rejectKyc', label: 'Reject KYC' });
                                  } else if (kStatus === 'verified') {
                                    opts.push({ key: 'rejectKyc', label: 'Reject KYC' });
                                  } else if (kStatus === 'rejected') {
                                    opts.push({ key: 'grantKyc', label: 'Grant KYC' });
                                  }
                                }
                                if (employerPerms.canChangeSub) opts.push({ key:'changeSubscription', label:'Change Subscription' });
                                if (employerPerms.canAddCredit) opts.push({ key:'addCredits', label:'Add Credits' });
                                return opts;
                              })().map((opt) => (
                                <button
                                  key={opt.key}
                                  onClick={() => handleMenuSelection(opt.key)}
                                  disabled={actionLoading}
                                  style={{ width:'100%', textAlign:'left', padding:'8px 12px', background:'transparent', border:'none', fontSize:'12px', cursor:'pointer' }}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="tabs-bar" style={{ display:'flex', flexWrap:'wrap', gap:'6px', margin:'16px 0' }}>
                  {TABS.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                      style={{
                        padding:'8px 12px',
                        fontSize:'12px',
                        border:'1px solid #ccc',
                        background: activeTab === tab ? '#2563eb' : '#fff',
                        color: activeTab === tab ? '#fff' : '#333',
                        borderRadius:'4px',
                        cursor:'pointer'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="tab-content" style={{ background:'#fff', border:'1px solid #ddd', borderRadius:'6px', padding:'16px' }}>
                  {renderTabContent()}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      {showChangeSubscriptionDialog && (
          <div className="form-container" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:3100, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:'90%', maxWidth:'500px', background:'#fff', borderRadius:'8px', padding:'20px' }}>
              <h2 style={{ marginTop:0 }}>Change Subscription</h2>
              {changeSubError && <div className="error-message">{changeSubError}</div>}
              <div className="form-group">
                <label>Subscription Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  disabled={plansLoading || changeSubSaving}
                >
                  <option value="">-- Select --</option>
                  {subscriptionPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.plan_name_english}
                    </option>
                  ))}
                </select>
              </div>
              {selectedPlanId && (() => {
                const plan = subscriptionPlans.find((p) => String(p.id) === String(selectedPlanId));
                if (!plan) return null;
                const validityDays = Number(plan.plan_validity_days) || 0;
                const expiryDate = validityDays
                  ? new Date(Date.now() + validityDays * 86400000).toLocaleDateString(undefined, {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })
                  : 'No expiry';
                return (
                  <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px', fontSize:'13px', lineHeight:1.5, marginBottom:'12px' }}>
                    <div><strong>Contact Credits:</strong> {plan.contact_credits || 0}</div>
                    <div><strong>Interest Credits:</strong> {plan.interest_credits || 0}</div>
                    <div><strong>Ad Credits:</strong> {plan.ad_credits || 0}</div>
                    <div><strong>Expiry Date:</strong> {expiryDate}</div>
                  </div>
                );
              })()}
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowChangeSubscriptionDialog(false)} disabled={changeSubSaving}>Cancel</button>
                <button className="btn-primary" onClick={handleChangeSubscriptionSave} disabled={changeSubSaving}>
                  {changeSubSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
        {showAddCreditsDialog && (
          <div className="form-container" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:3200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:'90%', maxWidth:'420px', background:'#fff', borderRadius:'8px', padding:'20px' }}>
              <h2 style={{ marginTop:0 }}>Add Credits</h2>
              {addCreditsError && <div className="error-message">{addCreditsError}</div>}
              <div className="form-group">
                <label>Contact Credits</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={addCreditsForm.contact}
                  onChange={(e) => setAddCreditsForm((f) => ({ ...f, contact: e.target.value }))}
                  disabled={addCreditsSaving}
                />
              </div>
              <div className="form-group">
                <label>Interest Credits</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={addCreditsForm.interest}
                  onChange={(e) => setAddCreditsForm((f) => ({ ...f, interest: e.target.value }))}
                  disabled={addCreditsSaving}
                />
              </div>
              <div className="form-group">
                <label>Ad Credits</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={addCreditsForm.ad}
                  onChange={(e) => setAddCreditsForm((f) => ({ ...f, ad: e.target.value }))}
                  disabled={addCreditsSaving}
                               />
              </div>
              <div className="form-group">
                <label>Credit Expiry Date</label>
                <input type="date" value={addCreditsForm.expiry} onChange={(e) => setAddCreditsForm((f) => ({ ...f, expiry: e.target.value }))} disabled={addCreditsSaving} />
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowAddCreditsDialog(false)} disabled={addCreditsSaving}>Cancel</button>
                <button className="btn-primary" onClick={handleAddCreditsSave} disabled={addCreditsSaving}>
                  {addCreditsSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW: Deactivation reason modal */}
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
                  onClick={() => setShowDeactivateDialog(false)}
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
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={{ fontSize:'12px', lineHeight:'1.4', background:'#f9f9f9', padding:'8px', borderRadius:'4px', border:'1px solid #eee' }}>
      <div style={{ fontWeight:600 }}>{label}</div>
      <div style={{ color:'#333' }}>{value !== undefined && value !== null && value !== '' ? value : '-'}</div>
    </div>
  );
}
