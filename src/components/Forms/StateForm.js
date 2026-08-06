import React, { useState, useEffect } from 'react';
import statesApi from '../../api/masters/statesApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './StateForm.css';

export default function StateForm({ stateId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    state_english: '',
    state_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (stateId) {
      fetchState();
    } else {
      setFormData({
        state_english: '',
        state_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [stateId]);

  const fetchState = async () => {
    setLoading(true);
    try {
      const response = await statesApi.getById(stateId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching state:', error);
      setError('Failed to fetch state details');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (stateId) {
        await statesApi.update(stateId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'State updated successfully' });
      } else {
        await statesApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'State created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving state:', error);
      setError(error.response?.data?.message || 'Failed to save state');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save state' });
    } finally {
      setLoading(false);
    }
  };

  const handleHindiDoubleTap = async () => {
    const englishName = formData.state_english?.trim();
    if (!englishName) return;

    try {
      const translatedText = await translate(englishName);
      if (translatedText) {
        setFormData(prev => ({ ...prev, state_hindi: translatedText }));
      }
    } catch (err) {
      console.error('Error translating state name:', err);
      setError('Failed to auto-translate English name. Please fill Hindi name manually.');
    }
  };

  if (loading && stateId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{stateId ? 'Edit State' : 'Add New State'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="state-form">
        <div className="form-group">
          <label htmlFor="state_english">English Name *</label>
          <input
            type="text"
            id="state_english"
            name="state_english"
            value={formData.state_english}
            onChange={handleChange}
            placeholder="e.g., Maharashtra"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="state_hindi">Hindi Name *</label>
          <input
            type="text"
            id="state_hindi"
            name="state_hindi"
            value={formData.state_hindi}
            onChange={handleChange}
            placeholder="e.g., महाराष्ट्र"
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
            {loading ? 'Saving...' : (stateId ? 'Update' : 'Create')}
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
