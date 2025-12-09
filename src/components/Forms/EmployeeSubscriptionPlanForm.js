import React, { useEffect, useState } from 'react';
import employeeSubscriptionPlansApi from '../../api/subscriptions/employeeSubscriptionPlansApi';
import './MasterForm.css';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';

export default function EmployeeSubscriptionPlanForm({ planId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    plan_name_english: '',
    plan_name_hindi: '',
    plan_validity_days: '',
    plan_tagline_english: '',
    plan_tagline_hindi: '',
    plan_price: '',
    contact_credits: '',
    interest_credits: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(!!planId);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (!planId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await employeeSubscriptionPlansApi.getById(planId);
        const d = res.data?.data || {};
        setFormData({
          plan_name_english: d.plan_name_english ?? '',
          plan_name_hindi: d.plan_name_hindi ?? '',
          plan_validity_days: d.plan_validity_days ?? '',
          plan_tagline_english: d.plan_tagline_english ?? '',
          plan_tagline_hindi: d.plan_tagline_hindi ?? '',
          plan_price: d.plan_price ?? '',
          contact_credits: d.contact_credits ?? '',
          interest_credits: d.interest_credits ?? '',
          sequence: d.sequence ?? '',
          is_active: d.is_active ?? true,
        });
      } catch {
        setError('Failed to fetch plan details');
      } finally {
        setLoading(false);
      }
    })();
  }, [planId]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }));
  };

  const handleTranslateName = async () => {
    const english = formData.plan_name_english?.trim();
    if (!english) return;
    try {
      const translated = await translate(english);
      if (translated) setFormData(prev => ({ ...prev, plan_name_hindi: translated }));
    } catch {
      setError('Failed to auto-translate plan name to Hindi');
    }
  };

  const handleTranslateTagline = async () => {
    const english = formData.plan_tagline_english?.trim();
    if (!english) return;
    try {
      const translated = await translate(english);
      if (translated) setFormData(prev => ({ ...prev, plan_tagline_hindi: translated }));
    } catch {
      setError('Failed to auto-translate tagline to Hindi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Coerce number fields
    const payload = {
      plan_name_english: formData.plan_name_english,
      plan_name_hindi: formData.plan_name_hindi || null,
      plan_validity_days: Number(formData.plan_validity_days || 0),
      plan_tagline_english: formData.plan_tagline_english || null,
      plan_tagline_hindi: formData.plan_tagline_hindi || null,
      plan_price: formData.plan_price === '' ? 0 : Number(formData.plan_price),
      contact_credits: Number(formData.contact_credits || 0),
      interest_credits: formData.interest_credits === '' ? 0 : Number(formData.interest_credits),
      sequence: formData.sequence === '' ? null : Number(formData.sequence),
      is_active: !!formData.is_active,
    };

    try {
      if (planId) {
        await employeeSubscriptionPlansApi.update(planId, payload);
        onSuccess && onSuccess({ type: 'success', text: 'Plan updated successfully' });
      } else {
        await employeeSubscriptionPlansApi.create(payload);
        onSuccess && onSuccess({ type: 'success', text: 'Plan created successfully' });
      }
      onClose && onClose();
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to save plan';
      setError(msg);
      onSuccess && onSuccess({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  if (loading && planId) return <div className="loading">Loading...</div>;

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{planId ? 'Edit Employee Plan' : 'Add Employee Plan'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form className="master-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="plan_name_english">Plan Name (English) *</label>
          <input id="plan_name_english" name="plan_name_english" type="text" value={formData.plan_name_english} onChange={handleChange} placeholder="e.g., Basic" required />
        </div>

        <div className="form-group">
          <label htmlFor="plan_name_hindi">Plan Name (Hindi)</label>
          <input
            id="plan_name_hindi"
            name="plan_name_hindi"
            type="text"
            value={formData.plan_name_hindi}
            onChange={handleChange}
            placeholder="e.g., बेसिक"
            onDoubleClick={handleTranslateName}
          />
        </div>

        <div className="form-group">
          <label htmlFor="plan_validity_days">Validity (Days) *</label>
          <input id="plan_validity_days" name="plan_validity_days" type="number" value={formData.plan_validity_days} onChange={handleChange} placeholder="e.g., 30" required />
        </div>

        <div className="form-group">
          <label htmlFor="plan_tagline_english">Tagline (English)</label>
          <input id="plan_tagline_english" name="plan_tagline_english" type="text" value={formData.plan_tagline_english} onChange={handleChange} placeholder="Short description" />
        </div>

        <div className="form-group">
          <label htmlFor="plan_tagline_hindi">Tagline (Hindi)</label>
          <input
            id="plan_tagline_hindi"
            name="plan_tagline_hindi"
            type="text"
            value={formData.plan_tagline_hindi}
            onChange={handleChange}
            placeholder="संक्षिप्त विवरण"
            onDoubleClick={handleTranslateTagline}
          />
        </div>

        <div className="form-group">
          <label htmlFor="plan_price">Price (₹) *</label>
          <input id="plan_price" name="plan_price" step="0.01" type="number" value={formData.plan_price} onChange={handleChange} placeholder="e.g., 299" required />
        </div>

        <div className="form-group">
          <label htmlFor="contact_credits">Contact Credits *</label>
          <input id="contact_credits" name="contact_credits" type="number" value={formData.contact_credits} onChange={handleChange} placeholder="e.g., 10" required />
        </div>

        <div className="form-group">
          <label htmlFor="interest_credits">Interest Credits *</label>
          <input id="interest_credits" name="interest_credits" step="0.01" type="number" value={formData.interest_credits} onChange={handleChange} placeholder="e.g., 5" required />
        </div>

        <div className="form-group">
          <label htmlFor="sequence">Sequence</label>
          <input id="sequence" name="sequence" type="number" value={formData.sequence} onChange={handleChange} placeholder="e.g., 1" />
        </div>

        <div className="form-group checkbox">
          <label>
            <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
            Active
          </label>
        </div>

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={loading || translating}>{loading ? 'Saving...' : (planId ? 'Update' : 'Create')}</button>
          <button className="btn-secondary" type="button" onClick={onClose} disabled={loading || translating}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
