import React, { useState, useEffect } from 'react';
import qualificationsApi from '../../api/masters/qualificationsApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function QualificationForm({ qualificationId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    qualification_english: '',
    qualification_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (qualificationId) {
      fetchQualification();
    } else {
      setFormData({
        qualification_english: '',
        qualification_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [qualificationId]);

  const fetchQualification = async () => {
    setLoading(true);
    try {
      const response = await qualificationsApi.getById(qualificationId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching qualification:', error);
      setError('Failed to fetch qualification details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleHindiDoubleTap = async () => {
    const englishName = formData.qualification_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setFormData(prev => ({ ...prev, qualification_hindi: translated }));
      }
    } catch {
      setError('Failed to auto-translate English name. Please fill Hindi manually.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (qualificationId) {
        await qualificationsApi.update(qualificationId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Qualification updated successfully' });
      } else {
        await qualificationsApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Qualification created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving qualification:', error);
      setError(error.response?.data?.message || 'Failed to save qualification');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save qualification' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && qualificationId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{qualificationId ? 'Edit Qualification' : 'Add New Qualification'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="qualification_english">English Name *</label>
          <input
            type="text"
            id="qualification_english"
            name="qualification_english"
            value={formData.qualification_english}
            onChange={handleChange}
            placeholder="e.g., Bachelor's Degree"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="qualification_hindi">Hindi Name *</label>
          <input
            type="text"
            id="qualification_hindi"
            name="qualification_hindi"
            value={formData.qualification_hindi}
            onChange={handleChange}
            placeholder="e.g., स्नातक डिग्री"
            required
            onDoubleClick={handleHindiDoubleTap}
          />
        </div>

        <div className="form-group">
          <label htmlFor="sequence">Sequence</label>
          <input
            type="number"
            id="sequence"
            name="sequence"
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
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading || translating}
          >
            {loading ? 'Saving...' : (qualificationId ? 'Update' : 'Create')}
          </button>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
