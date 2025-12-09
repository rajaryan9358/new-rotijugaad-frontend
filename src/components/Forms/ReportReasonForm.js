import React, { useState, useEffect } from 'react';
import reportReasonsApi from '../../api/masters/reportReasonsApi';
import './MasterForm.css';

export default function ReportReasonForm({ reasonId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    reason_english: '',
    reason_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reasonId) {
      fetchReason();
    } else {
      setFormData({
        reason_english: '',
        reason_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [reasonId]);

  const fetchReason = async () => {
    setLoading(true);
    try {
      const response = await reportReasonsApi.getById(reasonId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching report reason:', error);
      setError('Failed to fetch report reason details');
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
      if (reasonId) {
        await reportReasonsApi.update(reasonId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Report Reason updated successfully' });
      } else {
        await reportReasonsApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Report Reason created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving report reason:', error);
      setError(error.response?.data?.message || 'Failed to save report reason');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save report reason' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && reasonId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{reasonId ? 'Edit Report Reason' : 'Add New Report Reason'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="reason_english">English Name *</label>
          <input
            type="text"
            id="reason_english"
            name="reason_english"
            value={formData.reason_english}
            onChange={handleChange}
            placeholder="e.g., Inappropriate Content"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="reason_hindi">Hindi Name *</label>
          <input
            type="text"
            id="reason_hindi"
            name="reason_hindi"
            value={formData.reason_hindi}
            onChange={handleChange}
            placeholder="e.g., अनुचित सामग्री"
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
            disabled={loading}
          >
            {loading ? 'Saving...' : (reasonId ? 'Update' : 'Create')}
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
