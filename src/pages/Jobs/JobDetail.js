import React, { useEffect, useState, useRef, useMemo } from 'react';
import jobApi from '../../api/jobApi';
import reportsApi from '../../api/reportsApi';
import { getAppBaseUrl } from '../../api/baseUrl';
import '../Masters/MasterPage.css';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const TABS = ['Job detail', 'Recommended Candidates', 'Applicants', 'Violation Reports']; // changed 'Reports' to 'Violation Reports'
const APPLICANT_TABS = [
  { key: 'sent', label: 'Sent Interest' },
  { key: 'received', label: 'Received Interest' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' }
];

const hasExpired = (value) => {
  if (!value) return false;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.getTime() <= Date.now();
};

const hasValidCoordinates = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

const getGoogleMapsUrl = (lat, lng) => (
  hasValidCoordinates(lat, lng)
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`
    : ''
);

const locationLinkStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  color: '#2563eb',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: 'inherit',
  fontFamily: 'inherit'
};

function renderLocationValue({ lat, lng, city, state }) {
  const mapsUrl = getGoogleMapsUrl(lat, lng);
  const locationLabel = [city, state].filter(Boolean).join(', ');

  if (!mapsUrl && !locationLabel) return '-';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', textAlign: 'left' }}>
      <span>{locationLabel || 'Coordinates available'}</span>
      {mapsUrl ? (
        <button
          type="button"
          style={locationLinkStyle}
          onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
        >
          View location
        </button>
      ) : null}
    </div>
  );
}

function getEmployerOrganizationName(job) {
  const organizationType = String(job?.employer_organization_type || job?.Employer?.organization_type || '').trim().toLowerCase();
  if (organizationType === 'domestic' || organizationType === 'household') return 'Household';
  return job?.employer_organization_name || job?.Employer?.organization_name || '-';
}

function getEmployerBusinessCategory(job) {
  return (
    job?.employer_business_category
    || job?.Employer?.BusinessCategory?.category_english
    || job?.Employer?.BusinessCategory?.category_hindi
    || '-'
  );
}

const statusBadge = (jobOrStatus) => {
  if (jobOrStatus === null || jobOrStatus === undefined) {
    return (
      <span style={{ display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:'999px', fontSize:12, fontWeight:600, background:'#e5e7eb', color:'#0f172a' }}>
        -
      </span>
    );
  }

  const job = (jobOrStatus && typeof jobOrStatus === 'object') ? jobOrStatus : { status: jobOrStatus };
  const status = String(job.status || '').toLowerCase();
  const expired = hasExpired(job.expired_at) || status === 'expired';

  const palette = {
    active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
    inactive: { bg: '#fee2e2', color: '#b91c1c', label: 'Inactive' },
    expired: { bg: '#fef3c7', color: '#92400e', label: 'Expired' }
  };

  const tone = palette[status] || { bg: '#e5e7eb', color: '#0f172a', label: status || '-' };
  const label = (expired && status === 'inactive') ? 'Expired • Inactive' : (expired ? 'Expired' : tone.label);

  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:'999px', fontSize:12, fontWeight:600, background: expired ? palette.expired.bg : tone.bg, color: expired ? palette.expired.color : tone.color }}>
      {label}
    </span>
  );
};

export default function JobDetail({ jobId: propJobId, onClose, onEdit }) {
  // Accept jobId from props or from route param
  const params = useParams();
  const jobId = propJobId || params.jobId;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [error, setError] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [reports, setReports] = useState([]);
  const [applicantTab, setApplicantTab] = useState(APPLICANT_TABS[0].key);
  const [reportsLoading, setReportsLoading] = useState(false); // add
  const [reportsError, setReportsError] = useState(null); // add
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef(null);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notice, setNotice] = useState(null); // add
  const [showUnverifiedDialog, setShowUnverifiedDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveShowOrg, setApproveShowOrg] = useState(true);
  const jobPerms = useMemo(() => ({
    canView: hasPermission(PERMISSIONS.JOBS_VIEW),
    canManage: hasPermission(PERMISSIONS.JOBS_MANAGE),
    canDelete: hasPermission(PERMISSIONS.JOBS_DELETE),
    canStatusToggle: hasPermission(PERMISSIONS.JOBS_STATUS_TOGGLE),
    canApproveReject: hasPermission(PERMISSIONS.JOBS_APPROVE_REJECT),
    canRepost: hasPermission(PERMISSIONS.JOBS_REPOST),
    canShowOrganization: hasPermission(PERMISSIONS.JOBS_SHOW_ORGANIZATION),
  }), []);

  useEffect(() => {
    setSidebarOpen(getSidebarState()); // add
  }, []);

  const handleMenuClick = () => { // add
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    saveSidebarState(newState);
  };

  useEffect(() => {
    if (!jobPerms.canView) return;
    setLoading(true);
    jobApi.getById(jobId)
      .then(res => setJob(res.data?.data || null))
      .catch(() => setError('Failed to load job'))
      .finally(() => setLoading(false));
  }, [jobId, jobPerms.canView]);

  useEffect(() => {
    if (activeTab === 'Applicants') {
      jobApi.getApplicants(jobId)
        .then(res => setApplicants(res.data?.data || []))
        .catch(() => setApplicants([]));
    }
    if (activeTab === 'Violation Reports') {
      fetchViolationReports();
    }
  }, [activeTab, jobId]);

  const fetchViolationReports = async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      // Fetch reports where report_type='job' and report_id=jobId
      const res = await reportsApi.getReports({
        report_type: 'job',
        report_id: jobId
      });
      setReports(res.data?.data || []);
    } catch (e) {
      setReportsError('Failed to load violation reports');
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleMarkReportAsRead = async (reportId) => {
    try {
      await reportsApi.markReportAsRead(reportId);
      setReports(reports =>
        reports.map(r =>
          r.id === reportId ? { ...r, read_at: new Date().toISOString() } : r
        )
      );
    } catch (e) {
      alert('Failed to mark as read');
    }
  };

  useEffect(() => {
    const handler = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setOptionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isExpiredJob = React.useCallback((j) => hasExpired(j?.expired_at) || String(j?.status || '').toLowerCase() === 'expired', []);

  const setJobStatus = async (nextStatus) => {
    if (!job || !jobPerms.canStatusToggle) {
      setOptionsOpen(false);
      if (!jobPerms.canStatusToggle) alert('You do not have permission to update job status.');
      return;
    }
    try {
      await jobApi.toggleStatus(job.id, nextStatus);

      // avoid crashing if prev becomes null during re-renders
      setJob(prev => ({
        ...(prev || {}),
        status: nextStatus,
        expired_at: nextStatus === 'active' ? null : (prev?.expired_at ?? null)
      }));

      const res = await jobApi.getById(jobId);
      setJob(res.data?.data || null);
    } catch {
      alert('Failed to update job status');
    } finally {
      setOptionsOpen(false);
    }
  };

  const toggleJobStatus = async () => {
    // keep existing behavior for quick active<->inactive, but route through setJobStatus
    const nextStatus = (job?.status || '').toLowerCase() === 'active' ? 'inactive' : 'active';
    await setJobStatus(nextStatus);
  };

  const handleMarkExpired = async () => setJobStatus('expired');

  const isApprovedJob = React.useCallback(
    (j) => String(j?.verification_status || 'pending').toLowerCase() === 'approved',
    []
  );

  const isPendingJob = React.useCallback(
    (j) => String(j?.verification_status || 'pending').toLowerCase() === 'pending',
    []
  );

  const setJobVerificationStatus = async (next) => {
    if (!job || !jobPerms.canApproveReject) {
      setOptionsOpen(false);
      if (!jobPerms.canApproveReject) alert('You do not have permission to approve/reject jobs.');
      return;
    }
    if (next === 'approved') {
      const evs = String(job?.Employer?.verification_status || 'pending').toLowerCase();
      if (evs !== 'verified' && evs !== 'approved') {
        setShowUnverifiedDialog(true);
        setOptionsOpen(false);
        return;
      }
      // Only show the org-visibility dialog if the user has that permission
      if (jobPerms.canShowOrganization) {
        setApproveShowOrg(true);
        setShowApproveDialog(true);
        setOptionsOpen(false);
        return;
      }
    }
    try {
      await jobApi.setVerificationStatus(job.id, next);
      const res = await jobApi.getById(jobId);
      setJob(res.data?.data || null);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update verification status');
    } finally {
      setOptionsOpen(false);
    }
  };

  const confirmApproveJob = async () => {
    setShowApproveDialog(false);
    try {
      await jobApi.setVerificationStatus(job.id, 'approved', { show_organization: approveShowOrg ? 1 : 0 });
      const res = await jobApi.getById(jobId);
      setJob(res.data?.data || null);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to approve job');
    }
  };

  const toggleShowOrganization = async () => {
    if (!job || !jobPerms.canManage) return;
    const next = Number(job.show_organization) === 0 ? 1 : 0;
    setOptionsOpen(false);
    try {
      await jobApi.setShowOrganization(job.id, next);
      setJob((prev) => prev ? { ...prev, show_organization: next } : prev);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update organization visibility');
    }
  };

  const handleShareJob = async () => {
    const slug = job?.slug;
    if (!slug) {
      setOptionsOpen(false);
      return;
    }

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
      setNotice({ type: 'success', text: 'Share link copied to clipboard.' });
    } catch {
      setNotice({ type: 'error', text: 'Failed to copy share link.' });
    } finally {
      setOptionsOpen(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {notice && ( // add
              <div className={`inline-message ${notice.type === 'error' ? 'error' : 'success'}`}>
                {notice.text}
                <button className="msg-close" onClick={() => setNotice(null)}>✕</button>
              </div>
            )}
            <div className="list-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h1 style={{ margin: 0 }}>Job Detail</h1>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary small"
                  onClick={onClose ? onClose : () => navigate(-1)}
                  style={{ padding: '4px 10px' }}
                >
                  Back
                </button>
                {jobPerms.canManage && (
                  <button
                    className="btn-primary small"
                    onClick={onEdit ? onEdit : () => navigate('/jobs', { state: { editJobId: job.id } })}
                    style={{ padding: '4px 10px' }}
                  >
                    Edit
                  </button>
                )}
                {(jobPerms.canStatusToggle || jobPerms.canRepost || jobPerms.canManage || jobPerms.canApproveReject) && (
                  <div ref={optionsRef} style={{ position:'relative' }}>
                    <button
                      className="btn-secondary small"
                      onClick={() => setOptionsOpen(o => !o)}
                      style={{ padding: '4px 10px' }}
                      title="Actions"
                    >
                      ⋮
                    </button>
                    {optionsOpen && (
                      <div
                        style={{
                          position:'absolute',
                          right:0,
                          top:'calc(100% + 6px)',
                          minWidth:'180px',
                          background:'#fff',
                          border:'1px solid #e2e8f0',
                          borderRadius:'8px',
                          boxShadow:'0 12px 24px rgba(15,23,42,0.15)',
                          zIndex:20,
                          padding:'6px 0'
                        }}
                      >
                        {/* NEW: share job (restored) */}
                        <button
                          style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                          onClick={handleShareJob}
                        >
                          Share job
                        </button>

                        <div style={{ height: 1, background: '#e2e8f0', margin: '6px 0' }} />

                        {/* CHANGED: Approve/Reject only when pending */}
                        {jobPerms.canApproveReject && isPendingJob(job) && (
                          <>
                            <button
                              style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                              onClick={() => setJobVerificationStatus('approved')}
                            >
                              Approve job
                            </button>
                            <button
                              style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                              onClick={() => setJobVerificationStatus('rejected')}
                            >
                              Reject job
                            </button>
                            <div style={{ height: 1, background: '#e2e8f0', margin: '6px 0' }} />
                          </>
                        )}

                        {/* unchanged: status actions only when approved */}
                        {jobPerms.canStatusToggle && isApprovedJob(job) && (
                          <>
                            {/* Active: Deactivate + Mark Expired */}
                            {(job.status || '').toLowerCase() === 'active' && (
                              <>
                                <button
                                  style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                                  onClick={toggleJobStatus}
                                >
                                  Deactivate job
                                </button>
                                <button
                                  style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                                  onClick={handleMarkExpired}
                                >
                                  Mark expired
                                </button>
                              </>
                            )}

                            {/* Inactive (not expired): Activate + Mark Expired */}
                            {(job.status || '').toLowerCase() === 'inactive' && !isExpiredJob(job) && (
                              <>
                                <button
                                  style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                                  onClick={() => setJobStatus('active')}
                                >
                                  Activate job
                                </button>
                                <button
                                  style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                                  onClick={handleMarkExpired}
                                >
                                  Mark expired
                                </button>
                              </>
                            )}

                            {/* Expired: Activate or Inactive */}
                            {isExpiredJob(job) && (
                              <>
                                <button
                                  style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                                  onClick={() => setJobStatus('active')}
                                >
                                  Activate job
                                </button>
                                {(job.status || '').toLowerCase() !== 'inactive' && (
                                  <button
                                    style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                                    onClick={() => setJobStatus('inactive')}
                                  >
                                    Mark inactive
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                        {/* Show / Hide Organization (approved jobs, canShowOrganization) */}
                        {jobPerms.canShowOrganization && isApprovedJob(job) && (
                          <>
                            <div style={{ height: 1, background: '#e2e8f0', margin: '6px 0' }} />
                            <button
                              style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                              onClick={toggleShowOrganization}
                            >
                              {Number(job.show_organization) === 0 ? 'Show organization' : 'Hide organization'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="tabs-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '16px 0' }}>
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`tab-btn${activeTab === tab ? ' active' : ''}`}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    border: '1px solid #ccc',
                    background: activeTab === tab ? '#2563eb' : '#fff',
                    color: activeTab === tab ? '#fff' : '#333',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div
              className="tab-content"
              style={{
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '16px',
                width: '100%',
                overflow: 'visible'
              }}
            >
              {activeTab === 'Job detail' && (
                <JobDetailTab job={job} />
              )}
              {activeTab === 'Recommended Candidates' && (
                <RecommendedCandidatesTab jobId={jobId} />
              )}
              {activeTab === 'Applicants' && (
                <ApplicantsTab
                  applicants={applicants}
                  applicantTab={applicantTab}
                  setApplicantTab={setApplicantTab}
                  jobId={jobId}
                  navigate={navigate}
                />
              )}
              {activeTab === 'Violation Reports' && (
                <ViolationReportsTab
                  reports={reports}
                  loading={reportsLoading}
                  error={reportsError}
                  onMarkAsRead={handleMarkReportAsRead}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {showUnverifiedDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '28px 24px', maxWidth: '360px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Profile Not Verified</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#475569' }}>
              The employer's profile is not verified. Please verify the profile before approving this job.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowUnverifiedDialog(false)}
                style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowUnverifiedDialog(false); navigate(`/employers/${job?.employer_id}`); }}
                style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
              >
                View Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {showApproveDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '28px 24px', maxWidth: '380px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Approve Job</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#475569' }}>
              Choose how the organization name appears to candidates in the app.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '24px' }}>
              <input
                type="checkbox"
                checked={approveShowOrg}
                onChange={(e) => setApproveShowOrg(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>
                Show organization name to candidates
              </span>
            </label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowApproveDialog(false)}
                style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmApproveJob}
                style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JobDetailTab({ job }) {
  if (!job) return <div style={{ fontSize: '13px', color: '#666' }}>Loading...</div>;

  // CHANGED: render verification as a chip
  const verificationChip = (() => {
    const v = String(job.verification_status || 'pending').toLowerCase();
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
  })();

  // Helper to map day numbers to names (for legacy/array support)
  const dayNumberToName = (d) => {
    const map = {
      '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
      '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '7': 'Sunday',
      1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
      4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday',
      'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday',
      'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday'
    };
    if (typeof d === 'object' && d !== null && d.day) d = d.day;
    if (typeof d === 'object' && d !== null && d.value) d = d.value;
    if (typeof d === 'string' && map[d.toLowerCase()]) return map[d.toLowerCase()];
    if (typeof d === 'number' && map[d]) return map[d];
    return d;
  };

  const dayToShort = (d) => {
    const name = dayNumberToName(d);
    const key = String(name || '').toLowerCase();
    const map = {
      monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
      thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
    };
    return map[key] || null;
  };

  // Use direct fields from backend if present, fallback to legacy/joined data
  // Gender (already handled)
  let genders = '-';
  if (Array.isArray(job.genders)) {
    genders = job.genders.join(', ');
  } else if (typeof job.genders === 'string') {
    genders = job.genders.includes(',') ? job.genders : job.genders.split(' ').join(', ');
  } else if (Array.isArray(job.JobGenders)) {
    genders = job.JobGenders.map(g => g.gender).join(', ');
  }

  // Experience: handle array or string, always show comma-separated
  let experiences = '-';
  if (Array.isArray(job.experiences)) {
    experiences = job.experiences.join(', ');
  } else if (typeof job.experiences === 'string') {
    experiences = job.experiences;
  } else if (Array.isArray(job.JobExperiences)) {
    experiences = job.JobExperiences
      .map(e => e.Experience?.title_english || e.Experience?.title_hindi)
      .filter(Boolean)
      .join(', ');
  }

  // Qualifications: handle array or string, always show comma-separated
  let qualifications = '-';
  if (Array.isArray(job.qualifications)) {
    qualifications = job.qualifications.join(', ');
  } else if (typeof job.qualifications === 'string') {
    qualifications = job.qualifications;
  } else if (Array.isArray(job.JobQualifications)) {
    qualifications = job.JobQualifications
      .map(q => q.Qualification?.qualification_english || q.Qualification?.qualification_hindi)
      .filter(Boolean)
      .join(', ');
  }

  const shifts = job.shifts || (Array.isArray(job.JobShifts) ? job.JobShifts.map(s => s.Shift?.shift_english).filter(Boolean).join(', ') : '-');
  const skills = job.skills || (Array.isArray(job.JobSkills) ? job.JobSkills.map(s => s.Skill?.skill_english).filter(Boolean).join(', ') : '-');
  const benefits = job.benefits || (Array.isArray(job.SelectedJobBenefits) ? job.SelectedJobBenefits.map(b => b.JobBenefit?.benefit_english).filter(Boolean).join(', ') : '-');

  // Working Days (show as day names if array, else show as string)
  let jobDays = '-';
  if (Array.isArray(job.job_days) && job.job_days.length) {
    jobDays = job.job_days.map(dayNumberToName).join(', ');
  } else if (typeof job.job_days === 'string') {
    jobDays = job.job_days;
  }

  // Short format for job days (Mon, Tue, ...)
  const jobDaysShort = Array.isArray(job.job_days) && job.job_days.length
    ? job.job_days.map(dayToShort).filter(Boolean).join(',')
    : '';

  const formatTime12h = (t) => {
    if (!t) return '';
    const s = String(t).trim();
    const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!m) return s; // fallback
    let hh = parseInt(m[1], 10);
    const mm = m[2];
    if (Number.isNaN(hh)) return s;
    const suffix = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${hh}:${mm} ${suffix}`;
  };

  const start12 = formatTime12h(job.work_start_time);
  const end12 = formatTime12h(job.work_end_time);

  const timeRange =
    (start12 && end12)
      ? `${start12} - ${end12}`
      : (start12 || end12 || '');

  const workDuration = (() => {
    const s = job.work_start_time;
    const e = job.work_end_time;
    if (!s || !e) return '';
    const [sh, sm] = String(s).split(':').map(Number);
    const [eh, em] = String(e).split(':').map(Number);
    if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return '';
    let totalMins = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMins <= 0) totalMins += 24 * 60;
    const h = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
  })();

  const shiftTiming = [jobDaysShort || null, timeRange || null].filter(Boolean).join(' • ') || '-';

  // State and City
  const state = job.job_state || job.State?.state_english || '-';
  const city = job.job_city || job.City?.city_english || '-';

  return (
    <div>
      <div className="detail-section" style={{ paddingLeft: 0 }}>
        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '12px' }}>
          <Detail label="ID" value={job.id} />
          <Detail
            label="Employer"
            value={
              job.employer_name
              || job.Employer?.name
              || job.employer_id
              || '-'
            }
          />
          <Detail label="Organization Name" value={getEmployerOrganizationName(job)} />
          <Detail label="Organization Category" value={getEmployerBusinessCategory(job)} />
          <Detail label="Job Profile" value={job.job_profile || (job.JobProfile?.profile_english)} />
          <Detail label="Job Designation" value={job.job_designation || '-'} />
          <Detail label="Household" value={job.is_household ? 'Yes' : 'No'} />
          <Detail label="Gender" value={genders} />
          <Detail label="Experiences" value={experiences} />
          <Detail label="Qualifications" value={qualifications} />
          <Detail label="Shifts" value={shifts} />
          <Detail label="Skills" value={skills} />
          <Detail label="Benefits" value={benefits} />
          <Detail label="Working Days" value={jobDays} />

          {/* CHANGED: show combined hired/total */}
          <Detail
            label="Vacancies (Hired/Total)"
            value={`${Number(job.hired_total ?? 0)}/${Number(job.no_vacancy ?? 0)}`}
          />

          <Detail label="State" value={state} />
          <Detail label="City" value={city} />
          <Detail label="Location" value={renderLocationValue({ lat: job.lat, lng: job.lng, city, state })} />
          <Detail label="Salary" value={job.salary_min && job.salary_max ? `${job.salary_min} - ${job.salary_max}` : (job.salary_min || job.salary_max || '-')} />
          <Detail label="Salary Type" value={job.salary_type || job.SalaryType?.type_english || job.SalaryType?.type_hindi || "-"} />
          <Detail label="Status" value={statusBadge(job)} />
          <Detail label="Expired At" value={job.expired_at ? new Date(job.expired_at).toLocaleString() : '-'} />
          <Detail label="Status Time" value={job.updated_at ? new Date(job.updated_at).toLocaleString() : '-'} />
          <Detail label="Created" value={job.created_at ? new Date(job.created_at).toLocaleString() : '-'} />
          <Detail label="Interviewer Contact" value={job.interviewer_contact || '-'} />
          <Detail label="Shift Timing" value={shiftTiming} />
          {(start12 || end12) && <Detail label="Working Hours" value={timeRange || '-'} />}
          {workDuration && <Detail label="Working Hours Duration" value={workDuration} />}
          <Detail label="Verification Status" value={verificationChip} /> {/* CHANGED */}
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description (English):</strong>
          <div style={{ fontSize: '13px', lineHeight: '1.4', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{job.description_english}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Description (Hindi):</strong>
          <div style={{ fontSize: '13px', lineHeight: '1.4', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{job.description_hindi}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Job Location:</strong>
          <div style={{ fontSize: '13px', lineHeight: '1.4', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{job.job_location || '-'}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Job Address (English):</strong>
          <div style={{ fontSize: '13px', lineHeight: '1.4', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{job.job_address_english}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Job Address (Hindi):</strong>
          <div style={{ fontSize: '13px', lineHeight: '1.4', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{job.job_address_hindi}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Other Benefit (English):</strong>
          <div style={{ fontSize: '13px', lineHeight: '1.4', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{job.other_benefit_english}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <strong>Other Benefit (Hindi):</strong>
          <div style={{ fontSize: '13px', lineHeight: '1.4', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{job.other_benefit_hindi}</div>
        </div>
      </div>
    </div>
  );
}



function RecommendedCandidatesTab({ jobId }) {
  const canViewEmployees = useMemo(() => hasPermission(PERMISSIONS.EMPLOYEES_VIEW), []);
  const canShowPhone = useMemo(() => hasPermission(PERMISSIONS.EMPLOYEES_SHOW_PHONE_ADDRESS), []);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!canViewEmployees) return;
    if (!jobId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    jobApi
      .getRecommendedCandidates(jobId)
      .then((res) => {
        const data = res.data?.data || [];
        if (mounted) setRows(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) {
          setRows([]);
          setError('Failed to load recommended candidates');
        }
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [jobId, canViewEmployees]);

  if (!canViewEmployees) {
    return <div style={{ fontSize: '13px', color: '#666' }}>You do not have permission to view employees.</div>;
  }

  const chipBase = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    border: '1px solid transparent',
    whiteSpace: 'nowrap'
  };

  const renderVerificationChip = (value) => {
    const v = String(value || 'pending').toLowerCase();
    const palette = {
      pending: { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', label: 'Pending' },
      approved: { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Approved' },
      rejected: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'Rejected' }
    };
    const tone = palette[v] || { bg: '#e5e7eb', color: '#0f172a', border: '#cbd5e1', label: value || '-' };
    return <span style={{ ...chipBase, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>{tone.label}</span>;
  };

  const renderKycChip = (value) => {
    const v = String(value || 'pending').toLowerCase();
    // handle common aliases
    const normalized = (v === 'granted' || v === 'verified') ? 'approved' : (v === 'rejected' ? 'rejected' : (v === 'pending' ? 'pending' : v));
    const palette = {
      pending: { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', label: 'Pending' },
      approved: { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Approved' },
      rejected: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'Rejected' }
    };
    const tone = palette[normalized] || { bg: '#e5e7eb', color: '#0f172a', border: '#cbd5e1', label: value || '-' };
    return <span style={{ ...chipBase, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>{tone.label}</span>;
  };

  const renderUserStatusChip = (isActive) => {
    if (isActive === null || isActive === undefined) {
      return <span style={{ ...chipBase, background: '#e5e7eb', color: '#0f172a', border: '1px solid #cbd5e1' }}>-</span>;
    }
    const active = Boolean(isActive);
    const tone = active
      ? { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Active' }
      : { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'Inactive' };
    return <span style={{ ...chipBase, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>{tone.label}</span>;
  };


  if (loading) return <div style={{ fontSize: '13px' }}>Loading...</div>;
  if (error) return <div style={{ color: '#b91c1c', fontSize: '12px' }}>{error}</div>;
  if (!rows.length) return <div style={{ fontSize: '13px', color: '#666' }}>No matching candidates found.</div>;

  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Recommended Candidates</h2>
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Mobile</th>
              <th style={thStyle}>Gender</th>
              <th style={thStyle}>Qualification</th>
              <th style={thStyle}>Expected Salary</th>
              <th style={thStyle}>Salary Freq</th>
              <th style={thStyle}>Preferred State</th>
              <th style={thStyle}>Preferred City</th>
              <th style={thStyle}>Job Profiles</th>
              <th style={thStyle}>Verification</th>
              <th style={thStyle}>KYC</th>
              <th style={thStyle}>User Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const profiles = Array.isArray(r.job_profiles)
                ? r.job_profiles
                    .map((p) => p?.profile_english || p?.profile_hindi)
                    .filter(Boolean)
                    .join(', ')
                : '-';

              return (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.id}</td>
                  <td style={tdStyle}>
                    <Link to={`/employees/${r.id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                      {r.name || '-'}
                    </Link>
                  </td>
                  <td style={tdStyle}>{canShowPhone ? (r.mobile || '-') : '-'}</td>
                  <td style={tdStyle}>{r.gender || '-'}</td>
                  <td style={tdStyle}>{r.qualification || '-'}</td>
                  <td style={tdStyle}>{r.expected_salary ?? '-'}</td>
                  <td style={tdStyle}>{r.expected_salary_frequency || '-'}</td>
                  <td style={tdStyle}>{r.preferred_state || '-'}</td>
                  <td style={tdStyle}>{r.preferred_city || '-'}</td>
                  <td style={tdStyle}>{profiles || '-'}</td>
                  <td style={tdStyle}>{renderVerificationChip(r.verification_status)}</td>
                  <td style={tdStyle}>{renderKycChip(r.kyc_status)}</td>
                  <td style={tdStyle}>{renderUserStatusChip(r.is_active)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApplicantsTab({ applicants, applicantTab, setApplicantTab, jobId, navigate }) {
  // Group applicants by rules
  const grouped = {
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
      <ApplicantTable
        applicants={grouped[applicantTab]}
        type={applicantTab}
        jobId={jobId}
        navigate={navigate}
      />
    </div>
  );
}

function ApplicantTable({ applicants, type, navigate }) {
  if (!applicants || applicants.length === 0) {
    return <div style={{ fontSize: '13px', color: '#666' }}>No applicants found.</div>;
  }

  // Define time label and field based on tab
  let timeLabel = 'Time';
  let timeField = 'applied_at';
  if (type === 'sent') {
    timeLabel = 'Sent Time';
    timeField = 'applied_at';
  } else if (type === 'received') {
    timeLabel = 'Applied Time';
    timeField = 'applied_at';
  } else if (type === 'shortlisted') {
    timeLabel = 'Shortlisted Time';
    timeField = 'updated_at';
  } else if (type === 'hired') {
    timeLabel = 'Hired Time';
    timeField = 'updated_at';
  } else if (type === 'rejected') {
    timeLabel = 'Rejected Time';
    timeField = 'updated_at';
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
      <thead>
        <tr style={{ background: '#f5f5f5' }}>
          <th style={thStyle}>ID</th>
          <th style={thStyle}>Name</th>
          <th style={thStyle}>Verification</th>
          <th style={thStyle}>KYC</th>
          <th style={thStyle}>Preferred Salary</th>
          <th style={thStyle}>Preferred State</th>
          <th style={thStyle}>Preferred City</th>
          <th style={thStyle}>Job Profiles</th>
          <th style={thStyle}>OTP</th>
          <th style={thStyle}>Status</th>
          <th style={thStyle}>{timeLabel}</th>
        </tr>
      </thead>
      <tbody>
        {applicants.map(a => (
          <ApplicantRow key={a.id} applicant={a} timeField={timeField} navigate={navigate} />
        ))}
      </tbody>
    </table>
  );
}

function ApplicantRow({ applicant, timeField, navigate }) {
  const emp = applicant.employee || {};
  const name = emp.name || applicant.name || '-';
  const verification = emp.kyc_status || '-';
  const kyc = emp.verification_status || '-';
  const salary = emp.expected_salary ? `${emp.expected_salary}` : '-';
  const state = emp.PreferredState?.state_english || emp.preferred_state || '-';
  const city = emp.PreferredCity?.city_english || emp.preferred_city || '-';
  const profiles = Array.isArray(emp.JobProfiles)
    ? emp.JobProfiles.map(jp => jp.profile_english || jp.profile_hindi).join(', ')
    : (emp.job_profiles || '-');
  const status = applicant.status;
  const timeValue = applicant[timeField] ? new Date(applicant[timeField]).toLocaleString() : '-';

  // Employee ID for navigation (emp.id)
  const employeeId = emp.id;

  return (
    <tr>
      <td style={tdStyle}>{applicant.id}</td>
      <td style={tdStyle}>
        {employeeId ? (
          <Link
            to={`/employees/${employeeId}`}
            style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {name}
          </Link>
        ) : name}
      </td>
      <td style={tdStyle}>{verification}</td>
      <td style={tdStyle}>{kyc}</td>
      <td style={tdStyle}>{salary}</td>
      <td style={tdStyle}>{state}</td>
      <td style={tdStyle}>{city}</td>
      <td style={tdStyle}>{profiles}</td>
      <td style={tdStyle}>{applicant.otp || '-'}</td>
      <td style={tdStyle}>{status}</td>
      <td style={tdStyle}>{timeValue}</td>
    </tr>
  );
}

const thStyle = { textAlign: 'left', padding: '8px', border: '1px solid #ddd' };
const tdStyle = { padding: '6px', border: '1px solid #eee' };

// Row for received interest with employee details
function ReceivedInterestRow({ applicant }) {
  // Assume backend provides employee details in applicant.employee or similar
  const emp = applicant.employee || {};
  // Fallbacks for direct fields
  const name = emp.name || applicant.name || '-';
  const verification = emp.kyc_status || '-';
  const kyc = emp.verification_status || '-';
  const salary = emp.expected_salary ? `${emp.expected_salary}` : '-';
  const state = emp.PreferredState?.state_english || emp.preferred_state || '-';
  const city = emp.PreferredCity?.city_english || emp.preferred_city || '-';
  const profiles = Array.isArray(emp.JobProfiles)
    ? emp.JobProfiles.map(jp => jp.profile_english || jp.profile_hindi).join(', ')
    : (emp.job_profiles || '-');

  return (
    <tr>
      <td style={tdStyle}>{applicant.id}</td>
      <td style={tdStyle}>{name}</td>
      <td style={tdStyle}>{verification}</td>
      <td style={tdStyle}>{kyc}</td>
      <td style={tdStyle}>{salary}</td>
      <td style={tdStyle}>{state}</td>
      <td style={tdStyle}>{city}</td>
      <td style={tdStyle}>{profiles}</td>
      <td style={tdStyle}>{applicant.status}</td>
      <td style={tdStyle}>{applicant.applied_at ? new Date(applicant.applied_at).toLocaleString() : '-'}</td>
    </tr>
  );
}

function ReportsTab({ reports }) {
  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Reports</h2>
      {reports.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No reports found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>Message</th>
              <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>Reported At</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id}>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.id}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.type}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.message}</td>
                <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  const isNode = React.isValidElement(value);
  const displayValue = isNode
    ? value
    : (value !== undefined && value !== null && value !== '' ? value : '-');
  return (
    <div style={{ fontSize: '12px', lineHeight: '1.4', background: '#f9f9f9', padding: '8px', borderRadius: '4px', border: '1px solid #eee' }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div style={{ color: '#333' }}>{displayValue}</div>
    </div>
  );
}

function DefaultApplicantRow({ applicant }) {
  // Show job profiles if available (for employee interests)
  let profiles = '-';
  if (applicant.employee && Array.isArray(applicant.employee.JobProfiles) && applicant.employee.JobProfiles.length > 0) {
    profiles = applicant.employee.JobProfiles.map(jp => jp.profile_english || jp.profile_hindi).join(', ');
  }
  return (
    <tr>
      <td style={tdStyle}>{applicant.id}</td>
      <td style={tdStyle}>{applicant.name || '-'}</td>
      <td style={tdStyle}>{applicant.mobile || '-'}</td>
      <td style={tdStyle}>{profiles}</td>
      <td style={tdStyle}>{applicant.status}</td>
      <td style={tdStyle}>{applicant.applied_at ? new Date(applicant.applied_at).toLocaleString() : '-'}</td>
    </tr>
  );
}

function ViolationReportsTab({ reports, loading, error, onMarkAsRead }) {
  const formatDateTime = (val) => {
    if (!val) return '-';
    try {
      return new Date(val).toLocaleString();
    } catch {
      return val;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h2 style={{ marginTop: 0, fontSize: '16px' }}>Violation Reports</h2>
      </div>
      {error && (
        <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{error}</div>
      )}
      {loading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : reports.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No violation reports found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Employee Name</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Reason</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Date/Time</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => {
              // For job reports: user_id is the employee who reported
              const employee = r.reporter_entity;
              const employeeId = employee?.id;
              const employeeName = employee?.name || '-';
              const reason = r.reason?.reason_english || '-';
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
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{reason}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{r.description || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>{formatDateTime(r.created_at)}</td>
                  <td style={{ padding: '6px', border: '1px solid #eee' }}>
                    <button
                      className="btn-small"
                      disabled={!!r.read_at}
                      onClick={() => onMarkAsRead(r.id)}
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
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
