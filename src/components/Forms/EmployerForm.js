import React, { useEffect, useState, useMemo, useRef } from 'react';
import employersApi, { EMPLOYER_ORG_TYPES, EMPLOYER_ORG_TYPE_OPTIONS } from '../../api/employersApi';
import { getStates } from '../../api/statesApi';
import { getCities } from '../../api/citiesApi';
import businessCategoriesApi from '../../api/masters/businessCategoriesApi';
import './MasterForm.css';
import LogsAction from '../LogsAction';

export default function EmployerForm({ employerId, onClose, onSuccess, presetUser, userLocked = false }) {
  const isEdit = !!employerId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    user_id: '',
    mobile: '',
    name: '',
    organization_type: '',
    organization_name: '',
    business_category_id: '',
    state_id: '',
    city_id: '',
    address: '',
    email: '',
    aadhar_number: '',
    assisted_by: ''
  });

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const presetAppliedRef = useRef(false);

  useEffect(() => {
    if (!presetUser || presetAppliedRef.current) return;
    const presetId = presetUser.user_id || presetUser.id;
    setForm(f => ({
      ...f,
      user_id: presetId || '',
      mobile: presetUser.mobile || f.mobile,
      name: f.name || presetUser.name || ''
    }));
    presetAppliedRef.current = true;
  }, [presetUser]);

  useEffect(() => {
    fetchStates();
    fetchCities();
    fetchCategories();
    if (isEdit) {
      employersApi.getById(employerId)
        .then(res => {
          const e = res.data?.data || {};
          setForm({
            user_id: e.user_id || '',
            mobile: e.User?.mobile || e.mobile || '',
            name: e.name || '',
            organization_type: normalizeOrgType(e.organization_type),
            organization_name: e.organization_name || '',
            business_category_id: e.business_category_id || '',
            state_id: e.state_id || '',
            city_id: e.city_id || '',
            address: e.address || '',
            email: e.email || '',
            aadhar_number: e.aadhar_number || '',
            assisted_by: e.assisted_by || ''
          });
        })
        .catch(() => setError('Failed to load employer'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isEdit, employerId]);

  const fetchStates = async () => {
    try { const res = await getStates(); setStates(res.data?.data || []); } catch {}
  };
  const fetchCities = async () => {
    try { const res = await getCities(); setCities(res.data?.data || []); } catch {}
  };
  const fetchCategories = async () => {
    try { const res = await businessCategoriesApi.getAll(); setCategories(res.data?.data || []); } catch {}
  };

  const setField = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'state_id') next.city_id = '';
      return next;
    });
  };

  const filteredCities = useMemo(
    () => (form.state_id ? cities.filter(c => c.state_id === parseInt(form.state_id, 10)) : []),
    [form.state_id, cities]
  );

  const normalizeOrgType = (v) => {
    const s = (v ?? '').toString().trim().toLowerCase();
    return EMPLOYER_ORG_TYPES.includes(s) ? s : '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const nameValue = form.name.trim();
      const mobileValue = form.mobile.trim();

      if (!nameValue) {
        setError('name is required');
        setSaving(false);
        return;
      }
      if (!form.user_id && !mobileValue) {
        setError('mobile is required when user is not pre-selected');
        setSaving(false);
        return;
      }
      if (isEdit && !mobileValue) {
        setError('mobile is required');
        setSaving(false);
        return;
      }

      const orgTypeValue = normalizeOrgType(form.organization_type);
      if (form.organization_type && !orgTypeValue) {
        setError('organization type must be domestic or firm');
        setSaving(false);
        return;
      }

      const payload = {
        ...form,
        name: nameValue,
        organization_type: orgTypeValue || null,
        business_category_id: form.business_category_id || null,
        state_id: form.state_id || null,
        city_id: form.city_id || null,
        assisted_by: form.assisted_by || null
      };
      if (mobileValue) payload.mobile = mobileValue;
      else delete payload.mobile;
      if (!payload.user_id) delete payload.user_id;

      if (isEdit) {
        await employersApi.update(employerId, payload);
        onSuccess && onSuccess({ type: 'success', text: 'Employer updated' });
      } else {
        await employersApi.create(payload);
        onSuccess && onSuccess({ type: 'success', text: 'Employer created' });
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const mobileDisabled = userLocked;

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{isEdit ? 'Edit Employer' : 'Add New Employer'}</h1>
        {isEdit && (
          <LogsAction category="employer" title="Employer Logs" />
        )}
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={submit} className="master-form">
        <div className="form-group">
          <label>Mobile {form.user_id ? '' : '*'}</label>
          <input
            value={form.mobile}
            onChange={e => setField('mobile', e.target.value)}
            placeholder="10-digit mobile"
            required={!form.user_id}
            disabled={mobileDisabled}
          />
        </div>

        <div className="form-group">
          <label>Name *</label>
          <input
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            required
            placeholder="Name"
          />
        </div>

        <div className="form-group">
          <label>Organization Type</label>
          <select
            value={form.organization_type}
            onChange={e => setField('organization_type', e.target.value)}
          >
            <option value="">-- Select --</option>
            {EMPLOYER_ORG_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Organization Name</label>
          <input
            value={form.organization_name}
            onChange={e => setField('organization_name', e.target.value)}
            placeholder="Legal organization name"
          />
        </div>

        <div className="form-group">
          <label>Business Category</label>
          <select
            value={form.business_category_id}
            onChange={e => setField('business_category_id', e.target.value)}
          >
            <option value="">-- Select --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.category_english}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>State</label>
          <select
            value={form.state_id}
            onChange={e => setField('state_id', e.target.value)}
          >
            <option value="">-- Select --</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.state_english}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>City</label>
          <select
            value={form.city_id}
            onChange={e => setField('city_id', e.target.value)}
            disabled={!form.state_id}
          >
            <option value="">-- Select --</option>
            {filteredCities.map(c => <option key={c.id} value={c.id}>{c.city_english}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Address</label>
          <textarea
            className="styled-textarea" // added
            style={{ resize:'vertical', padding:'8px', fontSize:'13px', lineHeight:'1.4', border:'1px solid #ccc', borderRadius:'4px' }} // added
            rows="3"
            value={form.address}
            onChange={e => setField('address', e.target.value)}
            placeholder="Business address"
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setField('email', e.target.value)}
            placeholder="example@domain.com"
          />
        </div>

        <div className="form-group">
          <label>Aadhar Number</label>
          <input
            value={form.aadhar_number}
            onChange={e => setField('aadhar_number', e.target.value)}
            maxLength={12}
            placeholder="12-digit Aadhar"
          />
        </div>

        <div className="form-group">
          <label>Assisted By</label>
          <input
            value={form.assisted_by}
            onChange={e => setField('assisted_by', e.target.value)}
            placeholder="Assistant code or name"
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={
              saving ||
              (!isEdit && !form.user_id && !form.mobile.trim())
            }
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
