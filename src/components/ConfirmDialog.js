import React from 'react';
import './ConfirmDialog.css';

export default function ConfirmDialog({ open, title = 'Confirm', message = '', onConfirm, onCancel, confirmLabel = 'Yes', cancelLabel = 'No' }) {
  if (!open) return null;
  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
