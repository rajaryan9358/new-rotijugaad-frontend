import React, { useState, useEffect } from 'react';
import employerCallExperienceApi from '../../api/masters/employerCallExperienceApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function EmployerCallExperienceForm({ experienceId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    experience_english: '',
    experience_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (experienceId) {
      fetchExperience();
    } else {
      setFormData({
        experience_english: '',
        experience_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [experienceId]);

  const fetchExperience = async () => {
    setLoading(true);
    try {
      const response = await employerCallExperienceApi.getById(experienceId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching call experience:', error);
      setError('Failed to fetch call experience details');
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
    const englishName = formData.experience_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setFormData(prev => ({ ...prev, experience_hindi: translated }));
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
      if (experienceId) {
        await employerCallExperienceApi.update(experienceId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Call Experience updated successfully' });
      } else {
        await employerCallExperienceApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Call Experience created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving call experience:', error);
      setError(error.response?.data?.message || 'Failed to save call experience');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save call experience' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && experienceId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{experienceId ? 'Edit Call Experience' : 'Add New Call Experience'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="experience_english">English Name *</label>
          <input
            type="text"
            id="experience_english"
            name="experience_english"
            value={formData.experience_english}
            onChange={handleChange}
            placeholder="e.g., Very Good"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="experience_hindi">Hindi Name *</label>
          <input
            type="text"
            id="experience_hindi"
            name="experience_hindi"
            value={formData.experience_hindi}
            onChange={handleChange}
            placeholder="e.g., बहुत अच्छा"
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
            {loading ? 'Saving...' : (experienceId ? 'Update' : 'Create')}
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
