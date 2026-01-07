import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import JobDetail from '../Jobs/JobDetail';
import RecommendedJobsTab from './RecommendedJobsTab';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import employeesApi from '../../api/employeesApi';
import jobProfilesApi from '../../api/masters/jobProfilesApi';
import employeeSubscriptionPlansApi from '../../api/subscriptions/employeeSubscriptionPlansApi';
import reportsApi from '../../api/reportsApi';
import callHistoryApi from '../../api/callHistoryApi';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import EmployeeForm from '../../components/Forms/EmployeeForm';
import '../Masters/MasterPage.css';

const TABS = [
  'Basic details',
  'Job profiles',
  'Experiences',
  'Documents',
  'Recommended Jobs',
  'Applications',
  'Hired jobs',
  'Wishlist',
  'Credit history',
  'Subscription history',
  'Call experiences',
  'Call review by employer',          // CHANGED (was: 'Call reviews')
  'Referrals',
  'Voilation report by employer',     // CHANGED (was: 'Voilation reports')
  'Voilations reported'
];

const CREDIT_HISTORY_TABS = [
  { key: 'contact', label: 'Contact Credits' },
  { key: 'interest', label: 'Interest Credits' },
  { key: 'admin', label: 'Admin Credits' }
];

const referralHeaderCellStyle = { cursor: 'pointer' };
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

// FIXED: non-hook helper (was missing returns/braces, so suffix stayed empty/undefined)
function getEmployeeHeadingSuffix(employee, canShowPhoneAddress) {
  const name = (employee?.name || employee?.User?.name || '').toString().trim();
  const mobile = (employee?.User?.mobile || '').toString().trim();

  if (!name && !mobile) return '';

  if (!canShowPhoneAddress) {
    return name || '';
  }

  if (name && mobile) return `${name} (${mobile})`;
  return name || mobile;
}

