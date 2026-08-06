import React, { useState, useEffect } from 'react';
import jobBenefitsApi from '../../api/masters/jobBenefitsApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function JobBenefitForm({ benefitId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    benefit_english: '',
    benefit_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (benefitId) {
      fetchBenefit();
    } else {
      setFormData({
        benefit_english: '',
        benefit_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [benefitId]);

  const fetchBenefit = async () => {
    setLoading(true);
    try {
      const response = await jobBenefitsApi.getById(benefitId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching job benefit:', error);
      setError('Failed to fetch job benefit details');
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
    const englishName = formData.benefit_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setFormData(prev => ({ ...prev, benefit_hindi: translated }));
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
      if (benefitId) {
        await jobBenefitsApi.update(benefitId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Job Benefit updated successfully' });
      } else {
        await jobBenefitsApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Job Benefit created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving job benefit:', error);
      setError(error.response?.data?.message || 'Failed to save job benefit');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save job benefit' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && benefitId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{benefitId ? 'Edit Job Benefit' : 'Add New Job Benefit'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="benefit_english">English Name *</label>
          <input
            type="text"
            id="benefit_english"
            name="benefit_english"
            value={formData.benefit_english}
            onChange={handleChange}
            placeholder="e.g., Health Insurance"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="benefit_hindi">Hindi Name *</label>
          <input
            type="text"
            id="benefit_hindi"
            name="benefit_hindi"
            value={formData.benefit_hindi}
            onChange={handleChange}
            placeholder="e.g., स्वास्थ्य बीमा"
            onDoubleClick={handleHindiDoubleTap}
            required
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
            {loading ? 'Saving...' : (benefitId ? 'Update' : 'Create')}
          </button>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={onClose}
            disabled={loading || translating}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
