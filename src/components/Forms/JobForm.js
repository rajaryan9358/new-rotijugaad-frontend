import React, { useState, useMemo, useEffect } from 'react';
import jobApi from '../../api/jobApi';
import skillsApi from '../../api/masters/skillsApi';
import experiencesApi from '../../api/masters/experiencesApi';
import qualificationsApi from '../../api/masters/qualificationsApi';
import jobBenefitsApi from '../../api/masters/jobBenefitsApi';
import shiftsApi from '../../api/masters/shiftsApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

// Helper for chip multi-select
function MultiSelectChips({ label, options, selected, setSelected, optionLabel, optionValue }) {
  const [open, setOpen] = useState(false);
  const toggle = v => {
    setSelected(sel =>
      sel.includes(v)
        ? sel.filter(x => x !== v)
        : [...sel, v]
    );
  };
  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <label>{label}</label>
      <div
        className="chip-select-box"
        style={{
          minHeight: 38,
          border: '1px solid #ddd',
          borderRadius: 6,
          background: '#fafbfc',
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center'
        }}
        onClick={() => setOpen(o => !o)}
        tabIndex={0}
        onBlur={() => setOpen(false)}
      >
        {selected.length === 0 && (
          <span style={{ color: '#888', fontSize: 13 }}>Select {label.toLowerCase()}</span>
        )}
        {selected.map(val => {
          const opt = options.find(o => o[optionValue] === val);
          return (
            <span
              key={val}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#6366f1',
                color: '#fff',
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '12px',
                marginRight: 2
              }}
            >
              {opt ? opt[optionLabel] : val}
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  marginLeft: 4,
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: 1
                }}
                onClick={e => {
                  e.stopPropagation();
                  setSelected(sel => sel.filter(x => x !== val));
                }}
                tabIndex={-1}
              >×</button>
            </span>
          );
        })}
        <span style={{ marginLeft: 'auto', color: '#888', fontSize: 12 }}>▼</span>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 10,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            marginTop: 2,
            width: '100%',
            maxHeight: 180,
            overflowY: 'auto'
          }}
        >
          {options.map(opt => (
            <label
              key={opt[optionValue]}
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '13px',
                padding: '7px 12px',
                cursor: 'pointer',
                background: selected.includes(opt[optionValue]) ? '#f3f4f6' : '#fff',
                gap: '6px'
              }}
              onMouseDown={e => e.preventDefault()}
              onClick={() => toggle(opt[optionValue])}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt[optionValue])}
                readOnly
                style={{
                  marginRight: 4,
                  marginLeft: 0,
                  width: '16px',      // set fixed width
                  minWidth: '16px',   // prevent stretching
                  flex: '0 0 auto'    // do not grow/shrink
                }}
              />
              {opt[optionLabel]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const DEFAULT_DAYS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' }
];

