import React, { useState, useEffect } from 'react';
import { getCityById, createCity, updateCity } from '../../api/citiesApi';
import { getStates } from '../../api/statesApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './CityForm.css';

export default function CityForm({ cityId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    state_id: '',
    city_english: '',
    city_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    fetchStates();
    if (cityId) {
      fetchCity();
    } else {
      setFormData({
        state_id: '',
        city_english: '',
        city_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [cityId]);

  const fetchStates = async () => {
    try {
      const response = await getStates();
      setStates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching states:', error);
      setError('Failed to fetch states');
    }
  };

  const fetchCity = async () => {
    setLoading(true);
    try {
      const response = getCityById(cityId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching city:', error);
      setError('Failed to fetch city details');
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
    const englishName = formData.city_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setFormData(prev => ({ ...prev, city_hindi: translated }));
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
      if (cityId) {
        await updateCity(cityId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'City updated successfully' });
      } else {
        await createCity(formData);
        onSuccess && onSuccess({ type: 'success', text: 'City created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving city:', error);
      setError(error.response?.data?.message || 'Failed to save city');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save city' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && cityId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{cityId ? 'Edit City' : 'Add New City'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="city-form">
        <div className="form-group">
          <label htmlFor="state_id">State *</label>
          <select
            id="state_id"
            name="state_id"
            value={formData.state_id}
            onChange={handleChange}
            required
          >
            <option value="">-- Select State --</option>
            {states.map(state => (
              <option key={state.id} value={state.id}>
                {state.state_english}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="city_english">English Name *</label>
          <input
            type="text"
            id="city_english"
            name="city_english"
            value={formData.city_english}
            onChange={handleChange}
            placeholder="e.g., Mumbai"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="city_hindi">Hindi Name *</label>
          <input
            type="text"
            id="city_hindi"
            name="city_hindi"
            value={formData.city_hindi}
            onChange={handleChange}
            placeholder="e.g., मुंबई"
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
            {loading ? 'Saving...' : (cityId ? 'Update' : 'Create')}
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
