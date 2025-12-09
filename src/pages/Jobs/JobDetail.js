import React, { useEffect, useState, useRef, useMemo } from 'react';
import jobApi from '../../api/jobApi';
import reportsApi from '../../api/reportsApi';
import '../Masters/MasterPage.css';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

const TABS = ['Job detail', 'Applicants', 'Violation Reports']; // changed 'Reports' to 'Violation Reports'
const APPLICANT_TABS = [
  { key: 'sent', label: 'Sent Interest' },
  { key: 'received', label: 'Received Interest' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' }
];

const statusBadge = (status) => {
  const palette = {
    active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
    inactive: { bg: '#fee2e2', color: '#b91c1c', label: 'Inactive' }
  };
  const key = (status || '').toLowerCase();
  const tone = palette[key] || { bg: '#e5e7eb', color: '#0f172a', label: status || '-' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:'999px', fontSize:12, fontWeight:600, background:tone.bg, color:tone.color }}>
      {tone.label}
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
  const jobPerms = useMemo(() => ({
    canView: hasPermission(PERMISSIONS.JOBS_VIEW),
    canManage: hasPermission(PERMISSIONS.JOBS_MANAGE),
    canStatusToggle: hasPermission(PERMISSIONS.JOBS_STATUS_TOGGLE),
    canRepost: hasPermission(PERMISSIONS.JOBS_REPOST),
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

  const toggleJobStatus = async () => {
    if (!job || !jobPerms.canStatusToggle) {
      setOptionsOpen(false);
      if (!jobPerms.canStatusToggle) alert('You do not have permission to update job status.');
      return;
    }
    const nextStatus = (job.status || '').toLowerCase() === 'active' ? 'inactive' : 'active';
    try {
      await jobApi.toggleStatus(job.id, nextStatus);
      setJob(prev => ({ ...prev, status: nextStatus }));
    } catch {
      alert('Failed to update job status');
    } finally {
      setOptionsOpen(false);
    }
  };
  const handleRepost = () => {
    if (!jobPerms.canRepost) {
      setOptionsOpen(false);
      alert('You do not have permission to repost jobs.');
      return;
    }
    setOptionsOpen(false);
    navigate('/jobs', { state: { cloneJobId: job.id } });
  };
  const handleShare = async () => { // add
    setOptionsOpen(false);
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

  if (!jobPerms.canView) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper" style={{ padding: 16 }}>You do not have permission to view this job.</div>
          </main>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
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
  }
  if (!job) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper" style={{ padding: 16 }}>Job not found.</div>
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
                {(jobPerms.canStatusToggle || jobPerms.canRepost) && (
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
                        {jobPerms.canStatusToggle && (
                          <button
                            style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                            onClick={toggleJobStatus}
                          >
                            {(job.status || '').toLowerCase() === 'active' ? 'Deactivate' : 'Activate'} job
                          </button>
                        )}
                        {jobPerms.canRepost && (
                          <button
                            style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                            onClick={handleRepost}
                          >
                            Repost job
                          </button>
                        )}
                        <button // add
                          style={{ width:'100%', textAlign:'left', padding:'8px 14px', background:'transparent', border:'none', fontSize:'13px', cursor:'pointer' }}
                          onClick={handleShare}
                        >
                          Share job
                        </button>
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
    </div>
  );
}

function JobDetailTab({ job }) {
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
          <Detail label="Job Profile" value={job.job_profile || (job.JobProfile?.profile_english)} />
          <Detail label="Household" value={job.is_household ? 'Yes' : 'No'} />
          <Detail label="Gender" value={genders} />
          <Detail label="Experiences" value={experiences} />
          <Detail label="Qualifications" value={qualifications} />
          <Detail label="Shifts" value={shifts} />
          <Detail label="Skills" value={skills} />
          <Detail label="Benefits" value={benefits} />
          <Detail label="Working Days" value={jobDays} />
          <Detail label="Vacancy" value={job.no_vacancy} />
          <Detail label="Hired" value={job.hired_total} />
          <Detail label="State" value={state} />
          <Detail label="City" value={city} />
          <Detail label="Salary" value={job.salary_min && job.salary_max ? `${job.salary_min} - ${job.salary_max}` : (job.salary_min || job.salary_max || '-')} />
          <Detail label="Status" value={statusBadge(job.status)} />
          <Detail label="Status Time" value={job.updated_at ? new Date(job.updated_at).toLocaleString() : '-'} />
          <Detail label="Created" value={job.created_at ? new Date(job.created_at).toLocaleString() : '-'} />
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
    timeLabel = 'Interest Sent Time';
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
  const verification = emp.verification_status || '-';
  const kyc = emp.kyc_status || '-';
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
  const verification = emp.verification_status || '-';
  const kyc = emp.kyc_status || '-';
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
  return (
    <div style={{ fontSize: '12px', lineHeight: '1.4', background: '#f9f9f9', padding: '8px', borderRadius: '4px', border: '1px solid #eee' }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div style={{ color: '#333' }}>{value !== undefined && value !== null && value !== '' ? value : '-'}</div>
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
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Violation Reports</h2>
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
