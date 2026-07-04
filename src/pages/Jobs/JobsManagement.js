import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getAppBaseUrl } from '../../api/baseUrl';
import experiencesApi from '../../api/masters/experiencesApi';
import qualificationsApi from '../../api/masters/qualificationsApi';
import shiftsApi from '../../api/masters/shiftsApi';
import skillsApi from '../../api/masters/skillsApi';
import jobProfilesApi from '../../api/masters/jobProfilesApi';
import jobBenefitsApi from '../../api/masters/jobBenefitsApi';
import businessCategoriesApi from '../../api/masters/businessCategoriesApi';
import '../Masters/MasterPage.css';
import JobForm from '../../components/Forms/JobForm';
import jobApi from '../../api/jobApi';
import JobDetail from './JobDetail'; // (to be created below)
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import LogsAction from '../../components/LogsAction';
import logsApi from '../../api/logsApi';
import { useResizableColumns } from '../../hooks/useResizableColumns';

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

const hasValidCoordinates = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

const getGoogleMapsUrl = (lat, lng) => (
  hasValidCoordinates(lat, lng)
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`
    : ''
);

const getEmployerOrganizationName = (job) => {
  const organizationType = String(job?.employer_organization_type || job?.Employer?.organization_type || '').trim().toLowerCase();
  if (organizationType === 'domestic' || organizationType === 'household') return 'Household';
  return job?.employer_organization_name || job?.Employer?.organization_name || '-';
};

const getEmployerBusinessCategory = (job) => (
  job?.employer_business_category
  || job?.Employer?.BusinessCategory?.category_english
  || job?.Employer?.BusinessCategory?.category_hindi
  || '-'
);

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

const formatTime12h = (t) => {
  if (!t) return '';
  const [hStr, mStr] = String(t).split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ? mStr.padStart(2, '0') : '00';
  if (!Number.isFinite(h)) return '';
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
};

const formatWorkDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  const [sh, sm] = String(startTime).split(':').map(Number);
  const [eh, em] = String(endTime).split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return '';
  let totalMins = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMins <= 0) totalMins += 24 * 60;
  const h = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
};

function MultiCheckSelect({ label, options, value = [], onChange, optionLabel = 'label', optionValue = 'value', placeholder = 'Any' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const toggle = (v) => {
    const str = String(v);
    onChange(value.includes(str) ? value.filter(x => x !== str) : [...value, str]);
  };
  const selected = value.length === 0 ? placeholder : options.filter(o => value.includes(String(o[optionValue]))).map(o => o[optionLabel]).join(', ');
  return (
    <div style={{ minWidth: 200, position: 'relative' }} ref={ref}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: 4 }}>{label}</label>
      <div
        className="state-filter-select"
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13, color: value.length ? '#0f172a' : '#94a3b8' }}>{selected}</span>
        <span style={{ marginLeft: 6, fontSize: 10, flexShrink: 0 }}>▼</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
          {options.map(opt => {
            const v = String(opt[optionValue]);
            const checked = value.includes(v);
            return (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', background: checked ? '#f0f9ff' : 'transparent', fontSize: 13 }} onMouseDown={e => e.preventDefault()} onClick={() => toggle(v)}>
                <input type="checkbox" checked={checked} readOnly style={{ width: 14, minWidth: 14, flex: '0 0 auto' }} />
                {opt[optionLabel]}
              </label>
            );
          })}
          {options.length === 0 && <div style={{ padding: '8px 12px', fontSize: 13, color: '#94a3b8' }}>No options</div>}
        </div>
      )}
    </div>
  );
}

const DEFAULTS = {
  cb: 36, id: 60, employer: 120, org_name: 140, org_category: 130, employer_phone: 120,
  interviewer_contact: 140, shift_timing: 110, working_hours: 120, work_duration: 90, job_profile: 130, job_designation: 130,
  household: 90, gender: 80, experience: 130, qualification: 120, shift: 110,
  skills: 130, benefits: 130, verification: 110, vacancies: 90, state: 90, city: 90,
  location: 120, salary_type: 100, salary: 100, status: 90, expiry_date: 110,
  status_time: 130, created: 110, job_life: 90, actions: 100
};

export default function JobsManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const getDurationMins = React.useCallback((job) => {
    const s = String(job.work_start_time || '').split(':').map(Number);
    const e = String(job.work_end_time || '').split(':').map(Number);
    if (s.length < 2 || e.length < 2 || !Number.isFinite(s[0]) || !Number.isFinite(e[0])) return -1;
    let mins = (e[0] * 60 + (e[1] || 0)) - (s[0] * 60 + (s[1] || 0));
    if (mins <= 0) mins += 24 * 60;
    return mins;
  }, []);

  // Filters
  const [filters, setFilters] = useState({
    gender: '',
    experience: '',
    qualification: '',
    shift: '',
    skill: '',
    job_profile: [],
    org_category: '',
    job_benefit: '',
    status: '',
    job_recency: 'all',
    verification_status: '',
    job_state_id: '',
    job_city_id: '',
    created_from: '',
    created_to: '',
  });

  const [draftFilters, setDraftFilters] = useState({ ...filters });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [options, setOptions] = useState({
    experiences: [],
    qualifications: [],
    shifts: [],
    skills: [],
    job_profiles: [],
    job_benefits: [],
    business_categories: [],
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
  const [unverifiedEmployerJob, setUnverifiedEmployerJob] = useState(null);
  const [pendingApproveJob, setPendingApproveJob] = useState(null);
  const [approveShowOrg, setApproveShowOrg] = useState(true);
  const [cloneJobId, setCloneJobId] = useState(null);
  const activeFilterCount = React.useMemo(
    () => Object.entries(filters).reduce((sum, [key, val]) => {
      if (Array.isArray(val)) return sum + (val.length > 0 ? 1 : 0);
      if (!val) return sum;
      if (key === 'job_recency' && val === 'all') return sum;
      return sum + 1;
    }, 0),
    [filters]
  );
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const displayRows = React.useMemo(() => {
    if (sortField !== 'work_duration') return rows;
    return [...rows].sort((a, b) => {
      const da = getDurationMins(a);
      const db = getDurationMins(b);
      return sortDir === 'asc' ? da - db : db - da;
    });
  }, [rows, sortField, sortDir, getDurationMins]);
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
    canApproveReject: hasPermission(PERMISSIONS.JOBS_APPROVE_REJECT),
    canRepost: hasPermission(PERMISSIONS.JOBS_REPOST),
    canExport: hasPermission(PERMISSIONS.JOBS_EXPORT),
    canShowOrganization: hasPermission(PERMISSIONS.JOBS_SHOW_ORGANIZATION),
  }), []);

  const { colWidths, rHandle } = useResizableColumns('jobs-col-widths', DEFAULTS);

  // Parse all filters from URL once on mount
  const initialUrlParams = React.useMemo(() => {
    const p = new URLSearchParams(location.search);
    const toArr = (v) => v ? v.split(',').filter(Boolean) : [];
    return {
      action: p.get('action') || '',
      actionId: p.get('id') || '',
      search: p.get('search') || '',
      page: Math.max(parseInt(p.get('page') || '1', 10), 1),
      sortField: p.get('sortField') || 'id',
      sortDir: p.get('sortDir') || 'desc',
      filters: {
        gender: p.get('gender') || '',
        experience: p.get('experience') || '',
        qualification: p.get('qualification') || '',
        shift: p.get('shift') || '',
        skill: p.get('skill') || '',
        job_profile: toArr(p.get('job_profile')),
        org_category: p.get('org_category') || '',
        job_benefit: p.get('job_benefit') || '',
        status: (['active','inactive','expired'].includes(p.get('status') || '') ? p.get('status') : '') || '',
        job_recency: p.get('job_recency') || p.get('recency') === 'new' ? 'new' : 'all',
        verification_status: (['pending','approved','rejected'].includes(p.get('verification_status') || '') ? p.get('verification_status') : '') || '',
        job_state_id: p.get('job_state_id') || '',
        job_city_id: p.get('job_city_id') || '',
        created_from: p.get('created_from') || '',
        created_to: p.get('created_to') || '',
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  const buildQueryParams = React.useCallback((overrides = {}) => {
    const params = {
      page: overrides.page ?? currentPage,
      limit: overrides.limit ?? pageSize,
      sortField: sortField === 'work_duration' ? 'id' : sortField,
      sortDir,
      search: searchTerm.trim() || undefined
    };
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length) params[key] = value.join(',');
      } else if (value !== undefined && value !== null && value !== '' && !(key === 'job_recency' && value === 'all')) {
        params[key] = value;
      }
    });
    return params;
  }, [currentPage, pageSize, sortField, sortDir, searchTerm, filters]);

  // Bidirectional URL sync — write all active filters + search to URL
  const syncToUrl = React.useCallback((nextFilters, nextSearch, nextPage, nextSortField, nextSortDir) => {
    const p = new URLSearchParams();
    if (nextSearch && nextSearch.trim()) p.set('search', nextSearch.trim());
    if (nextPage && nextPage > 1) p.set('page', String(nextPage));
    if (nextSortField && nextSortField !== 'id') p.set('sortField', nextSortField);
    if (nextSortDir && nextSortDir !== 'desc') p.set('sortDir', nextSortDir);
    Object.entries(nextFilters || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) { if (value.length) p.set(key, value.join(',')); }
      else if (value && !(key === 'job_recency' && value === 'all')) p.set(key, String(value));
    });
    navigate({ pathname: location.pathname, search: p.toString() ? `?${p}` : '' }, { replace: true });
  }, [navigate, location.pathname]);

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

  // Hydrate all state from URL once on mount
  useEffect(() => {
    const { action, actionId, search, page, sortField: sf, sortDir: sd, filters: urlFilters } = initialUrlParams;
    if (search) setSearchTerm(search);
    if (page > 1) setCurrentPage(page);
    if (sf !== 'id') setSortField(sf);
    if (sd !== 'desc') setSortDir(sd);
    setFilters(urlFilters);
    setDraftFilters(urlFilters);
    setQueryHydrated(true);
    if (action === 'add') {
      setCloneJobId(null); setEditJobId(null); setShowJobFormPanel(true);
    } else if (action === 'edit' && actionId) {
      setEditJobId(Number(actionId)); setCloneJobId(null); setShowJobFormPanel(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        experiencesRes, qualificationsRes, shiftsRes, skillsRes,
        jobProfilesRes, jobBenefitsRes, businessCatsRes, employersRes, statesRes, citiesRes
      ] = await Promise.all([
        experiencesApi.getAll(), qualificationsApi.getAll(), shiftsApi.getAll(), skillsApi.getAll(),
        jobProfilesApi.getAll(), jobBenefitsApi.getAll(), businessCategoriesApi.getAll(),
        jobApi.getEmployers({ limit: 100 }), jobApi.getStates(), jobApi.getCities(),
      ]);
      setOptions({
        experiences: experiencesRes.data?.data || [],
        qualifications: qualificationsRes.data?.data || [],
        shifts: shiftsRes.data?.data || [],
        skills: skillsRes.data?.data || [],
        job_profiles: jobProfilesRes.data?.data || [],
        job_benefits: jobBenefitsRes.data?.data || [],
        business_categories: businessCatsRes.data?.data || [],
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
    const next = { ...draftFilters };
    setFilters(next);
    setCurrentPage(1);
    setShowFilterPanel(false);
    syncToUrl(next, searchTerm, 1, sortField, sortDir);

    try {
      const active = Object.entries(next)
        .filter(([k, v]) => (Array.isArray(v) ? v.length : Boolean(v)) && !(k === 'job_recency' && v === 'all'))
        .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
        .join(', ') || 'none';
      logsApi.create({ category: 'jobs', type: 'update', redirect_to: '/jobs', log_text: `Applied job filters: ${active}` });
    } catch (e) { /* ignore */ }
  };

  const EMPTY_FILTERS = {
    gender: '', experience: '', qualification: '', shift: '', skill: '',
    job_profile: [], org_category: '', job_benefit: '', status: '', job_recency: 'all',
    verification_status: '', job_state_id: '', job_city_id: '', created_from: '', created_to: '',
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setSortField('id');
    setSortDir('desc');
    setCurrentPage(1);
    setSearchTerm('');
    setShowFilterPanel(false);
    syncToUrl(EMPTY_FILTERS, '', 1, 'id', 'desc');
    try { logsApi.create({ category: 'jobs', type: 'update', redirect_to: '/jobs', log_text: 'Cleared job filters' }); } catch (e) { /* ignore */ }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setCurrentPage(1);
    syncToUrl(filters, val, 1, sortField, sortDir);
  };

  const handleSort = (field) => {
    const nextDir = sortField === field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    const nextField = field;
    setSortField(nextField);
    setSortDir(nextDir);
    setCurrentPage(1);
    syncToUrl(filters, searchTerm, 1, nextField, nextDir);
  };

  const headerIndicator = (field) => sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const handlePageChange = (delta) => {
    const next = Math.min(Math.max(1, currentPage + delta), totalPages);
    setCurrentPage(next);
    syncToUrl(filters, searchTerm, next, sortField, sortDir);
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setCurrentPage(1);
    syncToUrl(filters, searchTerm, 1, sortField, sortDir);
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
      'ID','Employer','Organization Name','Organization Category','Employer Phone','Interviewer Contact','Shift Timing',
      'Job Profile','Household','Gender','Experience','Qualification','Shift','Skills','Benefits',
      'Vacancies','State','City','Salary Type','Salary','Status','Verification','Expiry Date','Updated','Created'
    ];
    const escapeCell = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g,'""')}"` : str;
    };
    const rows = exportRows.map(job => [
      job.id,
      job.employer_name || job.employer_id || '',
      getEmployerOrganizationName(job),
      getEmployerBusinessCategory(job),
      job.employer_phone || '',
      job.interviewer_contact || '',
      job.shift_timing_display || '',
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
      job.salary_type || '',
      job.salary_min && job.salary_max ? `${job.salary_min}-${job.salary_max}` : (job.salary_min || job.salary_max || ''),
      job.status || '',
      job.verification_status || '',
      formatExportDateTime(job.expired_at),
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
        .map(([k, v]) => {
          if (k === 'job_profile') {
            const match = (options.job_profiles || []).find(p => String(p.id) === String(v));
            const name = match ? (match.profile_english || match.profile_hindi || match.name) : null;
            return `${k}=${name || v}`;
          }
          return `${k}=${v}`;
        })
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
  const locationCellStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: '8px',
    flexWrap: 'wrap',
    width: '100%',
    textAlign: 'left'
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
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  };
  // NOTE: show UI-expired only when `expired_at` is a past date for active/inactive jobs.
  // Also treat status=expired as expired.
  const isExpiredJob = (job) => {
    const status = String(job?.status || '').toLowerCase();
    if (status === 'expired') return true;
    if (status !== 'active' && status !== 'inactive') return false;
    if (!job?.expired_at) return false;
    try {
      const d = new Date(job.expired_at);
      if (Number.isNaN(d.getTime())) return false;
      return d.getTime() < Date.now();
    } catch {
      return false;
    }
  };

  const renderStatusBadge = (jobOrStatus) => {
    const job = (jobOrStatus && typeof jobOrStatus === 'object') ? jobOrStatus : { status: jobOrStatus };
    const status = String(job.status || '').toLowerCase();

    const expired = isExpiredJob(job);
    const tone = statusPalette[status] || { bg: '#e5e7eb', color: '#0f172a', label: status || '-' };

    const label = (() => {
      if (expired && status === 'inactive') return 'Inactive and expired';
      if (expired && status === 'active') return 'Expired';
      if (expired && status === 'expired') return 'Expired';
      return tone.label;
    })();

    const chipTone = expired ? (statusPalette.expired || tone) : tone;

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        background: chipTone.bg,
        color: chipTone.color
      }}>
        {label}
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
    if (!jobPerms.canApproveReject || statusUpdatingId) return;
    if (next === 'approved') {
      const evs = String(job.employer_verification_status || 'pending').toLowerCase();
      if (evs !== 'verified' && evs !== 'approved') {
        setUnverifiedEmployerJob(job);
        return;
      }
      if (jobPerms.canShowOrganization) {
        setApproveShowOrg(true);
        setPendingApproveJob(job);
        return;
      }
    }
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

  const confirmApproveJob = async () => {
    if (!pendingApproveJob) return;
    const job = pendingApproveJob;
    setPendingApproveJob(null);
    setStatusUpdatingId(job.id);
    try {
      await jobApi.approveJob(job.id, { show_organization: approveShowOrg ? 1 : 0 });
      setMessage({ type: 'success', text: 'Job approved' });
      fetchRows();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to approve job' });
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

  const handleRowClick = (jobId, e) => {
    if (e && (e.ctrlKey || e.metaKey || e.button === 1)) {
      window.open(`/jobs/${jobId}`, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/jobs/${jobId}`);
    }
  };

  const removeFilterChip = React.useCallback((key) => {
    const emptyVal = (key === 'job_recency') ? 'all' : key === 'job_profile' ? [] : '';
    setFilters(prev => {
      const next = { ...prev, [key]: emptyVal };
      syncToUrl(next, searchTerm, 1, sortField, sortDir);
      return next;
    });
    setCurrentPage(1);
  }, [syncToUrl, searchTerm, sortField, sortDir]);

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
      getEmployerOrganizationName(job).toLowerCase().includes(s) ||
      getEmployerBusinessCategory(job).toLowerCase().includes(s) ||
      (job.job_profile || '').toLowerCase().includes(s) ||
      (job.job_designation || '').toLowerCase().includes(s) ||
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

  const handleShareJob = async (job) => {
    const slug = job?.slug;
    if (!slug) return;

    const link = `${getAppBaseUrl()}/app/jobs/${slug}`;
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
          <main className={`main-content jobs-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
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
        <main className={`main-content jobs-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">

            {unverifiedEmployerJob && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ background:'#fff', borderRadius:12, padding:'28px 24px', maxWidth:420, width:'90%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
                  <h3 style={{ margin:'0 0 10px', fontSize:17, fontWeight:700, color:'#1e293b' }}>Profile Not Verified</h3>
                  <p style={{ margin:'0 0 20px', fontSize:14, color:'#475569', lineHeight:1.5 }}>
                    The employer's profile is not verified. Please verify the profile first before approving this job.
                  </p>
                  <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                    <button
                      className="btn-secondary small"
                      onClick={() => setUnverifiedEmployerJob(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary small"
                      onClick={() => { navigate(`/employers/${unverifiedEmployerJob.employer_id}`); setUnverifiedEmployerJob(null); }}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pendingApproveJob && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ background:'#fff', borderRadius:12, padding:'28px 24px', maxWidth:400, width:'90%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
                  <h3 style={{ margin:'0 0 8px', fontSize:17, fontWeight:700, color:'#1e293b' }}>Approve Job</h3>
                  <p style={{ margin:'0 0 16px', fontSize:14, color:'#475569', lineHeight:1.5 }}>
                    Choose how the organization name appears to candidates in the app.
                  </p>
                  <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:24 }}>
                    <input
                      type="checkbox"
                      checked={approveShowOrg}
                      onChange={e => setApproveShowOrg(e.target.checked)}
                      style={{ width:16, height:16, cursor:'pointer' }}
                    />
                    <span style={{ fontSize:13, color:'#0f172a', fontWeight:500 }}>
                      Show organization name to candidates
                    </span>
                  </label>
                  <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                    <button
                      className="btn-secondary small"
                      onClick={() => setPendingApproveJob(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary small"
                      onClick={confirmApproveJob}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                      <a className="btn-primary small" href="/jobs?action=add" style={{ textDecoration:'none' }} onClick={e => { e.preventDefault(); setCloneJobId(null); setEditJobId(null); setShowJobFormPanel(true); }}>
                        + Create Job
                      </a>
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
                    if (Array.isArray(value)) {
                      if (!value.length) return null;
                      let names;
                      if (key === 'job_profile') names = value.map(id => options.job_profiles.find(p => String(p.id) === id)?.profile_english || id).join(', ');
                      else if (key === 'org_category') names = value.map(id => options.business_categories.find(c => String(c.id) === id)?.category_english || id).join(', ');
                      else names = value.join(', ');
                      return (
                        <span key={key} className="badge chip" style={chipBaseStyle}>
                          {key.replace(/_/g, ' ')}: {names}
                          <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip(key)}>×</button>
                        </span>
                      );
                    }
                    if (!value) return null;
                    if (key === 'job_recency' && value === 'all') return null;
                    let label = value;
                    if (key === 'job_recency') label = value === 'new' ? 'New (Last 48h)' : 'All Jobs';
                    if (key === 'verification_status') label = VERIFICATION_OPTIONS.find(o => o.value === value)?.label || value;
                    if (key === 'job_state_id') label = options.states.find(s => String(s.id) === String(value))?.state_english || value;
                    if (key === 'job_city_id') label = options.cities.find(c => String(c.id) === String(value))?.city_english || value;
                    if (key === 'org_category') label = options.business_categories.find(c => String(c.id) === String(value))?.category_english || value;
                    return (
                      <span key={`${key}-${value}`} className="badge chip" style={chipBaseStyle}>
                        {key.replace(/_/g, ' ')}: {label}
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
                      <MultiCheckSelect
                        label="Job Profile"
                        options={options.job_profiles}
                        value={draftFilters.job_profile}
                        onChange={val => setDraftFilters(f => ({ ...f, job_profile: val }))}
                        optionLabel="profile_english"
                        optionValue="id"
                        placeholder="Any job profile"
                      />
                      <SingleSelect
                        label="Organization Category"
                        options={options.business_categories}
                        value={draftFilters.org_category}
                        onChange={val => setDraftFilters(f => ({ ...f, org_category: val }))}
                        optionLabel="category_english"
                        optionValue="id"
                        placeholder="Any category"
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

                <div className="table-container">
                  <table className="data-table col-resizable" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: colWidths.cb, textAlign: 'center', padding: '4px' }}>
                          <input
                            type="checkbox"
                            style={{ width: 14, cursor: 'pointer' }}
                            checked={rows.length > 0 && rows.every(r => selectedIds.has(r.id))}
                            onChange={e => setSelectedIds(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())}
                          />
                        </th>
                        <th onClick={() => handleSort('id')} style={{ cursor:'pointer', width: colWidths.id }}>ID{headerIndicator('id')}{rHandle('id')}</th>
                        <th onClick={() => handleSort('employer_id')} style={{ cursor:'pointer', width: colWidths.employer }}>Employer{headerIndicator('employer_id')}{rHandle('employer')}</th>
                        <th style={{ width: colWidths.org_name }}>Organization Name{rHandle('org_name')}</th>
                        <th style={{ width: colWidths.org_category }}>Organization Category{rHandle('org_category')}</th>
                        <th style={{ width: colWidths.employer_phone }}>Employer Phone{rHandle('employer_phone')}</th>
                        <th style={{ width: colWidths.interviewer_contact }}>Interviewer Contact{rHandle('interviewer_contact')}</th> {/* NEW */}
                        <th style={{ width: colWidths.shift_timing }}>Shift Timing{rHandle('shift_timing')}</th>
                        <th style={{ width: colWidths.working_hours }}>Working Hours{rHandle('working_hours')}</th>
                        <th onClick={() => handleSort('work_duration')} style={{ cursor: 'pointer', width: colWidths.work_duration }}>Duration{headerIndicator('work_duration')}{rHandle('work_duration')}</th>
                        <th onClick={() => handleSort('job_profile_id')} style={{ cursor:'pointer', width: colWidths.job_profile }}>Job Profile{headerIndicator('job_profile_id')}{rHandle('job_profile')}</th>
                        <th style={{ width: colWidths.job_designation }}>Job Designation{rHandle('job_designation')}</th>
                        <th style={{ width: colWidths.household }}>Household{rHandle('household')}</th>
                        <th style={{ width: colWidths.gender }}>Gender{rHandle('gender')}</th>
                        <th style={{ width: colWidths.experience }}>Experience{rHandle('experience')}</th>
                        <th style={{ width: colWidths.qualification }}>Qualification{rHandle('qualification')}</th>
                        <th style={{ width: colWidths.shift }}>Shift{rHandle('shift')}</th>
                        <th style={{ width: colWidths.skills }}>Skills{rHandle('skills')}</th>
                        <th style={{ width: colWidths.benefits }}>Benefits{rHandle('benefits')}</th>
                        <th style={{ width: colWidths.verification }}>Verification{rHandle('verification')}</th> {/* NEW */}
                        <th style={{ width: colWidths.vacancies }}>Vacancies{rHandle('vacancies')}</th> {/* CHANGED */}
                        <th style={{ width: colWidths.state }}>State{rHandle('state')}</th>
                        <th style={{ width: colWidths.city }}>City{rHandle('city')}</th>
                        <th style={{ width: colWidths.location }}>Location{rHandle('location')}</th>
                        <th style={{ width: colWidths.salary_type }}>Salary Type{rHandle('salary_type')}</th>
                        <th style={{ width: colWidths.salary }}>Salary{rHandle('salary')}</th>
                        <th style={{ width: colWidths.status }}>Status{rHandle('status')}</th>
                        <th style={{ width: colWidths.expiry_date }}>Expiry Date{rHandle('expiry_date')}</th>
                        <th style={{ width: colWidths.status_time }}>Status Time{rHandle('status_time')}</th>
                        <th style={{ width: colWidths.created }}>Created{rHandle('created')}</th>
                        <th style={{ width: colWidths.job_life }}>Job Life (days){rHandle('job_life')}</th>
                        <th style={{ width: 'auto', whiteSpace: 'nowrap' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={33}>Loading...</td>
                        </tr>
                      ) : displayRows.length ? (
                        displayRows.map(job => {
                          const expired = isExpiredJob(job);
                          const verification = String(job.verification_status || 'pending').toLowerCase();
                          const isApproved = verification === 'approved';
                          const isPending = verification === 'pending'; // NEW
                          const isInactiveRow = String(job.status || '').toLowerCase() === 'inactive'; // NEW (restore neutral row styling)
                          const jobLifeDays = getJobLifeDays(job.created_at);
                          const mapsUrl = getGoogleMapsUrl(job.lat, job.lng);

                          return (
                            <tr
                              key={job.id}
                              onClick={(e) => handleRowClick(job.id, e)}
                              onAuxClick={(e) => { if (e.button === 1) handleRowClick(job.id, e); }}
                              style={{
                                background: isInactiveRow ? '#f3f4f6' : '#ffffff',
                                color: isInactiveRow ? '#94a3b8' : '#0f172a',
                                cursor: 'pointer'
                              }}
                            >
                              <td style={{ textAlign: 'center', padding: '4px' }} onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  style={{ width: 14, cursor: 'pointer' }}
                                  checked={selectedIds.has(job.id)}
                                  onChange={e => setSelectedIds(prev => {
                                    const next = new Set(prev);
                                    e.target.checked ? next.add(job.id) : next.delete(job.id);
                                    return next;
                                  })}
                                />
                              </td>
                              <td>
                                <Link
                                  to={`/jobs/${job.id}`}
                                  onClick={e => e.stopPropagation()}
                                  style={{ color: 'inherit', textDecoration: 'none' }}
                                >
                                  {job.id}
                                </Link>
                              </td>

                              <td>
                                {job.employer_id ? (
                                  <a
                                    href={`/employers/${job.employer_id}`}
                                    style={linkButtonStyle}
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/employers/${job.employer_id}`); }}
                                  >
                                    {(job.employer_name || `Employer #${job.employer_id}`)}
                                  </a>
                                ) : (job.employer_name || '-')}
                              </td>
                              <td>{getEmployerOrganizationName(job)}</td>
                              <td>{getEmployerBusinessCategory(job)}</td>

                              <td>{job.employer_phone || '-'}</td>
                              <td>{job.interviewer_contact || '-'}</td>      {/* NEW */}
                              <td>{job.shift_timing_display || '-'}</td>
                              <td>{(() => { const s = formatTime12h(job.work_start_time); const e2 = formatTime12h(job.work_end_time); return s && e2 ? `${s} - ${e2}` : s || e2 || '-'; })()}</td>
                              <td>{formatWorkDuration(job.work_start_time, job.work_end_time) || '-'}</td>

                              <td>
                                {job.job_profile || '-'}
                                {job.created_at && (
                                  <span style={NEW_BADGE_STYLE}>New</span>
                                )}
                              </td>
                              <td>{job.job_designation || '-'}</td>
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
                                {mapsUrl ? (
                                  <span style={locationCellStyle}>
                                    <button
                                      type="button"
                                      style={linkButtonStyle}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                                      }}
                                    >
                                      View location
                                    </button>
                                  </span>
                                ) : '-'}
                              </td>
                              <td>{job.salary_type || '-'}</td>
                              <td>
                                {job.salary_min && job.salary_max
                                  ? `${job.salary_min} - ${job.salary_max}`
                                  : (job.salary_min || job.salary_max || '-')}
                              </td>
                              <td>{renderStatusBadge(job)}</td>
                              <td>{formatExpiry(job.expired_at) || '-'}</td>
                              <td>{job.updated_at ? new Date(job.updated_at).toLocaleString() : '-'}</td>
                              <td>{job.created_at ? new Date(job.created_at).toLocaleString() : '-'}</td>
                              <td>{jobLifeDays}</td>
                              <td>
                                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                                  {/* CHANGED: Approve/Reject only when pending */}
                                  {jobPerms.canApproveReject && isPending && (
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
                                      {job.status === 'active' && !expired && (
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
                                          {job.status !== 'active' && (
                                            <button
                                              className="btn-small"
                                              style={{ minWidth:110 }}
                                              disabled={statusUpdatingId === job.id}
                                              onClick={(event) => { event.stopPropagation(); handleSetStatus(job, 'active'); }}
                                            >
                                              {statusUpdatingId === job.id ? 'Updating...' : 'Activate'}
                                            </button>
                                          )}
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
                                    <a
                                      className="btn-small btn-edit"
                                      href={`/jobs/${job.id}`}
                                      style={{ minWidth:80, textDecoration:'none' }}
                                      onClick={(event) => { event.stopPropagation(); event.preventDefault(); navigate(`/jobs/${job.id}`); }}
                                    >View</a>
                                    {jobPerms.canManage && (
                                      <a
                                        className="btn-small btn-edit"
                                        href={`/jobs?action=edit&id=${job.id}`}
                                        style={{ minWidth:80, textDecoration:'none' }}
                                        onClick={(event) => { event.stopPropagation(); event.preventDefault(); setEditJobId(job.id); setShowJobFormPanel(true); }}
                                      >Edit</a>
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
                          <td colSpan={25}>No data{/* CHANGED */}</td>
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
