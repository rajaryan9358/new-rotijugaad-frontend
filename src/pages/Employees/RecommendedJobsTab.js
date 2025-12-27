import React from 'react';
import { Link } from 'react-router-dom';
import employeesApi from '../../api/employeesApi';

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
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={th(160)}>Employer</th>
                <th style={th(180)}>Organization</th>
                <th style={th(130)}>Org Type</th>
                {perms?.canShowEmployerPhoneAddress && (
                  <th style={th(140)}>Employer Phone</th>
                )}
                <th style={th(160)}>Interviewer Contact</th>
                <th style={th(180)}>Job Profile</th>
                <th style={th(140)}>Shift Timing</th>
                <th style={th(110)}>Household</th>
                <th style={th(140)}>Gender</th>
                <th style={th(180)}>Experience</th>
                <th style={th(180)}>Qualification</th>
                <th style={th(160)}>Shift</th>
                <th style={th(260)}>Skills</th>
                <th style={th(260)}>Benefits</th>
                <th style={th(140)}>Verification</th>
                <th style={th(120)}>Vacancies</th>
                <th style={th(160)}>State</th>
                <th style={th(160)}>City</th>
                <th style={th(140)}>Job Status</th>
                <th style={th(110)}>Job Life</th>
                <th style={th(180)}>Created At</th>
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
