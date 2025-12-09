import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import JobProfileForm from '../../components/Forms/JobProfileForm';
import ConfirmDialog from '../../components/ConfirmDialog';
import jobProfilesApi from '../../api/masters/jobProfilesApi';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import './MasterPage.css';

export default function JobProfiles() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profiles, setProfiles] = useState([]);
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
      fetchProfiles();
    } else {
      setLoading(false);
    }
  }, [canViewMasters]);

  useEffect(() => {
    if (!showForm) {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        const scrollPos = getScrollPosition('profiles-scroll');
        mainContent.scrollTop = scrollPos;

        const handleScroll = () => {
          saveScrollPosition('profiles-scroll', mainContent.scrollTop);
        };
        mainContent.addEventListener('scroll', handleScroll);
        return () => mainContent.removeEventListener('scroll', handleScroll);
      }
    }
  }, [showForm]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const response = await jobProfilesApi.getAll();
      const sorted = (response.data.data || []).sort((a, b) => {
        const seqA = a.sequence || 0;
        const seqB = b.sequence || 0;
        return seqA - seqB;
      });
      setProfiles(sorted);
    } catch (error) {
      console.error('Error fetching job profiles:', error);
      setMessage({ type: 'error', text: 'Failed to fetch job profiles' });
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
      const newProfiles = [...profiles];
      const draggedProfile = newProfiles[draggedItem];
      newProfiles.splice(draggedItem, 1);
      newProfiles.splice(dropIndex, 0, draggedProfile);

      const updatedProfiles = newProfiles.map((profile, idx) => ({
        ...profile,
        sequence: idx + 1,
      }));

      setProfiles(updatedProfiles);
      setDraggedItem(null);

      await jobProfilesApi.updateSequence(updatedProfiles);
      setMessage({ type: 'success', text: 'Sequence updated successfully' });
    } catch (error) {
      console.error('Error updating sequence:', error);
      setMessage({ type: 'error', text: 'Failed to update sequence' });
      fetchProfiles();
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const confirmDelete = (id) => {
    setConfirm({
      open: true,
      id,
      title: 'Delete Job Profile',
      message: 'Are you sure you want to delete this job profile? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm({ ...confirm, open: false });
    try {
      await jobProfilesApi.delete(id);
      setProfiles(profiles.filter((p) => p.id !== id));
      setMessage({ type: 'success', text: 'Job Profile deleted successfully' });
    } catch (error) {
      console.error('Error deleting profile:', error);
      setMessage({ type: 'error', text: 'Failed to delete job profile' });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchProfiles();
  };

  const handleEdit = (profile) => {
    setEditingId(profile.id);
    setShowForm(true);
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className="main-content">
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
                  <h1>Job Profiles Management</h1>
                  {canManageMasters && (
                    <button className="btn-primary small" onClick={() => { setEditingId(null); setShowForm(true); }}>
                      + Add Profile
                    </button>
                  )}
                </div>

                <div className="table-container">
                  <table className="data-table draggable">
                    <thead>
                      <tr>
                        <th className="drag-handle"></th>
                        <th>English Name</th>
                        <th>Hindi Name</th>
                        <th>Image</th>
                        <th>Sequence</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.length > 0 ? (
                        profiles.map((profile, index) => (
                          <tr
                            key={profile.id}
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
                            <td>{profile.profile_english}</td>
                            <td>{profile.profile_hindi}</td>
                            <td>
                              {profile.profile_image ? (
                                <img src={profile.profile_image} alt={profile.profile_english} style={{ height: '30px', width: '30px', borderRadius: '4px' }} />
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>{profile.sequence || '-'}</td>
                            <td>
                              <span className={`badge ${profile.is_active ? 'active' : 'inactive'}`}>
                                {profile.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {canManageMasters && (
                                <button className="btn-small btn-edit" onClick={() => handleEdit(profile)}>
                                  Edit
                                </button>
                              )}
                              {canDeleteMasters && (
                                <button className="btn-small btn-delete" onClick={() => confirmDelete(profile.id)}>
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="no-data">
                            No job profiles found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <JobProfileForm
                profileId={editingId}
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