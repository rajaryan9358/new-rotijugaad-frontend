import React, { useEffect, useRef, useState } from 'react';
import employeesApi from '../../api/employeesApi';
import usersApi from '../../api/usersApi';
import { getStates } from '../../api/statesApi';
import { getCities } from '../../api/citiesApi';
import qualificationsApi from '../../api/masters/qualificationsApi';
import shiftsApi from '../../api/masters/shiftsApi';
import './MasterForm.css';

export default function EmployeeForm({ employeeId, onClose, onSuccess, presetUser, mobileLocked = false }) {
  const isEdit = !!employeeId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    dob: '',
    gender: '',
    state_id: '',
    city_id: '',
    preferred_state_id: '',
    preferred_city_id: '',
    qualification_id: '',
    expected_salary: '',
    expected_salary_frequency: '',
    preferred_shift_id: '',
    assistant_code: '',
    email: '',
    about_user: '',
    aadhar_number: '',
    aadhar_verified_at: '',
    selfie_link: '',
    verification_status: 'pending',
    kyc_status: 'pending',
    total_contact_credit: 0,
    contact_credit: 0,
    total_interest_credit: 0,
    interest_credit: 0,
    credit_expiry_at: '',
    subscription_plan_id: '',
    mobile: '',
    user_id: ''
  });
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [prefCities, setPrefCities] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [error, setError] = useState(null);
  const topRef = useRef(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [legacyDataUrl, setLegacyDataUrl] = useState(false);
  const presetAppliedRef = useRef(null);
  const isPresetUser = Boolean(form.user_id);
  // mobile stays editable during edit; locked only on create when preset/forced
  const mobileFieldLocked = isEdit ? false : (mobileLocked || isPresetUser);

  useEffect(() => {
    if (!error) return;
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [error]);

  useEffect(() => {
    console.log('[EmployeeForm] Component mounted, isEdit:', isEdit); // added
    
    // Call all fetch functions
    fetchStates();
    fetchAllCities();
    fetchQualifications();
    fetchShifts();
    
    if (isEdit) {
      employeesApi.getEmployeeById(employeeId)
        .then(res => {
          const e = res.data?.data || {};
          const mobileFromUser = e.User?.mobile || '';
          setForm({
            name: e.name || '',
            dob: e.dob || '',
            gender: e.gender || '',
            state_id: e.state_id || '',
            city_id: e.city_id || '',
            preferred_state_id: e.preferred_state_id || '',
            preferred_city_id: e.preferred_city_id || '',
            qualification_id: e.qualification_id || '',
            expected_salary: e.expected_salary || '',
            expected_salary_frequency: e.expected_salary_frequency || '',
            preferred_shift_id: e.preferred_shift_id || '',
            assistant_code: e.assistant_code || '',
            email: e.email || '',
            about_user: e.about_user || '',
            aadhar_number: e.aadhar_number || '',
            aadhar_verified_at: e.aadhar_verified_at ? e.aadhar_verified_at.split('T')[0] : '',
            selfie_link: e.selfie_link || '',
            verification_status: e.verification_status || 'pending',
            kyc_status: e.kyc_status || 'pending',
            total_contact_credit: e.total_contact_credit || 0,
            contact_credit: e.contact_credit || 0,
            total_interest_credit: e.total_interest_credit || 0,
            interest_credit: e.interest_credit || 0,
            credit_expiry_at: e.credit_expiry_at ? e.credit_expiry_at.split('T')[0] : '',
            subscription_plan_id: e.subscription_plan_id || '',
            mobile: mobileFromUser,
            user_id: e.user_id || e.User?.id || ''
          });
          // If mobile missing from include, fetch via user_id
          if (!mobileFromUser && e.user_id) {
            usersApi.getUserById(e.user_id)
              .then(uRes => {
                const m = uRes.data?.data?.mobile;
                if (m) setForm(prev => ({ ...prev, mobile: m }));
              })
              .catch(() => {});
          }
          if (e.selfie_link) {
            setSelfiePreview(e.selfie_link);
            if (e.selfie_link.startsWith('data:image')) { // added
              setLegacyDataUrl(true); // added
            }
          }
        })
        .catch(() => setError('Failed to load employee'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isEdit, employeeId]);

  useEffect(() => {
    if (employeeId || !presetUser) return;
    const presetKey = presetUser.user_id || presetUser.id;
    if (!presetKey || presetAppliedRef.current === presetKey) return;
    setForm(prev => ({
      ...prev,
      user_id: presetKey,
      mobile: presetUser.mobile ?? prev.mobile ?? '',
      name: prev.name || presetUser.name || ''
    }));
    presetAppliedRef.current = presetKey;
  }, [employeeId, presetUser]);

  const fetchStates = async () => {
    try {
      const res = await getStates();
      setStates(res.data?.data || []);
    } catch {}
  };

  const fetchAllCities = async () => {
    try {
      const res = await getCities();
      setCities(res.data?.data || []);
      setPrefCities(res.data?.data || []);
    } catch {}
  };

  const fetchQualifications = async () => {
    try {
      const res = await qualificationsApi.getAll();
      setQualifications(res.data?.data || []);
    } catch {}
  };

  const fetchShifts = async () => {
    try {
      const res = await shiftsApi.getAll();
      setShifts(res.data?.data || []);
    } catch {}
  };

  const setField = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      // Filter cities when state changes
      if (k === 'state_id') {
        updated.city_id = '';
      }
      if (k === 'preferred_state_id') {
        updated.preferred_city_id = '';
      }
      return updated;
    });
  };

  const getFilteredCities = (stateId) => {
    if (!stateId) return [];
    return cities.filter(c => c.state_id === parseInt(stateId));
  };

  const getPrefFilteredCities = (stateId) => {
    if (!stateId) return [];
    return prefCities.filter(c => c.state_id === parseInt(stateId));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const trimmedMobile = String(form.mobile || '').trim();
    const trimmedName = form.name?.trim() || '';
    const needsMobile = !isEdit && !form.user_id;

    if (!trimmedName) {
      setError('Name is required.');
      setSaving(false);
      return;
    }
    if ((needsMobile || isEdit) && !trimmedMobile) {
      setError('Mobile is required.');
      setSaving(false);
      return;
    }
    try {
      if (legacyDataUrl && form.selfie_link.startsWith('data:image')) {
        setError('Please re-upload selfie (only file path is stored).');
        setSaving(false);
        return;
      }
      if (isEdit) {
        const payload = {
          ...form,
          state_id: form.state_id || null,
          city_id: form.city_id || null,
          preferred_state_id: form.preferred_state_id || null,
          preferred_city_id: form.preferred_city_id || null,
          qualification_id: form.qualification_id || null,
          preferred_shift_id: form.preferred_shift_id || null,
          expected_salary: form.expected_salary || null,
          subscription_plan_id: form.subscription_plan_id || null,
          mobile: trimmedMobile
        };
        if (legacyDataUrl && form.selfie_link.startsWith('data:image')) {
          delete payload.selfie_link;
        }
        await employeesApi.updateEmployee(employeeId, payload);
        onSuccess && onSuccess({ type: 'success', text: 'Employee updated' });
        onClose();
      } else {
        let userIdToUse = form.user_id ? parseInt(form.user_id, 10) : null;
        let finalName = trimmedName;
        let finalMobile = trimmedMobile;
        if (userIdToUse) {
          if (Number.isNaN(userIdToUse)) {
            setError('Invalid user selected.');
            return;
          }
          let userRecord;
          try {
            const userRes = await usersApi.getUserById(userIdToUse);
            userRecord = userRes.data?.data;
          } catch (err) {
            setError(err?.response?.data?.message || 'Failed to fetch user details');
            return;
          }
          if (!userRecord) {
            setError('User not found');
            return;
          }
          const hasEmployeeProfile = Boolean(
            userRecord?.Employee ||
            userRecord?.employee ||
            (Array.isArray(userRecord?.Employees) && userRecord.Employees.length)
          );
          const hasEmployerProfile = Boolean(
            userRecord?.Employer ||
            userRecord?.employer ||
            (Array.isArray(userRecord?.Employers) && userRecord.Employers.length)
          );
          if (hasEmployeeProfile) {
            setError('Employee record already exists for this user.');
            return;
          }
          if (hasEmployerProfile) {
            setError('Employer record already exists for this user.');
            return;
          }
          finalMobile = userRecord.mobile || finalMobile;
          if (!finalName) {
            finalName = userRecord.name || '';
          }
          if (!finalName) {
            setError('Name is required for the employee.');
            return;
          }
        } else {
          // Create user + employee in a single backend transaction (POST /employees)
          userIdToUse = null;
        }
        const empPayload = {
          ...form,
          user_id: userIdToUse,
          name: finalName,
          mobile: userIdToUse ? finalMobile : trimmedMobile,
          state_id: form.state_id || null,
          city_id: form.city_id || null,
          preferred_state_id: form.preferred_state_id || null,
          preferred_city_id: form.preferred_city_id || null,
          qualification_id: form.qualification_id || null,
          preferred_shift_id: form.preferred_shift_id || null,
          expected_salary: form.expected_salary || null,
          subscription_plan_id: form.subscription_plan_id || null
        };
        if (legacyDataUrl && form.selfie_link.startsWith('data:image')) {
          delete empPayload.selfie_link;
        }
        try {
          await employeesApi.createEmployee(empPayload);
        } catch (err) {
          const msg = err?.response?.data?.message || err.message || 'Failed to create employee';
          setError(msg);
          setSaving(false);
          return;
        }
        onSuccess && onSuccess({ type: 'success', text: 'Employee created' });
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSelfieChange = async (e) => { // modified
    const file = e.target.files?.[0];
    if (!file) return;
    // reset legacy flag on new upload
    setLegacyDataUrl(false); // added

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should not exceed 5MB');
      return;
    }

    setUploadingSelfie(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('selfie', file);

      const res = await employeesApi.uploadEmployeeSelfie(formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!res.data?.success) {
        setError(res.data?.message || 'Upload failed');
        setUploadingSelfie(false);
        return;
      }

      // Store only path in form; show preview using url or path
      const { path: storedPath, url } = res.data;
      setField('selfie_link', storedPath);
      setSelfiePreview(url || storedPath);
    } catch (err) {
      console.error('Selfie upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload selfie');
    } finally {
      setUploadingSelfie(false);
    }
  };

  const removeSelfie = () => { // modified
    setField('selfie_link', '');
    setSelfiePreview(null);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="form-container">
      <div ref={topRef} />
      <div className="form-header">
        <h1>{isEdit ? 'Edit Employee' : 'Add New Employee'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={submit} className="master-form">
        {/* Mobile field for create, disabled for edit */}
        <div className="form-group">
          <label>Mobile *</label>
          <input
            type="text"
            value={form.mobile}
            onChange={e => setForm(prev => ({ ...prev, mobile: e.target.value }))}
            disabled={mobileFieldLocked}
            placeholder="10-digit mobile"
            required={!isEdit && !isPresetUser}
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="Employee name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={e => setField('email', e.target.value)}
            placeholder="employee@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="dob">Date of Birth</label>
          <input
            id="dob"
            type="date"
            value={form.dob}
            onChange={e => setField('dob', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            value={form.gender}
            onChange={e => setField('gender', e.target.value)}
          >
            <option value="">-- Select --</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="state_id">State</label>
          <select
            id="state_id"
            value={form.state_id}
            onChange={e => setField('state_id', e.target.value)}
          >
            <option value="">-- Select --</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.state_english}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="city_id">City</label>
          <select
            id="city_id"
            value={form.city_id}
            onChange={e => setField('city_id', e.target.value)}
            disabled={!form.state_id}
          >
            <option value="">-- Select --</option>
            {getFilteredCities(form.state_id).map(c => <option key={c.id} value={c.id}>{c.city_english}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="preferred_state_id">Preferred State</label>
          <select
            id="preferred_state_id"
            value={form.preferred_state_id}
            onChange={e => setField('preferred_state_id', e.target.value)}
          >
            <option value="">-- Select --</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.state_english}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="preferred_city_id">Preferred City</label>
          <select
            id="preferred_city_id"
            value={form.preferred_city_id}
            onChange={e => setField('preferred_city_id', e.target.value)}
            disabled={!form.preferred_state_id}
          >
            <option value="">-- Select --</option>
            {getPrefFilteredCities(form.preferred_state_id).map(c => <option key={c.id} value={c.id}>{c.city_english}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="qualification_id">Qualification</label>
          <select
            id="qualification_id"
            value={form.qualification_id}
            onChange={e => setField('qualification_id', e.target.value)}
          >
            <option value="">-- Select --</option>
            {qualifications.map(q => <option key={q.id} value={q.id}>{q.qualification_english}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="expected_salary">Expected Salary</label>
          <input
            id="expected_salary"
            type="number"
            step="0.01"
            value={form.expected_salary}
            onChange={e => setField('expected_salary', e.target.value)}
            placeholder="e.g., 25000"
          />
        </div>

        <div className="form-group">
          <label htmlFor="expected_salary_frequency">Expected Salary Frequency</label>
          <select
            id="expected_salary_frequency"
            value={form.expected_salary_frequency}
            onChange={e => setField('expected_salary_frequency', e.target.value)}
          >
            <option value="">-- Select --</option>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="preferred_shift_id">Preferred Shift</label>
          <select
            id="preferred_shift_id"
            value={form.preferred_shift_id}
            onChange={e => setField('preferred_shift_id', e.target.value)}
          >
            <option value="">-- Select --</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.shift_english}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="assistant_code">Assistant Code</label>
          <input
            id="assistant_code"
            type="text"
            value={form.assistant_code}
            onChange={e => setField('assistant_code', e.target.value)}
            placeholder="Optional assistant code"
          />
        </div>

        <div className="form-group">
          <label htmlFor="about_user">About User</label>
          <textarea
            id="about_user"
            className="styled-textarea"
            style={{ resize:'vertical', padding:'8px', fontSize:'13px', lineHeight:'1.4', border:'1px solid #ccc', borderRadius:'4px' }}
            rows="3"
            value={form.about_user}
            onChange={e => setField('about_user', e.target.value)}
            placeholder="Brief description about the employee..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="aadhar_number">Aadhar Number</label>
          <input
            id="aadhar_number"
            type="text"
            value={form.aadhar_number}
            onChange={e => setField('aadhar_number', e.target.value)}
            maxLength="12"
            placeholder="12-digit Aadhar number"
          />
        </div>

        <div className="form-group">
          <label htmlFor="aadhar_verified_at">Aadhar Verified At</label>
          <input
            id="aadhar_verified_at"
            type="date"
            value={form.aadhar_verified_at}
            onChange={e => setField('aadhar_verified_at', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Selfie</label>
          <div style={{ marginBottom: '8px' }}>
            {selfiePreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={selfiePreview}
                  alt="Selfie preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    objectFit: 'cover'
                  }}
                />
                <button
                  type="button"
                  onClick={removeSelfie}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(255,0,0,0.7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1'
                  }}
                  title="Remove selfie"
                >
                  ×
                </button>
              </div>
            ) : (
              <div
                style={{
                  width: '200px',
                  height: '200px',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '14px'
                }}
              >
                No selfie uploaded
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleSelfieChange}
            disabled={uploadingSelfie}
            style={{ display: 'block', marginTop: '8px' }}
          />
          {uploadingSelfie && <small style={{ color: '#666' }}>Uploading...</small>}
          <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
            Max size: 5MB. Formats: JPG, PNG, GIF. Path will be stored.
          </small>
          {form.selfie_link && (
            <small style={{ color: '#28a745', display: 'block', marginTop: '4px' }}>
              Stored path: {form.selfie_link}
            </small>
          )}
          {legacyDataUrl && !uploadingSelfie && (
            <small style={{ color:'#d58512', display:'block', marginTop:'4px' }}>
              Legacy embedded image detected. Re-upload to save a file path.
            </small>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving || uploadingSelfie}>
            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
          </button>
          {!isEdit && (
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving || uploadingSelfie}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