// NEW: used by UI where renderActiveBadge(...) is referenced
function renderActiveBadge(value) {
	const isActive =
		value === true ||
		value === 1 ||
		value === '1' ||
		(value || '').toString().toLowerCase() === 'active' ||
		(value || '').toString().toLowerCase() === 'true';

	const tone = isActive
		? { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Active' }
		: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'Inactive' };

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
				background: tone.bg,
				color: tone.color,
				border: `1px solid ${tone.border}`,
				whiteSpace: 'nowrap'
			}}
		>
			{tone.label}
		</span>
	);
}


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

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [employeeJobProfiles, setEmployeeJobProfiles] = useState([]); // added
  const [allJobProfiles, setAllJobProfiles] = useState([]); // added
  const [showJobProfileDialog, setShowJobProfileDialog] = useState(false); // added
  const [selectingProfiles, setSelectingProfiles] = useState(false); // added
  const [selectedJobProfileIds, setSelectedJobProfileIds] = useState(new Set()); // added
  const [jobProfilesError, setJobProfilesError] = useState(null); // added
  const [experiences, setExperiences] = useState([]);
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState(null);
  const [showExpDialog, setShowExpDialog] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [expForm, setExpForm] = useState({
    previous_firm: '',
    work_duration: '',
    work_duration_frequency: '',
    document_type_id: '',
    work_nature_id: '',
    experience_certificate: ''
  });
  const [uploadingCert, setUploadingCert] = useState(false); // added
  const [documents, setDocuments] = useState([]); // added
  const [workNatures, setWorkNatures] = useState([]); // added
  const [docUploading, setDocUploading] = useState(false);
  const [employeeDocs, setEmployeeDocs] = useState([]); // unchanged
  const [applications, setApplications] = useState({ sent: [], received: [] });
  const [appTab, setAppTab] = useState('Sent');
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState(null);
  const [jobDetailId, setJobDetailId] = useState(null);
  const [viewJobId, setViewJobId] = useState(null); // restore this state
  const [hiredJobs, setHiredJobs] = useState([]); // NEW
  const [hiredLoading, setHiredLoading] = useState(false); // NEW
  const [hiredError, setHiredError] = useState(null); // NEW
  const [wishlist, setWishlist] = useState([]); // NEW
  const [wishlistLoading, setWishlistLoading] = useState(false); // NEW
  const [wishlistError, setWishlistError] = useState(null); // NEW
  const [paymentHistory, setPaymentHistory] = useState([]); // added
  const [paymentLoading, setPaymentLoading] = useState(false); // added
  const [paymentError, setPaymentError] = useState(null); // added
  const [creditHistory, setCreditHistory] = useState([]); // add
  const [creditHistoryTab, setCreditHistoryTab] = useState('contact'); // add
  const [creditHistoryLoading, setCreditHistoryLoading] = useState(false); // add
  const [creditHistoryError, setCreditHistoryError] = useState(null); // add
  const [manualCreditHistory, setManualCreditHistory] = useState([]);
  const [manualCreditHistoryLoading, setManualCreditHistoryLoading] = useState(false);
  const [manualCreditHistoryError, setManualCreditHistoryError] = useState(null);
  const [voilationReports, setVoilationReports] = useState([]); // add
  const [voilationLoading, setVoilationLoading] = useState(false); // add
  const [voilationError, setVoilationError] = useState(null); // add
  const [callExperiences, setCallExperiences] = useState([]); // add
  const [callExpLoading, setCallExpLoading] = useState(false); // add
  const [callExpError, setCallExpError] = useState(null); // add
  const [callReviews, setCallReviews] = useState([]);
  const [callReviewsLoading, setCallReviewsLoading] = useState(false);
  const [callReviewsError, setCallReviewsError] = useState(null);
  const [voilationsReported, setVoilationsReported] = useState([]);
  const [voilationsReportedLoading, setVoilationsReportedLoading] = useState(false);
  const [voilationsReportedError, setVoilationsReportedError] = useState(null);
  const [notice, setNotice] = useState(null); // add

  const [referrals, setReferrals] = useState([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralsError, setReferralsError] = useState(null);

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showChangeSubscriptionDialog, setShowChangeSubscriptionDialog] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [changeSubSaving, setChangeSubSaving] = useState(false);
  const [changeSubError, setChangeSubError] = useState(null);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [addCreditsForm, setAddCreditsForm] = useState({ contact: '', interest: '', expiry: '' });
  const [addCreditsSaving, setAddCreditsSaving] = useState(false);
  const [addCreditsError, setAddCreditsError] = useState(null);

  // NEW: Deactivate dialog state (no system prompt)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateSaving, setDeactivateSaving] = useState(false);
  const [deactivateError, setDeactivateError] = useState(null);

  const actionMenuRef = useRef(null);

  const perms = React.useMemo(() => ({
    canView: hasPermission(PERMISSIONS.EMPLOYEES_VIEW),
    canManage: hasPermission(PERMISSIONS.EMPLOYEES_MANAGE),
    canDelete: hasPermission(PERMISSIONS.EMPLOYEES_DELETE),
    canStatusToggle: hasPermission(PERMISSIONS.EMPLOYEES_STATUS_TOGGLE),
    canVerify: hasPermission(PERMISSIONS.EMPLOYEES_VERIFY),
    canGrantKyc: hasPermission(PERMISSIONS.EMPLOYEES_KYC_GRANT),
    canAddCredit: hasPermission(PERMISSIONS.EMPLOYEES_ADD_CREDIT),
    canChangeSubscription: hasPermission(PERMISSIONS.EMPLOYEES_SUBSCRIPTION_CHANGE),

    // Sensitive fields
    canShowPhoneAddress: hasPermission(PERMISSIONS.EMPLOYEES_SHOW_PHONE_ADDRESS),
    canShowEmployerPhoneAddress: hasPermission(PERMISSIONS.EMPLOYERS_SHOW_PHONE_ADDRESS),
  }), []);

  useEffect(() => {
    setSidebarOpen(getSidebarState());
    fetchEmployee();
  }, [id]);

  useEffect(() => { // added
    if (employee) {
      fetchEmployeeJobProfiles();
      fetchAllJobProfiles();
    }
  }, [employee]);

  useEffect(() => { // modified
    if (employee && activeTab === 'Experiences') {
      loadExperiences();
      loadDocuments(); // added
      loadWorkNatures(); // added
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (employee && activeTab === 'Documents') {
      fetchEmployeeDocuments(); // added
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (employee && activeTab === 'Applications') {
      fetchApplications();
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (employee && activeTab === 'Hired jobs') {
      fetchHiredJobs();
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (employee && activeTab === 'Wishlist') {
      fetchWishlist();
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (employee && activeTab === 'Subscription history') {
      fetchPaymentHistory();
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (employee && activeTab === 'Credit history') {
      fetchCreditHistory();
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (!employee) return;
    if (activeTab !== 'Credit history') return;
    if (creditHistoryTab !== 'admin') return;
    fetchManualCreditHistory();
  }, [employee, activeTab, creditHistoryTab]);

  useEffect(() => {
    // FIX: tab label is "Voilation report by employer" (not "Voilation reports")
    if (employee && (activeTab === 'Voilation report by employer' || activeTab === 'Voilation reports')) {
      fetchVoilationReports();
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (employee && activeTab === 'Call experiences') {
      fetchCallExperiences();
    }
    if (employee && activeTab === 'Call review by employer') {
      fetchCallReviews();
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (employee && activeTab === 'Voilations reported') {
      fetchVoilationsReported();
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (!actionMenuOpen) return;
    const handler = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [actionMenuOpen]);

  useEffect(() => {
    if (employee && activeTab === 'Referrals') {
      fetchReferralsForEmployee();
    }
  }, [employee, activeTab]);

  const fetchEmployee = async () => {
    if (!perms.canView) return;
    setLoading(true);
    setError(null);
    try {
      const res = await employeesApi.getEmployeeById(id);
      setEmployee(res.data?.data || null);
    } catch (e) {
      setError('Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeJobProfiles = async () => {
    if (!perms.canView) return;
    try {
      const res = await employeesApi.getEmployeeJobProfiles(id);
      const rows = res.data?.data || [];
      setEmployeeJobProfiles(rows);
      setSelectedJobProfileIds(new Set(rows.map(r => r.job_profile_id)));
    } catch (e) {
      console.warn('Failed to load employee job profiles', e);
    }
  };

  const fetchAllJobProfiles = async () => { // modified
    setJobProfilesError(null);
    try {
      const res = await jobProfilesApi.getAll();
      setAllJobProfiles(res.data?.data || []);
    } catch (e) {
      setJobProfilesError(e.response?.data?.message || 'Failed to load job profiles');
      setAllJobProfiles([]);
    }
  };

  const loadExperiences = async () => { // added
    if (!perms.canView) return;
    setExpLoading(true);
    setExpError(null);
    try {
      const res = await employeesApi.getEmployeeExperiences(id);
      setExperiences(res.data?.data || []);
    } catch (e) {
      setExpError('Failed to load experiences');
    } finally {
      setExpLoading(false);
    }
  };

  const loadDocuments = async () => { // added
    if (!perms.canView) return;
    try {
      const res = await employeesApi.getDocumentTypes();
      setDocuments(res.data?.data || []);
    } catch (e) {
      console.warn('Failed to load document types', e);
    }
  };

  const loadWorkNatures = async () => { // added
    if (!perms.canView) return;
    try {
      const res = await employeesApi.getWorkNatures();
      setWorkNatures(res.data?.data || []);
    } catch (e) {
      console.warn('Failed to load work natures', e);
    }
  };

  const fetchEmployeeDocuments = async () => {
    if (!employee || !perms.canView) return;
    try {
      const res = await employeesApi.getEmployeeDocuments(employee.id);
      setEmployeeDocs(res.data?.data || []);
    } catch (e) {
      console.warn('Failed to load employee documents', e);
    }
  };

  const fetchApplications = async () => {
    if (!perms.canView) return;
    setAppLoading(true);
    setAppError(null);
    try {
      const res = await employeesApi.getEmployeeApplications(id);
      setApplications(res.data?.data || { sent: [], received: [] });
    } catch (e) {
      setAppError('Failed to load applications');
      setApplications({ sent: [], received: [] });
    } finally {
      setAppLoading(false);
    }
  };

  const fetchHiredJobs = async () => {
    if (!perms.canView) return;
    setHiredLoading(true);
    setHiredError(null);
    try {
      const res = await employeesApi.getEmployeeHiredJobs(id);
      setHiredJobs(res.data?.data || []);
    } catch (e) {
      setHiredError('Failed to load hired jobs');
      setHiredJobs([]);
    } finally {
      setHiredLoading(false);
    }
  };

  const fetchWishlist = async () => {
    if (!perms.canView) return;
    setWishlistLoading(true);
    setWishlistError(null);
    try {
      const res = await employeesApi.getEmployeeWishlist(id);
      setWishlist(res.data?.data || []);
    } catch (e) {
      setWishlistError('Failed to load wishlist');
      setWishlist([]);
    } finally {
      setWishlistLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!perms.canView) return;
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const res = await employeesApi.getEmployeePaymentHistory(employee.id);
      setPaymentHistory(res.data?.data || []);
    } catch (e) {
      setPaymentError('Failed to load payment history');
      setPaymentHistory([]);
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchCreditHistory = async () => {
    if (!perms.canView) return;
    setCreditHistoryLoading(true);
    setCreditHistoryError(null);
    try {
      const res = await employeesApi.getEmployeeCreditHistory(id);
      setCreditHistory(res.data?.data || []);
    } catch (e) {
      setCreditHistoryError('Failed to load credit history');
      setCreditHistory([]);
    } finally {
      setCreditHistoryLoading(false);
    }
  };

  const fetchManualCreditHistory = async () => {
    if (!perms.canView) return;
    setManualCreditHistoryLoading(true);
    setManualCreditHistoryError(null);
    try {
      const res = await employeesApi.getEmployeeManualCreditHistory(id);
      setManualCreditHistory(res.data?.data || []);
    } catch (e) {
      setManualCreditHistoryError('Failed to load admin credit history');
      setManualCreditHistory([]);
    } finally {
      setManualCreditHistoryLoading(false);
    }
  };

  const fetchVoilationReports = async () => {
    if (!perms.canView) return;
    setVoilationLoading(true);
    setVoilationError(null);
    try {
      // Fetch reports where report_type=employee and report_id=employee.id (this employee is being reported)
      const res = await reportsApi.getReports({
        report_type: 'employee',
        report_id: employee.id
      });
      setVoilationReports(res.data?.data || []);
    } catch (e) {
      setVoilationError('Failed to load voilation reports');
      setVoilationReports([]);
    } finally {
      setVoilationLoading(false);
    }
  };

  const fetchCallExperiences = async () => {
    if (!perms.canView) return;
    setCallExpLoading(true);
    setCallExpError(null);
    try {
      const res = await employeesApi.getEmployeeCallExperiences(id);
      setCallExperiences(res.data?.data || []);
    } catch (e) {
      setCallExpError('Failed to load call experiences');
      setCallExperiences([]);
    } finally {
      setCallExpLoading(false);
    }
  };

  const fetchCallReviews = async () => { // NEW
    if (!perms.canView) return;
    setCallReviewsLoading(true);
    setCallReviewsError(null);
    try {
      const res = await employeesApi.getEmployeeCallReviews(id);
      setCallReviews(res.data?.data || []);
    } catch (e) {
      setCallReviewsError('Failed to load call reviews');
      setCallReviews([]);
    } finally {
      setCallReviewsLoading(false);
    }
  };

  const loadSubscriptionPlans = async () => {
    if (!perms.canChangeSubscription) return;
    setPlansLoading(true);
    try {
      const res = await employeeSubscriptionPlansApi.getAll();
      setSubscriptionPlans(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load subscription plans', err);
    } finally {
      setPlansLoading(false);
    }
  };

  const openChangeSubscriptionDialog = () => {
    if (!perms.canChangeSubscription) {
      setError('You do not have permission to change subscriptions.');
      return;
    }
    setChangeSubError(null);
    setSelectedPlanId(employee?.subscription_plan_id || '');
    setShowChangeSubscriptionDialog(true);
    if (!subscriptionPlans.length) loadSubscriptionPlans();
  };

  const handleChangeSubscriptionSave = async () => {
    if (!perms.canChangeSubscription) {
      setChangeSubError('You do not have permission to change subscriptions.');
      return;
    }
    if (!selectedPlanId) {
      setChangeSubError('Select a subscription plan');
      return;
    }
    setChangeSubSaving(true);
    setChangeSubError(null);
    try {
      await employeesApi.changeEmployeeSubscription(id, { subscription_plan_id: selectedPlanId });
      await fetchEmployee();
      setShowChangeSubscriptionDialog(false);
    } catch (err) {
      setChangeSubError(err.response?.data?.message || 'Failed to update subscription');
    } finally {
      setChangeSubSaving(false);
    }
  };

  const openAddCreditsDialog = () => {
    if (!perms.canAddCredit) {
      setError('You do not have permission to add credits.');
      return;
    }
    setAddCreditsForm({
      contact: '',
      interest: '',
      expiry: employee?.credit_expiry_at ? employee.credit_expiry_at.split('T')[0] : ''
    });
    setAddCreditsError(null);
    setShowAddCreditsDialog(true);
  };

  const handleAddCreditsSave = async () => {
    if (!perms.canAddCredit) {
      setAddCreditsError('You do not have permission to add credits.');
      return;
    }
    const contact = parseInt(addCreditsForm.contact, 10) || 0;
    const interest = parseInt(addCreditsForm.interest, 10) || 0;
    if (contact <= 0 && interest <= 0) {
      setAddCreditsError('Enter credits to add');
      return;
    }
    setAddCreditsSaving(true);
    setAddCreditsError(null);
    try {
      await employeesApi.addEmployeeCredits(id, {
        contact_credits: contact,
        interest_credits: interest,
        credit_expiry_at: addCreditsForm.expiry || null
      });
      await fetchEmployee();
      setShowAddCreditsDialog(false);
    } catch (err) {
      setAddCreditsError(err.response?.data?.message || 'Failed to add credits');
    } finally {
      setAddCreditsSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!employee) return;
    const reason = (deactivateReason || '').toString().trim();
    if (!reason) { setDeactivateError('Deactivation reason is required.'); return; }

    setDeactivateSaving(true);
    setDeactivateError(null);
    try {
      await employeesApi.deactivateEmployee(employee.id, { deactivation_reason: reason });
      await fetchEmployee();
      setShowDeactivateDialog(false);
      setNotice({ type: 'success', text: 'Employee deactivated.' });
    } catch (err) {
      setDeactivateError(err?.response?.data?.message || 'Failed to deactivate employee.');
    } finally {
      setDeactivateSaving(false);
    }
  };

  const handleEmployeeAction = async (actionKey) => {
    if (!employee) return;
    const ensure = (flag, msg) => {
      if (!flag) {
        setError(msg);
        setActionLoading(false);
      }
      return flag;
    };
    setActionLoading(true);
    setError(null);
    try {
      switch (actionKey) {
        case 'activate':
        case 'deactivate':
          if (!ensure(perms.canStatusToggle, 'You do not have permission to change status.')) break;
          if (actionKey === 'activate') {
            await employeesApi.activateEmployee(employee.id);
          } else {
            // NEW: open custom dialog
            setActionMenuOpen(false);
            setShowDeactivateDialog(true);
            setDeactivateReason('');
            setDeactivateError(null);
          }
          break;
        case 'approve':
        case 'reject':
          if (!ensure(perms.canVerify, 'You do not have permission to verify employees.')) break;
          await (actionKey === 'approve'
            ? employeesApi.approveEmployee(employee.id)
            : employeesApi.rejectEmployee(employee.id));
          break;
        case 'grantKyc':
        case 'rejectKyc':
          if (!ensure(perms.canGrantKyc, 'You do not have permission to manage KYC.')) break;
          await (actionKey === 'grantKyc'
            ? employeesApi.grantEmployeeKyc(employee.id)
            : employeesApi.rejectEmployeeKyc(employee.id));
          break;
        default:
          break;
      }
      await fetchEmployee();
      setActionMenuOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMenuSelection = (actionKey) => {
    switch (actionKey) {
      case 'changeSubscription':
        openChangeSubscriptionDialog();
        break;
      case 'addCredits':
        openAddCreditsDialog();
        break;
      case 'deactivate': // NEW: open custom dialog
        if (!perms.canStatusToggle) { setError('You do not have permission to change status.'); return; }
        setActionMenuOpen(false);
        setShowDeactivateDialog(true);
        setDeactivateReason('');
        setDeactivateError(null);
        break;
      case 'shareEmployee': // add
        handleShareEmployee();
        break;
      default:
        handleEmployeeAction(actionKey);
    }
  };

  const handleMenuClick = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    saveSidebarState(newState);
  };

  const handleShareEmployee = async () => { // add
    setActionMenuOpen(false);
    const link = 'https://google.com';
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
      setNotice({ type: 'success', text: 'Share link copied to clipboard.' });
    } catch {
      setNotice({ type: 'error', text: 'Failed to copy share link.' });
    }
  };

  const formatDateTime = (val) => {
    if (!val) return '-';
    try {
      return new Date(val).toLocaleString();
    } catch {
      return val;
    }
  };

  // NEW: date-only formatter (DOB etc.)
  const formatDateOnly = (val) => {
    if (!val) return '-';
    try {
      // if backend sends DATEONLY as "YYYY-MM-DD", keep it stable
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return '-';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '-';
    }
  };

  const renderStatusBadge = (status) => {
    const normalized = (status || '').toLowerCase();
    const palette = {
      verified: { bg: '#16a34a', color: '#fff' },
      approved: { bg: '#16a34a', color: '#fff' }, // legacy
      pending: { bg: '#f59e0b', color: '#1f2937' },
      rejected: { bg: '#dc2626', color: '#fff' }
    };
    const tone = palette[normalized] || { bg: '#e5e7eb', color: '#1f2937' };
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'capitalize',
          background: tone.bg,
          color: tone.color
        }}
      >
        {status || '-'}
      </span>
    );
  };

  // NEW: simple status chip (for employer_kyc_status; also usable for job_status if you want)
  const statusChipPalette = {
    pending: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    verified: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
    rejected: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' }
  };

  function renderStatusChip(value) {
    const v = (value || '').toString().trim().toLowerCase();
    if (!v) return <span>-</span>;
    const tone = statusChipPalette[v] || { bg: '#e5e7eb', color: '#0f172a', border: '#d1d5db' };
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
        {v}
      </span>
    );
  }

  const basic = employee || {};

  // NEW: compute age from DOB (employee.dob)
  const calculateAge = React.useCallback((dob) => {
    if (!dob) return '-';
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
    return age >= 0 ? age : '-';
  }, []);

  const renderBasicDetails = () => (
    <div className="detail-section">
      <div className="grid-2col" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'12px' }}>
        <Detail label="ID" value={basic.id} />
        <Detail label="Name" value={basic.name} />
        {perms.canShowPhoneAddress && (
          <Detail label="Mobile" value={basic.User?.mobile || '-'} />
        )}
        <Detail label="Email" value={basic.email} />
        <Detail label="Gender" value={basic.gender} />
        <Detail label="DOB" value={formatDateOnly(basic.dob)} />
        <Detail label="Age" value={calculateAge(basic.dob)} />
        <Detail label="Aadhar Number" value={basic.aadhar_number || '-'} />
        <Detail label="User Status" value={renderActiveBadge(basic.User?.is_active)} />

        {/* NEW: show reason if present */}
        <Detail label="Deactivation Reason" value={basic.User?.deactivation_reason || '-'} />

        {/* NEW: status changed by (admin) */}
        <Detail label="Status Changed By" value={basic.User?.StatusChangedBy?.name || '-'} />

        <Detail label="Delete Status" value={basic.User?.delete_pending ? 'Pending deletion' : 'Active'} />
        <Detail label="Delete Requested At" value={formatDateTime(basic.User?.delete_requested_at)} />
        <Detail label="Referred By" value={basic.User?.referred_by || '-'} />
        <Detail label="Preferred Language" value={basic.User?.preferred_language || '-'} />
        <Detail label="Referral Code" value={basic.User?.referral_code || '-'} />
        <Detail label="Total Referred" value={basic.User?.total_referred ?? '-'} />
        {perms.canShowPhoneAddress && (
          <Detail label="State" value={basic.State?.state_english || '-'} />
        )}
        {perms.canShowPhoneAddress && (
          <Detail label="City" value={basic.City?.city_english || '-'} />
        )}
        {perms.canShowPhoneAddress && (
          <Detail label="Preferred State" value={basic.PreferredState?.state_english || '-'} />
        )}
        {perms.canShowPhoneAddress && (
          <Detail label="Preferred City" value={basic.PreferredCity?.city_english || '-'} />
        )}
        <Detail label="Qualification" value={basic.Qualification?.qualification_english} /> {/* joined */}
        <Detail label="Preferred Shift" value={basic.Shift?.shift_english} />  {/* joined */}
        <Detail label="Subscription Plan" value={basic.SubscriptionPlan?.plan_name_english} /> {/* joined */}
        <Detail label="Expected Salary" value={basic.expected_salary} />
        <Detail label="Expected Salary Frequency" value={basic.expected_salary_frequency} />
        <Detail label="Job Profiles" value={basic.job_profiles_display} /> {/* added */}
        <Detail label="Work Nature" value={basic.work_natures_display} /> {/* added */}
        <Detail label="Verification" value={renderStatusBadge(basic.verification_status)} />
        <Detail label="Verification At" value={formatDateTime(basic.verification_at)} /> {/* NEW */}
        <Detail label="KYC" value={renderStatusBadge(basic.kyc_status)} />
        <Detail label="KYC Verification At" value={formatDateTime(basic.kyc_verification_at)} /> {/* NEW */}
        <Detail label="Contact Credits" value={`${basic.contact_credit || 0}/${basic.total_contact_credit || 0}`} />
        <Detail label="Interest Credits" value={`${basic.interest_credit || 0}/${basic.total_interest_credit || 0}`} />
        <Detail label="Credit Expiry" value={formatDateTime(basic.credit_expiry_at)} /> {/* formatted date-time */}
        <Detail label="Created At" value={formatDateTime(basic.created_at)} />
      </div>
      {basic.selfie_link && (
        <div style={{ marginTop:'16px' }}>
          <strong>Selfie:</strong><br />
          <img
            src={basic.selfie_link}
            alt="Selfie"
            style={{ maxWidth:'160px', borderRadius:'6px', border:'1px solid #ddd' }}
          />
        </div>
      )}
      {basic.about_user && (
        <div style={{ marginTop:'16px' }}>
          <strong>About:</strong>
          <div style={{ fontSize:'13px', lineHeight:'1.4', marginTop:'4px' }}>{basic.about_user}</div>
        </div>
      )}
    </div>
  );

  const placeholder = (title) => (
    <div style={{ fontSize:'13px', color:'#555' }}>
      {title} data not implemented yet.
    </div>
  );

  const toggleJobProfile = (jp) => { // added
    if (!perms.canManage) return;
    setSelectedJobProfileIds(prev => {
      const next = new Set(prev);
      if (next.has(jp.id)) {
        next.delete(jp.id);
      } else {
        if (next.size >= 3) return prev; // enforce max 3
        next.add(jp.id);
      }
      return next;
    });
  };

  const saveJobProfiles = async () => {
    setSelectingProfiles(true);
    setJobProfilesError(null);
    try {
      const ids = Array.from(selectedJobProfileIds);
      const res = await employeesApi.saveEmployeeJobProfiles(id, ids);
      if (!res.data?.success) {
        setJobProfilesError(res.data?.message || 'Save failed');
        return;
      }
      await fetchEmployeeJobProfiles();
      setShowJobProfileDialog(false);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to save job profiles';
      setJobProfilesError(msg);
    } finally {
      setSelectingProfiles(false);
    }
  };

  const openAddExperience = () => {
    setEditingExp(null);
    setExpForm({
      previous_firm:'',
      work_duration:'',
      work_duration_frequency:'',
      document_type_id:'',
      work_nature_id:'',
      experience_certificate:''
    });
    setExpError(null);
    setShowExpDialog(true);
  };

  const openEditExperience = (row) => {
    setEditingExp(row.id);
    setExpForm({
      previous_firm: row.previous_firm || '',
      work_duration: row.work_duration || '',
      work_duration_frequency: row.work_duration_frequency || '',
      document_type_id: row.document_type_id || '',
      work_nature_id: row.work_nature_id || '',
      experience_certificate: row.experience_certificate || ''
    });
    setExpError(null);
    setShowExpDialog(true);
  };

  const handleExpField = (k,v)=> setExpForm(f=>({ ...f, [k]: v })); // added

  const saveExperience = async () => { // added
    if (!perms.canManage) { setExpError('You do not have permission to manage experiences.'); return; }
    setExpError(null);
    try {
      if (!expForm.previous_firm.trim()) {
        setExpError('Previous firm required');
        return;
      }
      const payload = { ...expForm };
      if (editingExp) {
        await employeesApi.updateEmployeeExperience(id, editingExp, payload);
      } else {
        await employeesApi.createEmployeeExperience(id, payload);
      }
      setShowExpDialog(false);
      await loadExperiences();
    } catch (e) {
      setExpError(e.response?.data?.message || 'Save failed');
    }
  };

  const deleteExperience = async (expId) => { // added
    if (!perms.canDelete) { setExpError('You do not have permission to delete experiences.'); return; }
    if (!window.confirm('Delete experience?')) return;
    try {
      await employeesApi.deleteEmployeeExperience(id, expId);
      setExperiences(prev => prev.filter(r => r.id !== expId));
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const uploadCertificate = async (e) => { // added
    if (!perms.canManage) { setExpError('You do not have permission to manage experiences.'); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setExpError('Only images and PDF files allowed');
      return;
    }
    if (file.size > 5*1024*1024) {
      setExpError('Max size 5MB');
      return;
    }
    setUploadingCert(true);
    setExpError(null);
    try {
      const res = await employeesApi.uploadExperienceCertificate(file); // CHANGED: pass File (not FormData)
      if (!res.data?.success) {
        setExpError(res.data?.message || 'Upload failed');
      } else {
        handleExpField('experience_certificate', res.data.path);
      }
    } catch (err) {
      setExpError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingCert(false);
    }
  };

  const removeCertificate = () => { handleExpField('experience_certificate', ''); }; // added

  const uploadDocument = async (type, file) => { // modified
    if (!perms.canManage) { setError('You do not have permission to upload documents.'); return; }
    if (!file || !employee) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Only images/PDF allowed'); return;
    }
    if (file.size > 5*1024*1024) { setError('Max size 5MB'); return; }
    setDocUploading(true);
    setError(null);
    try {
      await employeesApi.uploadEmployeeDocument(employee.id, type, file); // CHANGED: pass File (not FormData)
      await fetchEmployeeDocuments();
    } catch (e) {
      setError(e.response?.data?.message || 'Upload failed');
    } finally {
      setDocUploading(false);
    }
  };

  const removeDocument = async (docId) => { // modified
    if (!perms.canDelete) { setError('You do not have permission to delete documents.'); return; }
    if (!employee) return;
    try {
      await employeesApi.deleteEmployeeDocument(employee.id, docId);
      setEmployeeDocs(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      setError(e.response?.data?.message || 'Remove failed');
    }
  };

  const handleMarkReportAsRead = async (reportId) => {
    if (!perms.canManage) { setVoilationError('You do not have permission to update reports.'); return; }
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
    if (!perms.canManage) { setCallExpError('You do not have permission to update call history.'); return; }
    try {
      await callHistoryApi.markRead(callHistoryId);
      setCallExperiences(list =>
        list.map(r =>
          r.id === callHistoryId ? { ...r, read_at: new Date().toISOString() } : r
        )
      );
      setCallReviews(list =>
        list.map(r =>
          r.id === callHistoryId ? { ...r, read_at: new Date().toISOString() } : r
        )
      );
    } catch (e) {
      alert('Failed to mark as read');
    }
  };

  const fetchVoilationsReported = async () => {
    if (!perms.canView || !employee) return;
    setVoilationsReportedLoading(true);
    setVoilationsReportedError(null);
    try {
      const res = await employeesApi.getEmployeeVoilationsReported(employee.id);
      const rows = res.data?.data || [];
      setVoilationsReported(rows);
    } catch (e) {
      setVoilationsReportedError(e?.response?.data?.message || 'Failed to load violations reported');
    } finally {
      setVoilationsReportedLoading(false);
    }
  };

  const renderVoilationsReportedTab = () => (
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
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Status</th> {/* NEW */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Reason</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Date/Time</th>
            </tr>
          </thead>
          <tbody>
            {voilationsReported.map(r => (
              <tr key={r.id}>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  {r.job_id ? (
                    <Link to={`/jobs/${r.job_id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                      {r.job_name}
                    </Link>
                  ) : (r.job_name || '-')}
                </td>

                {/* NEW */}
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{renderJobStatusChip(r.job_status)}</td>

                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  {r.employer_id ? (
                    <Link to={`/employers/${r.employer_id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                      {r.employer_name || '-'}
                    </Link>
                  ) : (r.employer_name || '-')}
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

  const renderJobProfilesTab = () => (
    <div>
      {/* header row updated */}
      <div style={{ display:'flex', alignItems:'center', marginBottom:'12px' }}> {/* changed */}
        <h2 style={{ margin:0, fontSize:'16px' }}>Job Profiles</h2>
        {perms.canManage && (
          <div style={{ marginLeft:'auto' }}>
            <button
              className="btn-primary small"
              onClick={() => setShowJobProfileDialog(true)}
              style={{ padding:'4px 10px', fontSize:'12px', width:'auto', minWidth:'unset' }}
            >
              {employeeJobProfiles.length ? 'Edit' : 'Add'} Job Profiles
            </button>
          </div>
        )}
      </div>
      {employeeJobProfiles.length === 0 ? (
        <div style={{ fontSize:'13px', color:'#666' }}>No job profiles selected.</div>
      ) : (
        <table style={{ width:'100%', borderCollapse: 'collapse', fontSize:'12px' }}>
          <thead>
            <tr style={{ background:'#f5f5f5' }}>
              <th style={{ textAlign:'left', padding:'8px', border:'1px solid #ddd' }}>Image</th>
              <th style={{ textAlign:'left', padding:'8px', border:'1px solid #ddd' }}>Name</th>
            </tr>
          </thead>
          <tbody>
            {employeeJobProfiles.map(p => (
              <tr key={p.id}>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>
                  {p.JobProfile?.profile_image ? (
                    <img
                      src={p.JobProfile.profile_image}
                      alt={p.JobProfile.profile_english}
                      style={{ width:'48px', height:'48px', objectFit:'cover', borderRadius:'4px', border:'1px solid #ddd' }}
                    />
                  ) : (
                    <div style={{ width:'48px', height:'48px', background:'#eaeaea', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color:'#666' }}>No Img</div>
                  )}
                </td>
                <td style={{ padding:'6px', border:'1px solid #eee' }}>
                  {p.JobProfile?.profile_english || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showJobProfileDialog && perms.canManage && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0,
          background:'rgba(0,0,0,0.4)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:2000
        }}>
          <div style={{
            background:'#fff', width:'90%', maxWidth:'660px', // reduced from 760px
            maxHeight:'80vh', overflowY:'auto', borderRadius:'8px',
            padding:'20px', boxShadow:'0 4px 18px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <h3 style={{ margin:0, fontSize:'16px' }}>Select Job Profiles (max 3)</h3>
            </div>
            {jobProfilesError && (
              <div style={{ marginBottom:'8px', color:'#b91c1c', fontSize:'12px', background:'#fee2e2', padding:'8px', borderRadius:'4px' }}>
                {jobProfilesError}
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:'10px' }}>
              {allJobProfiles.map(jp => {
                const selected = selectedJobProfileIds.has(jp.id);
                const disabled = !selected && selectedJobProfileIds.size >= 3;
                return (
                  <div
                    key={jp.id}
                    onClick={() => !disabled && toggleJobProfile(jp)}
                    style={{
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      border: `2px solid ${selected ? '#2563eb' : '#ddd'}`,
                      borderRadius:'8px',
                      padding:'8px',
                      background:selected ? '#f0f6ff' : '#fff',
                      opacity: disabled ? 0.5 : 1,
                      display:'flex',
                      flexDirection:'column',
                      alignItems:'center',
                      transition:'border-color 0.2s, background 0.2s'
                    }}
                  >
                    {jp.profile_image ? (
                      <img
                        src={jp.profile_image}
                        alt={jp.profile_english}
                        style={{
                          width:'60px', height:'60px', objectFit:'cover',
                          borderRadius:'6px', border:'1px solid #ccc', marginBottom:'6px'
                        }}
                      />
                    ) : (
                      <div style={{
                        width:'60px', height:'60px', background:'#eaeaea',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'10px', color:'#666', borderRadius:'6px', marginBottom:'6px'
                      }}>No Image</div>
                    )}
                    <div style={{ fontSize:'10px', fontWeight:600, textAlign:'center', lineHeight:'1.2' }}>
                      {jp.profile_english}
                    </div>
                    {selected && (
                      <div style={{ marginTop:'4px', fontSize:'9px', color:'#2563eb' }}>✓ Selected</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:'16px', display:'flex', justifyContent:'flex-end', gap:'10px' }}>
              <button
                className="btn-secondary small"
                onClick={() => setShowJobProfileDialog(false)}
                disabled={selectingProfiles}
                style={{ padding:'10px 10px', width:'auto', minWidth:'unset' }}
              >
                Cancel
              </button>
              <button
                className="btn-primary small"
                onClick={saveJobProfiles}
                disabled={selectingProfiles}
                style={{ padding:'10px 10px', width:'auto', minWidth:'unset' }}
              >
                {selectingProfiles ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderExperiencesTab = () => (
    <div>
      <div style={{ display:'flex', alignItems:'center', marginBottom:'12px' }}>
        <h2 style={{ margin:0, fontSize:'16px' }}>Experiences</h2>
        {perms.canManage && (
          <div style={{ marginLeft:'auto' }}>
            <button
              className="btn-primary small"
              style={{ padding:'4px 10px', fontSize:'12px' }}
              onClick={openAddExperience}
            >Add Experience</button>
          </div>
        )}
      </div>
      {expError && <div style={{ color:'#b91c1c', fontSize:'12px', marginBottom:'8px' }}>{expError}</div>}
      {expLoading ? (
        <div style={{ fontSize:'13px' }}>Loading...</div>
      ) : experiences.length === 0 ? (
        <div style={{ fontSize:'13px', color:'#666' }}>No experiences found.</div>
      ) : (
        <table style={{ width:'100%', borderCollapse: 'collapse', fontSize:'12px' }}>
          <thead>
            <tr style={{ background:'#f5f5f5' }}>
              {/* CHANGED: column order */}
              <th style={{ textAlign:'left', padding:'6px', border:'1px solid #ddd' }}>Work Nature</th>
              <th style={{ textAlign:'left', padding:'6px', border:'1px solid #ddd' }}>Firm Name</th>
              <th style={{ textAlign:'left', padding:'6px', border:'1px solid #ddd' }}>Duration</th>
              <th style={{ textAlign:'left', padding:'6px', border:'1px solid #ddd' }}>Document Type</th>
              <th style={{ textAlign:'left', padding:'6px', border:'1px solid #ddd' }}>Uploaded Document</th>
              <th style={{ textAlign:'left', padding:'6px', border:'1px solid #ddd' }}>Created At</th>
              <th style={{ textAlign:'left', padding:'6px', border:'1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {experiences.map(exp => {
              const durationLabel =
                exp.work_duration
                  ? `${exp.work_duration}${exp.work_duration_frequency ? ` ${exp.work_duration_frequency}` : ''}`
                  : '-';

              return (
                <tr key={exp.id}>
                  {/* CHANGED: column order + combined duration */}
                  <td style={{ padding:'6px', border:'1px solid #eee' }}>
                    {workNatures.find(w => w.id === exp.work_nature_id)?.nature_english || '-'}
                  </td>
                  <td style={{ padding:'6px', border:'1px solid #eee' }}>{exp.previous_firm || '-'}</td>
                  <td style={{ padding:'6px', border:'1px solid #eee' }}>{durationLabel}</td>
                  <td style={{ padding:'6px', border:'1px solid #eee' }}>
                    {documents.find(d => d.id === exp.document_type_id)?.type_english || '-'}
                  </td>
                  <td style={{ padding:'6px', border:'1px solid #eee' }}>
                    {exp.experience_certificate
                      ? <a href={exp.experience_certificate} target="_blank" rel="noreferrer">View</a>
                      : '-'}
                  </td>

                  {/* NEW */}
                  <td style={{ padding:'6px', border:'1px solid #eee' }}>
                    {formatDateTime(exp.created_at)}
                  </td>

                  <td style={{ padding:'6px', border:'1px solid #eee' }}>
                    <button
                      className="btn-small btn-edit"
                      style={{ marginRight:'4px' }}
                      onClick={() => openEditExperience(exp)}
                      disabled={!perms.canManage}
                    >Edit</button>
                    {perms.canDelete && (
                      <button
                        className="btn-small btn-delete"
                        onClick={() => deleteExperience(exp.id)}
                      >Delete</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {showExpDialog && (
        <div style={{
          position:'fixed',
          inset:0,
          background:'rgba(0,0,0,0.45)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:2500
        }}>
          <div className="form-container" style={{
            width:'90%',
            maxWidth:'640px',
            maxHeight:'80vh',
            overflowY:'auto'
          }}>
            <div className="form-header">
              <h1>{editingExp ? 'Edit Experience' : 'Add Experience'}</h1>
              <button className="btn-close" onClick={() => setShowExpDialog(false)}>✕</button>
            </div>

            {/* NEW: resolve current exp for Created At display (edit mode only) */}
            {/*
              NOTE: keep this inside render to avoid extra state.
              experiences[] already exists in this component.
            */}
            {(() => {
              const currentExp = editingExp ? experiences.find((x) => x.id === editingExp) : null;

              return (
                <>
                  {expError && <div className="error-message">{expError}</div>}

                  <form className="master-form">
                    {/* CHANGED: order -> Work Nature */}
                    <div className="form-group">
                      <label htmlFor="work_nature_id">Work Nature</label>
                      <select
                        id="work_nature_id"
                        value={expForm.work_nature_id}
                        onChange={(e) => handleExpField('work_nature_id', e.target.value)}
                      >
                        <option value="">--</option>
                        {workNatures.map((w) => (
                          <option key={w.id} value={w.id}>{w.nature_english}</option>
                        ))}
                      </select>
                    </div>

                    {/* CHANGED: order -> Firm Name */}
                    <div className="form-group">
                      <label htmlFor="previous_firm">Firm Name *</label>
                      <input
                        id="previous_firm"
                        value={expForm.previous_firm}
                        onChange={(e) => handleExpField('previous_firm', e.target.value)}
                        placeholder="Company / Firm name"
                        required
                      />
                    </div>

                    {/* CHANGED: order -> Duration (value + freq) */}
                    <div className="form-group">
                      <label htmlFor="work_duration">Duration</label>
                      <input
                        id="work_duration"
                        type="number"
                        step="0.01"
                        value={expForm.work_duration}
                        onChange={(e) => handleExpField('work_duration', e.target.value)}
                        placeholder="e.g. 12"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="work_duration_frequency">Duration Freq</label>
                      <select
                        id="work_duration_frequency"
                        value={expForm.work_duration_frequency}
                        onChange={(e) => handleExpField('work_duration_frequency', e.target.value)}
                      >
                        <option value="">--</option>
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>

                    {/* CHANGED: order -> Document Type */}
                    <div className="form-group">
                      <label htmlFor="document_type_id">Document Type</label>
                      <select
                        id="document_type_id"
                        value={expForm.document_type_id}
                        onChange={(e) => handleExpField('document_type_id', e.target.value)}
                      >
                        <option value="">--</option>
                        {documents.map((d) => (
                          <option key={d.id} value={d.id}>{d.type_english}</option>
                        ))}
                      </select>
                    </div>

                    {/* existing certificate uploader block stays, but is now in the right position */}
                    <div className="form-group">
                      <label htmlFor="experience_certificate">Uploaded Document (Image/PDF)</label>
                      <div style={{ marginBottom:'8px' }}>
                        {expForm.experience_certificate ? (
                          <div style={{ position:'relative', display:'inline-block' }}>
                            <img
                              src={expForm.experience_certificate}
                              alt="Certificate"
                              style={{
                                maxWidth:'200px',
                                maxHeight:'200px',
                                borderRadius:'8px',
                                border:'1px solid #ddd',
                                objectFit:'cover'
                              }}
                            />
                            <button
                              type="button"
                              onClick={removeCertificate}
                              style={{
                                position:'absolute',
                                top:'4px',
                                right:'4px',
                                background:'rgba(255,0,0,0.7)',
                                color:'#fff',
                                border:'none',
                                borderRadius:'50%',
                                width:'24px',
                                height:'24px',
                                cursor:'pointer',
                                fontSize:'14px',
                                lineHeight:'1'
                              }}
                              title="Remove certificate"
                            >×</button>
                          </div>
                        ) : (
                          <div style={{
                            width:'200px', height:'200px',
                            border:'2px dashed #ddd',
                            borderRadius:'8px',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            fontSize:'14px',
                            color:'#999'
                          }}>No certificate uploaded</div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={uploadCertificate}
                        disabled={uploadingCert || !perms.canManage}
                      />
                      {uploadingCert && <small style={{ color:'#666', display:'block', marginTop:'4px' }}>Uploading...</small>}
                      <small style={{ color:'#666', display:'block', marginTop:'6px' }}>
                        JPG, PNG, GIF, PDF. Max 5MB.
                      </small>
                      {expForm.experience_certificate && (
                        <small style={{ color:'#28a745', display:'block', marginTop:'4px' }}>
                          Stored: {expForm.experience_certificate}
                        </small>
                      )}
                    </div>

                    {/* NEW: Created date/time (edit only), before actions */}
                    {editingExp ? (
                      <div className="form-group">
                        <label>Created At</label>
                        <div style={{ fontSize: '12px', color: '#334155' }}>
                          {formatDateTime(currentExp?.created_at)}
                        </div>
                      </div>
                    ) : null}

                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setShowExpDialog(false)}
                        disabled={uploadingCert}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={saveExperience}
                        disabled={uploadingCert || !perms.canManage}
                      >
                        {editingExp ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );

  const renderDocumentsTab = () => { // modified
    if (!employee) return null;
    const types = [
      { key:'resume', label:'Resume' },
      { key:'driving_license', label:'Driving License' },
      { key:'other', label:'Other Document' }
    ];
    const findDoc = (t) => employeeDocs.find(d => d.document_type === t); // changed
    return (
      <div>
        <h2 style={{ marginTop:0, fontSize:'16px' }}>Documents</h2>
        {error && <div style={{ color:'#b91c1c', fontSize:'12px', marginBottom:'8px' }}>{error}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'20px' }}>
          {types.map(d => {
            const doc = findDoc(d.key);
            const path = doc?.document_link; // changed
            const isImage = path && /\.(png|jpe?g|gif)$/i.test(path);
            return (
              <div key={d.key} style={{ border:'1px solid #ddd', borderRadius:'8px', padding:'12px', background:'#fafafa' }}>
                <strong style={{ fontSize:'13px' }}>{d.label}</strong>
                <div style={{ marginTop:'8px', minHeight:'140px', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', border:'1px dashed #ccc', borderRadius:'6px', position:'relative' }}>
                  {path ? (
                    isImage ? (
                      <img src={path} alt={d.label} style={{ maxWidth:'100%', maxHeight:'120px', objectFit:'cover', borderRadius:'4px' }} />
                    ) : (
                      <a href={path} target="_blank" rel="noreferrer" style={{ fontSize:'12px', color:'#2563eb' }}>
                        {doc?.document_name || 'View Document'} {/* changed */}
                      </a>
                    )
                  ) : (
                    <span style={{ fontSize:'11px', color:'#777' }}>No {d.label.toLowerCase()} uploaded</span>
                  )}
                  {doc && (
                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      title="Remove"
                      style={{
                        position:'absolute', top:'4px', right:'4px',
                        background:'rgba(220,38,38,0.85)', color:'#fff',
                        border:'none', borderRadius:'50%', width:'22px',
                        height:'22px', cursor:'pointer', fontSize:'12px', lineHeight:'1'
                      }}
                    >×</button>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  disabled={docUploading || !perms.canManage}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) uploadDocument(d.key, f);
                  }}
                  style={{ marginTop:'10px', width:'100%' }}
                />
                {path && (
                  <small style={{ display:'block', marginTop:'6px', fontSize:'11px', color:'#2563eb' }}>
                    {doc?.document_name} ({Math.round((doc.document_size||0)/1024)} KB)
                  </small>
                )}
              </div>
            );
          })}
        </div>
        {docUploading && <div style={{ marginTop:'12px', fontSize:'12px', color:'#555' }}>Uploading...</div>}
        {!perms.canManage && <div style={{ marginTop:'8px', fontSize:'12px', color:'#b91c1c' }}>You do not have permission to manage documents.</div>}
      </div>
    );
  };

  const renderApplicationsTab = () => {
    const tabList = ['Sent', 'Received'];
    const sentCount = applications.sent?.length || 0;
    const receivedCount = applications.received?.length || 0;
    const rows = appTab === 'Sent' ? applications.sent : applications.received;

    return (
      <div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          {tabList.map(tab => {
            const count = tab === 'Sent' ? sentCount : receivedCount;
            return (
              <button
                key={tab}
                className={`tab-btn ${appTab === tab ? 'active' : ''}`}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  border: '1px solid #ccc',
                  background: appTab === tab ? '#2563eb' : '#fff',
                  color: appTab === tab ? '#fff' : '#333',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => setAppTab(tab)}
              >
                {tab} <span>({count})</span>
              </button>
            );
          })}
        </div>
        {appError && <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{appError}</div>}
        {appLoading ? (
          <div style={{ fontSize: '13px' }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#666' }}>No {appTab.toLowerCase()} applications found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Organization</th>

                {/* NEW */}
                {perms.canShowEmployerPhoneAddress && (
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer Phone</th>
                )}

                {perms.canShowEmployerPhoneAddress && (
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>State</th>
                )}
                {perms.canShowEmployerPhoneAddress && (
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>City</th>
                )}
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Salary</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Vacancy Left</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Hired</th>

                {/* REMOVED: OTP */}

                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>
                  {appTab === 'Sent' ? 'Applied Time' : 'Received Time'}
                </th>

                {/* NEW */}
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employee KYC</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Status</th>

                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    <Link to={`/jobs/${row.job_id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                      {row.job_profile || '-'}
                    </Link>
                  </td>

                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    <Link to={`/employers/${row.employer_id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                      {row.employer_name || '-'}
                    </Link>
                  </td>

                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.organization_name || '-'}</td>

                  {/* NEW */}
                  {perms.canShowEmployerPhoneAddress && (
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.employer_phone || '-'}</td>
                  )}

                  {perms.canShowEmployerPhoneAddress && (
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.job_state || '-'}</td>
                  )}
                  {perms.canShowEmployerPhoneAddress && (
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.job_city || '-'}</td>
                  )}

                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {row.salary_min && row.salary_max ? `${row.salary_min} - ${row.salary_max}` : '-'}
                  </td>

                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.vacancy_left ?? '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.hired_total ?? '-'}</td>

                  {/* REMOVED: OTP cell */}

                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {formatDateTime(appTab === 'Sent' ? row.applied_at : row.received_at)}
                  </td>

                  {/* NEW */}
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {renderStatusBadge(row.employee_kyc_status)}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {renderJobStatusChip(row.job_status)}
                  </td>

                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderHiredJobsTab = () => {
    return (
      <div>
        <h2 style={{ marginTop: 0, fontSize: '16px' }}>Hired Jobs</h2>
        {hiredError && (
          <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{hiredError}</div>
        )}
        {hiredLoading ? (
          <div style={{ fontSize: '13px' }}>Loading...</div>
        ) : hiredJobs.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#666' }}>No hired jobs found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job Status</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer</th>
                {perms.canShowEmployerPhoneAddress && (
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer Phone</th>
                )}
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer KYC</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Organization</th>
                {perms.canShowEmployerPhoneAddress && (
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>State</th>
                )}
                {perms.canShowEmployerPhoneAddress && (
                  <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>City</th>
                )}
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Salary</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Vacancy Left</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Hired</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>OTP</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>
                  Hired Time
                </th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {hiredJobs.map(row => (
                <tr key={row.id}>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    <Link
                      to={`/jobs/${row.job_id}`}
                      style={{
                        color: '#2563eb',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 'inherit',
                        background: 'none',
                        border: 'none'
                      }}
                    >
                      {row.job_profile || '-'}
                    </Link>
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{renderJobStatusChip(row.job_status)}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    <Link
                      to={`/employers/${row.employer_id}`}
                      style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {row.employer_name || '-'}
                    </Link>
                  </td>
                  {perms.canShowEmployerPhoneAddress && (
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.employer_phone || '-'}</td>
                  )}
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.employer_kyc_status || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.organization_name || '-'}</td>
                  {perms.canShowEmployerPhoneAddress && (
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.job_state || '-'}</td>
                  )}
                  {perms.canShowEmployerPhoneAddress && (
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.job_city || '-'}</td>
                  )}
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {row.salary_min && row.salary_max
                      ? `${row.salary_min} - ${row.salary_max}`
                      : '-'}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.vacancy_left ?? '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.hired_total ?? '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.otp || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {formatDateTime(row.hired_at)}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {row.status}
                  </td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderWishlistTab = () => (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Wishlist</h2>
      {wishlistError && (
        <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{wishlistError}</div>
      )}
      {wishlistLoading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : wishlist.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No wishlist jobs found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer</th>
              {perms.canShowEmployerPhoneAddress && (
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>State</th>
              )}
              {perms.canShowEmployerPhoneAddress && (
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>City</th>
              )}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Timing</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Salary</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Vacancy Left</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {wishlist.map(row => (
              <tr key={row.id}>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  <Link
                    to={`/jobs/${row.job_id}`}
                    style={{
                      color: '#2563eb',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 'inherit',
                      background: 'none',
                      border: 'none'
                    }}
                  >
                    {row.job_profile || '-'}
                  </Link>
                </td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  <Link
                    to={`/employers/${row.employer_id}`}
                    style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {row.employer_name || '-'}
                  </Link>
                </td>
                {perms.canShowEmployerPhoneAddress && (
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.job_state || '-'}</td>
                )}
                {perms.canShowEmployerPhoneAddress && (
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.job_city || '-'}</td>
                )}
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  {row.work_start_time && row.work_end_time
                    ? `${row.work_start_time} - ${row.work_end_time}`
                    : '-'}
                </td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  {row.salary_min && row.salary_max
                    ? `${row.salary_min} - ${row.salary_max}`
                    : '-'}
                </td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.vacancy_left ?? '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderCreditHistoryTab = () => {
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
          {creditHistoryError && (
            <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{creditHistoryError}</div>
          )}
          {creditHistoryLoading ? (
            <div style={{ fontSize: '13px' }}>Loading...</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr style={{ background:'#f5f5f5' }}>
                  <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Employer Name</th>
                  <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Verification</th>
                  <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>KYC</th>
                  {perms.canShowEmployerPhoneAddress && (
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
                      {(row.employer_id && row.employer_name) ? (
                        <Link
                          to={`/employers/${row.employer_id}`}
                          style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {row.employer_name}
                        </Link>
                      ) : (row.employer_name || '-')}
                    </td>
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{row.verification_status}</td>
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{row.kyc_status}</td>
                    {perms.canShowEmployerPhoneAddress && (
                      <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{row.mobile || '-'}</td>
                    )}
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{row.call_experience}</td>
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{formatDateTime(row.date)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={perms.canShowEmployerPhoneAddress ? 6 : 5} style={{ padding:'8px', textAlign: 'left' }}>No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      );
    }
    if (creditHistoryTab === 'interest') {
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

          {creditHistoryError && (
            <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{creditHistoryError}</div>
          )}

          {creditHistoryLoading ? (
            <div style={{ fontSize: '13px' }}>Loading...</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr style={{ background:'#f5f5f5' }}>
                  <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Job Profile</th>
                  <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Employer Name</th>
                  <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Organization</th>
                  {perms.canShowEmployerPhoneAddress && (
                    <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Employer Mobile</th>
                  )}
                  <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Job Status</th>
                  <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Interest Status</th>
                  <th style={{ padding:'6px', border:'1px solid #ddd', textAlign: 'left' }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>
                      {row.job_id ? (
                        <Link
                          to={`/jobs/${row.job_id}`}
                          style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {row.job_profile || '-'}
                        </Link>
                      ) : (row.job_profile || '-')}
                    </td>
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>
                      {(row.employer_id && row.employer_name) ? (
                        <Link
                          to={`/employers/${row.employer_id}`}
                          style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {row.employer_name}
                        </Link>
                      ) : (row.employer_name || '-')}
                    </td>
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{row.organization_name || '-'}</td>
                    {perms.canShowEmployerPhoneAddress && (
                      <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{row.employer_mobile || row.employer_phone || '-'}</td>
                    )}
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{renderJobStatusChip(row.job_status)}</td>
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{renderInterestStatusChip(row.job_interest_status || row.interest_status || row.status)}</td>
                    <td style={{ padding:'6px', border:'1px solid #eee', textAlign: 'left' }}>{formatDateTime(row.created_at || row.date)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={perms.canShowEmployerPhoneAddress ? 7 : 6} style={{ padding:'8px', textAlign: 'left' }}>No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      );
    }

    if (creditHistoryTab === 'admin') {
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
    }
    return null;
  };

  const renderSubscriptionHistoryTab = () => (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Subscription History</h2>
      {paymentError && (
        <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{paymentError}</div>
      )}
      {paymentLoading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : paymentHistory.length === 0 ? (
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
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Started At</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Expires At</th>
            </tr>
          </thead>
          <tbody>
            {paymentHistory.map(row => (
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
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(row.updated_at)}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(row.expiry_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderVoilationReportsTab = () => (
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
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer Name</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer Status</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Reason</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Date/Time</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {voilationReports.map(r => {
              // For employee reports: user_id is the employer who reported, reporter_entity is Employer
              const employer = r.reporter_entity;
              const employerId = employer?.id;
              const employerName = employer?.name || '-';
              const reason = r.reason?.reason_english || '-';
              return (
                <tr key={r.id}>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {employerId ? (
                      <Link
                        to={`/employers/${employerId}`}
                        style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {employerName}
                      </Link>
                    ) : employerName}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    {employer?.User && employer.User.is_active !== undefined && employer.User.is_active !== null
                      ? renderActiveBadge(employer.User.is_active)
                      : '-'}
                  </td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{reason}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.description || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(r.created_at)}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    <button
                      className="btn-small"
                      disabled={!perms.canManage || !!r.read_at}
                      onClick={() => handleMarkReportAsRead(r.id)}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        background: r.read_at ? '#9ca3af' : '#16a34a',
                        color: '#fff',
                        cursor: !perms.canManage || r.read_at ? 'not-allowed' : 'pointer',
                        opacity: !perms.canManage || r.read_at ? 0.6 : 1
                      }}
                    >
                      {r.read_at ? 'Read' : 'Mark as Read'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderCallExperiencesTab = () => (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Call Experiences</h2>
      {callExpError && (
        <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{callExpError}</div>
      )}
      {callExpLoading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : callExperiences.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No call experiences found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Job</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Call Experience</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Review</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Date/Time</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {callExperiences.map(r => (
              <tr key={r.id}>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  {r.employer_id ? (
                    <Link
                      to={`/employers/${r.employer_id}`}
                      style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {r.employer_name || '-'}
                    </Link>
                  ) : (r.employer_name || '-')}
                </td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  {r.job_id ? (
                    <Link
                      to={`/jobs/${r.job_id}`}
                      style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {r.job_name || '-'}
                    </Link>
                  ) : (r.job_name || '-')}
                </td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.call_experience || '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.review || '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(r.created_at)}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  <button
                    className="btn-small"
                    disabled={!!r.read_at}
                    onClick={() => handleMarkCallHistoryRead(r.id)}
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      background: r.read_at ? '#9ca3af' : '#16a34a',
                      color: '#fff',
                      cursor: r.read_at ? 'not-allowed' : 'pointer',
                      opacity: r.read_at ? 0.6 : 1
                    }}
                  >
                    {r.read_at ? 'Read' : 'Mark as Read'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderCallReviewsTab = () => ( // NEW
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Call Reviews</h2>
      {callReviewsError && (
        <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{callReviewsError}</div>
      )}
      {callReviewsLoading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : callReviews.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No call reviews found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employer</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Call Experience</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Review</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Date/Time</th>
            </tr>
          </thead>
          <tbody>
            {callReviews.map(r => (
              <tr key={r.id}>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>
                  {r.employer_id ? (
                    <Link to={`/employers/${r.employer_id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                      {r.employer_name || '-'}
                    </Link>
                  ) : (r.employer_name || '-')}
                </td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.call_experience || '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.review || '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const fetchReferralsForEmployee = async () => {
    if (!employee) return;
    setReferralsLoading(true);
    setReferralsError(null);
    try {
      const res = await employeesApi.getEmployeeReferrals(employee.id);
      setReferrals(res.data?.data || []);
    } catch (e) {
      setReferralsError(e.response?.data?.message || 'Failed to load referrals');
      setReferrals([]);
    } finally {
      setReferralsLoading(false);
    }
  };

  const renderReferralNameCell = (name, route) => (
    route ? (
      <button type="button" style={referralLinkButtonStyle} onClick={(event) => { event.stopPropagation(); navigate(route); }}>
        {name || '-'}
      </button>
    ) : (
      <span>{name || '-'}</span>
    )
  );

  const renderReferralsTab = () => {
    if (!employee) {
      return <div style={{ fontSize: '13px', color: '#666' }}>Employee data not loaded yet.</div>;
    }
    return (
      <div>
        {referralsError && (
          <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{referralsError}</div>
        )}
        {referralsLoading ? (
          <div style={{ fontSize: '13px' }}>Loading...</div>
        ) : referrals.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#666' }}>No referrals found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Phone</th>          {/* NEW */}
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>User Type</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Contact Credit</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Interest Credit</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => {
                const targetType =
                  (referral.user_type || referral.user_entity_type || referral.user_user_type || '').toString().toLowerCase();
                const targetId = referral.user_entity_id || referral.user_id;
                const userRoute = getReferralDetailRoute(targetType, targetId);
                const userName = referral.user_name || referral.User?.name || '-';
                const canShowTargetPhone = targetType.includes('employer') ? perms.canShowEmployerPhoneAddress : perms.canShowPhoneAddress;
                return (
                  <tr key={referral.id}>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{referral.id}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>
                      {renderReferralNameCell(userName, userRoute)}
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{canShowTargetPhone ? (referral.user_mobile || '-') : '-'}</td>  {/* NEW */}
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{referral.user_type || '-'}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{referral.contact_credit || 0}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{referral.interest_credit || 0}</td>
                    <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(referral.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Basic details': return renderBasicDetails();
      case 'Job profiles': return renderJobProfilesTab();
      case 'Experiences': return renderExperiencesTab();
      case 'Documents': return renderDocumentsTab();
      case 'Recommended Jobs':
        if (typeof RecommendedJobsTab !== 'function') {
          return (
            <div style={{ color: '#b91c1c', fontSize: '13px' }}>
              Recommended Jobs tab failed to load.
            </div>
          );
        }
        return <RecommendedJobsTab employeeId={employee?.id} perms={perms} />;
      case 'Applications': return renderApplicationsTab();
      case 'Hired jobs': return renderHiredJobsTab();
      case 'Wishlist': return renderWishlistTab();
      case 'Credit history': return renderCreditHistoryTab();
      case 'Subscription history': return renderSubscriptionHistoryTab();
      case 'Call experiences': return renderCallExperiencesTab();
      case 'Call review by employer': return renderCallReviewsTab();
      case 'Referrals': return renderReferralsTab();
      case 'Voilation report by employer': return renderVoilationReportsTab();
      case 'Voilations reported':
        return renderVoilationsReportedTab();
      default: return null;
    }
  };

  const onEditSuccess = (msg) => {
    msg && console.log('[EmployeeDetail] edit success:', msg);
    setShowEditForm(false);
    fetchEmployee();
  };

  if (loading) return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">Loading...</div>
        </main>
      </div>
    </div>
  );

  if (!perms.canView) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} />
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

  // CHANGED: was React.useMemo(...) (hook); now plain computation (no hook)
  const employeeHeadingSuffix = getEmployeeHeadingSuffix(employee, perms.canShowPhoneAddress);

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {notice && (
              <div className={`inline-message ${notice.type === 'error' ? 'error' : 'success'}`}>
                {notice.text}
                <button className="msg-close" onClick={() => setNotice(null)}>✕</button>
              </div>
            )}
            {/* Render JobDetail in a panel/dialog style like EmployeeForm */}
            {viewJobId && (
              <div
                className="form-container"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.35)',
                  zIndex: 3000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '10px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    width: '96vw',
                    maxWidth: '1200px',
                    maxHeight: '96vh',
                    overflow: 'auto',
                    position: 'relative',
                    padding: 0
                  }}
                >
                  {typeof JobDetail === 'function' ? (
                    <JobDetail
                      jobId={viewJobId}
                      onClose={() => setViewJobId(null)}
                      onEdit={() => setViewJobId(null)}
                    />
                  ) : (
                    <div style={{ padding: 16, color: '#b91c1c', fontSize: '13px' }}>
                      Job detail failed to load.
                    </div>
                  )}
                  <button
                    className="btn-close"
                    onClick={() => setViewJobId(null)}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 16,
                      background: 'rgba(0,0,0,0.08)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      fontSize: 20,
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                    title="Close"
                  >✕</button>
                </div>
              </div>
            )}
            {/* ...existing employee detail UI... */}
            {!viewJobId && (
              <>
                <div className="list-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  {!showEditForm && <h1 style={{ margin: 0 }}>Employee Detail
                    {employeeHeadingSuffix ? (
                      <span style={{ marginLeft: 10, fontSize: '0.95em', fontWeight: 600, color: '#475569' }}>
                        {employeeHeadingSuffix}
                      </span>
                    ) : null}
                  </h1>}
                  {!showEditForm && (
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <button
                        className="btn-secondary small"
                        onClick={() => navigate(-1)}
                        style={{ padding:'4px 10px' }}
                      >
                        Back
                      </button>
                      {employee && perms.canManage && (
                        <button
                          className="btn-primary small"
                          onClick={() => setShowEditForm(true)}
                          style={{ padding:'4px 10px' }}
                        >
                          Edit
                        </button>
                      )}
                      {employee && (
                        <div ref={actionMenuRef} style={{ position:'relative' }}>
                          <button
                            className="btn-secondary small"
                            style={{ padding:'4px 10px' }}
                            onClick={() => setActionMenuOpen(v => !v)}
                            disabled={actionLoading}
                            title="Actions"
                          >
                            ⋮
                          </button>
                          {actionMenuOpen && (
                            <div
                              style={{
                                position:'absolute',
                                right:0,
                                top:'calc(100% + 4px)',
                                background:'#fff',
                                border:'1px solid #ddd',
                                borderRadius:'6px',
                                boxShadow:'0 6px 18px rgba(0,0,0,0.12)',
                                minWidth:'160px',
                                zIndex:10
                              }}
                            >
                              {(() => {
                                const opts = [];
                                if (employee?.User && perms.canStatusToggle) {
                                  if (employee.User.is_active) {
                                    opts.push({ key:'deactivate', label:'Deactivate' });
                                  } else {
                                    opts.push({ key:'activate', label:'Activate' });
                                  }
                                }
                                const vStatus = (employee?.verification_status || '').toString().toLowerCase();
                                if (perms.canVerify) {
                                  if (vStatus === 'pending') {
                                    opts.push({ key:'approve', label:'Approve' });
                                    opts.push({ key:'reject', label:'Reject' });
                                  } else if (vStatus === 'verified') {
                                    opts.push({ key:'reject', label:'Reject Verification' });
                                  } else if (vStatus === 'rejected') {
                                    opts.push({ key:'approve', label:'Approve Verification' });
                                  }
                                }

                                const kStatus = (employee?.kyc_status || '').toString().toLowerCase();
                                if (perms.canGrantKyc) {
                                  if (kStatus === 'pending') {
                                    opts.push({ key:'grantKyc', label:'Grant KYC' });
                                    opts.push({ key:'rejectKyc', label:'Reject KYC' });
                                  } else if (kStatus === 'verified') {
                                    opts.push({ key:'rejectKyc', label:'Reject KYC' });
                                  } else if (kStatus === 'rejected') {
                                    opts.push({ key:'grantKyc', label:'Grant KYC' });
                                  }
                                }
                                if (employee && perms.canChangeSubscription) {
                                  opts.push({ key:'changeSubscription', label:'Change Subscription' });
                                }
                                if (employee && perms.canAddCredit) {
                                  opts.push({ key:'addCredits', label:'Add Credits' });
                                }
                                opts.push({ key:'shareEmployee', label:'Share Employee' }); // add
                                return opts.length ? opts : [{ key:'none', label:'No actions', disabled:true }];
                              })().map(opt => (
                                 <button
                                   key={opt.key}
                                   disabled={opt.disabled || actionLoading}
                                   onClick={() => !opt.disabled && handleMenuSelection(opt.key)}
                                   style={{
                                     width:'100%',
                                     textAlign:'left',
                                     padding:'8px 12px',
                                     background:'transparent',
                                     border:'none',
                                     fontSize:'12px',
                                     cursor: opt.disabled ? 'not-allowed' : 'pointer'
                                   }}
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
                {error && (
                  <div className="inline-message error">
                    {error}
                    <button className="msg-close" onClick={() => setError(null)}>✕</button>
                  </div>
                )}
                {!employee ? (
                  <div style={{ padding:'12px', fontSize:'13px' }}>Employee not found.</div>
                ) : showEditForm ? (
                  <EmployeeForm
                    employeeId={employee.id}
                    onClose={() => setShowEditForm(false)}
                    onSuccess={onEditSuccess}
                  />
                ) : (
                  <>
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
                            borderRadius: '4px',
                            cursor:'pointer'
                          }}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="tab-content" style={{ background:'#fff', border:'1px solid #ddd', borderRadius:'6px', padding:'16px' }}>
                      {renderTabContent()}
                    </div>                  </>
                )}
              </>
            )}
            {showChangeSubscriptionDialog && perms.canChangeSubscription && (
              <div className="form-container" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:3100, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:'90%', maxWidth:'500px', background:'#fff', borderRadius:'8px', padding:'20px' }}>
                  <h2 style={{ marginTop:0 }}>Change Subscription</h2>
                  {changeSubError && <div className="error-message">{changeSubError}</div>}
                  <div className="form-group">
                    <label>Subscription Plan</label>
                    <select
                      value={selectedPlanId}
                      onChange={e => setSelectedPlanId(e.target.value)}
                      disabled={plansLoading || changeSubSaving}
                    >
                      <option value="">-- Select --</option>
                      {subscriptionPlans.map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.plan_name_english} ({plan.contact_credits} contact / {plan.interest_credits} interest)
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedPlanId && (
                    <div style={{ fontSize:'13px', marginBottom:'12px', lineHeight:1.5 }}>
                      {(() => {
                        const plan = subscriptionPlans.find(p => String(p.id) === String(selectedPlanId));
                        if (!plan) return null;
                        const validityDays = Number(plan.plan_validity_days) || 0;
                        const expiryDate = validityDays ? formatDateTime(new Date(Date.now() + validityDays * 86400000)) : '-';
                        return (
                          <>
                            <div><strong>Contact Credits:</strong> {plan.contact_credits}</div>
                            <div><strong>Interest Credits:</strong> {plan.interest_credits}</div>
                            <div><strong>Expiry:</strong> {expiryDate}</div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowChangeSubscriptionDialog(false)} disabled={changeSubSaving}>Cancel</button>
                    <button className="btn-primary" onClick={handleChangeSubscriptionSave} disabled={changeSubSaving}>
                      {changeSubSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showAddCreditsDialog && perms.canAddCredit && (
              <div className="form-container" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:3200, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:'90%', maxWidth:'420px', background:'#fff', borderRadius:'8px', padding:'20px' }}>
                  <h2 style={{ marginTop:0 }}>Add Credits</h2>
                  {addCreditsError && <div className="error-message">{addCreditsError}</div>}
                  <div className="form-group">
                    <label>Contact Credits</label>
                    <input
                      type="number"
                      min="0"
                      value={addCreditsForm.contact}
                      onChange={e => setAddCreditsForm(f => ({ ...f, contact: e.target.value }))}
                      placeholder="0"
                      disabled={addCreditsSaving}
                    />
                  </div>
                  <div className="form-group">
                    <label>Interest Credits</label>
                    <input
                      type="number"
                      min="0"
                      value={addCreditsForm.interest}
                      onChange={e => setAddCreditsForm(f => ({ ...f, interest: e.target.value }))}
                      placeholder="0"
                      disabled={addCreditsSaving}
                    />
                  </div>
                  <div className="form-group">
                    <label>Credit Expiry Date</label>
                    <input
                      type="date"
                      value={addCreditsForm.expiry}
                      onChange={e => setAddCreditsForm(f => ({ ...f, expiry: e.target.value }))}
                      disabled={addCreditsSaving}
                    />
                    <small style={{ display:'block', color:'#6b7280', marginTop:'4px' }}>
                      Leave blank to keep current expiry ({employee?.credit_expiry_at ? employee.credit_expiry_at.split('T')[0] : 'none'}).
                    </small>
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
        </main>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  const isNode = React.isValidElement(value);
  const displayValue = isNode
    ? value
    : (value !== undefined && value !== null && value !== '' ? value : '-');
  return (
    <div style={{ fontSize:'12px', lineHeight:'1.4', background:'#f9f9f9', padding:'8px', borderRadius:'4px', border:'1px solid #eee' }}>
      <div style={{ fontWeight:600 }}>{label}</div>
      <div style={{ color:'#333' }}>{displayValue}</div>
    </div>
  );
}