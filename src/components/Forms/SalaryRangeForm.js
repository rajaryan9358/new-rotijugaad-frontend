import React, { useState, useEffect } from 'react';
import salaryRangesApi from '../../api/masters/salaryRangesApi';
import './MasterForm.css';

export default function SalaryRangeForm({ rangeId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    salary_from: '',
    salary_to: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (rangeId) {
      fetchRange();
    } else {
      setFormData({
        salary_from: '',
        salary_to: '',
        is_active: true,
      });
    }
  }, [rangeId]);

  const fetchRange = async () => {
    setLoading(true);
    try {
      const response = await salaryRangesApi.getById(rangeId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching salary range:', error);
      setError('Failed to fetch salary range details');
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
      if (rangeId) {
        await salaryRangesApi.update(rangeId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Salary Range updated successfully' });
      } else {
        await salaryRangesApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Salary Range created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving salary range:', error);
      setError(error.response?.data?.message || 'Failed to save salary range');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save salary range' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && rangeId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{rangeId ? 'Edit Salary Range' : 'Add New Salary Range'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="salary_from">Salary From *</label>
          <input
            type="number"
            id="salary_from"
            name="salary_from"
            value={formData.salary_from}
            onChange={handleChange}
            placeholder="e.g., 10000"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="salary_to">Salary To *</label>
          <input
            type="number"
            id="salary_to"
            name="salary_to"
            value={formData.salary_to}
            onChange={handleChange}
            placeholder="e.g., 20000"
            required
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
            disabled={loading}
          >
            {loading ? 'Saving...' : (rangeId ? 'Update' : 'Create')}
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
