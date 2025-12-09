import React, { useEffect, useState } from 'react';
import planBenefitsApi from '../../api/subscriptions/planBenefitsApi';
import employeeSubscriptionPlansApi from '../../api/subscriptions/employeeSubscriptionPlansApi';
import employerSubscriptionPlansApi from '../../api/subscriptions/employerSubscriptionPlansApi';
import './MasterForm.css';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';

export default function PlanBenefitForm({ benefitId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    subscription_type: 'Employee',
    plan_id: '',
    benefit_english: '',
    benefit_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(!!benefitId);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (!benefitId) {
      setLoading(false);
      fetchPlans('Employee');
      return;
    }
    (async () => {
      try {
        const res = await planBenefitsApi.getById(benefitId);
        const d = res.data?.data || {};
        setFormData({
          subscription_type: d.subscription_type ?? 'Employee',
          plan_id: d.plan_id ?? '',
          benefit_english: d.benefit_english ?? '',
          benefit_hindi: d.benefit_hindi ?? '',
          sequence: d.sequence ?? '',
          is_active: d.is_active ?? true,
        });
        fetchPlans(d.subscription_type);
      } catch {
        setError('Failed to fetch benefit details');
      } finally {
        setLoading(false);
      }
    })();
  }, [benefitId]);

  const fetchPlans = async (type) => {
    try {
      const api = type === 'Employee' ? employeeSubscriptionPlansApi : employerSubscriptionPlansApi;
      const res = await api.getAll();
      const data = res.data?.data || [];
      setPlans(data);
    } catch {
      setPlans([]);
    }
  };

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'subscription_type') {
      setFormData((prev) => ({ ...prev, plan_id: '' }));
      fetchPlans(value);
    }
  };

  const handleHindiDoubleTap = async () => {
    const english = formData.benefit_english?.trim();
    if (!english) return;
    try {
      const translated = await translate(english);
      if (translated) setFormData(prev => ({ ...prev, benefit_hindi: translated }));
    } catch {
      setError('Failed to auto-translate benefit to Hindi. Please fill manually.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      subscription_type: formData.subscription_type,
      plan_id: Number(formData.plan_id),
      benefit_english: formData.benefit_english,
      benefit_hindi: formData.benefit_hindi || null,
      sequence: formData.sequence === '' ? null : Number(formData.sequence),
      is_active: !!formData.is_active,
    };

    try {
      if (benefitId) {
        await planBenefitsApi.update(benefitId, payload);
        onSuccess && onSuccess({ type: 'success', text: 'Benefit updated successfully' });
      } else {
        await planBenefitsApi.create(payload);
        onSuccess && onSuccess({ type: 'success', text: 'Benefit created successfully' });
      }
      onClose && onClose();
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to save benefit';
      setError(msg);
      onSuccess && onSuccess({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  if (loading && benefitId) return <div className="loading">Loading...</div>;

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{benefitId ? 'Edit Plan Benefit' : 'Add Plan Benefit'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form className="master-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="subscription_type">Subscription Type *</label>
          <select
            id="subscription_type"
            name="subscription_type"
            value={formData.subscription_type}
            onChange={handleChange}
            required
          >
            <option value="Employee">Employee</option>
            <option value="Employer">Employer</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="plan_id">Plan *</label>
          <select
            id="plan_id"
            name="plan_id"
            value={formData.plan_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.plan_name_english} - ₹{Number(p.plan_price).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="benefit_english">Benefit (English) *</label>
          <input
            id="benefit_english"
            name="benefit_english"
            type="text"
            value={formData.benefit_english}
            onChange={handleChange}
            placeholder="e.g., Unlimited job postings"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="benefit_hindi">Benefit (Hindi)</label>
          <input
            id="benefit_hindi"
            name="benefit_hindi"
            type="text"
            value={formData.benefit_hindi}
            onChange={handleChange}
            placeholder="e.g., असीमित नौकरी पोस्टिंग"
            onDoubleClick={handleHindiDoubleTap}
          />
        </div>

        <div className="form-group">
          <label htmlFor="sequence">Sequence</label>
          <input
            id="sequence"
            name="sequence"
            type="number"
            value={formData.sequence}
            onChange={handleChange}
            placeholder="e.g., 1"
          />
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
            Active
          </label>
        </div>

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={loading || translating}>
            {loading ? 'Saving...' : benefitId ? 'Update' : 'Create'}
          </button>
          <button className="btn-secondary" type="button" onClick={onClose} disabled={loading || translating}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
