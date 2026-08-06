import React, { useEffect, useState } from 'react';
import usersApi from '../../api/usersApi';
import './MasterForm.css';

export default function UserForm({ userId, onClose, onSuccess }) {
  const isEdit = !!userId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    mobile: '',
    name: '',
    user_type: 'employee',
    verification_status: 'pending',
    kyc_status: 'pending',
    referred_by: '',
    is_active: true
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    usersApi.getUserById(userId)
      .then(res => {
        const u = res.data?.data || {};
        setForm({
          mobile: u.mobile || '',
          name: u.name || '',
          user_type: u.user_type || 'employee',
          verification_status: u.verification_status || 'pending',
          kyc_status: u.kyc_status || 'pending',
          referred_by: u.referred_by || '',
          is_active: !!u.is_active
        });
      })
      .catch(() => setError('Failed to load user'))
      .finally(() => setLoading(false));
  }, [isEdit, userId]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!form.mobile.trim()) {
        setError('Mobile is required');
      } else {
        if (isEdit) {
          await usersApi.updateUser(userId, form);
          onSuccess && onSuccess({ type: 'success', text: 'User updated' });
        } else {
          await usersApi.createUser(form);
          onSuccess && onSuccess({ type: 'success', text: 'User created' });
        }
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{isEdit ? 'Edit User' : 'Add New User'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={submit} className="master-form">
        <div className="form-group">
          <label htmlFor="mobile">Mobile *</label>
          <input
            id="mobile"
            type="text"
            value={form.mobile}
            onChange={e => setField('mobile', e.target.value)}
            required
            disabled={isEdit}
            placeholder="e.g., 9876543210"
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="User name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="user_type">User Type</label>
          <select
            id="user_type"
            value={form.user_type}
            onChange={e => setField('user_type', e.target.value)}
          >
            <option value="employee">Employee</option>
            <option value="employer">Employer</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="verification_status">Verification Status</label>
          <select
            id="verification_status"
            value={form.verification_status}
            onChange={e => setField('verification_status', e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="kyc_status">KYC Status</label>
          <select
            id="kyc_status"
            value={form.kyc_status}
            onChange={e => setField('kyc_status', e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="referred_by">Referred By</label>
          <input
            id="referred_by"
            type="text"
            value={form.referred_by}
            onChange={e => setField('referred_by', e.target.value)}
            placeholder="Referrer code / mobile"
          />
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setField('is_active', e.target.checked)}
            />
            Active
          </label>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
