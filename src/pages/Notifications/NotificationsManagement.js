import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import notificationsApi from '../../api/notificationsApi';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import '../Masters/MasterPage.css';

const TARGET_OPTIONS = [
  { value: 'all_users', label: 'All Users' },
  { value: 'all_employees', label: 'All Employees' },
  { value: 'all_employers', label: 'All Employers' },
  { value: 'employees_with_subscription', label: 'Employees with subscription' },
  { value: 'employees_without_subscription', label: 'Employees without subscription' },
  { value: 'employers_with_subscription', label: 'Employers with subscription' },
  { value: 'employers_without_subscription', label: 'Employers without subscription' },
  { value: 'verified_employees', label: 'Verified Employees' },
  { value: 'pending_employees', label: 'Pending Employees' },
  { value: 'pending_kyc_employees', label: 'Pending KYC Employees' },
  { value: 'rejected_employees', label: 'Rejected Employees' },
  { value: 'verified_employers', label: 'Verified Employers' },
  { value: 'pending_employers', label: 'Pending Employers' },
  { value: 'pending_kyc_employers', label: 'Pending KYC Employers' },
  { value: 'rejected_employers', label: 'Rejected Employers' },
  { value: 'employers_with_active_job', label: 'Employers with active job' },
];
const HASHTAG_SUGGESTIONS = ['user_name', 'organization_name', 'job_name', 'city', 'state'];
const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '18px' }}>
    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{label}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
  </div>
);
const headerCellStyle = { cursor: 'pointer' };
const suggestionDropdownStyle = {
  border: '1px solid #d9d9d9',
  borderRadius: '6px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  background: '#fff',
  marginTop: '6px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
  zIndex: 2,
};

