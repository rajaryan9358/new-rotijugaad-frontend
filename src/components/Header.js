import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

export default function Header({ onMenuClick }) {
  const { logout } = useAuth();
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuClick}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <h1 className="logo">Roti Jugaad Admin</h1>
      </div>
      <div className="header-right">
        <span className="admin-name">{admin.name || 'Admin'}</span>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
