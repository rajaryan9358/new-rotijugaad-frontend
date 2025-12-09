import React, { useEffect, useState } from 'react';
import jobProfilesApi from '../../api/jobProfilesApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function JobProfileForm({ profileId, onClose, onSuccess }) {
  const isEdit = !!profileId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const { translating, translate } = useAutoTranslation();
  const [form, setForm] = useState({
    profile_english: '',
    profile_hindi: '',
    profile_image: '',
    sequence: '',
    is_active: true
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (!isEdit) { setLoading(false); return; }
    jobProfilesApi.getById(profileId)
      .then(res => {
        const p = res.data?.data || {};
        setForm({
          profile_english: p.profile_english || '',
            profile_hindi: p.profile_hindi || '',
            profile_image: p.profile_image || '',
            sequence: p.sequence ?? '',
            is_active: !!p.is_active
        });
        if (p.profile_image) setImagePreview(p.profile_image.startsWith('/uploads') ? p.profile_image : p.profile_image);
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [isEdit, profileId]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Select a valid image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image exceeds 5MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await jobProfilesApi.uploadImage(file);
      if (!res.data?.success) {
        setError(res.data?.message || 'Upload failed');
      } else {
        setField('profile_image', res.data.path);
        setImagePreview(res.data.url || res.data.path);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setField('profile_image', '');
    setImagePreview(null);
  };

  const handleHindiDoubleTap = async () => {
    const englishName = form.profile_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setField('profile_hindi', translated);
      }
    } catch {
      setError('Failed to auto-translate English name. Please fill Hindi manually.');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!form.profile_english.trim()) {
        setError('English name required');
        setSaving(false);
        return;
      }
      const payload = {
        profile_english: form.profile_english || null,
        profile_hindi: form.profile_hindi || null,
        profile_image: form.profile_image || null,
        sequence: form.sequence === '' ? null : Number(form.sequence),
        is_active: !!form.is_active
      };
      if (isEdit) {
        await jobProfilesApi.update(profileId, payload);
        onSuccess && onSuccess({ type: 'success', text: 'Job profile updated' });
      } else {
        await jobProfilesApi.create(payload);
        onSuccess && onSuccess({ type: 'success', text: 'Job profile created' });
      }
      onClose();
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
        <h1>{isEdit ? 'Edit Job Profile' : 'Add Job Profile'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={submit} className="master-form">
        <div className="form-group">
          <label>English Name *</label>
          <input
            type="text"
            value={form.profile_english}
            onChange={e => setField('profile_english', e.target.value)}
            placeholder="e.g., Carpenter"
            required
          />
        </div>
        <div className="form-group">
          <label>Hindi Name</label>
          <input
            type="text"
            value={form.profile_hindi}
            onChange={e => setField('profile_hindi', e.target.value)}
            placeholder="हिंदी नाम"
            onDoubleClick={handleHindiDoubleTap}
          />
        </div>
        <div className="form-group">
          <label>Sequence</label>
          <input
            type="number"
            value={form.sequence}
            onChange={e => setField('sequence', e.target.value)}
            placeholder="e.g., 1"
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
        <div className="form-group">
          <label>Image</label>
          <div style={{ marginBottom:'8px' }}>
            {imagePreview ? (
              <div style={{ position:'relative', display:'inline-block' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width:'140px', height:'140px', objectFit:'cover', borderRadius:'8px', border:'1px solid #ddd' }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  style={{
                    position:'absolute', top:'4px', right:'4px',
                    background:'rgba(255,0,0,0.72)', color:'#fff',
                    border:'none', borderRadius:'50%', width:'22px', height:'22px',
                    cursor:'pointer', fontSize:'13px', lineHeight:'1'
                  }}
                  title="Remove image"
                >×</button>
              </div>
            ) : (
              <div style={{
                width:'140px', height:'140px', border:'2px dashed #ccc',
                borderRadius:'8px', display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:'12px', color:'#777'
              }}>
                No image
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            disabled={uploading}
            style={{ display:'block' }}
          />
          {uploading && <small style={{ color:'#555' }}>Uploading...</small>}
          {form.profile_image && (
            <small style={{ display:'block', marginTop:'4px', color:'#28a745' }}>
              Stored path: {form.profile_image}
            </small>
          )}
          <small style={{ display:'block', marginTop:'4px', color:'#666' }}>
            Max size 5MB. JPG/PNG/GIF supported.
          </small>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving || uploading || translating}>
            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving || uploading}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
