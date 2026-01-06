import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import SalaryRangeForm from '../../components/Forms/SalaryRangeForm';
import ConfirmDialog from '../../components/ConfirmDialog';
import LogsAction from '../../components/LogsAction';
import salaryRangesApi from '../../api/masters/salaryRangesApi';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import './MasterPage.css';

export default function SalaryRanges() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ranges, setRanges] = useState([]);
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
    if (canViewMasters) {
      fetchRanges();
    } else {
      setLoading(false);
    }
  }, [canViewMasters]);

  useEffect(() => {
    if (!showForm) {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        const scrollPos = getScrollPosition('salaryranges-scroll');
        mainContent.scrollTop = scrollPos;

        const handleScroll = () => {
          saveScrollPosition('salaryranges-scroll', mainContent.scrollTop);
        };
        mainContent.addEventListener('scroll', handleScroll);
        return () => mainContent.removeEventListener('scroll', handleScroll);
      }
    }
  }, [showForm]);

  const fetchRanges = async () => {
    setLoading(true);
    try {
      const response = await salaryRangesApi.getAll();
      setRanges(response.data.data || []);
    } catch (error) {
      console.error('Error fetching salary ranges:', error);
      setMessage({ type: 'error', text: 'Failed to fetch salary ranges' });
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

  const confirmDelete = (id) => {
    setConfirm({
      open: true,
      id,
      title: 'Delete Salary Range',
      message: 'Are you sure you want to delete this salary range? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm({ ...confirm, open: false });
    try {
      await salaryRangesApi.delete(id);
      setRanges(ranges.filter((r) => r.id !== id));
      setMessage({ type: 'success', text: 'Salary Range deleted successfully' });
    } catch (error) {
      console.error('Error deleting salary range:', error);
      setMessage({ type: 'error', text: 'Failed to delete salary range' });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchRanges();
  };

  const handleEdit = (range) => {
    setEditingId(range.id);
    setShowForm(true);
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className="main-content salary-ranges-page">
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
  <h1>Salary Ranges Management</h1>
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {canManageMasters && (
                    <button
                      className="btn-primary small"
                      onClick={() => {
                        setEditingId(null);
                        setShowForm(true);
                      }}
                    >
                      + Add Range
                    </button>
                  )}
    {canViewMasters && (
      <LogsAction
        category="salary ranges"
        title="Salary Range Logs"
      />
    )}
  </div>
</div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Salary From</th>
                        <th>Salary To</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="no-data">Loading...</td>
                        </tr>
                      ) : ranges.length > 0 ? (
                        ranges.map((range) => (
                          <tr key={range.id}>
                            <td>₹{range.salary_from}</td>
                            <td>₹{range.salary_to}</td>
                            <td>
                              <span className={`badge ${range.is_active ? 'active' : 'inactive'}`}>
                                {range.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {canManageMasters && (
                                <button
                                  className="btn-small btn-edit"
                                  onClick={() => handleEdit(range)}
                                >
                                  Edit
                                </button>
                              )}
                              {canDeleteMasters && (
                                <button
                                  className="btn-small btn-delete"
                                  onClick={() => confirmDelete(range.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="no-data">
                            No salary ranges found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <SalaryRangeForm
                rangeId={editingId}
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
