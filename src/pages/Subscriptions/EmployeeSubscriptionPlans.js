import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmployeeSubscriptionPlanForm from '../../components/Forms/EmployeeSubscriptionPlanForm';
import employeeSubscriptionPlansApi from '../../api/subscriptions/employeeSubscriptionPlansApi';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import '../Masters/MasterPage.css';

export default function EmployeeSubscriptionPlans() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '' });
  const [message, setMessage] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const navigate = useNavigate();

  const canViewSubs = hasPermission(PERMISSIONS.SUBSCRIPTIONS_VIEW);
  const canManageSubs = hasPermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE);
  const canDeleteSubs = hasPermission(PERMISSIONS.SUBSCRIPTIONS_DELETE);
  const showActions = canManageSubs || canDeleteSubs;
  const columnCount = 10 + (showActions ? 1 : 0) + (canManageSubs ? 1 : 0);

  useEffect(() => {
    setSidebarOpen(getSidebarState());
    if (canViewSubs) fetchPlans();
  }, [canViewSubs]);

  useEffect(() => {
    if (showForm || !canViewSubs) return;
    const main = document.querySelector('.main-content');
    if (!main) return;
    const pos = getScrollPosition('emp-sub-plans-scroll');
    main.scrollTop = pos;
    const onScroll = () => saveScrollPosition('emp-sub-plans-scroll', main.scrollTop);
    main.addEventListener('scroll', onScroll);
    return () => main.removeEventListener('scroll', onScroll);
  }, [showForm, canViewSubs]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await employeeSubscriptionPlansApi.getAll();
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      // optional: sort by sequence then id
      data.sort((a, b) => (a.sequence ?? 9999) - (b.sequence ?? 9999) || a.id - b.id);
      setPlans(data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to fetch plans' });
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
      title: 'Delete Plan',
      message: 'Are you sure you want to delete this plan? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm({ ...confirm, open: false });
    try {
      await employeeSubscriptionPlansApi.delete(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setMessage({ type: 'success', text: 'Plan deleted successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete plan' });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchPlans();
  };

  const syncPlanSequence = async (items) => {
    try {
      const payload = items.map((plan) => ({ id: plan.id, sequence: plan.sequence }));
      await employeeSubscriptionPlansApi.updateSequence(payload);
      setMessage({ type: 'success', text: 'Sequence updated successfully' });
    } catch (error) {
      console.error('Employee plan sequence update failed', error);
      const text = error.response?.data?.message || 'Failed to update sequence';
      setMessage({ type: 'error', text });
      fetchPlans();
    }
  };

  const handleDragStart = (e, index) => {
    if (!canManageSubs) return;
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    if (!canManageSubs) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (!canManageSubs || draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      return;
    }
    const reordered = [...plans];
    const [moved] = reordered.splice(draggedItem, 1);
    reordered.splice(dropIndex, 0, moved);
    const sequenced = reordered.map((plan, idx) => ({ ...plan, sequence: idx + 1 }));
    setPlans(sequenced);
    setDraggedItem(null);
    await syncPlanSequence(sequenced);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  if (!canViewSubs) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="no-access">
                <h1>Access Denied</h1>
                <p>You do not have permission to view subscription plans.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            {!showForm ? (
              <>
                <div className="list-header">
                  <h1>Employee Plans</h1>
                  {canManageSubs && (
                    <button className="btn-primary small" onClick={() => { setEditingId(null); setShowForm(true); }}>
                      + Add Plan
                    </button>
                  )}
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {canManageSubs && <th className="drag-handle"></th>}
                        <th>Seq</th>
                        <th>Name (EN)</th>
                        <th>Name (HI)</th>
                        <th>Validity (Days)</th>
                        <th>Tagline (EN)</th>
                        <th>Tagline (HI)</th>
                        <th>Price (₹)</th>
                        <th>Contact Cr</th>
                        <th>Interest Cr</th>
                        <th>Status</th>
                        {showActions && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {plans.length ? (
                        plans.map((p, index) => (
                          <tr
                            key={p.id}
                            draggable={canManageSubs}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`draggable-row ${draggedItem === index ? 'dragging' : ''}`}
                          >
                            {canManageSubs && (
                              <td className="drag-handle">
                                <span className="drag-icon">⋮⋮</span>
                              </td>
                            )}
                            <td>{p.sequence ?? '-'}</td>
                            <td>{p.plan_name_english ?? '-'}</td>
                            <td>{p.plan_name_hindi ?? '-'}</td>
                            <td>{p.plan_validity_days ?? '-'}</td>
                            <td>{p.plan_tagline_english ?? '-'}</td>
                            <td>{p.plan_tagline_hindi ?? '-'}</td>
                            <td>{p.plan_price != null ? Number(p.plan_price).toFixed(2) : '-'}</td>
                            <td>{p.contact_credits ?? '-'}</td>
                            <td>{p.interest_credits != null ? Number(p.interest_credits) : '-'}</td>
                            <td>
                              <span className={`badge ${p.is_active ? 'active' : 'inactive'}`}>
                                {p.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            {showActions && (
                              <td>
                                {canManageSubs && (
                                  <button className="btn-small btn-edit" onClick={() => { setEditingId(p.id); setShowForm(true); }}>
                                    Edit
                                  </button>
                                )}
                                {canDeleteSubs && (
                                  <button className="btn-small btn-delete" onClick={() => confirmDelete(p.id)}>
                                    Delete
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columnCount} className="no-data">{loading ? 'Loading...' : 'No plans found'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmployeeSubscriptionPlanForm
                planId={editingId}
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
