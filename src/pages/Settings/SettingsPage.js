import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import settingsApi from '../../api/settingsApi';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import '../Masters/MasterPage.css';

const fieldGroups = {
  support: [
    { label: 'Employee support mobile', name: 'employee_support_mobile', type: 'tel', hint: 'Enter digits only (e.g., 9876543210)' },
    { label: 'Employee support email', name: 'employee_support_email', type: 'email' },
    { label: 'Employer support mobile', name: 'employer_support_mobile', type: 'tel', hint: 'Enter digits only (e.g., 9876543210)' },
    { label: 'Employer support email', name: 'employer_support_email', type: 'email' }
  ],
  policies: [
    { label: 'Privacy policy link', name: 'privacy_policy', type: 'text' },
    { label: 'Terms and conditions link', name: 'terms_and_conditions', type: 'text' },
    { label: 'Refund policy link', name: 'refund_policy', type: 'text' }
  ],
  links: [
    { label: 'LinkedIn link', name: 'linkedin_link' },
    { label: 'XL link', name: 'xl_link' },
    { label: 'Facebook link', name: 'facebook_link' },
    { label: 'Instagram link', name: 'instagram_link' }
  ],
  keys: [
    { label: 'Cashfree ID', name: 'cashfree_id', mask: false },
    { label: 'Cashfree secret', name: 'cashfree_secret', mask: true },
    { label: 'WhatsApp ID', name: 'whatsapp_id', mask: false },
    { label: 'WhatsApp key', name: 'whatsapp_key', mask: true },
    { label: 'KYC ID', name: 'kyc_id', mask: false },
    { label: 'KYC key', name: 'kyc_key', mask: true },
    { label: 'Google Translate key', name: 'google_translate_key', mask: true },
    { label: 'SMS ID', name: 'sms_id', mask: false },
    { label: 'SMS key', name: 'sms_key', mask: true }
  ]
};

const initialState = Object.values(fieldGroups)
  .flat()
  .reduce((acc, field) => ({ ...acc, [field.name]: '' }), {});

const renderInput = (field, value, onChange, disabled = false) => {
  const type = field.mask ? 'password' : field.type || 'text';
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="input-block"
      placeholder={field.mask ? '••••••••' : (field.type === 'text' ? 'https://...' : '')}
      disabled={disabled}
    />
  );
};

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const canView = hasPermission(PERMISSIONS.SETTINGS_VIEW);
  const canUpdate = hasPermission(PERMISSIONS.SETTINGS_UPDATE);

  useEffect(() => {
    setSidebarOpen(getSidebarState());
    if (!canView) {
      setError('You do not have permission to view settings.');
      setLoading(false);
      return;
    }
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await settingsApi.getSettings();
      if (res.data?.data) {
        setFormData(prev => ({ ...prev, ...res.data.data }));
        setUpdatedAt(res.data.data.updated_at || '');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name) => (value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canUpdate) {
      setError('You do not have permission to update settings.');
      return;
    }
    setSaving(true);
    setStatusMessage('');
    setError('');
    try {
      const res = await settingsApi.updateSettings(formData);
      if (res.data?.data) {
        setFormData(prev => ({ ...prev, ...res.data.data }));
        setUpdatedAt(res.data.data.updated_at || '');
      }
      setStatusMessage('Settings saved successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={() => {
        const next = !sidebarOpen;
        setSidebarOpen(next);
        saveSidebarState(next);
      }} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper" style={{ padding: '16px' }}>
            {loading ? (
              <div>Loading settings...</div>
            ) : (
              <div className="form-container">
                <div className="list-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <h1>Settings</h1>
                  <LogsAction
                    category="setting"
                    title="Settings Logs"
                    baseButtonClassName="btn-secondary"
                    sizeClassName="small"
                    buttonStyle={{ marginLeft: 'auto' }}
                  />
                </div>
                <form onSubmit={handleSubmit} className="master-form">
                  {error && <div className="error-message">{error}</div>}
                  {statusMessage && <div className="success-message">{statusMessage}</div>}
                  <div className="form-section" style={{ marginBottom: '20px' }}>
                    <h3>Support Contacts</h3>
                    <div className="form-grid">
                      {fieldGroups.support.map(field => (
                        <div key={field.name} className="form-group">
                          <label>{field.label}</label>
                          {renderInput(field, formData[field.name] || '', (val) => handleChange(field.name)(val), !canUpdate)}
                          {field.hint && (
                            <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                              {field.hint}
                            </small>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="form-section" style={{ marginBottom: '20px' }}>
                    <h3>Policy Links</h3>
                    <div className="form-grid">
                      {fieldGroups.policies.map(field => (
                        <div key={field.name} className="form-group">
                          <label>
                            {field.label}
                            <small style={{ display: 'block', fontWeight: 400, color: '#6b7280' }}>
                              URL of the document (PDF/HTML) served from uploads.
                            </small>
                          </label>
                          {renderInput(field, formData[field.name] || '', (val) => handleChange(field.name)(val), !canUpdate)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="form-section" style={{ marginBottom: '20px' }}>
                    <h3>Social Links</h3>
                    <div className="form-grid">
                      {fieldGroups.links.map(field => (
                        <div key={field.name} className="form-group">
                          <label>{field.label}</label>
                          {renderInput(field, formData[field.name] || '', (val) => handleChange(field.name)(val), !canUpdate)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="form-section" style={{ marginBottom: '20px' }}>
                    <h3>Integrations &amp; Keys</h3>
                    <div className="form-grid">
                      {fieldGroups.keys.map(field => (
                        <div key={field.name} className="form-group">
                          <label>
                            {field.label}
                            {field.mask && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#6b7280' }}>masked</span>}
                          </label>
                          {renderInput(field, formData[field.name] || '', (val) => handleChange(field.name)(val), !canUpdate)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Last updated</label>
                    <div style={{ fontSize: '12px', color: '#555' }}>
                      {updatedAt ? new Date(updatedAt).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div className="form-actions">
                    {canUpdate && (
                      <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save settings'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
