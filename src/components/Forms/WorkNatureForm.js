import React, { useState, useEffect } from 'react';
import workNaturesApi from '../../api/masters/workNaturesApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function WorkNatureForm({ natureId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nature_english: '',
    nature_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (natureId) {
      fetchNature();
    } else {
      setFormData({
        nature_english: '',
        nature_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [natureId]);

  const fetchNature = async () => {
    setLoading(true);
    try {
      const response = await workNaturesApi.getById(natureId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching work nature:', error);
      setError('Failed to fetch work nature details');
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
    const englishName = formData.nature_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setFormData(prev => ({ ...prev, nature_hindi: translated }));
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
      if (natureId) {
        await workNaturesApi.update(natureId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Work Nature updated successfully' });
      } else {
        await workNaturesApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Work Nature created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving work nature:', error);
      setError(error.response?.data?.message || 'Failed to save work nature');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save work nature' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && natureId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{natureId ? 'Edit Work Nature' : 'Add New Work Nature'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="nature_english">English Name *</label>
          <input
            type="text"
            id="nature_english"
            name="nature_english"
            value={formData.nature_english}
            onChange={handleChange}
            placeholder="e.g., Full-time"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="nature_hindi">Hindi Name *</label>
          <input
            type="text"
            id="nature_hindi"
            name="nature_hindi"
            value={formData.nature_hindi}
            onChange={handleChange}
            placeholder="e.g., पूर्णकालिक"
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
            {loading ? 'Saving...' : (natureId ? 'Update' : 'Create')}
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
