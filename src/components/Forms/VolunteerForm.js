import React, { useEffect, useState } from 'react';
import volunteersApi from '../../api/masters/volunteersApi';
import './MasterForm.css';

export default function VolunteerForm({ volunteerId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    assistant_code: '',
    address: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!volunteerId) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await volunteersApi.getById(volunteerId);
        const v = res.data?.data || {};
        setFormData({
          name: v.name || '',
          phone_number: v.phone_number || '',
          assistant_code: v.assistant_code || '',
          address: v.address || '',
          description: v.description || '',
        });
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to fetch volunteer');
      } finally {
        setLoading(false);
      }
    })();
  }, [volunteerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: formData.name?.trim(),
        phone_number: formData.phone_number?.trim(),
        assistant_code: formData.assistant_code?.trim() || null,
        address: formData.address?.trim() || null,
        description: formData.description?.trim() || null,
      };

      if (!payload.name || !payload.phone_number) {
        setError('Name and Phone Number are required');
        setLoading(false);
        return;
      }

      if (volunteerId) {
        await volunteersApi.update(volunteerId, payload);
        onSuccess && onSuccess({ type: 'success', text: 'Volunteer updated successfully' });
      } else {
        await volunteersApi.create(payload);
        onSuccess && onSuccess({ type: 'success', text: 'Volunteer created successfully' });
      }
      onClose && onClose();
    } catch (e2) {
      const msg = e2.response?.data?.message || 'Failed to save volunteer';
      setError(msg);
      onSuccess && onSuccess({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  if (loading && volunteerId) return <div className="loading">Loading...</div>;

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{volunteerId ? 'Edit Volunteer' : 'Add Volunteer'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="phone_number">Phone Number *</label>
          <input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="assistant_code">Assistant Code</label>
          <input id="assistant_code" name="assistant_code" value={formData.assistant_code} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows="3" />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="3" />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : (volunteerId ? 'Update' : 'Create')}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
