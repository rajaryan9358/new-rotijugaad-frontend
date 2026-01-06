import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import SalaryTypeForm from '../../components/Forms/SalaryTypeForm';
import ConfirmDialog from '../../components/ConfirmDialog';
import LogsAction from '../../components/LogsAction';
import salaryTypesApi from '../../api/masters/salaryTypesApi';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import './MasterPage.css';

export default function SalaryTypes() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [types, setTypes] = useState([]);
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
      fetchTypes();
    } else {
      setLoading(false);
    }
  }, [canViewMasters]);

  useEffect(() => {
    if (!showForm) {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        const scrollPos = getScrollPosition('salarytypes-scroll');
        mainContent.scrollTop = scrollPos;

        const handleScroll = () => {
          saveScrollPosition('salarytypes-scroll', mainContent.scrollTop);
        };
        mainContent.addEventListener('scroll', handleScroll);
        return () => mainContent.removeEventListener('scroll', handleScroll);
      }
    }
  }, [showForm]);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const response = await salaryTypesApi.getAll();
      const sorted = (response.data.data || []).sort((a, b) => {
        const seqA = a.sequence || 0;
        const seqB = b.sequence || 0;
        return seqA - seqB;
      });
      setTypes(sorted);
    } catch (error) {
      console.error('Error fetching salary types:', error);
      setMessage({ type: 'error', text: 'Failed to fetch salary types' });
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
      const newTypes = [...types];
      const draggedType = newTypes[draggedItem];
      newTypes.splice(draggedItem, 1);
      newTypes.splice(dropIndex, 0, draggedType);

      const updatedTypes = newTypes.map((type, idx) => ({
        ...type,
        sequence: idx + 1,
      }));

      setTypes(updatedTypes);
      setDraggedItem(null);

      await salaryTypesApi.updateSequence(updatedTypes);
      setMessage({ type: 'success', text: 'Sequence updated successfully' });
    } catch (error) {
      console.error('Error updating sequence:', error);
      setMessage({ type: 'error', text: 'Failed to update sequence' });
      fetchTypes();
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const confirmDelete = (id) => {
    setConfirm({
      open: true,
      id,
      title: 'Delete Salary Type',
      message: 'Are you sure you want to delete this salary type? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm({ ...confirm, open: false });
    try {
      await salaryTypesApi.delete(id);
      setTypes(types.filter((t) => t.id !== id));
      setMessage({ type: 'success', text: 'Salary Type deleted successfully' });
    } catch (error) {
      console.error('Error deleting salary type:', error);
      setMessage({ type: 'error', text: 'Failed to delete salary type' });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchTypes();
  };

  const handleEdit = (type) => {
    setEditingId(type.id);
    setShowForm(true);
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className="main-content salary-types-page">
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
  <h1>Salary Types Management</h1>
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {canManageMasters && (
                    <button className="btn-primary small" onClick={() => { setEditingId(null); setShowForm(true); }}>
                      + Add Type
                    </button>
                  )}
    {canViewMasters && (
      <LogsAction
        category="salary types"
        title="Salary Type Logs"
      />
    )}
  </div>
</div>

                <div className="table-container">
                  <table className="data-table draggable">
                    <thead>
                      <tr>
                        <th className="drag-handle"></th>
                        <th>English Name</th>
                        <th>Hindi Name</th>
                        <th>Sequence</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="no-data">Loading...</td>
                        </tr>
                      ) : types.length > 0 ? (
                        types.map((type, index) => (
                          <tr
                            key={type.id}
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
                            <td>{type.type_english}</td>
                            <td>{type.type_hindi}</td>
                            <td>{type.sequence || '-'}</td>
                            <td>
                              <span className={`badge ${type.is_active ? 'active' : 'inactive'}`}>
                                {type.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {canManageMasters && (
                                <button className="btn-small btn-edit" onClick={() => handleEdit(type)}>
                                  Edit
                                </button>
                              )}
                              {canDeleteMasters && (
                                <button className="btn-small btn-delete" onClick={() => confirmDelete(type.id)}>
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="no-data">
                            No salary types found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <SalaryTypeForm
                typeId={editingId}
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
