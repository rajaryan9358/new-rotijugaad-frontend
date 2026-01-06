import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { hasPermission, PERMISSIONS, PERMISSION_GROUPS } from '../../utils/permissions';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import '../Masters/MasterPage.css';
import { rolesApi } from '../../api/roles';
import LogsAction from '../../components/LogsAction';

const PERMISSION_OPTIONS = ['*', ...new Set(Object.values(PERMISSIONS))];

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '18px' }}>
    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>{label}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
  </div>
);

const normalizePermissions = (input) => {
  if (Array.isArray(input)) return input;
  if (!input) return [];
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
    return input
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
};

export default function RolesManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(getSidebarState());
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', permissionsText: '' });
  const [editingId, setEditingId] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const canView = hasPermission(PERMISSIONS.ADMINS_VIEW);
  const canManage = hasPermission(PERMISSIONS.ADMINS_MANAGE);
  const canDelete = hasPermission(PERMISSIONS.ADMINS_DELETE);
  const togglePermission = (permCode) => {
    if (permCode === '*') {
      setSelectedPermissions((prev) => (prev.includes('*') ? [] : ['*']));
      return;
    }
    setSelectedPermissions((prev) => {
      const withoutGlobal = prev.filter((p) => p !== '*');
      return withoutGlobal.includes(permCode)
        ? withoutGlobal.filter((p) => p !== permCode)
        : [...withoutGlobal, permCode];
    });
  };

  const renderPermissionCheckbox = (code, labelText) => {
    const checked = selectedPermissions.includes(code);
    return (
      <label
        key={code}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '10px',
          background: checked ? '#eef2ff' : '#fff',
          border: `1px solid ${checked ? '#a5b4fc' : '#e5e7eb'}`,
          fontSize: '13px',
          boxShadow: checked ? '0 1px 4px rgba(79,70,229,0.15)' : 'none'
        }}
      >
        <input type="checkbox" checked={checked} onChange={() => togglePermission(code)} />
        <span>{labelText}</span>
      </label>
    );
  };

  useEffect(() => {
    if (!canView) return;
    fetchRoles();
  }, [canView]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await rolesApi.list();
      const normalized = (res.data?.data || []).map((role) => ({
        ...role,
        permissions: normalizePermissions(role.permissions),
      }));
      setRoles(normalized);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load roles' });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  const resetForm = () => {
    setForm({ name: '', slug: '', permissionsText: '' });
    setEditingId(null);
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        permissions: selectedPermissions.length ? selectedPermissions : ['*']
      };
      if (editingId) {
        await rolesApi.update(editingId, payload);
        setMessage({ type: 'success', text: 'Role updated' });
      } else {
        await rolesApi.create(payload);
        setMessage({ type: 'success', text: 'Role created' });
      }
      resetForm();
      fetchRoles();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Save failed' });
    }
  };

  const handleEdit = (role) => {
    if (!canManage) return;
    const permissions = normalizePermissions(role.permissions);
    setEditingId(role.id);
    setForm({
      name: role.name,
      slug: role.slug,
      permissionsText: permissions.join('\n')
    });
    setSelectedPermissions(permissions);
  };

  const handleDelete = async (id) => {
    if (!canDelete) return;
    if (!window.confirm('Delete this role?')) return;
    try {
      await rolesApi.remove(id);
      setMessage({ type: 'success', text: 'Role deleted' });
      fetchRoles();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Delete failed' });
    }
  };

  if (!canView) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content roles-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view roles.</div>
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
      <Header onMenuClick={handleMenuClick} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content roles-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            <div className="list-header">
              <h1>Roles & Permissions</h1>
              <LogsAction category="roles" title="Roles Logs" />
            </div>

            <div
              className="grid-two"
              style={{
                display: 'grid',
                gridTemplateColumns: showForm ? 'minmax(300px, 360px) 1fr' : '1fr',
                gap: '20px',
                alignItems: 'flex-start'
              }}
            >
              {showForm && (
                <div className="data-card" style={{ padding: '26px' }}>
                  <h2 style={{ marginTop: 0, marginBottom: '20px' }}>{editingId ? 'Edit Role' : 'Create Role'}</h2>
                  <form onSubmit={handleSubmit}>
                    <FormField label="Role name">
                      <input
                        type="text"
                        className="state-filter-select"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        required
                      />
                    </FormField>
                    <FormField label="Slug (e.g. super_admin)">
                      <input
                        type="text"
                        className="state-filter-select"
                        value={form.slug}
                        onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                        required={!editingId}
                        disabled={!!editingId}
                      />
                    </FormField>
                    <FormField label="Permissions">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {PERMISSION_GROUPS.map((group) => (
                          <div key={group.key}>
                            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', color: '#4b5563' }}>
                              {group.label}
                            </div>
                            <div
                              style={{
                                border: '1px solid #d1d5db',
                                borderRadius: '12px',
                                padding: '12px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: '10px',
                                background: '#f9fafb'
                              }}
                            >
                              {group.permissions.map(({ code, label }) => renderPermissionCheckbox(code, label))}
                            </div>
                          </div>
                        ))}
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', color: '#4b5563' }}>
                            Global
                          </div>
                          {renderPermissionCheckbox('*', 'Full access (*)')}
                        </div>
                      </div>
                    </FormField>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <button
                        type="submit"
                        className="btn-primary btn-small"
                        disabled={loading}
                      >
                        {editingId ? 'Update Role' : 'Create Role'}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          className="btn-secondary btn-small"
                          onClick={resetForm}
                          disabled={loading}
                        >
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
                        <th>ID</th>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Permissions</th>
                        <th>Updated</th>
                        {showActions && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={showActions ? 6 : 5}>Loading...</td></tr>
                      ) : roles.length ? (
                        roles.map((role) => (
                          <tr key={role.id}>
                            <td>{role.id}</td>
                            <td>{role.name}</td>
                            <td>{role.slug}</td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {role.permissions.map((perm) => (
                                  <span
                                    key={perm}
                                    className="badge chip"
                                    style={{ background: '#eef2ff', color: '#3730a3', textTransform: 'none' }}
                                  >
                                    {perm}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>{role.updated_at ? new Date(role.updated_at).toLocaleString() : '-'}</td>
                            {showActions && (
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {canManage && (
                                    <button className="btn-small btn-edit" onClick={() => handleEdit(role)}>Edit</button>
                                  )}
                                  {canDelete && (
                                    <button className="btn-small btn-delete" onClick={() => handleDelete(role.id)}>Delete</button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={showActions ? 6 : 5}>No roles found</td></tr>
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
