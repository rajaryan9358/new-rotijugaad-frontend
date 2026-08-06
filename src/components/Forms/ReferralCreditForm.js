import React, { useState, useEffect } from 'react';
import referralCreditsApi from '../../api/masters/referralCreditsApi';
import './MasterForm.css';

export default function ReferralCreditForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    employee_contact_credit: 0,
    employee_interest_credit: 0,
    employer_contact_credit: 0,
    employer_interest_credit: 0,
    employer_ads_credit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await referralCreditsApi.get();
        const d = res.data?.data || {};
        setFormData({
          employee_contact_credit: d.employee_contact_credit ?? 0,
          employee_interest_credit: d.employee_interest_credit ?? 0,
          employer_contact_credit: d.employer_contact_credit ?? 0,
          employer_interest_credit: d.employer_interest_credit ?? 0,
          employer_ads_credit: d.employer_ads_credit ?? 0,
        });
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load referral credits');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value === '' ? '' : Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await referralCreditsApi.update({
        employee_contact_credit: Number(formData.employee_contact_credit) || 0,
        employee_interest_credit: Number(formData.employee_interest_credit) || 0,
        employer_contact_credit: Number(formData.employer_contact_credit) || 0,
        employer_interest_credit: Number(formData.employer_interest_credit) || 0,
        employer_ads_credit: Number(formData.employer_ads_credit) || 0,
      });
      onSuccess && onSuccess({ type: 'success', text: 'Referral credits updated successfully' });
    } catch (e2) {
      const msg = e2.response?.data?.message || 'Failed to update referral credits';
      setError(msg);
      onSuccess && onSuccess({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>Referral Credits</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label>Employee Contact Credit</label>
          <input type="number" min="0" name="employee_contact_credit" value={formData.employee_contact_credit} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Employee Interest Credit</label>
          <input type="number" min="0" name="employee_interest_credit" value={formData.employee_interest_credit} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Employer Contact Credit</label>
          <input type="number" min="0" name="employer_contact_credit" value={formData.employer_contact_credit} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Employer Interest Credit</label>
          <input type="number" min="0" name="employer_interest_credit" value={formData.employer_interest_credit} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Employer Ads Credit</label>
          <input type="number" min="0" name="employer_ads_credit" value={formData.employer_ads_credit} onChange={handleChange} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
