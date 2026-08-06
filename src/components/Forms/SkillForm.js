import React, { useState, useEffect } from 'react';
import skillsApi from '../../api/masters/skillsApi';
import { useAutoTranslation } from '../../hooks/useAutoTranslation';
import './MasterForm.css';

export default function SkillForm({ skillId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    skill_english: '',
    skill_hindi: '',
    sequence: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { translating, translate } = useAutoTranslation();

  useEffect(() => {
    if (skillId) {
      fetchSkill();
    } else {
      setFormData({
        skill_english: '',
        skill_hindi: '',
        sequence: '',
        is_active: true,
      });
    }
  }, [skillId]);

  const fetchSkill = async () => {
    setLoading(true);
    try {
      const response = await skillsApi.getById(skillId);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching skill:', error);
      setError('Failed to fetch skill details');
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
    const englishName = formData.skill_english?.trim();
    if (!englishName) return;
    try {
      const translated = await translate(englishName);
      if (translated) {
        setFormData(prev => ({ ...prev, skill_hindi: translated }));
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
      if (skillId) {
        await skillsApi.update(skillId, formData);
        onSuccess && onSuccess({ type: 'success', text: 'Skill updated successfully' });
      } else {
        await skillsApi.create(formData);
        onSuccess && onSuccess({ type: 'success', text: 'Skill created successfully' });
      }
      onClose();
    } catch (error) {
      console.error('Error saving skill:', error);
      setError(error.response?.data?.message || 'Failed to save skill');
      onSuccess && onSuccess({ type: 'error', text: error.response?.data?.message || 'Failed to save skill' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && skillId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>{skillId ? 'Edit Skill' : 'Add New Skill'}</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="master-form">
        <div className="form-group">
          <label htmlFor="skill_english">English Name *</label>
          <input
            type="text"
            id="skill_english"
            name="skill_english"
            value={formData.skill_english}
            onChange={handleChange}
            placeholder="e.g., Communication"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="skill_hindi">Hindi Name *</label>
          <input
            type="text"
            id="skill_hindi"
            name="skill_hindi"
            value={formData.skill_hindi}
            onChange={handleChange}
            placeholder="e.g., संचार"
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
            {loading ? 'Saving...' : (skillId ? 'Update' : 'Create')}
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
