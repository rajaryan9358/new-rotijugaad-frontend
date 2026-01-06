import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ConfirmDialog from '../../components/ConfirmDialog';
import LogsAction from '../../components/LogsAction';
import VolunteerForm from '../../components/Forms/VolunteerForm';
import volunteersApi from '../../api/masters/volunteersApi';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import './MasterPage.css';

export default function Volunteers() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '' });
  const [message, setMessage] = useState(null);

  const canViewMasters = hasPermission(PERMISSIONS.MASTERS_VIEW);
  const canManageMasters = hasPermission(PERMISSIONS.MASTERS_MANAGE);
  const canDeleteMasters = hasPermission(PERMISSIONS.MASTERS_DELETE);
  const navigate = useNavigate();

  useEffect(() => {
    setSidebarOpen(getSidebarState());
    if (canViewMasters) fetchVolunteers();
    else setLoading(false);
  }, [canViewMasters]);

  useEffect(() => {
    if (!showForm) {
      const mainContent = document.querySelector('.main-content');
      if (!mainContent) return;
      const scrollPos = getScrollPosition('volunteers-scroll');
      mainContent.scrollTop = scrollPos;

      const handleScroll = () => saveScrollPosition('volunteers-scroll', mainContent.scrollTop);
      mainContent.addEventListener('scroll', handleScroll);
      return () => mainContent.removeEventListener('scroll', handleScroll);
    }
  }, [showForm]);

  const fetchVolunteers = async () => {
    setLoading(true);
    try {
      const res = await volunteersApi.getAll();
      setVolunteers(res.data?.data || []);
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to fetch volunteers' });
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

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchVolunteers();
  };

  const confirmDelete = (id) => {
    setConfirm({
      open: true,
      id,
      title: 'Delete Volunteer',
      message: 'Are you sure you want to delete this volunteer? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm((c) => ({ ...c, open: false }));
    try {
      await volunteersApi.delete(id);
      setVolunteers((prev) => prev.filter((v) => v.id !== id));
      setMessage({ type: 'success', text: 'Volunteer deleted successfully' });
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to delete volunteer' });
    }
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className="main-content volunteers-page">
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            {!canViewMasters ? (
              <div className="inline-message error">You do not have permission to view masters.</div>
            ) : showForm ? (
              <VolunteerForm
                volunteerId={editingId}
                onClose={handleFormClose}
                onSuccess={(msg) => setMessage(msg)}
              />
            ) : (
              <>
                <div className="list-header">
  <h1>Volunteers</h1>
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {canManageMasters && (
                    <button className="btn-primary small" onClick={() => { setEditingId(null); setShowForm(true); }}>
                      + Add Volunteer
                    </button>
                  )}
    {canViewMasters && (
      <LogsAction
        category="volunteers"
        title="Volunteer Logs"
      />
    )}
  </div>
</div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Assistant Code</th>
                        <th>Address</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="6" className="no-data">Loading...</td></tr>
                      ) : volunteers.length > 0 ? (
                        volunteers.map((v) => (
                          <tr key={v.id}>
                            <td>{v.name}</td>
                            <td>{v.phone_number}</td>
                            <td>{v.assistant_code || '-'}</td>
                            <td>{v.address || '-'}</td>
                            <td>{v.description || '-'}</td>
                            <td>
                              {canManageMasters && (
                                <button className="btn-small btn-edit" onClick={() => { setEditingId(v.id); setShowForm(true); }}>
                                  Edit
                                </button>
                              )}
                              {canDeleteMasters && (
                                <button className="btn-small btn-delete" onClick={() => confirmDelete(v.id)}>
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="6" className="no-data">No volunteers found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <ConfirmDialog
              open={confirm.open}
              title={confirm.title}
              message={confirm.message}
              onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
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
