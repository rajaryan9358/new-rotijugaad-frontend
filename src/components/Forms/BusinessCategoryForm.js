import React, { useState, useEffect, useCallback } from 'react';
import businessCategoriesApi from '../../api/masters/businessCategoriesApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function BusinessCategoryForm({ categoryId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    category_english: '',
    category_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  const fetchCategory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await businessCategoriesApi.getById(categoryId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching business category:', error);
      setError('Failed to fetch business category details');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    if (categoryId) {
      fetchCategory();
    } else {
      setFormData({
        category_english: '',
        category_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [categoryId, fetchCategory]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleHindiDoubleTap = async () => {
    const englishName = formData.category_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setFormData(prev => ({ ...prev, category_hindi: translated }));
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
      if (categoryId) {
        await businessCategoriesApi.update(categoryId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Business Category updated successfully' });
      } else {
        await businessCategoriesApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Business Category created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving business category:', error);
      setError(error.response?.data?.message || 'Failed to save business category');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save business category' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && categoryId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{categoryId ? 'Edit Business Category' : 'Add New Business Category'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="category_english">English Name *</label>
          <input
            type="text"
            id="category_english"
            name="category_english"
            value={formData.category_english}
            onChange={handleChange}
            placeholder="e.g., Information Technology"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category_hindi">Hindi Name *</label>
          <input
            type="text"
            id="category_hindi"
            name="category_hindi"
            value={formData.category_hindi}
            onChange={handleChange}
            placeholder="e.g., सूचना प्रौद्योगिकी"
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
            {loading ? 'Saving...' : (categoryId ? 'Update' : 'Create')}
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
