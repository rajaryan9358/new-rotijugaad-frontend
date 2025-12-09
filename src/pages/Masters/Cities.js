import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import CityForm from '../../components/Forms/CityForm';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getCities, deleteCity, updateSequence } from '../../api/citiesApi';
import { getStates } from '../../api/statesApi';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import './CitiesPage.css';

export default function Cities() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cities, setCities] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedStateFilter, setSelectedStateFilter] = useState('');
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '' });
  const [message, setMessage] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const canViewMasters = hasPermission(PERMISSIONS.MASTERS_VIEW);
  const canManageMasters = hasPermission(PERMISSIONS.MASTERS_MANAGE);
  const canDeleteMasters = hasPermission(PERMISSIONS.MASTERS_DELETE);
  const navigate = useNavigate();

  useEffect(() => {
    setSidebarOpen(getSidebarState());
    fetchStates();
    if (canViewMasters) {
      fetchCities();
    } else {
      setLoading(false);
    }
  }, [canViewMasters]);

  useEffect(() => {
    if (!showForm) {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        const scrollPos = getScrollPosition('cities-scroll');
        mainContent.scrollTop = scrollPos;

        const handleScroll = () => {
          saveScrollPosition('cities-scroll', mainContent.scrollTop);
        };
        mainContent.addEventListener('scroll', handleScroll);
        return () => mainContent.removeEventListener('scroll', handleScroll);
      }
    }
  }, [showForm]);

  // Apply filter when selectedStateFilter changes
  useEffect(() => {
    if (selectedStateFilter) {
      const filtered = allCities.filter(city => city.state_id === parseInt(selectedStateFilter));
      setCities(filtered);
    } else {
      setCities(allCities);
    }
  }, [selectedStateFilter, allCities]);

  const fetchStates = async () => {
    try {
      const response = await getStates();
      setStates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  const fetchCities = async () => {
    setLoading(true);
    try {
      const response = await getCities();
      const sorted = (response.data.data || []).sort((a, b) => {
        const seqA = a.sequence || 0;
        const seqB = b.sequence || 0;
        return seqA - seqB;
      });
      setAllCities(sorted);
      setCities(sorted);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setMessage({ type: 'error', text: 'Failed to fetch cities' });
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

  const handleDragOver = (e, index) => {
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
      const newCities = [...cities];
      const draggedCity = newCities[draggedItem];
      newCities.splice(draggedItem, 1);
      newCities.splice(dropIndex, 0, draggedCity);

      const updatedCities = newCities.map((city, idx) => ({
        ...city,
        sequence: idx + 1,
      }));

      setCities(updatedCities);
      setDraggedItem(null);

      await updateSequence(updatedCities);
      setMessage({ type: 'success', text: 'Sequence updated successfully' });
    } catch (error) {
      console.error('Error updating sequence:', error);
      setMessage({ type: 'error', text: 'Failed to update sequence' });
      fetchCities();
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const confirmDelete = (id) => {
    setConfirm({
      open: true,
      id,
      title: 'Delete City',
      message: 'Are you sure you want to delete this city? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm({ ...confirm, open: false });
    try {
      await deleteCity(id);
      const updated = allCities.filter((c) => c.id !== id);
      setAllCities(updated);
      setCities(updated.filter(c => !selectedStateFilter || c.state_id === parseInt(selectedStateFilter)));
      setMessage({ type: 'success', text: 'City deleted successfully' });
    } catch (error) {
      console.error('Error deleting city:', error);
      setMessage({ type: 'error', text: 'Failed to delete city' });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchCities();
  };

  const handleEdit = (city) => {
    setEditingId(city.id);
    setShowForm(true);
  };

  const getStateName = (stateId) => {
    const state = states.find(s => s.id === stateId);
    return state ? state.state_english : '-';
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
                  <h1>Cities Management</h1>
                  {canManageMasters && (
                    <button
                      className="btn-primary small"
                      onClick={() => {
                        setEditingId(null);
                        setShowForm(true);
                      }}
                    >
                      + Add City
                    </button>
                  )}
                </div>

                <div className="filter-section">
                  <label htmlFor="state-filter">Filter by State:</label>
                  <select
                    id="state-filter"
                    value={selectedStateFilter}
                    onChange={(e) => setSelectedStateFilter(e.target.value)}
                    className="state-filter-select"
                  >
                    <option value="">-- All States --</option>
                    {states.map(state => (
                      <option key={state.id} value={state.id}>
                        {state.state_english}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="table-container">
                  <table className="data-table draggable">
                    <thead>
                      <tr>
                        <th className="drag-handle"></th>
                        <th>State</th>
                        <th>English Name</th>
                        <th>Hindi Name</th>
                        <th>Sequence</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cities.length > 0 ? (
                        cities.map((city, index) => (
                          <tr
                            key={city.id}
                            draggable={canManageMasters}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`draggable-row ${draggedItem === index ? 'dragging' : ''}`}
                          >
                            <td className="drag-handle">
                              <span className="drag-icon">⋮⋮</span>
                            </td>
                            <td>{getStateName(city.state_id)}</td>
                            <td>{city.city_english}</td>
                            <td>{city.city_hindi}</td>
                            <td>{city.sequence || '-'}</td>
                            <td>
                              <span className={`badge ${city.is_active ? 'active' : 'inactive'}`}>
                                {city.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {canManageMasters && (
                                <button
                                  className="btn-small btn-edit"
                                  onClick={() => handleEdit(city)}
                                >
                                  Edit
                                </button>
                              )}
                              {canDeleteMasters && (
                                <button
                                  className="btn-small btn-delete"
                                  onClick={() => confirmDelete(city.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="no-data">
                            No cities found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <CityForm
                cityId={editingId}
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
