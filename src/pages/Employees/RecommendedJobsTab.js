import React from 'react';
import { Link } from 'react-router-dom';
import employeesApi from '../../api/employeesApi';
import { useResizableColumns } from '../../hooks/useResizableColumns';

const REC_JOBS_COL_DEFAULTS = {
  employer: 160, organization: 180, org_type: 130, employer_phone: 140,
  interviewer_contact: 160, job_profile: 180, shift_timing: 140, household: 110,
  gender: 140, experience: 180, qualification: 180, shift: 160,
  skills: 260, benefits: 260, verification: 140, vacancies: 120,
  state: 160, city: 160, job_status: 140, job_life: 110, created_at: 180
};

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  } catch {
    return '-';
  }
};

const renderJobVerificationBadge = (value) => {
  const v = (value || '').toString().toLowerCase();
  const tone =
    v === 'approved'
      ? { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Approved' }
      : v === 'rejected'
      ? { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'Rejected' }
      : { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', label: 'Pending' };

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
};

const renderJobStatusChip = (jobStatus, isExpired) => {
  const v = (jobStatus || '').toString().toLowerCase();
  const expired = !!isExpired || v === 'expired';

  const tone = expired
    ? { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', label: 'Expired' }
    : { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Active' };

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
};

export default function RecommendedJobsTab({ employeeId, perms }) {
  const { colWidths, rHandle } = useResizableColumns('rec-jobs-col-widths', REC_JOBS_COL_DEFAULTS);
  const [recommendedJobs, setRecommendedJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!employeeId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await employeesApi.getEmployeeRecommendedJobs(employeeId);
        const rows = res.data?.data || [];
        if (mounted) setRecommendedJobs(rows);
      } catch (e) {
        if (mounted) {
          setRecommendedJobs([]);
          setError('Failed to load recommended jobs');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [employeeId]);

  const thBase = { padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdBase = { padding: '6px', border: '1px solid #eee', verticalAlign: 'top' };
  const th = (minWidth) => ({ ...thBase, minWidth });

  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '16px' }}>Recommended Jobs</h2>

      {error && <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{error}</div>}

      {loading ? (
        <div style={{ fontSize: '13px' }}>Loading...</div>
      ) : recommendedJobs.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#666' }}>No matching jobs found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="col-resizable" style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ ...th(0), width: colWidths.employer }}>Employer{rHandle('employer')}</th>
                <th style={{ ...th(0), width: colWidths.organization }}>Organization{rHandle('organization')}</th>
                <th style={{ ...th(0), width: colWidths.org_type }}>Org Type{rHandle('org_type')}</th>
                {perms?.canShowEmployerPhoneAddress && (
                  <th style={{ ...th(0), width: colWidths.employer_phone }}>Employer Phone{rHandle('employer_phone')}</th>
                )}
                <th style={{ ...th(0), width: colWidths.interviewer_contact }}>Interviewer Contact{rHandle('interviewer_contact')}</th>
                <th style={{ ...th(0), width: colWidths.job_profile }}>Job Profile{rHandle('job_profile')}</th>
                <th style={{ ...th(0), width: colWidths.shift_timing }}>Shift Timing{rHandle('shift_timing')}</th>
                <th style={{ ...th(0), width: colWidths.household }}>Household{rHandle('household')}</th>
                <th style={{ ...th(0), width: colWidths.gender }}>Gender{rHandle('gender')}</th>
                <th style={{ ...th(0), width: colWidths.experience }}>Experience{rHandle('experience')}</th>
                <th style={{ ...th(0), width: colWidths.qualification }}>Qualification{rHandle('qualification')}</th>
                <th style={{ ...th(0), width: colWidths.shift }}>Shift{rHandle('shift')}</th>
                <th style={{ ...th(0), width: colWidths.skills }}>Skills{rHandle('skills')}</th>
                <th style={{ ...th(0), width: colWidths.benefits }}>Benefits{rHandle('benefits')}</th>
                <th style={{ ...th(0), width: colWidths.verification }}>Verification{rHandle('verification')}</th>
                <th style={{ ...th(0), width: colWidths.vacancies }}>Vacancies{rHandle('vacancies')}</th>
                <th style={{ ...th(0), width: colWidths.state }}>State{rHandle('state')}</th>
                <th style={{ ...th(0), width: colWidths.city }}>City{rHandle('city')}</th>
                <th style={{ ...th(0), width: colWidths.job_status }}>Job Status{rHandle('job_status')}</th>
                <th style={{ ...th(0), width: colWidths.job_life }}>Job Life{rHandle('job_life')}</th>
                <th style={{ ...th(0), width: colWidths.created_at }}>Created At{rHandle('created_at')}</th>
              </tr>
            </thead>
            <tbody>
              {recommendedJobs.map((row) => {
                const isExpiredRow = !!row.is_expired || (row.job_status || '').toString().toLowerCase() === 'expired';
                const rowStyle = isExpiredRow ? { background: '#f3f4f6', color: '#6b7280' } : undefined;
                const linkStyle = { color: isExpiredRow ? '#6b7280' : '#2563eb', textDecoration: 'underline' };
                return (
                <tr key={row.job_id || row.id} style={rowStyle}>
                  <td style={tdBase}>
                    <Link to={`/employers/${row.employer_id}`} style={linkStyle}>
                      {row.employer_name || '-'}
                    </Link>
                  </td>
                  <td style={tdBase}>{row.organization_name || '-'}</td>
                  <td style={tdBase}>{row.organization_type || '-'}</td>
                  {perms?.canShowEmployerPhoneAddress && (
                    <td style={tdBase}>{row.employer_phone || '-'}</td>
                  )}
                  <td style={tdBase}>{row.interviewer_contact || '-'}</td>
                  <td style={tdBase}>
                    <Link to={`/jobs/${row.job_id || row.id}`} style={linkStyle}>
                      {row.job_profile || '-'}
                    </Link>
                  </td>
                  <td style={tdBase}>{row.shift_timing_display || '-'}</td>
                  <td style={tdBase}>{row.is_household ? 'Yes' : 'No'}</td>
                  <td style={tdBase}>{row.genders || '-'}</td>
                  <td style={tdBase}>{row.experiences || '-'}</td>
                  <td style={tdBase}>{row.qualifications || '-'}</td>
                  <td style={tdBase}>{row.shifts || '-'}</td>
                  <td style={tdBase}>{row.skills || '-'}</td>
                  <td style={tdBase}>{row.benefits || '-'}</td>
                  <td style={tdBase}>{renderJobVerificationBadge(row.verification_status)}</td>
                  <td style={tdBase}>{(row.hired_total ?? 0) + '/' + (row.no_vacancy ?? '-')}</td>
                  <td style={tdBase}>{row.job_state || '-'}</td>
                  <td style={tdBase}>{row.job_city || '-'}</td>
                  <td style={tdBase}>{row.job_status || '-'}</td>
                  <td style={tdBase}>{row.job_life || '-'}</td>
                  <td style={tdBase}>{formatDateTime(row.created_at)}</td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