export default function NotificationsManagement() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(getSidebarState());
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    title: '',
    body: '',
    target: TARGET_OPTIONS[0].value,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [suggestionState, setSuggestionState] = useState(null);
  const [viewNotification, setViewNotification] = useState(null);

  const canView = hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW);
  const canManage = hasPermission(PERMISSIONS.NOTIFICATIONS_MANAGE);
  const canDelete = hasPermission(PERMISSIONS.NOTIFICATIONS_DELETE);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  const fetchNotifications = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data?.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load notifications' });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field) => (e) => {
    if (!canManage) return;
    const value = e.target.value;
    const caretPos = typeof e.target.selectionStart === 'number' ? e.target.selectionStart : value.length;
    setForm((prev) => ({ ...prev, [field]: value }));
    updateSuggestionState(field, value, caretPos);
  };

  const updateSuggestionState = (field, value, caretPos) => {
    const caret = Math.min(value.length, Math.max(0, caretPos ?? value.length));
    const hashIndex = value.lastIndexOf('#', caret - 1);
    if (hashIndex === -1) {
      setSuggestionState(null);
      return;
    }
    const mentionText = value.slice(hashIndex + 1, caret);
    if (mentionText.includes(' ') || mentionText.includes('#')) {
      setSuggestionState(null);
      return;
    }
    setSuggestionState({ field, query: mentionText.toLowerCase(), start: hashIndex, end: caret });
  };

  const applySuggestion = (tag) => {
    if (!suggestionState) return;
    setForm((prev) => {
      const current = prev[suggestionState.field];
      const before = current.slice(0, suggestionState.start);
      const after = current.slice(suggestionState.end);
      return { ...prev, [suggestionState.field]: `${before}#${tag}${after}` };
    });
    setSuggestionState(null);
  };

  const renderSuggestionList = (field) => {
    if (!suggestionState || suggestionState.field !== field) return null;
    const matches = HASHTAG_SUGGESTIONS.filter((tag) =>
      tag.toLowerCase().startsWith(suggestionState.query)
    );
    if (!matches.length) return null;
    return (
      <div style={suggestionDropdownStyle}>
        {matches.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => applySuggestion(tag)}
            style={{
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            #{tag}
          </button>
        ))}
      </div>
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setMessage({ type: 'error', text: 'You do not have permission to send notifications.' });
      return;
    }
    setSubmitting(true);
    try {
      await notificationsApi.create(form);
      setMessage({ type: 'success', text: 'Notification queued successfully' });
      setForm({ title: '', body: '', target: TARGET_OPTIONS[0].value });
      setSuggestionState(null);
      await fetchNotifications();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create notification' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setMessage({ type: 'error', text: 'You do not have permission to delete notifications.' });
      return;
    }
    if (!window.confirm('Delete this notification?')) return;
    setDeletingId(id);
    try {
      await notificationsApi.delete(id);
      setMessage({ type: 'success', text: 'Notification deleted' });
      await fetchNotifications();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete notification' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleResend = (notification) => {
    if (!canManage) {
      setMessage({ type: 'error', text: 'You do not have permission to resend notifications.' });
      return;
    }
    setForm({
      title: notification.title || '',
      body: notification.body || '',
      target: notification.target || TARGET_OPTIONS[0].value,
    });
    setSuggestionState(null);
  };

  const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
  const openNotification = (notification) => setViewNotification(notification);
  const closeNotification = () => setViewNotification(null);
  const gridTemplateColumns = canManage ? 'minmax(320px, 380px) 1fr' : '1fr';

  if (!canView) {
    return (
      <div className="dashboard-container">
        <Header
          onMenuClick={toggleSidebar}
          onLogout={() => {
            localStorage.clear();
            navigate('/login');
          }}
        />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content notifications-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view notifications.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header
        onMenuClick={toggleSidebar}
        onLogout={() => {
          localStorage.clear();
          navigate('/login');
        }}
      />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content notifications-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            <div className="list-header" style={{ marginBottom: 16, alignItems: 'center' }}>
              <h1>Notifications</h1>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <LogsAction category="notification" title="Notifications Logs" />
              </div>
            </div>

            <div className="grid-two" style={{ display: 'grid', gridTemplateColumns, gap: '20px', alignItems: 'flex-start' }}>
              {canManage && (
                <div className="data-card" style={{ padding: '26px' }}>
                  <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Send Notification</h2>
                  <form onSubmit={handleCreate}>
                    <FormField label="Title">
                      <input
                        type="text"
                        className="state-filter-select"
                        value={form.title}
                        onChange={handleFormChange('title')}
                        required
                        disabled={!canManage}
                      />
                      {renderSuggestionList('title')}
                    </FormField>
                    <FormField label="Target">
                      <select
                        className="state-filter-select"
                        value={form.target}
                        onChange={(e) => canManage && setForm((f) => ({ ...f, target: e.target.value }))}
                        disabled={!canManage}
                      >
                        {TARGET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Body">
                      <textarea
                        rows="4"
                        className="state-filter-select"
                        value={form.body}
                        onChange={handleFormChange('body')}
                        required
                        disabled={!canManage}
                      />
                      {renderSuggestionList('body')}
                    </FormField>
                    <button className="btn-primary btn-small" type="submit" disabled={submitting || !canManage}>
                      {submitting ? 'Saving...' : 'Send notification'}
                    </button>
                    {!canManage && <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>You do not have permission to send notifications.</div>}
                  </form>
                </div>
              )}

              <div className="data-card" style={{ padding: '0' }}>
                <div className="table-container" style={{ padding: '0' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={headerCellStyle}>Title</th>
                        <th style={headerCellStyle}>Target</th>
                        <th style={headerCellStyle}>Status</th>
                        <th style={headerCellStyle}>Sent</th>
                        <th style={headerCellStyle}>Created</th>
                        <th style={headerCellStyle} />
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="6" className="no-data">Loading...</td></tr>
                      ) : notifications.length ? (
                        notifications.map((n) => (
                          <tr key={n.id}>
                            <td>{n.title}</td>
                            <td>{n.target}</td>
                            <td>{n.status || '-'}</td>
                            <td>{formatDateTime(n.sent_at)}</td>
                            <td>{formatDateTime(n.created_at)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap' }}>
                                  <button
                                    type="button"
                                    className="btn-small btn-secondary"
                                    onClick={() => openNotification(n)}
                                  >
                                    View
                                  </button>
                                  {canDelete && (
                                    <button
                                      className="btn-small btn-delete"
                                      onClick={() => handleDelete(n.id)}
                                      disabled={deletingId === n.id}
                                    >
                                      {deletingId === n.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                  )}
                                  {canManage && (
                                    <button
                                      type="button"
                                      className="btn-small btn-secondary"
                                      onClick={() => handleResend(n)}
                                    >
                                      Resend
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="6" className="no-data">No notifications yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {viewNotification && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  padding: '24px'
                }}
                onClick={closeNotification}
              >
                <div
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    padding: 0,
                    borderRadius: '18px',
                    width: '520px',
                    maxWidth: '100%',
                    boxShadow: '0 20px 45px rgba(15,23,42,0.25)',
                    border: '1px solid rgba(226,232,240,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '85vh',
                    overflow: 'hidden'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                      color: '#fff',
                      padding: '18px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 20px rgba(37,99,235,0.25)'
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Notification</h3>
                    <button
                      onClick={closeNotification}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.35)',
                        color: '#fff',
                        cursor: 'pointer',
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        fontSize: '16px',
                        lineHeight: '32px',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ padding: '22px 26px', overflowY: 'auto', background: '#ffffff' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 1fr',
                        rowGap: '16px',
                        columnGap: '18px',
                        fontSize: '14px'
                      }}
                    >
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Title:</strong>
                      <span>{viewNotification.title || '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Target:</strong>
                      <span>{viewNotification.target || '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Status:</strong>
                      <span>{viewNotification.status || '—'}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Sent At:</strong>
                      <span>{formatDateTime(viewNotification.sent_at)}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b' }}>Created:</strong>
                      <span>{formatDateTime(viewNotification.created_at)}</span>
                      <strong style={{ textAlign: 'right', color: '#64748b', alignSelf: 'start' }}>Body:</strong>
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '12px',
                          borderRadius: '10px',
                          fontSize: '14px',
                          lineHeight: 1.5,
                          border: '1px solid rgba(148,163,184,0.4)'
                        }}
                      >
                        {viewNotification.body || '—'}
                      </div>
                    </div>
                    <div style={{ marginTop: '26px', textAlign: 'right' }}>
                      <button
                        className="btn-small btn-secondary"
                        onClick={closeNotification}
                        style={{
                          padding: '10px 20px',
                          fontSize: '13px',
                          borderRadius: '10px',
                          background: '#1d4ed8',
                          border: 'none',
                          color: '#fff',
                          boxShadow: '0 10px 18px rgba(29,78,216,0.3)'
                        }}
                      >
                        Close
                      </button>
                    </div>
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
