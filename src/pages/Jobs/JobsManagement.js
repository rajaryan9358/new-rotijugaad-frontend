import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import experiencesApi from '../../api/masters/experiencesApi';
import qualificationsApi from '../../api/masters/qualificationsApi';
import shiftsApi from '../../api/masters/shiftsApi';
import skillsApi from '../../api/masters/skillsApi';
import jobProfilesApi from '../../api/masters/jobProfilesApi';
import jobBenefitsApi from '../../api/masters/jobBenefitsApi';
import '../Masters/MasterPage.css';
import JobForm from '../../components/Forms/JobForm';
import jobApi from '../../api/jobApi';
import JobDetail from './JobDetail'; // (to be created below)
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import LogsAction from '../../components/LogsAction';
import logsApi from '../../api/logsApi';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'any', label: 'Any' }
];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'expired', label: 'Expired' } // NEW
];
const JOB_RECENCY_OPTIONS = [
  { value: 'all', label: 'All Jobs' },
  { value: 'new', label: 'New Jobs (Last 48h)' }
];

// NEW
const VERIFICATION_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

function SingleSelect({
  label,
  options,
  value,
  onChange,
  optionLabel = 'label',
  optionValue = 'value',
  placeholder = 'Any',
  disabled = false // NEW
}) {
  const normalizedValue = value === undefined || value === null ? '' : String(value);
  return (
    <div style={{ minWidth: 200 }}>
      <label style={{ display:'block', fontSize:'12px', fontWeight:600, marginBottom:4 }}>{label}</label>
      <select
        className="state-filter-select"
        value={normalizedValue}
        onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value)}
        style={{ width:'100%' }}
        disabled={disabled} // NEW
      >
        <option value="">{placeholder}</option>
        {(options || []).map(opt => {
          const raw = opt[optionValue];
          if (raw === undefined || raw === null) return null;
          const renderedValue = String(raw);
          return (
            <option key={renderedValue} value={renderedValue}>
              {opt[optionLabel] || raw}
            </option>
          );
        })}
      </select>
    </div>
  );
}

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
const buildExportFilename = () => {
  const pad = (n)=>String(n).padStart(2,'0');
  const now = new Date();
  let hours = now.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `jobs_${pad(now.getDate())}-${pad(now.getMonth()+1)}-${now.getFullYear()}_${pad(hours)}_${pad(now.getMinutes())}_${pad(now.getSeconds())}_${suffix}_.csv`;
};

