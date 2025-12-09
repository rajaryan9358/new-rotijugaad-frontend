import React, { useState, useEffect } from 'react';
import salaryTypesApi from '../../api/masters/salaryTypesApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function SalaryTypeForm({ typeId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    type_english: '',
    type_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (typeId) {
      fetchType();
    } else {
      setFormData({
        type_english: '',
        type_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [typeId]);

  const fetchType = async () => {
    setLoading(true);
    try {
      const response = await salaryTypesApi.getById(typeId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching salary type:', error);
      setError('Failed to fetch salary type details');
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
    const englishName = formData.type_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setFormData(prev => ({ ...prev, type_hindi: translated }));
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
      if (typeId) {
        await salaryTypesApi.update(typeId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Salary Type updated successfully' });
      } else {
        await salaryTypesApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Salary Type created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving salary type:', error);
      setError(error.response?.data?.message || 'Failed to save salary type');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save salary type' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && typeId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{typeId ? 'Edit Salary Type' : 'Add New Salary Type'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="type_english">English Name *</label>
          <input
            type="text"
            id="type_english"
            name="type_english"
            value={formData.type_english}
            onChange={handleChange}
            placeholder="e.g., Per Month"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="type_hindi">Hindi Name *</label>
          <input
            type="text"
            id="type_hindi"
            name="type_hindi"
            value={formData.type_hindi}
            onChange={handleChange}
            placeholder="e.g., प्रति माह"
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
            {loading ? 'Saving...' : (typeId ? 'Update' : 'Create')}
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
