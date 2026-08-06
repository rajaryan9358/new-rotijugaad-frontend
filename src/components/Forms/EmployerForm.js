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

  const topRef = useRef(null);

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
    assisted_by: '',
    total_contact_credit: 0,
    contact_credit: 0,
    total_interest_credit: 0,
    interest_credit: 0,
    total_ad_credit: 0,
    ad_credit: 0,
    credit_expiry_at: ''
  });

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const presetAppliedRef = useRef(false);

  useEffect(() => {
    if (!error) return;
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [error]);

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
            assisted_by: e.assisted_by || '',
            total_contact_credit: e.total_contact_credit || 0,
            contact_credit: e.contact_credit || 0,
            total_interest_credit: e.total_interest_credit || 0,
            interest_credit: e.interest_credit || 0,
            total_ad_credit: e.total_ad_credit || 0,
            ad_credit: e.ad_credit || 0,
            credit_expiry_at: e.credit_expiry_at ? e.credit_expiry_at.split('T')[0] : ''
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

  const validateCreditFields = () => {
    const totalContact = Number(form.total_contact_credit || 0);
    const contact = Number(form.contact_credit || 0);
    const totalInterest = Number(form.total_interest_credit || 0);
    const interest = Number(form.interest_credit || 0);
    const totalAd = Number(form.total_ad_credit || 0);
    const ad = Number(form.ad_credit || 0);

    if (totalContact < contact) return 'Total contact credit must be greater than or equal to contact credit';
    if (totalInterest < interest) return 'Total interest credit must be greater than or equal to interest credit';
    if (totalAd < ad) return 'Total ad credit must be greater than or equal to ad credit';
    return null;
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

      const addressValue = (form.address || '').trim();
      if (!addressValue) {
        setError('address is required');
        setSaving(false);
        return;
      }

      const creditError = validateCreditFields();
      if (creditError) {
        setError(creditError);
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
        assisted_by: form.assisted_by || null,
        total_contact_credit: Number(form.total_contact_credit || 0),
        contact_credit: Number(form.contact_credit || 0),
        total_interest_credit: Number(form.total_interest_credit || 0),
        interest_credit: Number(form.interest_credit || 0),
        total_ad_credit: Number(form.total_ad_credit || 0),
        ad_credit: Number(form.ad_credit || 0),
        credit_expiry_at: form.credit_expiry_at || null
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
      <div ref={topRef} />
      <div className="form-header">
        <h1>{isEdit ? 'Edit Employer' : 'Add New Employer'}</h1>
        <div className="form-header-actions">
          {isEdit && (
            <LogsAction
              category="employer"
              title="Employer Logs"
              buttonLabel="Logs"
              buttonStyle={{
                flex: '0 0 auto',
                width: 'auto',
                padding: '6px 12px',
                fontSize: '12px',
                lineHeight: 1.2,
                marginRight: 0
              }}
            />
          )}
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
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

        {isEdit && (
          <>
            <div className="form-group">
              <label>Total Contact Credit</label>
              <input
                type="number"
                min="0"
                value={form.total_contact_credit}
                onChange={e => {
                  setField('total_contact_credit', e.target.value);
                  setField('contact_credit', e.target.value);
                }}
              />
            </div>

            <div className="form-group">
              <label>Contact Credit</label>
              <input
                type="number"
                min="0"
                value={form.contact_credit}
                onChange={e => setField('contact_credit', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Total Interest Credit</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.total_interest_credit}
                onChange={e => {
                  setField('total_interest_credit', e.target.value);
                  setField('interest_credit', e.target.value);
                }}
              />
            </div>

            <div className="form-group">
              <label>Interest Credit</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.interest_credit}
                onChange={e => setField('interest_credit', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Total Ad Credit</label>
              <input
                type="number"
                min="0"
                value={form.total_ad_credit}
                onChange={e => {
                  setField('total_ad_credit', e.target.value);
                  setField('ad_credit', e.target.value);
                }}
              />
            </div>

            <div className="form-group">
              <label>Ad Credit</label>
              <input
                type="number"
                min="0"
                value={form.ad_credit}
                onChange={e => setField('ad_credit', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Credit Expiry Date</label>
              <input
                type="date"
                value={form.credit_expiry_at}
                onChange={e => setField('credit_expiry_at', e.target.value)}
              />
            </div>
          </>
        )}

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
