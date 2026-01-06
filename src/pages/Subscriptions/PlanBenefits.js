import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import ConfirmDialog from '../../components/ConfirmDialog';
import PlanBenefitForm from '../../components/Forms/PlanBenefitForm';
import planBenefitsApi from '../../api/subscriptions/planBenefitsApi';
import employeeSubscriptionPlansApi from '../../api/subscriptions/employeeSubscriptionPlansApi';
import employerSubscriptionPlansApi from '../../api/subscriptions/employerSubscriptionPlansApi';
import { getSidebarState, saveSidebarState, saveScrollPosition, getScrollPosition } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import '../Masters/MasterPage.css';

const DEFAULT_FILTERS = {
  subscription_type: '',
  plan_id: '',
  is_active: '',
};

export default function PlanBenefits() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [benefits, setBenefits] = useState([]);
  const [employeePlans, setEmployeePlans] = useState([]);
  const [employerPlans, setEmployerPlans] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('sequence');
  const [sortDir, setSortDir] = useState('asc');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '' });
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const canViewSubs = hasPermission(PERMISSIONS.SUBSCRIPTIONS_VIEW);
  const canManageSubs = hasPermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE);
  const canDeleteSubs = hasPermission(PERMISSIONS.SUBSCRIPTIONS_DELETE);
  const showActions = canManageSubs || canDeleteSubs;
  const columnCount = 6 + (showActions ? 1 : 0) + (canManageSubs ? 1 : 0);

  useEffect(() => {
    setSidebarOpen(getSidebarState());
  }, []);

  const planNameMap = useMemo(() => {
    const map = new Map();
    employeePlans.forEach((plan) => plan && map.set(`Employee-${plan.id}`, plan.plan_name_english));
    employerPlans.forEach((plan) => plan && map.set(`Employer-${plan.id}`, plan.plan_name_english));
    return map;
  }, [employeePlans, employerPlans]);

  const getPlanLabel = (benefit) =>
    planNameMap.get(`${benefit.subscription_type}-${benefit.plan_id}`) || benefit.plan_id;

  const fetchPlanMasters = useCallback(async () => {
    try {
      const [empRes, employerRes] = await Promise.all([
        employeeSubscriptionPlansApi.getAll(),
        employerSubscriptionPlansApi.getAll(),
      ]);
      setEmployeePlans(empRes.data?.data || []);
      setEmployerPlans(employerRes.data?.data || []);
    } catch (error) {
      console.error('Plan masters fetch error:', error);
    }
  }, []);

  const fetchBenefits = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sortField, sortDir };
      if (filters.subscription_type) params.subscription_type = filters.subscription_type;
      if (filters.plan_id) params.plan_id = filters.plan_id;
      if (filters.is_active) params.is_active = filters.is_active;
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch) params.search = trimmedSearch;
      const res = await planBenefitsApi.getAll(params);
      setBenefits(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setMessage({ type: 'error', text: 'Failed to fetch benefits' });
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm, sortField, sortDir]);

  useEffect(() => {
    if (!canViewSubs) return;
    fetchPlanMasters();
  }, [fetchPlanMasters, canViewSubs]);

  useEffect(() => {
    if (!canViewSubs) return;
    fetchBenefits();
  }, [fetchBenefits, canViewSubs]);

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
      title: 'Delete Benefit',
      message: 'Are you sure you want to delete this benefit? This action cannot be undone.',
    });
  };

  const handleDeleteConfirmed = async () => {
    const id = confirm.id;
    setConfirm({ ...confirm, open: false });
    try {
      await planBenefitsApi.delete(id);
      setBenefits((prev) => prev.filter((b) => b.id !== id));
      setMessage({ type: 'success', text: 'Benefit deleted successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete benefit' });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchBenefits();
  };

  const [draggedItem, setDraggedItem] = useState(null);

  const syncBenefitSequence = async (items) => {
    try {
      const payload = items.map((benefit) => ({ id: benefit.id, sequence: benefit.sequence }));
      await planBenefitsApi.updateSequence(payload);
      setMessage({ type: 'success', text: 'Sequence updated successfully' });
    } catch (error) {
      console.error('Plan benefit sequence update failed', error);
      const text = error.response?.data?.message || 'Failed to update sequence';
      setMessage({ type: 'error', text });
      fetchBenefits();
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
    const reordered = [...benefits];
    const [moved] = reordered.splice(draggedItem, 1);
    reordered.splice(dropIndex, 0, moved);
    const sequenced = reordered.map((benefit, idx) => ({ ...benefit, sequence: idx + 1 }));
    setBenefits(sequenced);
    setDraggedItem(null);
    await syncBenefitSequence(sequenced);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const toggleFilterPanel = () => {
    setDraftFilters(filters);
    setShowFilterPanel((prev) => !prev);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setShowFilterPanel(false);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
    setSearchTerm('');
    setShowFilterPanel(false);
  };

  const removeFilterChip = (key) => {
    if (key === 'search') {
      setSearchTerm('');
      return;
    }
    const next = { ...filters };
    if (key === 'subscription_type') {
      next.subscription_type = '';
      next.plan_id = '';
    } else if (key === 'plan') {
      next.plan_id = '';
    } else if (key === 'status') {
      next.is_active = '';
    }
    setFilters(next);
    setDraftFilters((prev) => ({ ...prev, ...next }));
  };

  const handleDraftFilterChange = (field, value) => {
    setDraftFilters((prev) => {
      if (field === 'subscription_type') {
        return { ...prev, subscription_type: value, plan_id: '' };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSortHeaderClick = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIndicator = (field) => (sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const planOptionsForDraft =
    draftFilters.subscription_type === 'Employer'
      ? employerPlans
      : draftFilters.subscription_type === 'Employee'
      ? employeePlans
      : [];

  const activeFilterCount = [searchTerm.trim(), filters.subscription_type, filters.plan_id, filters.is_active].filter(Boolean).length;
  const chipBaseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '20px',
    border: '1px solid #bae6fd',
    background: '#e0f2fe',
    color: '#0369a1',
    fontSize: '12px',
    fontWeight: 600,
  };
  const chipCloseStyle = {
    background: 'transparent',
    border: 'none',
    color: '#0369a1',
    cursor: 'pointer',
    fontSize: '12px',
    width: '18px',
    height: '18px',
    lineHeight: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (!canViewSubs) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content plan-benefits-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="no-access">
                <h1>Access Denied</h1>
                <p>You do not have permission to view subscription benefits.</p>
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
        <main className={`main-content plan-benefits-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
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
                  <h1>Plan Benefits</h1>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <LogsAction category="plan benefits" title="Plan Benefits Logs" />
                  {canManageSubs && (
                    <button className="btn-primary small" onClick={() => { setEditingId(null); setShowForm(true); }}>
                      + Add Benefit
                    </button>
                  )}
                  </div>
                </div>

                <div className="search-filter-row" style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Search</label>
                    <input
                      type="text"
                      className="state-filter-select"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search plan name or benefit..."
                      style={{ width: 'min(360px, 100%)', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                    <button className="btn-secondary btn-small" onClick={toggleFilterPanel}>
                      Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </button>
                  </div>
                </div>

                <div className="applied-filters" style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 12px', border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
                  {searchTerm && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Search: {searchTerm}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('search')}>×</button>
                    </span>
                  )}
                  {filters.subscription_type && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Type: {filters.subscription_type}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('subscription_type')}>×</button>
                    </span>
                  )}
                  {filters.plan_id && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Plan: {planNameMap.get(`${filters.subscription_type}-${filters.plan_id}`) || filters.plan_id}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('plan')}>×</button>
                    </span>
                  )}
                  {filters.is_active && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Status: {filters.is_active}
                      <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('status')}>×</button>
                    </span>
                  )}
                  {activeFilterCount === 0 && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>No filters applied</span>
                  )}
                </div>

                {showFilterPanel && (
                  <div className="filter-panel" style={{ position: 'relative', marginBottom: '16px', padding: '16px', border: '1px solid #ddd', borderRadius: '10px', background: '#f8fafc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Subscription Type</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.subscription_type}
                          onChange={(e) => handleDraftFilterChange('subscription_type', e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">All</option>
                          <option value="Employee">Employee</option>
                          <option value="Employer">Employer</option>
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Plan</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.plan_id}
                          onChange={(e) => handleDraftFilterChange('plan_id', e.target.value)}
                          style={{ width: '100%' }}
                          disabled={!draftFilters.subscription_type}
                        >
                          <option value="">All</option>
                          {planOptionsForDraft.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.plan_name_english}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Status</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.is_active}
                          onChange={(e) => handleDraftFilterChange('is_active', e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="filter-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn-primary btn-small" onClick={applyFilters}>Apply</button>
                      <button type="button" className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                      <button type="button" className="btn-secondary btn-small" onClick={() => setShowFilterPanel(false)}>Close</button>
                    </div>
                  </div>
                )}

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {canManageSubs && <th className="drag-handle"></th>}
                        <th onClick={() => handleSortHeaderClick('sequence')} style={{ cursor: 'pointer' }}>Seq{sortIndicator('sequence')}</th>
                        <th onClick={() => handleSortHeaderClick('subscription_type')} style={{ cursor: 'pointer' }}>Type{sortIndicator('subscription_type')}</th>
                        <th onClick={() => handleSortHeaderClick('plan_id')} style={{ cursor: 'pointer' }}>Plan{sortIndicator('plan_id')}</th>
                        <th onClick={() => handleSortHeaderClick('benefit_english')} style={{ cursor: 'pointer' }}>Benefit (EN){sortIndicator('benefit_english')}</th>
                        <th onClick={() => handleSortHeaderClick('benefit_hindi')} style={{ cursor: 'pointer' }}>Benefit (HI){sortIndicator('benefit_hindi')}</th>
                        <th onClick={() => handleSortHeaderClick('is_active')} style={{ cursor: 'pointer' }}>Status{sortIndicator('is_active')}</th>
                        {showActions && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {benefits.length ? (
                        benefits.map((b, index) => (
                          <tr
                            key={b.id}
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
                            <td>{b.sequence ?? '-'}</td>
                            <td>{b.subscription_type}</td>
                            <td>{getPlanLabel(b)}</td>
                            <td>{b.benefit_english}</td>
                            <td>{b.benefit_hindi ?? '-'}</td>
                            <td>
                              <span className={`badge ${b.is_active ? 'active' : 'inactive'}`}>
                                {b.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            {showActions && (
                              <td>
                                {canManageSubs && (
                                  <button className="btn-small btn-edit" onClick={() => { setEditingId(b.id); setShowForm(true); }}>
                                    Edit
                                  </button>
                                )}
                                {canDeleteSubs && (
                                  <button className="btn-small btn-delete" onClick={() => confirmDelete(b.id)}>
                                    Delete
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columnCount} className="no-data">{loading ? 'Loading...' : 'No benefits found'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <PlanBenefitForm
                benefitId={editingId}
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
