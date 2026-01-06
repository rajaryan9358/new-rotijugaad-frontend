import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import ReferralCreditForm from '../../components/Forms/ReferralCreditForm';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import './MasterPage.css';

export default function ReferralCredits() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [message, setMessage] = useState(null);
  const canViewMasters = hasPermission(PERMISSIONS.MASTERS_VIEW);
  const navigate = useNavigate();

  useEffect(() => setSidebarOpen(getSidebarState()), []);

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

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className="main-content referral-credits-page">
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)}>✕</button>
              </div>
            )}

            {!canViewMasters ? (
              <div className="inline-message error">You do not have permission to view masters.</div>
            ) : (
              <>
                <div className="list-header">
                  <h1>Referral Credits</h1>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {canViewMasters && (
                      <LogsAction
                        category="referral credits"
                        title="Referral Credits Logs"
                      />
                    )}
                  </div>
                </div>

                <ReferralCreditForm onSuccess={(msg) => setMessage(msg)} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
