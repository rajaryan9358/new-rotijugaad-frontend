import React, { useState, useEffect } from 'react';
import experiencesApi from '../../api/masters/experiencesApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function ExperienceForm({ experienceId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title_english: '',
    title_hindi: '',
    exp_type: 'year',
    exp_from: '',
    exp_to: '',
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
        title_english: '',
        title_hindi: '',
        exp_type: 'year',
        exp_from: '',
        exp_to: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [experienceId]);

  const fetchExperience = async () => {
    setLoading(true);
    try {
      const response = await experiencesApi.getById(experienceId);
      setFormData({
        ...response.data.data,
        exp_type: response.data.data?.exp_type || 'year',
      });
    } catch (error) {
      console.error('Error fetching experience:', error);
      setError('Failed to fetch experience details');
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
    const englishTitle = formData.title_english?.trim();
    if (!englishTitle) return;
    try {
      const translated = await translate(englishTitle);
      if (translated) {
        setFormData(prev => ({ ...prev, title_hindi: translated }));
      }
    } catch {
      setError('Failed to auto-translate English title. Please fill Hindi manually.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (experienceId) {
        await experiencesApi.update(experienceId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Experience updated successfully' });
      } else {
        await experiencesApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Experience created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving experience:', error);
      setError(error.response?.data?.message || 'Failed to save experience');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save experience' });
    } finally {
      setLoading(false);
    }
  };

  const unitLabel = formData.exp_type === 'month' ? 'Months' : 'Years';
  const unitLabelHindi = formData.exp_type === 'month' ? 'महीने' : 'साल';
  const titleExampleEnglish = formData.exp_type === 'month' ? 'e.g., 0-24 Months' : 'e.g., 0-2 Years';
  const titleExampleHindi = formData.exp_type === 'month' ? 'e.g., 0-24 महीने' : 'e.g., 0-2 साल';
  const fromExample = formData.exp_type === 'month' ? 'e.g., 0' : 'e.g., 0';
  const toExample = formData.exp_type === 'month' ? 'e.g., 24' : 'e.g., 2';

  if (loading && experienceId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{experienceId ? 'Edit Experience' : 'Add New Experience'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="title_english">English Title *</label>
          <input
            type="text"
            id="title_english"
            name="title_english"
            value={formData.title_english}
            onChange={handleChange}
            placeholder={titleExampleEnglish}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="title_hindi">Hindi Title *</label>
          <input
            type="text"
            id="title_hindi"
            name="title_hindi"
            value={formData.title_hindi}
            onChange={handleChange}
            placeholder={titleExampleHindi}
            required
            onDoubleClick={handleHindiDoubleTap}
          />
        </div>

        <div className="form-group">
          <label htmlFor="exp_type">Type *</label>
          <select
            id="exp_type"
            name="exp_type"
            value={formData.exp_type || 'year'}
            onChange={handleChange}
            required
          >
            <option value="year">Year (साल)</option>
            <option value="month">Month (महीने)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="exp_from">Experience From ({unitLabel}) *</label>
          <input
            type="number"
            id="exp_from"
            name="exp_from"
            value={formData.exp_from}
            onChange={handleChange}
            placeholder={fromExample}
            min="0"
            required
          />
          <small className="hint">Enter value in {unitLabel} ({unitLabelHindi})</small>
        </div>

        <div className="form-group">
          <label htmlFor="exp_to">Experience To ({unitLabel}) *</label>
          <input
            type="number"
            id="exp_to"
            name="exp_to"
            value={formData.exp_to}
            onChange={handleChange}
            placeholder={toExample}
            min="0"
            required
          />
          <small className="hint">Enter value in {unitLabel} ({unitLabelHindi})</small>
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
