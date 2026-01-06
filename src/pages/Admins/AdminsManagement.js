import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import '../Masters/MasterPage.css';
import { adminsApi } from '../../api/admins';
import { rolesApi } from '../../api/roles';
import LogsAction from '../../components/LogsAction';

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '18px' }}>
    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{label}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
  </div>
);

const headerCellStyle = { cursor: 'pointer' };

export default function AdminsManagement() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => getSidebarState());
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role_id: '' });
  const [editingId, setEditingId] = useState(null);

  const canView = hasPermission(PERMISSIONS.ADMINS_VIEW);
  const canManage = hasPermission(PERMISSIONS.ADMINS_MANAGE);
  const canDelete = hasPermission(PERMISSIONS.ADMINS_DELETE);

  useEffect(() => {
    if (!canView) return;
    fetchData();
  }, [canView]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminsRes, rolesRes] = await Promise.all([
        adminsApi.list(),
        rolesApi.list()
      ]);
      setAdmins(adminsRes.data?.data || []);
      setRoles(rolesRes.data?.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load admins' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role_id: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      if (editingId) {
        await adminsApi.update(editingId, {
          name: form.name,
          email: form.email,
          role_id: form.role_id,
          ...(form.password ? { password: form.password } : {}),
          is_active: true
        });
        setMessage({ type: 'success', text: 'Admin updated' });
      } else {
        await adminsApi.create(form);
        setMessage({ type: 'success', text: 'Admin created' });
      }
      resetForm();
      fetchData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Save failed' });
    }
  };

  const handleEdit = (admin) => {
    if (!canManage) return;
    setEditingId(admin.id);
    setForm({
      name: admin.name,
      email: admin.email,
      password: admin.password || '',
      role_id: admin.role_id || admin.roleRelation?.id || ''
    });
  };

  const handleDeactivate = async (id) => {
    if (!canDelete) return;
    if (!window.confirm('Deactivate this admin?')) return;
    try {
      await adminsApi.remove(id);
      setMessage({ type: 'success', text: 'Admin deactivated' });
      fetchData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Action failed' });
    }
  };

  const handleToggleActive = async (admin) => {
    if (!canDelete) return;
    const nextActive = !admin.is_active;
    if (!window.confirm(`${nextActive ? 'Activate' : 'Deactivate'} this admin?`)) return;
    try {
      await adminsApi.update(admin.id, { is_active: nextActive });
      setMessage({ type: 'success', text: `Admin ${nextActive ? 'activated' : 'deactivated'}` });
      fetchData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Action failed' });
    }
  };

  const handleMenuClick = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  const stats = [
    { label: 'Total Admins', value: admins.length },
    { label: 'Active Admins', value: admins.filter((a) => a.is_active).length },
    { label: 'Roles', value: roles.length }
  ];

  if (!canView) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={() => setSidebarOpen((o) => !o)} onLogout={() => { localStorage.clear(); navigate('/login'); }} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content admins-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view admins.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }
  const showForm = canManage;
  const showActions = canManage;
  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={() => { localStorage.clear(); navigate('/login'); }} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content admins-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            <div className="list-header">
              <h1>Admins</h1>
              <LogsAction category="admin" title="Admins Logs" />
            </div>
            <div className="stats-row" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px', marginBottom:'16px' }}>
              {stats.map((stat) => (
                <div key={stat.label} className="data-card" style={{ padding:'12px 16px', textAlign:'center' }}>
                  <div style={{ fontSize:'12px', color:'#6b7280', textTransform:'uppercase' }}>{stat.label}</div>
                  <div style={{ fontSize:'24px', fontWeight:700 }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div
              className="grid-two"
              style={{
                display:'grid',
                gridTemplateColumns: showForm ? 'minmax(300px, 360px) 1fr' : '1fr',
                gap:'20px',
                alignItems:'flex-start'
              }}
            >
              {showForm && (
                <div className="data-card" style={{ padding: '26px' }}>
                  <h2 style={{ marginTop: 0, marginBottom: '20px' }}>{editingId ? 'Edit Admin' : 'Create Admin'}</h2>
                  <form onSubmit={handleSubmit}>
                    <FormField label="Name">
                      <input
                        type="text"
                        className="state-filter-select"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        required
                      />
                    </FormField>
                    <FormField label="Email">
                      <input
                        type="email"
                        className="state-filter-select"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        required
                      />
                    </FormField>
                    <FormField label="Password">
                      <input
                        type="text"
                        className="state-filter-select"
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        required={!editingId}
                      />
                    </FormField>
                    <FormField label="Role">
                      <select
                        className="state-filter-select"
                        value={form.role_id}
                        onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                        required
                      >
                        <option value="">Select role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </FormField>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <button type="submit" className="btn-primary btn-small">
                        {editingId ? 'Update Admin' : 'Create Admin'}
                      </button>
                      {editingId && (
                        <button type="button" className="btn-secondary btn-small" onClick={resetForm}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}
              <div className="data-card" style={{ padding:'0' }}>
                <div className="table-container" style={{ padding:'0' }}>
                   <table className="data-table">
                     <thead>
                       <tr>
                         <th style={headerCellStyle}>ID</th>
                         <th style={headerCellStyle}>Name</th>
                         <th style={headerCellStyle}>Email</th>
                         <th style={headerCellStyle}>Role</th>
                         <th style={headerCellStyle}>Status</th>
                         <th style={headerCellStyle}>Updated</th>
                         {showActions && <th style={headerCellStyle}>Actions</th>}
                       </tr>
                     </thead>
                     <tbody>
                       {loading ? (
                         <tr><td colSpan={showActions ? 7 : 6}>Loading...</td></tr>
                       ) : admins.length ? (
                         admins.map((admin) => (
                           <tr key={admin.id}>
                             <td>{admin.id}</td>
                             <td>{admin.name}</td>
                             <td>{admin.email}</td>
                             <td>{admin.roleRelation?.name || '-'}</td>
                             <td>
                               <span className={`badge ${admin.is_active ? 'active' : 'inactive'}`}>
                                 {admin.is_active ? 'Active' : 'Inactive'}
                               </span>
                             </td>
                             <td>{admin.updated_at ? new Date(admin.updated_at).toLocaleString() : '-'}</td>
                             {showActions && (
                               <td>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                   {canManage && (
                                     <button className="btn-small btn-edit" onClick={() => handleEdit(admin)}>Edit</button>
                                   )}
                                   {canDelete && (
                                     <button
                                       className={`btn-small ${admin.is_active ? 'btn-delete' : 'btn-primary'}`}
                                       onClick={() => handleToggleActive(admin)}
                                     >
                                       {admin.is_active ? 'Deactivate' : 'Activate'}
                                     </button>
                                   )}
                                 </div>
                               </td>
                             )}
                           </tr>
                         ))
                       ) : (
                         <tr><td colSpan={showActions ? 7 : 6}>No admins found</td></tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
