import React, { useState, useEffect } from 'react';
import distancesApi from '../../api/masters/distancesApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function DistanceForm({ distanceId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title_english: '',
    title_hindi: '',
    distance: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (distanceId) {
      fetchDistance();
    } else {
      setFormData({
        title_english: '',
        title_hindi: '',
        distance: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [distanceId]);

  const fetchDistance = async () => {
    setLoading(true);
    try {
      const response = await distancesApi.getById(distanceId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching distance:', error);
      setError('Failed to fetch distance details');
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
      if (distanceId) {
        await distancesApi.update(distanceId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Distance updated successfully' });
      } else {
        await distancesApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Distance created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving distance:', error);
      setError(error.response?.data?.message || 'Failed to save distance');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save distance' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && distanceId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{distanceId ? 'Edit Distance' : 'Add New Distance'}</h1>
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
            placeholder="e.g., Within 5 KM"
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
            placeholder="e.g., 5 किमी के भीतर"
            onDoubleClick={handleHindiDoubleTap}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="distance">Distance (KM) *</label>
          <input
            type="number"
            step="0.01"
            id="distance"
            name="distance"
            value={formData.distance}
            onChange={handleChange}
            placeholder="e.g., 5"
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
            {loading ? 'Saving...' : (distanceId ? 'Update' : 'Create')}
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