export default function JobsManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // Filters
  const [filters, setFilters] = useState({
    gender: '',
    experience: '',
    qualification: '',
    shift: '',
    skill: '',
    job_profile: '',
    job_benefit: '',
    status: '',
    job_recency: 'all',

    // NEW
    verification_status: '',
    job_state_id: '',
    job_city_id: '',
    created_from: '',
    created_to: '',
  });

  const [draftFilters, setDraftFilters] = useState({ ...filters });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [options, setOptions] = useState({
    experiences: [],
    qualifications: [],
    shifts: [],
    skills: [],
    job_profiles: [],
    job_benefits: [],
    employers: [],
    states: [],
    cities: [],
  });
  const [message, setMessage] = useState(null);
  const [showJobFormPanel, setShowJobFormPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editJobId, setEditJobId] = useState(null);
  const [viewJobId, setViewJobId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [cloneJobId, setCloneJobId] = useState(null);
  const activeFilterCount = React.useMemo(
    () => Object.entries(filters).reduce((sum, [key, val]) => {
      if (!val) return sum;
      if (key === 'job_recency' && val === 'all') return sum;
      return sum + 1;
    }, 0),
    [filters]
  );
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [queryHydrated, setQueryHydrated] = useState(false);
  const [appliedQuerySignature, setAppliedQuerySignature] = useState('');

  const jobPerms = React.useMemo(() => ({
    canView: hasPermission(PERMISSIONS.JOBS_VIEW),
    canManage: hasPermission(PERMISSIONS.JOBS_MANAGE),
    canDelete: hasPermission(PERMISSIONS.JOBS_DELETE),
    canStatusToggle: hasPermission(PERMISSIONS.JOBS_STATUS_TOGGLE),
    canRepost: hasPermission(PERMISSIONS.JOBS_REPOST),
    canExport: hasPermission(PERMISSIONS.JOBS_EXPORT)
  }), []);

  const normalizedStatusFromQuery = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const status = (params.get('status') || '').trim().toLowerCase();
    return ['active', 'inactive', 'expired'].includes(status) ? status : '';
  }, [location.search]);

  const normalizedRecencyFromQuery = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const recency = (params.get('recency') || '').trim().toLowerCase();
    return recency === 'new' ? 'new' : 'all';
  }, [location.search]);

  // NEW: verification_status from query
  const normalizedVerificationFromQuery = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    const vs = (params.get('verification_status') || '').trim().toLowerCase();
    return ['pending', 'approved', 'rejected'].includes(vs) ? vs : '';
  }, [location.search]);

  const querySignature = React.useMemo(
    () => JSON.stringify({
      status: normalizedStatusFromQuery,
      job_recency: normalizedRecencyFromQuery,
      verification_status: normalizedVerificationFromQuery // NEW
    }),
    [normalizedStatusFromQuery, normalizedRecencyFromQuery, normalizedVerificationFromQuery]
  );

  const buildQueryParams = React.useCallback((overrides = {}) => {
    const params = {
      page: overrides.page ?? currentPage,
      limit: overrides.limit ?? pageSize,
      sortField,
      sortDir,
      search: searchTerm.trim() || undefined
    };
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params[key] = value;
    });
    return params;
  }, [currentPage, pageSize, sortField, sortDir, searchTerm, filters]);

  const fetchRows = React.useCallback(async (overrides = {}) => {
    setLoading(true);
    try {
      const params = { ...buildQueryParams(overrides) };
      const res = await jobApi.getAll(params);
      const payload = res.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const meta = payload.meta || {};
      const totalPagesFromMeta = meta.totalPages ?? 1;
      if (!params.all && totalPagesFromMeta && currentPage > totalPagesFromMeta) {
        setCurrentPage(totalPagesFromMeta);
        return;
      }
      setRows(rows);
      setTotalCount(meta.total ?? rows.length);
      setTotalPages(totalPagesFromMeta);
    } catch (e) {
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
      setMessage({ type: 'error', text: 'Failed to load jobs' });
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, currentPage]);

  useEffect(() => {
    if (appliedQuerySignature === querySignature) {
      if (!queryHydrated) setQueryHydrated(true);
      return;
    }

    let shouldResetPage = false;
    setFilters(prev => {
      const next = { ...prev };
      let changed = false;

      if (prev.status !== normalizedStatusFromQuery) {
        next.status = normalizedStatusFromQuery;
        changed = true;
      }
      if (prev.job_recency !== normalizedRecencyFromQuery) {
        next.job_recency = normalizedRecencyFromQuery;
        changed = true;
      }

      // NEW
      if (prev.verification_status !== normalizedVerificationFromQuery) {
        next.verification_status = normalizedVerificationFromQuery;
        changed = true;
      }

      if (changed) shouldResetPage = true;
      return changed ? next : prev;
    });

    setDraftFilters(prev => ({
      ...prev,
      status: normalizedStatusFromQuery,
      job_recency: normalizedRecencyFromQuery,
      verification_status: normalizedVerificationFromQuery // NEW
    }));

    if (shouldResetPage) setCurrentPage(1);
    setAppliedQuerySignature(querySignature);
    setQueryHydrated(true);
  }, [
    querySignature,
    normalizedStatusFromQuery,
    normalizedRecencyFromQuery,
    normalizedVerificationFromQuery, // NEW
    appliedQuerySignature,
    queryHydrated
  ]);

  useEffect(() => { fetchOptions(); }, []);
  useEffect(() => {
    if (!queryHydrated) return;
    fetchRows();
  }, [fetchRows, queryHydrated]);
  useEffect(() => {
    const { cloneJobId: stateCloneId, editJobId: stateEditId } = location.state || {};
    if (stateEditId) {
      if (!jobPerms.canManage) {
        setMessage({ type: 'error', text: 'You do not have permission to edit jobs.' });
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }
      setEditJobId(stateEditId);
      setCloneJobId(null);
      setShowJobFormPanel(true);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    if (stateCloneId) {
      if (!(jobPerms.canManage || jobPerms.canRepost)) {
        setMessage({ type: 'error', text: 'You do not have permission to repost jobs.' });
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }
      setCloneJobId(stateCloneId);
      setEditJobId(null);
      setShowJobFormPanel(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate, jobPerms.canManage, jobPerms.canRepost]);

  const fetchOptions = async () => {
    try {
      const [
        experiencesRes,
        qualificationsRes,
        shiftsRes,
        skillsRes,
        jobProfilesRes,
        jobBenefitsRes,
        employersRes,
        statesRes,
        citiesRes
      ] = await Promise.all([
        experiencesApi.getAll(),
        qualificationsApi.getAll(),
        shiftsApi.getAll(),
        skillsApi.getAll(),
        jobProfilesApi.getAll(),
        jobBenefitsApi.getAll(),
        jobApi.getEmployers({ limit: 100 }),
        jobApi.getStates(),
        jobApi.getCities(),
      ]);
      setOptions({
        experiences: experiencesRes.data?.data || [],
        qualifications: qualificationsRes.data?.data || [],
        shifts: shiftsRes.data?.data || [],
        skills: skillsRes.data?.data || [],
        job_profiles: jobProfilesRes.data?.data || [],
        job_benefits: jobBenefitsRes.data?.data || [],
        employers: employersRes.data?.data || [],
        states: statesRes.data?.data || [],
        cities: citiesRes.data?.data || [],
      });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load filter options' });
    }
  };

  const toggleFilterPanel = () => {
    if (showFilterPanel) return setShowFilterPanel(false);
    setDraftFilters({ ...filters });
    setShowFilterPanel(true);
  };

  const applyDraftFilters = () => {
    setFilters({ ...draftFilters });
    setCurrentPage(1);
    setShowFilterPanel(false);

    try {
      const active = Object.entries(draftFilters || {})
        .filter(([k, v]) => Boolean(v) && !(k === 'job_recency' && v === 'all'))
        .map(([k, v]) => `${k}=${v}`)
        .join(', ') || 'none';
      logsApi.create({
        category: 'jobs',
        type: 'update',
        redirect_to: '/jobs',
        log_text: `Applied job filters: ${active}`,
      });
    } catch (e) {
      // ignore logging failures
    }
  };

  const clearFilters = () => {
    const empty = {
      gender: '',
      experience: '',
      qualification: '',
      shift: '',
      skill: '',
      job_profile: '',
      job_benefit: '',
      status: '',
      job_recency: 'all',

      // NEW
      verification_status: '',
      job_state_id: '',
      job_city_id: '',
      created_from: '',
      created_to: '',
    };
    setFilters(empty);
    setDraftFilters(empty);
    setSortField('id');
    setSortDir('desc');
    setCurrentPage(1);
    setShowFilterPanel(false);

    try {
      logsApi.create({
        category: 'jobs',
        type: 'update',
        redirect_to: '/jobs',
        log_text: 'Cleared job filters',
      });
    } catch (e) {
      // ignore logging failures
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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

  const headerIndicator = (field) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const handlePageChange = (delta) => {
    setCurrentPage(p => Math.min(Math.max(1, p + delta), totalPages));
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const exportToCSV = async () => {
    if (!jobPerms.canExport) {
      setMessage({ type: 'error', text: 'You do not have permission to export jobs.' });
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
        const res = await jobApi.getAll({ ...baseParams, page });
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
      console.error('Export jobs error:', e);
      setMessage({ type: 'error', text: 'Failed to export jobs' });
      return;
    }

    if (!exportRows.length) {
      setMessage({ type: 'error', text: 'No jobs found for current filters.' });
      return;
    }

    const headers = [
      'ID','Employer','Employer Phone','Interviewer Contact','Shift Timing',
      'Job Profile','Household','Gender','Experience','Qualification','Shift','Skills','Benefits',
      'Vacancies','State','City','Salary','Status','Updated','Created'
    ];
    const escapeCell = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g,'""')}"` : str;
    };
    const rows = exportRows.map(job => [
      job.id,
      job.employer_name || job.employer_id || '',
      job.employer_phone || '',
      job.interviewer_contact || '',          // NEW
      job.shift_timing_display || '',         // NEW
      job.job_profile || '',
      job.is_household ? 'Yes' : 'No',
      job.genders || '',
      job.experiences || '',
      job.qualifications || '',
      job.shifts || '',
      job.skills || '',
      job.benefits || '',
      `${job.hired_total || 0}/${job.no_vacancy || 0}`,
      job.job_state || '',
      job.job_city || '',
      job.salary_min && job.salary_max ? `${job.salary_min}-${job.salary_max}` : (job.salary_min || job.salary_max || ''),
      job.status || '',
      formatExportDateTime(job.updated_at),
      formatExportDateTime(job.created_at)
    ]);
    const csv = [headers.map(escapeCell).join(','), ...rows.map(r => r.map(escapeCell).join(','))].join('\n');
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
      const active = Object.entries(filters || {})
        .filter(([k, v]) => Boolean(v) && !(k === 'job_recency' && v === 'all'))
        .map(([k, v]) => `${k}=${v}`)
        .join(', ') || 'none';
      await logsApi.create({
        category: 'jobs',
        type: 'export',
        redirect_to: '/jobs',
        log_text: `Exported jobs (filters: ${active}; search=${searchTerm || 'none'})`,
      });
    } catch (e) {
      // do not break export flow if logging fails
    }
  };

  const pageSummary = totalCount > 0
    ? { start: Math.min((currentPage - 1) * pageSize + 1, totalCount), end: Math.min((currentPage - 1) * pageSize + rows.length, totalCount) }
    : { start: 0, end: 0 };

  // Styling for chips (CHANGED: match EmployeesManagement)
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
  const statusPalette = {
    active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
    inactive: { bg: '#fee2e2', color: '#b91c1c', label: 'Inactive' },
    expired: { bg: '#fef3c7', color: '#92400e', label: 'Expired' } // NEW (keeps UI consistent)
  };
  const NEW_BADGE_STYLE = {
    marginLeft: 6,
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    background: '#22c55e',
    color: '#fff'
  };
  const formatExpiry = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString();
    } catch {
      return '';
    }
  };
  // NOTE: expired jobs are determined by `expired_at` being non-null (backend filter matches this).
  const isExpiredJob = (job) => Boolean(job?.expired_at) || String(job?.status || '').toLowerCase() === 'expired';

  const renderStatusBadge = (jobOrStatus) => {
    const job = (jobOrStatus && typeof jobOrStatus === 'object') ? jobOrStatus : { status: jobOrStatus };
    const status = String(job.status || '').toLowerCase();
    const expired = isExpiredJob(job);
    const expiryText = formatExpiry(job.expired_at);

    const tone = statusPalette[status] || { bg: '#e5e7eb', color: '#0f172a', label: status || '-' };

    const label = (() => {
      if (expired && status === 'inactive') return 'Expired • Inactive';
      if (expired) return 'Expired';
      return tone.label;
    })();

    return (
      <span style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '2px',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        background: expired ? '#fef3c7' : tone.bg,
        color: expired ? '#92400e' : tone.color
      }}>
        <span>{label}</span>
        {expired && expiryText ? (
          <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.9 }}>
            {expiryText}
          </span>
        ) : null}
      </span>
    );
  };

  const renderVerificationBadge = (value) => {
    const v = String(value || 'pending').toLowerCase();
    const palette = {
      pending: { bg: '#e5e7eb', color: '#0f172a', label: 'Pending' },
      approved: { bg: '#dcfce7', color: '#166534', label: 'Approved' },
      rejected: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' }
    };
    const tone = palette[v] || palette.pending;
    return (
      <span style={{ display:'inline-flex', alignItems:'center', padding:'4px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:700, background:tone.bg, color:tone.color }}>
        {tone.label}
      </span>
    );
  };

  const handleVerifyJob = async (job, next) => {
    if (!jobPerms.canManage || statusUpdatingId) return;
    setStatusUpdatingId(job.id);
    try {
      if (next === 'approved') await jobApi.approveJob(job.id);
      else if (next === 'rejected') await jobApi.rejectJob(job.id);
      setMessage({ type: 'success', text: `Job ${next}` });
      fetchRows();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to update verification status' });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const handleJobCreated = () => {
    setShowJobFormPanel(false);
    setEditJobId(null);
    setCloneJobId(null);
    fetchRows();
    setMessage({ type: 'success', text: 'Job saved successfully' });
  };

  const handleDeleteJob = async (jobId) => {
    if (!jobPerms.canDelete || !window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await jobApi.delete(jobId);
      setMessage({ type: 'success', text: 'Job deleted successfully' });
      fetchRows();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to delete job' });
    }
  };

  const handleRowClick = (jobId) => navigate(`/jobs/${jobId}`);

  const removeFilterChip = React.useCallback((key) => {
    setFilters(prev => ({ ...prev, [key]: key === 'job_recency' ? 'all' : '' }));
    setCurrentPage(1);
  }, []);

  const getJobLifeDays = (value) => {
    if (!value) return '-';
    const createdTs = new Date(value).getTime();
    if (Number.isNaN(createdTs)) return '-';
    const days = Math.floor((Date.now() - createdTs) / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : '-';
  };

  // Filtered rows based on search
  const filteredRows = React.useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const s = searchTerm.toLowerCase();
    return rows.filter(job =>
      String(job.id).includes(s) ||
      (job.employer_name || '').toLowerCase().includes(s) ||
      (job.job_profile || '').toLowerCase().includes(s) ||
      (job.job_state || '').toLowerCase().includes(s) ||
      (job.job_city || '').toLowerCase().includes(s)
    );
  }, [rows, searchTerm]);

  // NEW: fix eslint no-undef (table action buttons call this)
  const handleSetStatus = async (job, nextStatus) => {
    if (!jobPerms.canStatusToggle || statusUpdatingId) return;
    setStatusUpdatingId(job.id);
    try {
      await jobApi.toggleStatus(job.id, nextStatus);
      setMessage({ type: 'success', text: `Job marked ${nextStatus}` });
      fetchRows();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to update status' });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // CHANGED: share job should work same as Employees (copy-to-clipboard + fallback)
  const buildJobShareUrl = (id) => `${window.location.origin}/jobs/${id}`;
  const handleShareJob = async (job) => {
    const id = job?.id;
    if (!id) return;

    const link = buildJobShareUrl(id);
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
  };

  // filter cities by selected state (safe fallback if city objects don't have state_id)
  const filteredCitiesForDraftState = React.useMemo(() => {
    const sid = draftFilters.job_state_id;
    const allCities = options.cities || [];
    if (!sid) return allCities;

    const n = Number(sid);
    if (Number.isNaN(n)) return allCities;

    // supports common keys: state_id (masters), job_state_id (if any), StateId, etc.
    return allCities.filter((c) => {
      const cityStateId =
        c?.state_id ?? c?.job_state_id ?? c?.StateId ?? c?.stateId ?? null;
      return Number(cityStateId) === n;
    });
  }, [draftFilters.job_state_id, options.cities]);

  if (!jobPerms.canView) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={() => {}} onLogout={handleLogout} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view jobs.</div>
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
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            {viewJobId ? (
              <JobDetail
                jobId={viewJobId}
                onClose={() => setViewJobId(null)}
                onEdit={() => {
                  setEditJobId(viewJobId);
                  setShowJobFormPanel(true);
                  setViewJobId(null);
                }}
              />
            ) : !showJobFormPanel ? (
              <>
                <div className="list-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <h1>Jobs Management</h1>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {jobPerms.canManage && (
                      <button className="btn-primary small" onClick={() => { setCloneJobId(null); setEditJobId(null); setShowJobFormPanel(true); }}>
                        + Create Job
                      </button>
                    )}
                  </div>
                </div>
                <div className="search-filter-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:'1 1 auto' }}>
                    <label htmlFor="job-search-term" style={{ fontSize:'12px', fontWeight:600 }}>Search:</label>
                    <input
                      id="job-search-term"
                      type="text"
                      className="state-filter-select"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      placeholder="id, employer, profile, state, city..."
                      style={{ maxWidth:'260px' }}
                    />
                  </div>
                  <div style={{ flex:'0 0 auto', display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                    <button className="btn-secondary btn-small" onClick={toggleFilterPanel}>
                      {showFilterPanel ? 'Hide Filters' : `Filters${activeFilterCount ? ` (${activeFilterCount})` : ''}`}
                    </button>
                    <LogsAction category="jobs" />
                    {jobPerms.canExport && (
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
                  {Object.entries(filters).map(([key, value]) => {
                    if (!value) return null;
                    if (key === 'job_recency' && value === 'all') return null;

                    let label = value;

                    // ...existing code...
                    if (key === 'job_recency') label = value === 'new' ? 'New (Last 48h)' : 'All Jobs';

                    // NEW: chip labels
                    if (key === 'verification_status') label = VERIFICATION_OPTIONS.find(o => o.value === value)?.label || value;
                    if (key === 'job_state_id') label = options.states.find(s => String(s.id) === String(value))?.state_english || value;
                    if (key === 'job_city_id') label = options.cities.find(c => String(c.id) === String(value))?.city_english || value;
                    if (key === 'created_from') label = value;
                    if (key === 'created_to') label = value;

                    return (
                      <span key={`${key}-${value}`} className="badge chip" style={chipBaseStyle}>
                        {key.replace('_', ' ')}: {label}
                        <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip(key)}>×</button>
                      </span>
                    );
                  })}
                  {activeFilterCount === 0 && (
                    <span style={{ fontSize:'12px', color:'#64748b' }}>No filters applied</span>
                  )}
                </div>

                {/* Filter panel */}
                {showFilterPanel && (
                  <div className="filter-panel" style={{ position:'relative', marginBottom:'16px', padding:'16px', border:'1px solid #ddd', borderRadius:'10px', background:'#f8fafc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                      <SingleSelect
                        label="Preferred Gender"
                        options={GENDER_OPTIONS}
                        value={draftFilters.gender}
                        onChange={val => setDraftFilters(f => ({ ...f, gender: val }))}
                        placeholder="Any gender"
                      />
                      <SingleSelect
                        label="Experience Required"
                        options={options.experiences}
                        value={draftFilters.experience}
                        onChange={val => setDraftFilters(f => ({ ...f, experience: val }))}
                        optionLabel="title_english"
                        optionValue="id"
                        placeholder="Any experience"
                      />
                      <SingleSelect
                        label="Minimum Qualification"
                        options={options.qualifications}
                        value={draftFilters.qualification}
                        onChange={val => setDraftFilters(f => ({ ...f, qualification: val }))}
                        optionLabel="qualification_english"
                        optionValue="id"
                        placeholder="Any qualification"
                      />
                      <SingleSelect
                        label="Shift Timing"
                        options={options.shifts}
                        value={draftFilters.shift}
                        onChange={val => setDraftFilters(f => ({ ...f, shift: val }))}
                        optionLabel="shift_english"
                        optionValue="id"
                        placeholder="Any shift"
                      />
                      <SingleSelect
                        label="Skills Required"
                        options={options.skills}
                        value={draftFilters.skill}
                        onChange={val => setDraftFilters(f => ({ ...f, skill: val }))}
                        optionLabel="skill_english"
                        optionValue="id"
                        placeholder="Any skill"
                      />
                      <SingleSelect
                        label="Job Profile"
                        options={options.job_profiles}
                        value={draftFilters.job_profile}
                        onChange={val => setDraftFilters(f => ({ ...f, job_profile: val }))}
                        optionLabel="profile_english"
                        optionValue="id"
                        placeholder="Any job profile"
                      />
                      <SingleSelect
                        label="Job Benefits"
                        options={options.job_benefits}
                        value={draftFilters.job_benefit}
                        onChange={val => setDraftFilters(f => ({ ...f, job_benefit: val }))}
                        optionLabel="benefit_english"
                        optionValue="id"
                        placeholder="Any benefit"
                      />
                      <SingleSelect
                        label="Status"
                        options={STATUS_OPTIONS}
                        value={draftFilters.status}
                        onChange={val => setDraftFilters(f => ({ ...f, status: val }))}
                        placeholder="Any status"
                      />
                      <SingleSelect
                        label="Job Recency"
                        options={JOB_RECENCY_OPTIONS}
                        value={draftFilters.job_recency}
                        onChange={val => setDraftFilters(f => ({ ...f, job_recency: val }))}
                        placeholder="All jobs"
                      />

                      {/* NEW */}
                      <SingleSelect
                        label="Verification Status"
                        options={VERIFICATION_OPTIONS}
                        value={draftFilters.verification_status}
                        onChange={val => setDraftFilters(f => ({ ...f, verification_status: val }))}
                        placeholder="Any verification"
                      />

                      {/* NEW */}
                      <SingleSelect
                        label="State"
                        options={options.states}
                        value={draftFilters.job_state_id}
                        onChange={val => setDraftFilters(f => ({ ...f, job_state_id: val, job_city_id: '' }))}
                        optionLabel="state_english"
                        optionValue="id"
                        placeholder="Any state"
                      />

                      {/* NEW */}
                      <SingleSelect
                        label="City"
                        options={filteredCitiesForDraftState}
                        value={draftFilters.job_city_id}
                        onChange={val => setDraftFilters(f => ({ ...f, job_city_id: val }))}
                        optionLabel="city_english"
                        optionValue="id"
                        placeholder={draftFilters.job_state_id ? 'Any city' : 'Select state first'}
                        disabled={!draftFilters.job_state_id} // NEW (matches EmployeesManagement behavior)
                      />

                      {/* NEW */}
                      <div style={{ minWidth: 200 }}>
                        <label style={{ display:'block', fontSize:'12px', fontWeight:600, marginBottom:4 }}>Created Date From</label>
                        <input
                          type="date"
                          className="state-filter-select"
                          value={draftFilters.created_from}
                          onChange={(e) => setDraftFilters(f => ({ ...f, created_from: e.target.value }))}
                          style={{ width:'100%' }}
                        />
                      </div>

                      {/* NEW */}
                      <div style={{ minWidth: 200 }}>
                        <label style={{ display:'block', fontSize:'12px', fontWeight:600, marginBottom:4 }}>Created Date To</label>
                        <input
                          type="date"
                          className="state-filter-select"
                          value={draftFilters.created_to}
                          onChange={(e) => setDraftFilters(f => ({ ...f, created_to: e.target.value }))}
                          min={draftFilters.created_from || undefined}
                          style={{ width:'100%' }}
                        />
                      </div>
                    </div>
                    <div className="filter-actions" style={{ marginTop:'20px', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                      <button type="button" className="btn-primary btn-small" onClick={applyDraftFilters}>Apply</button>
                      <button type="button" className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                      <button type="button" className="btn-secondary btn-small" onClick={() => setShowFilterPanel(false)}>Close</button>
                    </div>
                  </div>
                )}

                <div className="table-container" style={{ overflowX:'auto' }}>
                  <table className="data-table" style={{ minWidth:'2000px' }}>
                    <thead>
                      <tr>
                        <th onClick={() => handleSort('id')} style={{ cursor:'pointer' }}>ID{headerIndicator('id')}</th>
                        <th onClick={() => handleSort('employer_id')} style={{ cursor:'pointer' }}>Employer{headerIndicator('employer_id')}</th>
                        <th>Employer Phone</th>
                        <th>Interviewer Contact</th> {/* NEW */}
                        <th>Shift Timing</th>        {/* NEW */}
                        <th onClick={() => handleSort('job_profile_id')} style={{ cursor:'pointer' }}>Job Profile{headerIndicator('job_profile_id')}</th>
                        <th>Household</th>
                        <th>Gender</th>
                        <th>Experience</th>
                        <th>Qualification</th>
                        <th>Shift</th>
                        <th>Skills</th>
                        <th>Benefits</th>
                        <th>Verification</th> {/* NEW */}
                        <th>Vacancies</th> {/* CHANGED */}
                        <th>State</th>
                        <th>City</th>
                        <th>Salary</th>
                        <th>Status</th>
                        <th>Status Time</th>
                        <th>Created</th>
                        <th>Job Life (days)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={23}>Loading...{/* CHANGED */}</td>
                        </tr>
                      ) : rows.length ? (
                        rows.map(job => {
                          const expired = isExpiredJob(job);
                          const verification = String(job.verification_status || 'pending').toLowerCase();
                          const isApproved = verification === 'approved';
                          const isPending = verification === 'pending'; // NEW
                          const isInactiveRow = String(job.status || '').toLowerCase() === 'inactive'; // NEW (restore neutral row styling)
                          const jobLifeDays = getJobLifeDays(job.created_at);

                          return (
                            <tr
                              key={job.id}
                              onClick={() => handleRowClick(job.id)}
                              // CHANGED: remove expired yellow/orange highlighting
                              style={{
                                background: isInactiveRow ? '#f3f4f6' : '#ffffff',
                                color: isInactiveRow ? '#94a3b8' : '#0f172a',
                                cursor: 'pointer'
                              }}
                            >
                              <td>{job.id}</td>

                              <td>
                                {job.employer_id ? (
                                  <button
                                    type="button"
                                    style={linkButtonStyle}
                                    onClick={() => navigate(`/employers/${job.employer_id}`)}
                                  >
                                    {(job.employer_name || `Employer #${job.employer_id}`)}
                                  </button>
                                ) : (job.employer_name || '-')}
                              </td>

                              <td>{job.employer_phone || '-'}</td>
                              <td>{job.interviewer_contact || '-'}</td>      {/* NEW */}
                              <td>{job.shift_timing_display || '-'}</td>     {/* NEW */}

                              <td>
                                {job.job_profile || '-'}
                                {job.created_at && (
                                  <span style={NEW_BADGE_STYLE}>New</span>
                                )}
                              </td>
                              <td>{job.is_household ? 'Yes' : 'No'}</td>
                              <td>{job.genders || '-'}</td>
                              <td>{job.experiences || '-'}</td>
                              <td>{job.qualifications || '-'}</td>
                              <td>{job.shifts || '-'}</td>
                              <td>{job.skills || '-'}</td>
                              <td>{job.benefits || '-'}</td>
                              <td>{renderVerificationBadge(job.verification_status)}</td> {/* NEW */}
                              <td>{`${Number(job.hired_total ?? 0)}/${Number(job.no_vacancy ?? 0)}`}</td> {/* CHANGED */}
                              <td>{job.job_state || '-'}</td>
                              <td>{job.job_city || '-'}</td>
                              <td>
                                {job.salary_min && job.salary_max
                                  ? `${job.salary_min} - ${job.salary_max}`
                                  : (job.salary_min || job.salary_max || '-')}
                              </td>
                              <td>{renderStatusBadge(job)}</td>
                              <td>{job.updated_at ? new Date(job.updated_at).toLocaleString() : '-'}</td>
                              <td>{job.created_at ? new Date(job.created_at).toLocaleString() : '-'}</td>
                              <td>{jobLifeDays}</td>
                              <td>
                                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                                  {/* CHANGED: Approve/Reject only when pending */}
                                  {jobPerms.canManage && isPending && (
                                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                                      <button
                                        className="btn-small"
                                        style={{ minWidth:110 }}
                                        disabled={statusUpdatingId === job.id}
                                        onClick={(event) => { event.stopPropagation(); handleVerifyJob(job, 'approved'); }}
                                      >
                                        {statusUpdatingId === job.id ? 'Updating...' : 'Approve'}
                                      </button>
                                      <button
                                        className="btn-small btn-delete"
                                        style={{ minWidth:110 }}
                                        disabled={statusUpdatingId === job.id}
                                        onClick={(event) => { event.stopPropagation(); handleVerifyJob(job, 'rejected'); }}
                                      >
                                        {statusUpdatingId === job.id ? 'Updating...' : 'Reject'}
                                      </button>
                                    </div>
                                  )}

                                  {/* unchanged: status actions only when approved */}
                                  {jobPerms.canStatusToggle && isApproved && (
                                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                                      {/* Per rules:
                                          - Active: Deactivate + Mark Expired
                                          - Inactive (not expired): Activate + Mark Expired
                                          - Expired: Activate OR Inactive (if currently expired) */}
                                      {job.status === 'active' && (
                                        <>
                                          <button
                                            className="btn-small"
                                            style={{ minWidth:110 }}
                                            disabled={statusUpdatingId === job.id}
                                            onClick={(event) => { event.stopPropagation(); handleSetStatus(job, 'inactive'); }}
                                          >
                                            {statusUpdatingId === job.id ? 'Updating...' : 'Deactivate'}
                                          </button>
                                          <button
                                            className="btn-small"
                                            style={{ minWidth:110 }}
                                            disabled={statusUpdatingId === job.id}
                                            onClick={(event) => { event.stopPropagation(); handleSetStatus(job, 'expired'); }}
                                          >
                                            {statusUpdatingId === job.id ? 'Updating...' : 'Mark Expired'}
                                          </button>
                                        </>
                                      )}

                                      {job.status === 'inactive' && !expired && (
                                        <>
                                          <button
                                            className="btn-small"
                                            style={{ minWidth:110 }}
                                            disabled={statusUpdatingId === job.id}
                                            onClick={(event) => { event.stopPropagation(); handleSetStatus(job, 'active'); }}
                                          >
                                            {statusUpdatingId === job.id ? 'Updating...' : 'Activate'}
                                          </button>
                                          <button
                                            className="btn-small"
                                            style={{ minWidth:110 }}
                                            disabled={statusUpdatingId === job.id}
                                            onClick={(event) => { event.stopPropagation(); handleSetStatus(job, 'expired'); }}
                                          >
                                            {statusUpdatingId === job.id ? 'Updating...' : 'Mark Expired'}
                                          </button>
                                        </>
                                      )}

                                      {expired && (
                                        <>
                                          <button
                                            className="btn-small"
                                            style={{ minWidth:110 }}
                                            disabled={statusUpdatingId === job.id}
                                            onClick={(event) => { event.stopPropagation(); handleSetStatus(job, 'active'); }}
                                          >
                                            {statusUpdatingId === job.id ? 'Updating...' : 'Activate'}
                                          </button>
                                          {job.status !== 'inactive' && (
                                            <button
                                              className="btn-small"
                                              style={{ minWidth:110 }}
                                              disabled={statusUpdatingId === job.id}
                                              onClick={(event) => { event.stopPropagation(); handleSetStatus(job, 'inactive'); }}
                                            >
                                              {statusUpdatingId === job.id ? 'Updating...' : 'Mark Inactive'}
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                  <div style={{ display:'flex', gap:'6px', flexWrap:'nowrap' }}>
                                    <button
                                      className="btn-small"
                                      style={{ minWidth:80 }}
                                      onClick={(event) => { event.stopPropagation(); navigate(`/jobs/${job.id}`); }}
                                    >View</button>
                                    {jobPerms.canManage && (
                                      <button
                                        className="btn-small btn-edit"
                                        style={{ minWidth:80 }}
                                        onClick={(event) => { event.stopPropagation(); setEditJobId(job.id); setShowJobFormPanel(true); }}
                                      >Edit</button>
                                    )}
                                    {jobPerms.canDelete && (
                                      <button
                                        className="btn-small btn-delete"
                                        style={{ minWidth:80 }}
                                        onClick={(event) => { event.stopPropagation(); handleDeleteJob(job.id); }}
                                      >Delete</button>
                                    )}
                                    {/* NEW */}
                                    <button
                                      className="btn-small"
                                      style={{ minWidth:80 }}
                                      onClick={(event) => { event.stopPropagation(); handleShareJob(job); }}
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
                          <td colSpan={23}>No data{/* CHANGED */}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalCount > 0 && (
                  <div className="pagination-bar" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'16px', padding:'10px 0' }}>
                    <span>Showing {pageSummary.start}-{pageSummary.end} of {totalCount}</span>
                    <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                      <div>
                        <label style={{ fontSize:'12px', marginRight:'8px' }}>Rows per page:</label>
                        <select
                          className="state-filter-select"
                          value={pageSize}
                          onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10) || 25)}
                          style={{ fontSize:'13px' }}
                        >
                          {[10,25,50,100].map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </div>
                      <button className="btn-secondary btn-small" disabled={currentPage === 1} onClick={() => handlePageChange(-1)}>Previous</button>
                      <span style={{ fontSize:'13px' }}>Page {currentPage} of {totalPages}</span>
                      <button className="btn-secondary btn-small" disabled={currentPage === totalPages} onClick={() => handlePageChange(1)}>Next</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              (jobPerms.canManage || (jobPerms.canRepost && cloneJobId)) ? (
                <JobForm
                  open={true}
                  onClose={() => { setShowJobFormPanel(false); setEditJobId(null); setCloneJobId(null); }}
                  onSuccess={handleJobCreated}
                  employers={options.employers}
                  jobProfiles={options.job_profiles}
                  states={options.states}
                  cities={options.cities}
                  jobId={editJobId}
                  cloneJobId={cloneJobId}
                />
              ) : (
                <div className="inline-message error">You do not have permission to create or edit jobs.</div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// NOTE: shift_timing_display is formatted server-side in 12-hour AM/PM.
// (no changes needed; jobs search fix is backend-only)
