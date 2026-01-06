import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ExperienceForm from '../../components/Forms/ExperienceForm';
import ConfirmDialog from '../../components/ConfirmDialog';
import LogsAction from '../../components/LogsAction';
import experiencesApi from '../../api/masters/experiencesApi';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import './MasterPage.css';

export default function Experiences() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '' });
  const [message, setMessage] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const canViewMasters = hasPermission(PERMISSIONS.MASTERS_VIEW);
  const canManageMasters = hasPermission(PERMISSIONS.MASTERS_MANAGE);
  const canDeleteMasters = hasPermission(PERMISSIONS.MASTERS_DELETE);
  const navigate = useNavigate();

  useEffect(() => {
    setSidebarOpen(getSidebarState());
    if (canViewMasters) {
      fetchExperiences();
    } else {
      setLoading(false);
    }
  }, [canViewMasters]);

  useEffect(() => {
    if (!showForm) {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        const scrollPos = getScrollPosition('experiences-scroll');
        mainContent.scrollTop = scrollPos;

        const handleScroll = () => {
          saveScrollPosition('experiences-scroll', mainContent.scrollTop);
        };
        mainContent.addEventListener('scroll', handleScroll);
        return () => mainContent.removeEventListener('scroll', handleScroll);
      }
    }
  }, [showForm]);

  const fetchExperiences = async () => {
    setLoading(true);
    try {
      const response = await experiencesApi.getAll();
      const sorted = (response.data.data || []).sort((a, b) => {
        const seqA = a.sequence || 0;
        const seqB = b.sequence || 0;
        return seqA - seqB;
      });
      setExperiences(sorted);
    } catch (error) {
      console.error('Error fetching experiences:', error);
      setMessage({ type: 'error', text: 'Failed to fetch experiences' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const handleMenuClick = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    saveSidebarState(newState);
  };

  const handleDragStart = (e, index) => {
    if (!canManageMasters) return;
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    if (!canManageMasters) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    if (!canManageMasters) return;
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      return;
    }

    try {
      const newExperiences = [...experiences];
      const draggedExp = newExperiences[draggedItem];
      newExperiences.splice(draggedItem, 1);
      newExperiences.splice(dropIndex, 0, draggedExp);

      const updatedExperiences = newExperiences.map((exp, idx) => ({
        ...exp,
        sequence: idx + 1,
      }));

      setExperiences(updatedExperiences);
      setDraggedItem(null);

      await experiencesApi.updateSequence(updatedExperiences);
      setMessage({ type: 'success', text: 'Sequence updated successfully' });
    } catch (error) {
      console.error('Error updating sequence:', error);
      setMessage({ type: 'error', text: 'Failed to update sequence' });
      fetchExperiences();
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const confirmDelete = (id) => {
    setConfirm({
      open: true,
      id,
      title: 'Delete Experience',
      message: 'Are you sure you want to delete this experience? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm({ ...confirm, open: false });
    try {
      await experiencesApi.delete(id);
      setExperiences(experiences.filter((e) => e.id !== id));
      setMessage({ type: 'success', text: 'Experience deleted successfully' });
    } catch (error) {
      console.error('Error deleting experience:', error);
      setMessage({ type: 'error', text: 'Failed to delete experience' });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchExperiences();
  };

  const handleEdit = (experience) => {
    setEditingId(experience.id);
    setShowForm(true);
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className="main-content experiences-page">
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            {!canViewMasters ? (
              <div className="inline-message error">You do not have permission to view masters.</div>
            ) : !showForm ? (
              <>
                <div className="list-header">
                  <h1>Experiences Management</h1>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {canManageMasters && (
                      <button
                        className="btn-primary small"
                        onClick={() => {
                          setEditingId(null);
                          setShowForm(true);
                        }}
                      >
                        + Add Experience
                      </button>
                    )}
                    {canViewMasters && (
                      <LogsAction
                        category="experience"
                        title="Experience Logs"
                      />
                    )}
                  </div>
                </div>

                <div className="table-container">
                  <table className="data-table draggable">
                    <thead>
                      <tr>
                        <th className="drag-handle"></th>
                        <th>English Title</th>
                        <th>Hindi Title</th>
                        <th>Type</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Sequence</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="9" className="no-data">
                            Loading...
                          </td>
                        </tr>
                      ) : experiences.length > 0 ? (
                        experiences.map((experience, index) => (
                          <tr
                            key={experience.id}
                            draggable={canManageMasters}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`draggable-row ${draggedItem === index ? 'dragging' : ''}`}
                          >
                            <td className="drag-handle">
                              <span className="drag-icon">⋮⋮</span>
                            </td>
                            <td>{experience.title_english}</td>
                            <td>{experience.title_hindi}</td>
                            <td>{(experience.exp_type || 'year') === 'month' ? 'Month' : 'Year'}</td>
                            <td>
                              {experience.exp_from}{' '}
                              {(experience.exp_type || 'year') === 'month' ? 'mo' : 'yr'}
                            </td>
                            <td>
                              {experience.exp_to}{' '}
                              {(experience.exp_type || 'year') === 'month' ? 'mo' : 'yr'}
                            </td>
                            <td>{experience.sequence || '-'}</td>
                            <td>
                              <span className={`badge ${experience.is_active ? 'active' : 'inactive'}`}>
                                {experience.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {canManageMasters && (
                                <button
                                  className="btn-small btn-edit"
                                  onClick={() => handleEdit(experience)}
                                >
                                  Edit
                                </button>
                              )}
                              {canDeleteMasters && (
                                <button
                                  className="btn-small btn-delete"
                                  onClick={() => confirmDelete(experience.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="no-data">
                            No experiences found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <ExperienceForm
                experienceId={editingId}
                onClose={handleFormClose}
                onSuccess={(msg) => setMessage(msg)}
              />
            )}

            <ConfirmDialog
              open={confirm.open}
              title={confirm.title}
              message={confirm.message}
              onCancel={() => setConfirm({ ...confirm, open: false })}
              onConfirm={handleDeleteConfirmed}
              confirmLabel="Delete"
              cancelLabel="Cancel"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
