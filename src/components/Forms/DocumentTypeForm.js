import React, { useState, useEffect } from 'react';
import documentTypesApi from '../../api/masters/documentTypesApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function DocumentTypeForm({ typeId, onClose, onSuccess }) {
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
    if (!typeId) return;
    setLoading(true);
    try {
      const response = await documentTypesApi.getById(typeId);
      const type = response?.data?.data;

      if (!type) {
        setError('Document Type not found');
        return;
      }

      setFormData({
        type_english: type?.type_english ?? '',
        type_hindi: type?.type_hindi ?? '',
        sequence: type?.sequence ?? '',
        is_active: type?.is_active ?? true,
      });
    } catch (error) {
      console.error('Error fetching document type:', error);
      setError(error.response?.data?.message || 'Failed to fetch document type details');
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
        await documentTypesApi.update(typeId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Document Type updated successfully' });
      } else {
        await documentTypesApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Document Type created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving document type:', error);
      setError(error.response?.data?.message || 'Failed to save document type');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save document type' });
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
        <h1>{typeId ? 'Edit Document Type' : 'Add New Document Type'}</h1>
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
            placeholder="e.g., Aadhar Card"
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
            placeholder="e.g., आधार कार्ड"
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
