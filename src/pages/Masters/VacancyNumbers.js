import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import VacancyNumberForm from '../../components/Forms/VacancyNumberForm';
import ConfirmDialog from '../../components/ConfirmDialog';
import vacancyNumbersApi from '../../api/masters/vacancyNumbersApi';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import './MasterPage.css';

export default function VacancyNumbers() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [numbers, setNumbers] = useState([]);
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
      fetchNumbers();
    } else {
      setLoading(false);
    }
  }, [canViewMasters]);

  useEffect(() => {
    if (!showForm) {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        const scrollPos = getScrollPosition('vacancynumbers-scroll');
        mainContent.scrollTop = scrollPos;

        const handleScroll = () => {
          saveScrollPosition('vacancynumbers-scroll', mainContent.scrollTop);
        };
        mainContent.addEventListener('scroll', handleScroll);
        return () => mainContent.removeEventListener('scroll', handleScroll);
      }
    }
  }, [showForm]);

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      const response = await vacancyNumbersApi.getAll();
      const sorted = (response.data.data || []).sort((a, b) => {
        const seqA = a.sequence || 0;
        const seqB = b.sequence || 0;
        return seqA - seqB;
      });
      setNumbers(sorted);
    } catch (error) {
      console.error('Error fetching vacancy numbers:', error);
      setMessage({ type: 'error', text: 'Failed to fetch vacancy numbers' });
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
      const newNumbers = [...numbers];
      const draggedNumber = newNumbers[draggedItem];
      newNumbers.splice(draggedItem, 1);
      newNumbers.splice(dropIndex, 0, draggedNumber);

      const updatedNumbers = newNumbers.map((number, idx) => ({
        ...number,
        sequence: idx + 1,
      }));

      setNumbers(updatedNumbers);
      setDraggedItem(null);

      await vacancyNumbersApi.updateSequence(updatedNumbers);
      setMessage({ type: 'success', text: 'Sequence updated successfully' });
    } catch (error) {
      console.error('Error updating sequence:', error);
      setMessage({ type: 'error', text: 'Failed to update sequence' });
      fetchNumbers();
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const confirmDelete = (id) => {
    setConfirm({
      open: true,
      id,
      title: 'Delete Vacancy Number',
      message: 'Are you sure you want to delete this vacancy number? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm({ ...confirm, open: false });
    try {
      await vacancyNumbersApi.delete(id);
      setNumbers(numbers.filter((n) => n.id !== id));
      setMessage({ type: 'success', text: 'Vacancy Number deleted successfully' });
    } catch (error) {
      console.error('Error deleting vacancy number:', error);
      setMessage({ type: 'error', text: 'Failed to delete vacancy number' });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchNumbers();
  };

  const handleEdit = (number) => {
    setEditingId(number.id);
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
                  <h1>Vacancy Numbers Management</h1>
                  {canManageMasters && (
                    <button
                      className="btn-primary small"
                      onClick={() => {
                        setEditingId(null);
                        setShowForm(true);
                      }}
                    >
                      + Add Number
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
                        <th>Sequence</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {numbers.length > 0 ? (
                        numbers.map((number, index) => (
                          <tr
                            key={number.id}
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
                            <td>{number.number_english}</td>
                            <td>{number.number_hindi}</td>
                            <td>{number.sequence || '-'}</td>
                            <td>
                              <span className={`badge ${number.is_active ? 'active' : 'inactive'}`}>
                                {number.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {canManageMasters && (
                                <button
                                  className="btn-small btn-edit"
                                  onClick={() => handleEdit(number)}
                                >
                                  Edit
                                </button>
                              )}
                              {canDeleteMasters && (
                                <button
                                  className="btn-small btn-delete"
                                  onClick={() => confirmDelete(number.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="no-data">
                            No vacancy numbers found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <VacancyNumberForm
                numberId={editingId}
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