export default function JobForm({
  open, onClose, onSuccess, employers, jobProfiles, states, cities, jobId, presetEmployer, cloneJobId
}) {
  const isCloneMode = !!cloneJobId && !jobId;
  const [form, setForm] = useState({
    employer_id: '',
    job_profile_id: '',
    is_household: false,
    description_english: '',
    description_hindi: '',
    no_vacancy: 1,
    interviewer_contact: '',
    job_address_english: '',
    job_address_hindi: '',
    job_state_id: '',
    job_city_id: '',
    other_benefit_english: '',
    other_benefit_hindi: '',
    salary_min: '',
    salary_max: '',
    work_start_time: '',
    work_end_time: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [employerSearch, setEmployerSearch] = useState('');
  const [showEmployerDropdown, setShowEmployerDropdown] = useState(false);
  const [loading, setLoading] = useState(!!jobId || isCloneMode);
  const { translating, translate } = useAutoTranslation();
  const [employerResults, setEmployerResults] = useState(Array.isArray(employers) ? employers : []);
  const [employerLoading, setEmployerLoading] = useState(false);

  // Multi-select states
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedExperiences, setSelectedExperiences] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedQualifications, setSelectedQualifications] = useState([]);
  const [selectedJobBenefits, setSelectedJobBenefits] = useState([]);
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);

  // Master options state
  const [skills, setSkills] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [genders, setGenders] = useState([
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'any', label: 'Any' }
  ]);
  const [qualifications, setQualifications] = useState([]);
  const [jobBenefits, setJobBenefits] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [days, setDays] = useState(DEFAULT_DAYS);

  // Fetch master data on mount
  useEffect(() => {
    async function fetchMasters() {
      try {
        const [
          skillsRes,
          experiencesRes,
          qualificationsRes,
          jobBenefitsRes,
          shiftsRes
        ] = await Promise.all([
          skillsApi.getAll(),
          experiencesApi.getAll(),
          qualificationsApi.getAll(),
          jobBenefitsApi.getAll(),
          shiftsApi.getAll()
        ]);
        setSkills(skillsRes.data?.data || []);
        setExperiences(experiencesRes.data?.data || []);
        setQualifications(qualificationsRes.data?.data || []);
        setJobBenefits(jobBenefitsRes.data?.data || []);
        setShifts(shiftsRes.data?.data || []);
        // days is static, but you can fetch from API if needed
      } catch (e) {
        // Optionally handle error
      }
    }
    fetchMasters();
  }, []);

  const formatEmployerLabel = React.useCallback((employerId) => {
    if (!employerId) return '';
    const match = employers?.find?.(e => e.id === employerId);
    return match ? `${match.name}${match.mobile ? ` (${match.mobile})` : ''}` : String(employerId);
  }, [employers]);

  const hydrateJob = React.useCallback((job) => {
    if (!job) return;
    setForm({
      employer_id: job.employer_id || '',
      job_profile_id: job.job_profile_id || '',
      is_household: !!job.is_household,
      description_english: job.description_english || '',
      description_hindi: job.description_hindi || '',
      no_vacancy: job.no_vacancy || 1,
      interviewer_contact: job.interviewer_contact || '',
      job_address_english: job.job_address_english || '',
      job_address_hindi: job.job_address_hindi || '',
      job_state_id: job.job_state_id || '',
      job_city_id: job.job_city_id || '',
      other_benefit_english: job.other_benefit_english || '',
      other_benefit_hindi: job.other_benefit_hindi || '',
      salary_min: job.salary_min || '',
      salary_max: job.salary_max || '',
      work_start_time: job.work_start_time || '',
      work_end_time: job.work_end_time || ''
    });
    setSelectedSkills(job.skills_ids || []);
    setSelectedExperiences(job.experiences_ids || []);
    setSelectedGenders(job.genders || []);
    setSelectedQualifications(job.qualifications_ids || []);
    setSelectedJobBenefits(job.job_benefits_ids || []);
    setSelectedShifts(job.shifts_ids || []);
    setSelectedDays(job.job_days || []);
    setEmployerSearch(formatEmployerLabel(job.employer_id));
  }, [formatEmployerLabel]);

  // Load job for edit
  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    jobApi.getById(jobId)
      .then(res => hydrateJob(res.data?.data))
      .catch(() => setError('Failed to load job'))
      .finally(() => setLoading(false));
  }, [jobId, hydrateJob]);

  // Load job for clone
  useEffect(() => {
    if (!isCloneMode) return;
    setLoading(true);
    jobApi.getById(cloneJobId)
      .then(res => hydrateJob(res.data?.data))
      .catch(() => setError('Failed to load job to repost'))
      .finally(() => setLoading(false));
  }, [isCloneMode, cloneJobId, hydrateJob]);

  const safeCities = Array.isArray(cities) ? cities : [];
  const safeStates = Array.isArray(states) ? states : [];
  const filteredCities = form.job_state_id
    ? safeCities.filter(c => c.state_id === parseInt(form.job_state_id, 10))
    : [];

  const filteredEmployers = useMemo(() => {
    const list = Array.isArray(employerResults) ? employerResults : [];
    if (!employerSearch.trim()) return list;
    const search = employerSearch.toLowerCase();
    return list.filter(e =>
      (e.name || '').toLowerCase().includes(search) ||
      (e.mobile || '').toLowerCase().includes(search) ||
      String(e.id).includes(search)
    );
  }, [employerSearch, employerResults]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleHindiDoubleTap = async (englishValue, targetField) => {
    const source = englishValue?.trim();
    if (!source) return;
    try {
      const translated = await translate(source);
      if (translated) {
        setField(targetField, translated);
      }
    } catch {
      setError('Failed to auto-translate English text. Please fill Hindi manually.');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!form.employer_id || !form.job_profile_id || !form.no_vacancy) {
        setError('Employer, Job Profile, and No. of Vacancy are required');
        setSaving(false);
        return;
      }
      const job_days = (selectedDays || []).map(d =>
        typeof d === 'object' && d.value ? String(d.value) : String(d)
      );
      const payload = {
        ...form,
        employer_id: form.employer_id ? parseInt(form.employer_id, 10) : null,
        job_profile_id: form.job_profile_id ? parseInt(form.job_profile_id, 10) : null,
        job_state_id: form.job_state_id ? parseInt(form.job_state_id, 10) : null,
        job_city_id: form.job_city_id ? parseInt(form.job_city_id, 10) : null,
        no_vacancy: parseInt(form.no_vacancy) || 1,
        salary_min: form.salary_min ? parseFloat(form.salary_min) : null,
        salary_max: form.salary_max ? parseFloat(form.salary_max) : null,
        skills: selectedSkills,
        experiences: selectedExperiences,
        genders: selectedGenders,
        qualifications: selectedQualifications,
        job_benefits: selectedJobBenefits,
        shifts: selectedShifts,
        job_days,
      };
      if (jobId) {
        await jobApi.update(jobId, payload);
      } else {
        await jobApi.create(payload);
      }
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showEmployerDropdown && !e.target.closest('.employer-search-container')) {
        setShowEmployerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmployerDropdown]);

  const isEdit = !!jobId;

  // If presetEmployer is provided, always use its id and name
  useEffect(() => {
    if (presetEmployer && !isEdit) {
      setField('employer_id', presetEmployer.id);
      setEmployerSearch(`${presetEmployer.name}`);
    }
    // eslint-disable-next-line
  }, [presetEmployer, isEdit]);

  useEffect(() => {
    if (Array.isArray(employers)) setEmployerResults(employers);
  }, [employers]);

  // Search employers as user types
  useEffect(() => {
    if (isEdit || (presetEmployer && !isEdit)) return;
    let active = true;
    const handle = setTimeout(async () => {
      try {
        setEmployerLoading(true);
        const res = await jobApi.searchEmployers({
          search: employerSearch || undefined,
          limit: 50
        });
        const list = res.data?.data || [];
        if (active) setEmployerResults(list);
      } finally {
        if (active) setEmployerLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(handle); };
  }, [employerSearch, isEdit, presetEmployer]);

  if (!open) return null;
  if (loading) return <div className="loading">Loading...</div>;
  const formTitle = jobId ? 'Edit Job' : isCloneMode ? 'Repost Job' : 'Create New Job';
  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{formTitle}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={submit} className="master-form">
        <div className="form-group">
          <label>Employer *</label>
          <div className="employer-search-container" style={{ position: 'relative' }}>
            <input
              type="text"
              value={
                presetEmployer && !isEdit
                  ? presetEmployer.name
                  : employerSearch
              }
              onChange={e => {
                if (isEdit || (presetEmployer && !isEdit)) return; // prevent change in edit mode or if preset
                setEmployerSearch(e.target.value);
                setShowEmployerDropdown(true);
                if (!e.target.value.trim()) setField('employer_id', '');
              }}
              onFocus={() => {
                if (isEdit || (presetEmployer && !isEdit)) return; // prevent dropdown in edit mode or if preset
                setShowEmployerDropdown(true);
              }}
              placeholder="Search by name, mobile or ID..."
              autoComplete="off"
              disabled={isEdit || (presetEmployer && !isEdit)}
            />
            {/* Dropdown only in create mode and not preset */}
            {!isEdit && !presetEmployer && showEmployerDropdown && (
              <div
                className="user-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  marginTop: '2px'
                }}
              >
                {employerLoading ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                    Searching...
                  </div>
                ) : filteredEmployers.length > 0 ? (
                  <>
                    <div style={{ padding: '8px 12px', fontSize: '12px', color: '#666', borderBottom: '1px solid #f0f0f0', background: '#f9f9f9' }}>
                      Showing {filteredEmployers.length} employer{filteredEmployers.length === 1 ? '' : 's'}
                    </div>
                    {filteredEmployers.slice(0, 50).map(e => (
                      <div
                        key={e.id}
                        onClick={() => {
                          setField('employer_id', e.id);
                          setEmployerSearch(`${e.name}${e.mobile ? ` (${e.mobile})` : ''}`);
                          setShowEmployerDropdown(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          fontSize: '14px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={ev => ev.currentTarget.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={ev => ev.currentTarget.style.backgroundColor = 'white'}
                      >
                        <strong>{e.name}</strong>
                        {e.mobile && <span style={{ marginLeft: '8px', color: '#666' }}>({e.mobile})</span>}
                        <span style={{ marginLeft: '8px', color: '#999', fontSize: '12px' }}>ID: {e.id}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                    No employers match "{employerSearch}"
                  </div>
                )}
              </div>
            )}
            {(form.employer_id && (!presetEmployer || isEdit)) && (
              <small style={{ display: 'block', marginTop: '4px', color: '#28a745', fontWeight: 500 }}>
                ✓ Selected Employer ID: {form.employer_id}
              </small>
            )}
            {/* Always show selected employer id in green if presetEmployer and not edit */}
            {presetEmployer && !isEdit && (
              <small style={{ display: 'block', marginTop: '4px', color: '#28a745', fontWeight: 500 }}>
                ✓ Selected Employer ID: {presetEmployer.id}
              </small>
            )}
            {!form.employer_id && employerSearch && (!presetEmployer || isEdit) && (
              <small style={{ display: 'block', marginTop: '4px', color: '#dc3545' }}>
                Please select an employer from the dropdown
              </small>
            )}
          </div>
        </div>
        <div className="form-group">
          <label>Job Profile *</label>
          <select
            value={form.job_profile_id}
            onChange={e => setField('job_profile_id', e.target.value)}
            required
          >
            <option value="">Select job profile</option>
            {jobProfiles.map(jp => (
              <option key={jp.id} value={jp.id}>{jp.profile_english}</option>
            ))}
          </select>
        </div>

        {/* State / City */}
        <div className="form-group">
          <label>Job State</label>
          <select
            value={form.job_state_id}
            onChange={e => {
              const nextState = e.target.value;
              setField('job_state_id', nextState);
              setField('job_city_id', ''); // reset city when state changes
            }}
          >
            <option value="">Select state</option>
            {safeStates.map(st => (
              <option key={st.id} value={st.id}>{st.state_english}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Job City</label>
          <select
            value={form.job_city_id}
            onChange={e => setField('job_city_id', e.target.value)}
            disabled={!form.job_state_id}
          >
            <option value="">Select city</option>
            {filteredCities.map(ct => (
              <option key={ct.id} value={ct.id}>{ct.city_english}</option>
            ))}
          </select>
        </div>

        {/* Multi-select chips for job fields */}
        <MultiSelectChips
          label="Skills"
          options={skills}
          selected={selectedSkills}
          setSelected={setSelectedSkills}
          optionLabel="skill_english"
          optionValue="id"
        />
        <MultiSelectChips
          label="Experiences"
          options={experiences}
          selected={selectedExperiences}
          setSelected={setSelectedExperiences}
          optionLabel="title_english"
          optionValue="id"
        />
        <MultiSelectChips
          label="Gender"
          options={genders}
          selected={selectedGenders}
          setSelected={setSelectedGenders}
          optionLabel="label"
          optionValue="value"
        />
        <MultiSelectChips
          label="Qualifications"
          options={qualifications}
          selected={selectedQualifications}
          setSelected={setSelectedQualifications}
          optionLabel="qualification_english"
          optionValue="id"
        />
        <MultiSelectChips
          label="Job Benefits"
          options={jobBenefits}
          selected={selectedJobBenefits}
          setSelected={setSelectedJobBenefits}
          optionLabel="benefit_english"
          optionValue="id"
        />
        <MultiSelectChips
          label="Shift Type"
          options={shifts}
          selected={selectedShifts}
          setSelected={setSelectedShifts}
          optionLabel="shift_english"
          optionValue="id"
        />
        <MultiSelectChips
          label="Working Days"
          options={days}
          selected={selectedDays}
          setSelected={setSelectedDays}
          optionLabel="label"
          optionValue="value"
        />

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={form.is_household}
              onChange={e => setField('is_household', e.target.checked)}
              style={{
                marginRight: 4,
                marginLeft: 0,
                width: '16px',      // set fixed width
                minWidth: '16px',   // prevent stretching
                flex: '0 0 auto'    // do not grow/shrink
              }}
            />
            Is Household Job
          </label>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={form.description_english}
            onChange={e => setField('description_english', e.target.value)}
            rows={2}
            placeholder="Enter job description"
            className="styled-textarea"
            style={{ resize:'vertical', padding:'8px', fontSize:'13px', lineHeight:'1.4', border:'1px solid #ccc', borderRadius:'4px' }}
          />
        </div>
        <div className="form-group">
          <label>Job Address</label>
          <textarea
            value={form.job_address_english}
            onChange={e => setField('job_address_english', e.target.value)}
            rows={2}
            placeholder="Enter job address"
            className="styled-textarea"
            style={{ resize:'vertical', padding:'8px', fontSize:'13px', lineHeight:'1.4', border:'1px solid #ccc', borderRadius:'4px' }}
          />
        </div>

        {/* Salary */}
        <div className="form-group">
          <label>Salary Range</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              value={form.salary_min}
              onChange={e => setField('salary_min', e.target.value)}
              placeholder="Min"
              style={{ padding:'8px', fontSize:'13px', border:'1px solid #ccc', borderRadius:'4px', flex:1 }}
            />
            <input
              type="number"
              value={form.salary_max}
              onChange={e => setField('salary_max', e.target.value)}
              placeholder="Max"
              style={{ padding:'8px', fontSize:'13px', border:'1px solid #ccc', borderRadius:'4px', flex:1 }}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Other Benefit</label>
          <textarea
            value={form.other_benefit_english}
            onChange={e => setField('other_benefit_english', e.target.value)}
            rows={2}
            placeholder="Enter other benefits"
            className="styled-textarea"
            style={{ resize:'vertical', padding:'8px', fontSize:'13px', lineHeight:'1.4', border:'1px solid #ccc', borderRadius:'4px' }}
          />
        </div>
        <div className="form-group">
          <label>No. of Vacancy *</label>
          <input
            type="number"
            value={form.no_vacancy}
            onChange={e => setField('no_vacancy', e.target.value)}
            required
            min={1}
            style={{ padding: '8px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
          />
        </div>
        <div className="form-group">
          <label>Interviewer Contact</label>
          <input
            type="text"
            value={form.interviewer_contact}
            onChange={e => setField('interviewer_contact', e.target.value)}
            placeholder="Enter interviewer contact number"
            style={{ padding: '8px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
          />
        </div>
        <div className="form-group">
          <label>Work Timings</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="time"
              value={form.work_start_time}
              onChange={e => setField('work_start_time', e.target.value)}
              style={{ padding: '8px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', flex: 1 }}
            />
            <input
              type="time"
              value={form.work_end_time}
              onChange={e => setField('work_end_time', e.target.value)}
              style={{ padding: '8px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', flex: 1 }}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving || translating}>
            {saving ? 'Saving...' : (isEdit ? 'Update Job' : 'Create Job')}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
