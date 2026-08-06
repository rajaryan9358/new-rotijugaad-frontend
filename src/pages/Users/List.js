import React, { useEffect, useState } from 'react';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import UserForm from './Form';
import usersApi from '../../api/usersApi';

export default function UsersList() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 25;
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // NEW: profile completion filter: '' | 'completed' | 'not_completed'
  const [profileCompletedFilter, setProfileCompletedFilter] = useState('');

  const canView = hasPermission(PERMISSIONS.USERS_VIEW);
  const canActivate = hasPermission(PERMISSIONS.USERS_ACTIVATE);
  const canDelete = hasPermission(PERMISSIONS.USERS_DELETE);

  function toErrorMessage(err) {
    return err?.response?.data?.message || err?.message || 'Request failed';
  }

  async function load() {
    if (!canView) { setLoading(false); return; }
    setLoading(true);

    // NEW: build query safely (includes filter when set)
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(profileCompletedFilter ? { profile_completed: profileCompletedFilter } : {})
    }).toString();

    try {
      const res = await usersApi.getUsers({
        page,
        limit,
        ...(profileCompletedFilter ? { profile_completed: profileCompletedFilter } : {})
      });
      const d = res?.data;
      if (d?.success) {
        setRows(d.data || []);
        setMeta(d.meta || {});
        setError('');
      } else {
        setError(d?.message || 'Error');
      }
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, canView, profileCompletedFilter]);

  async function onDelete(id) {
    if (!window.confirm('Delete user?')) return;
    try {
      const res = await usersApi.deleteUser(id);
      const d = res?.data;
      if (d?.success) load();
      else alert(d?.message || 'Delete failed');
    } catch (e) {
      alert(toErrorMessage(e));
    }
  }

  async function toggleActive(user) {
    const next = !user.is_active;
    try {
      const res = await usersApi.updateUserStatus(user.id, next);
      const d = res?.data;
      if (d?.success) load();
      else alert(d?.message || 'Status update failed');
    } catch (e) {
      alert(toErrorMessage(e));
    }
  }

  const tableHead = React.createElement('thead', null,
    React.createElement('tr', null,
      // NEW: includes Profile Completed column
      ['ID','Mobile','Name','Type','Active','Verification','KYC','Referral','Referred','Created','Profile Completed','']
        .map(h => React.createElement('th', { key: h }, h))
    )
  );

  const tableBody = React.createElement('tbody', null,
    rows.length
      ? rows.map(u => React.createElement('tr', { key: u.id },
          [
            u.id,
            u.mobile,
            u.name || '-',
            u.user_type || '-',
            u.is_active ? 'Yes' : 'No',
            u.verification_status || '-',
            u.kyc_status || '-',
            u.referral_code || '-',
            u.total_referred,
            u.created_at ? new Date(u.created_at).toLocaleDateString() : '-',
            // NEW: show profile completion timestamp
            u.profile_completed_at ? new Date(u.profile_completed_at).toLocaleString() : '-',
            React.createElement('span', { key: 'actions' },
              React.createElement('button', {
                onClick: () => { setEditing(u.id); setShowForm(true); }
              }, 'Edit'),
              ' ',
              canActivate ? React.createElement('button', {
                onClick: () => toggleActive(u)
              }, u.is_active ? 'Deactivate' : 'Activate') : null,
              ' ',
              canDelete ? React.createElement('button', { onClick: () => onDelete(u.id) }, 'Delete') : null
            )
          ].map((val, i) => React.createElement('td', { key: i }, val))
        ))
      : React.createElement('tr', null,
          // NEW: keep colSpan aligned with header count (12)
          React.createElement('td', { colSpan: 12 }, 'No users found.')
        )
  );

  const table = React.createElement('table', {
    style: { width: '100%', borderCollapse: 'collapse', marginTop: 12 }
  }, [tableHead, tableBody]);

  const pagination = React.createElement('div', { style: { marginTop: 12 } }, (() => {
    const totalPages = meta.totalPages || meta.pages || 1; // supports backend meta.totalPages
    return [
      React.createElement('button', { key: 'prev', disabled: page <= 1, onClick: () => setPage(p => p - 1) }, 'Prev'),
      ' ',
      React.createElement('span', { key: 'info' }, `Page ${page} / ${totalPages}`),
      ' ',
      React.createElement('button', {
        key: 'next',
        disabled: page >= totalPages,
        onClick: () => setPage(p => p + 1)
      }, 'Next')
    ];
  })());

  const formModal = showForm
    ? React.createElement(UserForm, {
        key: 'form',
        id: editing,
        onClose: (changed) => {
          setShowForm(false);
          setEditing(null);
          if (changed) load();
        }
      })
    : null;

  return React.createElement('div', { className: 'page' }, [
    React.createElement('h1', { key: 'h' }, 'Users'),
    React.createElement('button', {
      key: 'create',
      onClick: () => { setEditing(null); setShowForm(true); }
    }, 'Create User'),

    // NEW: filter control
    canView ? React.createElement('div', {
      key: 'filters',
      style: { marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
    }, [
      React.createElement('label', { key: 'pc-label' }, 'Profile Completed:'),
      React.createElement('select', {
        key: 'pc-select',
        value: profileCompletedFilter,
        onChange: (e) => { setProfileCompletedFilter(e.target.value); setPage(1); }
      }, [
        React.createElement('option', { key: 'all', value: '' }, 'All'),
        React.createElement('option', { key: 'completed', value: 'completed' }, 'Completed'),
        React.createElement('option', { key: 'not_completed', value: 'not_completed' }, 'Not Completed')
      ]),
      profileCompletedFilter
        ? React.createElement('button', {
            key: 'pc-clear',
            onClick: () => { setProfileCompletedFilter(''); setPage(1); }
          }, 'Clear')
        : null
    ]) : null,

    !canView ? React.createElement('p', { key: 'denied', style: { color: 'red' } }, 'You do not have permission to view users.') :
    loading ? React.createElement('p', { key: 'loading' }, 'Loading...') : null,
    error ? React.createElement('p', { key: 'error', style: { color: 'red' } }, error) : null,
    !loading && !error && canView ? table : null,
    !loading && !error && canView ? pagination : null,
    formModal
  ]);
}

