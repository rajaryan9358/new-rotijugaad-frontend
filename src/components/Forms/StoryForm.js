import React, { useEffect, useState } from 'react';
import { getStoryById, createStory, updateStory, uploadStoryImage } from '../../api/storiesApi';
import LogsAction from '../LogsAction';
import './MasterForm.css';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';

export default function StoryForm({ storyId, onClose, onSuccess }) {
  const isEdit = !!storyId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    user_type: '',
    title_english: '',
    title_hindi: '',
    description_english: '',
    description_hindi: '',
    image: '',
    expiry_at: '',
    sequence: 0,
    is_active: true,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (!isEdit) { setLoading(false); return; }
    if (!storyId && storyId !== 0) {
      setError('Invalid story id');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await getStoryById(storyId);
        if (res.data?.success === false) throw new Error(res.data?.message || 'Failed to load story');
        const s = res.data?.data || {};
        setForm({
          user_type: s.user_type || '',
          title_english: s.title_english || '',
          title_hindi: s.title_hindi || '',
          description_english: s.description_english || '',
          description_hindi: s.description_hindi || '',
          image: s.image || '',
          expiry_at: s.expiry_at ? s.expiry_at.split('T')[0] : '',
          sequence: s.sequence ?? 0,
          is_active: typeof s.is_active === 'boolean' ? s.is_active : true,
        });
        if (s.image) setImagePreview(s.image);
      } catch (e) {
        console.error('Story load failed:', e);
        if (e.response?.status === 404) {
          setError('Story not found');
        } else {
          setError(e.response?.data?.message || 'Failed to load story');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, storyId]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTitleHindiTranslate = async () => {
    const english = form.title_english?.trim();
    if (!english) return;
    try {
      const translated = await translate(english);
      if (translated) setField('title_hindi', translated);
    } catch {
      setError('Failed to auto-translate title to Hindi');
    }
  };

  const handleDescriptionHindiTranslate = async () => {
    const english = form.description_english?.trim();
    if (!english) return;
    try {
      const translated = await translate(english);
      if (translated) setField('description_hindi', translated);
    } catch {
      setError('Failed to auto-translate description to Hindi');
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Select a valid image'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be <= 5MB'); return; }

    setUploadingImage(true);
    setError(null);
    try {
      const res = await uploadStoryImage(file);
      if (!res.data?.success) { setError(res.data?.message || 'Upload failed'); return; }
      const { path, url } = res.data;
      setField('image', path);
      setImagePreview(url || path);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => { setField('image', ''); setImagePreview(null); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!form.user_type || !form.title_english || !form.description_english) {
        setError('user_type, title_english and description_english are required');
        return;
      }
      const payload = {
        ...form,
        sequence: parseInt(form.sequence, 10) || 0,
        expiry_at: form.expiry_at || null,
      };
      console.debug(isEdit ? 'Updating story' : 'Creating story', payload);
      if (isEdit) {
        const r = await updateStory(storyId, payload);
        if (!r.data?.success) throw new Error(r.data?.message || 'Update failed');
        onSuccess && onSuccess('Story updated');
      } else {
        const r = await createStory(payload);
        if (!r.data?.success) throw new Error(r.data?.message || 'Create failed');
        onSuccess && onSuccess('Story created');
      }
      onClose && onClose();
    } catch (err) {
      console.error('Story save failed:', err);
      setError(err.response?.data?.message || (err.response?.status === 404 ? 'Story not found' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="form-container">
      <div className="form-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>{isEdit ? 'Edit Story' : 'Add New Story'}</h1>
          {isEdit && (
            <LogsAction
              category="stories"
              title="Story Logs"
              buttonLabel="Logs"
              buttonClassName=""
              buttonStyle={{ padding: '4px 10px' }}
            />
          )}
        </div>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={submit} className="master-form">
        <div className="form-group">
          <label>User Type *</label>
          <select
            value={form.user_type}
            onChange={e => setField('user_type', e.target.value)}
            required
          >
            <option value="">Select user type</option>
            <option value="employee">Employee</option>
            <option value="employer">Employer</option>
          </select>
        </div>
        <div className="form-group">
          <label>Title (English)</label>
          <input type="text" value={form.title_english} onChange={e => setField('title_english', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Title (Hindi)</label>
          <input
            type="text"
            value={form.title_hindi}
            onChange={e => setField('title_hindi', e.target.value)}
            onDoubleClick={handleTitleHindiTranslate}
          />
        </div>
        <div className="form-group">
          <label>Description (English)</label>
          <textarea
            className="styled-textarea"
            style={{ resize:'vertical', padding:'8px', fontSize:'13px', lineHeight:'1.4', border:'1px solid #ccc', borderRadius:'4px' }}
            value={form.description_english}
            onChange={e => setField('description_english', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Description (Hindi)</label>
          <textarea
            className="styled-textarea"
            style={{ resize:'vertical', padding:'8px', fontSize:'13px', lineHeight:'1.4', border:'1px solid #ccc', borderRadius:'4px' }}
            value={form.description_hindi}
            onChange={e => setField('description_hindi', e.target.value)}
            onDoubleClick={handleDescriptionHindiTranslate}
          />
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
                  disabled={uploadingImage}
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
            onChange={handleImageChange}
            disabled={uploadingImage}
            style={{ display:'block' }}
          />
          {uploadingImage && <small style={{ color:'#555' }}>Uploading...</small>}
          {form.image && (
            <small style={{ display:'block', marginTop:'4px', color:'#28a745' }}>
              Stored path: {form.image}
            </small>
          )}
          <small style={{ display:'block', marginTop:'4px', color:'#666' }}>
            Max size 5MB. JPG/PNG/GIF supported.
          </small>
        </div>
        <div className="form-group">
          <label>Expiry Date</label>
          <input type="date" value={form.expiry_at} onChange={e => setField('expiry_at', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Sequence</label>
          <input type="number" value={form.sequence} onChange={e => setField('sequence', e.target.value)} />
        </div>
        <div className="form-group">
          <label>
            <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} />
            Is Active
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving || uploadingImage || translating}>
            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving || uploadingImage || translating}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
