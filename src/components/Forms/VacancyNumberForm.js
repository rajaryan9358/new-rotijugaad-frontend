import React, { useState, useEffect } from 'react';
import vacancyNumbersApi from '../../api/masters/vacancyNumbersApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function VacancyNumberForm({ numberId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    number_english: '',
    number_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (numberId) {
      fetchNumber();
    } else {
      setFormData({
        number_english: '',
        number_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [numberId]);

  const fetchNumber = async () => {
    setLoading(true);
    try {
      const response = await vacancyNumbersApi.getById(numberId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching vacancy number:', error);
      setError('Failed to fetch vacancy number details');
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
    const englishName = formData.number_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setFormData(prev => ({ ...prev, number_hindi: translated }));
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
      if (numberId) {
        await vacancyNumbersApi.update(numberId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Vacancy Number updated successfully' });
      } else {
        await vacancyNumbersApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Vacancy Number created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving vacancy number:', error);
      setError(error.response?.data?.message || 'Failed to save vacancy number');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save vacancy number' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && numberId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{numberId ? 'Edit Vacancy Number' : 'Add New Vacancy Number'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="number_english">English Name *</label>
          <input
            type="text"
            id="number_english"
            name="number_english"
            value={formData.number_english}
            onChange={handleChange}
            placeholder="e.g., 1-5"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="number_hindi">Hindi Name *</label>
          <input
            type="text"
            id="number_hindi"
            name="number_hindi"
            value={formData.number_hindi}
            onChange={handleChange}
            placeholder="e.g., 1-5"
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
            {loading ? 'Saving...' : (numberId ? 'Update' : 'Create')}
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
