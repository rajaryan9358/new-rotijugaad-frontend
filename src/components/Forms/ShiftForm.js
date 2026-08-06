import React, { useState, useEffect } from 'react';
import shiftsApi from '../../api/masters/shiftsApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function ShiftForm({ shiftId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    shift_english: '',
    shift_hindi: '',
    shift_from: '',
    shift_to: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (shiftId) {
      fetchShift();
    } else {
      setFormData({
        shift_english: '',
        shift_hindi: '',
        shift_from: '',
        shift_to: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [shiftId]);

  const fetchShift = async () => {
    setLoading(true);
    try {
      const response = await shiftsApi.getById(shiftId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching shift:', error);
      setError('Failed to fetch shift details');
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
    const englishName = formData.shift_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setFormData(prev => ({ ...prev, shift_hindi: translated }));
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
      if (shiftId) {
        await shiftsApi.update(shiftId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Shift updated successfully' });
      } else {
        await shiftsApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Shift created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving shift:', error);
      setError(error.response?.data?.message || 'Failed to save shift');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save shift' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && shiftId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{shiftId ? 'Edit Shift' : 'Add New Shift'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="shift_english">English Name *</label>
          <input
            type="text"
            id="shift_english"
            name="shift_english"
            value={formData.shift_english}
            onChange={handleChange}
            placeholder="e.g., Morning Shift"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="shift_hindi">Hindi Name *</label>
          <input
            type="text"
            id="shift_hindi"
            name="shift_hindi"
            value={formData.shift_hindi}
            onChange={handleChange}
            placeholder="e.g., सुबह की पाली"
            required
            onDoubleClick={handleHindiDoubleTap}
          />
        </div>

        <div className="form-group">
          <label htmlFor="shift_from">Shift From (Time) *</label>
          <input
            type="time"
            id="shift_from"
            name="shift_from"
            value={formData.shift_from}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="shift_to">Shift To (Time) *</label>
          <input
            type="time"
            id="shift_to"
            name="shift_to"
            value={formData.shift_to}
            onChange={handleChange}
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
            {loading ? 'Saving...' : (shiftId ? 'Update' : 'Create')}
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
