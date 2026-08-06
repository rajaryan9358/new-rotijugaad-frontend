import React, { useEffect, useState } from 'react';
import usersApi from '../../api/usersApi';

export default function UserForm({ id, onClose }) {
  const isEdit = !!id;
  const [form, setForm] = useState({
    mobile: '',
    name: '',
    user_type: '',
    is_active: true,
    verification_status: '',
    kyc_status: '',
    referral_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toErrorMessage(err) {
    return err?.response?.data?.message || err?.message || 'Request failed';
  }

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      usersApi
        .getUserById(id)
        .then((res) => {
          const d = res?.data;
          if (d?.success) {
            const u = d.data;
            setForm({
              mobile: u.mobile || '',
              name: u.name || '',
              user_type: u.user_type || '',
              is_active: u.is_active,
              verification_status: u.verification_status || '',
              kyc_status: u.kyc_status || '',
              referral_code: u.referral_code || ''
            });
          } else setError(d?.message || 'Load failed');
        })
        .catch((e) => setError(toErrorMessage(e)))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const request = isEdit
      ? usersApi.updateUser(id, form)
      : usersApi.createUser(form);

    request
      .then((res) => {
        const d = res?.data;
        if (d?.success) onClose(true);
        else setError(d?.message || 'Save failed');
      })
      .catch((e) => setError(toErrorMessage(e)))
      .finally(() => setSaving(false));
  }

  if (loading) {
    return React.createElement('div', { className: 'modal' },
      React.createElement('p', null, 'Loading...')
    );
  }

  const fields = [
    ['Mobile *', 'mobile', { required: true, disabled: isEdit }],
    ['Name', 'name', {}],
    ['User Type', 'user_type', {}],
    ['Verification Status', 'verification_status', {}],
    ['KYC Status', 'kyc_status', {}],
    ['Referral Code', 'referral_code', { disabled: isEdit }]
  ].map(([label, key, extra]) =>
    React.createElement('div', { key },
      React.createElement('label', null, label),
      React.createElement('br'),
      React.createElement('input', {
        value: form[key],
        onChange: e => setField(key, e.target.value),
        ...extra
      })
    )
  );

  const activeCheckbox = React.createElement('div', null,
    React.createElement('label', null,
      React.createElement('input', {
        type: 'checkbox',
        checked: form.is_active,
        onChange: e => setField('is_active', e.target.checked)
      }),
      ' Active'
    )
  );

  const errorEl = error
    ? React.createElement('p', { style: { color: 'red' } }, error)
    : null;

  const buttons = React.createElement('div', { style: { marginTop: 12 } }, [
    React.createElement('button', { key: 'save', type: 'submit', disabled: saving }, saving ? 'Saving...' : 'Save'),
    ' ',
    React.createElement('button', { key: 'cancel', type: 'button', onClick: () => onClose(false) }, 'Cancel')
  ]);

  const formEl = React.createElement('form', { onSubmit: submit }, [
    ...fields,
    activeCheckbox,
    errorEl,
    buttons
  ]);

  return React.createElement('div', {
    className: 'modal',
    style: { background: '#fff', padding: 16, border: '1px solid #ccc' }
  }, [
    React.createElement('h2', { key: 'title' }, isEdit ? 'Edit User' : 'Create User'),
    formEl
  ]);
}
