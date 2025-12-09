import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import dashboardApi from '../api/dashboardApi';
import {
  getSidebarState,
  saveSidebarState,
  saveScrollPosition,
  getScrollPosition
} from '../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../utils/permissions';
import './Dashboard.css';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setSidebarOpen(getSidebarState());
  }, []);

  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    const scrollPos = getScrollPosition('dashboard-scroll');
    mainContent.scrollTop = scrollPos;
    const handler = () => saveScrollPosition('dashboard-scroll', mainContent.scrollTop);
    mainContent.addEventListener('scroll', handler);
    return () => mainContent.removeEventListener('scroll', handler);
  }, []);

  const canViewDashboard = hasPermission(PERMISSIONS.DASHBOARD_VIEW);

  useEffect(() => {
    if (!canViewDashboard) {
      setLoadingStats(false);
      return;
    }
    const fetchStats = async () => {
      setLoadingStats(true);
      setDashboardError('');
      try {
        const res = await dashboardApi.getDashboardStats();
        setStats(res.data?.data || {});
      } catch (err) {
        setDashboardError(err.response?.data?.message || 'Failed to load dashboard metrics');
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [canViewDashboard]);

  const statGroups = [
    {
      title: 'Recent additions (last 48h)',
      stats: [
        { title: 'New Users', value: stats.newUsers ?? 0, color: '#F1C40F', icon: '🆕', link: '/users?recency=new' },
        { title: 'New Employees', value: stats.newEmployees ?? 0, color: '#F39C12', icon: '🆕', link: '/employees?recency=new' },
        { title: 'New Employers', value: stats.newEmployers ?? 0, color: '#E67E22', icon: '🆕', link: '/employers?recency=new' },
        { title: 'New Jobs', value: stats.newJobs ?? 0, color: '#D35400', icon: '🆕', link: '/jobs?recency=new' }
      ]
    },
    {
      title: 'User overview',
      stats: [
        { title: 'Total Users', value: stats.totalUsers ?? 0, color: '#0098DB', icon: '👥', link: '/users' },
        { title: 'Active Employees', value: stats.activeEmployees ?? 0, color: '#1ABC9C', icon: '🟢', link: '/employees?status=active' },
        { title: 'Active Employers', value: stats.activeEmployers ?? 0, color: '#16A085', icon: '🟢', link: '/employers?status=active' },
        { title: 'Pending Employees', value: stats.pendingEmployees ?? 0, color: '#E67E22', icon: '⏳', link: '/employees?verification_status=pending' },
        { title: 'Pending Employers', value: stats.pendingEmployers ?? 0, color: '#E74C3C', icon: '⏳', link: '/employers?verification_status=pending' }
      ]
    },
    {
      title: 'Employee health',
      stats: [
        { title: 'Total Employees', value: stats.totalEmployees ?? 0, color: '#00D4AA', icon: '💼', link: '/employees' },
        { title: 'Verified Employees', value: stats.verifiedEmployees ?? 0, color: '#00C896', icon: '✓', link: '/employees?verification_status=verified' },
        { title: 'KYC Verified Employees', value: stats.kycVerifiedEmployees ?? 0, color: '#27AE60', icon: '📋', link: '/employees?kyc_status=verified' },
        { title: 'Employee Deleted', value: stats.employeeDeleted ?? 0, color: '#C0392B', icon: '🗑️', link: '/users/deleted?user_type=employee' },
        { title: 'Employee Deletion Request', value: stats.employeeDeletionRequest ?? 0, color: '#E74C3C', icon: '🗑️', link: '/users/deletion-requests?user_type=employee' }
      ]
    },
    {
      title: 'Employer health',
      stats: [
        { title: 'Total Employers', value: stats.totalEmployers ?? 0, color: '#FF6B6B', icon: '🏢', link: '/employers' },
        { title: 'Verified Employers', value: stats.verifiedEmployers ?? 0, color: '#FF5252', icon: '✓', link: '/employers?verification_status=verified' },
        { title: 'KYC Verified Employers', value: stats.kycVerifiedEmployers ?? 0, color: '#229954', icon: '📋', link: '/employers?kyc_status=verified' },
        { title: 'Employer Deleted', value: stats.employerDeleted ?? 0, color: '#A93226', icon: '🗑️', link: '/users/deleted?user_type=employer' },
        { title: 'Employer Deletion Request', value: stats.employerDeletionRequest ?? 0, color: '#CB4335', icon: '🗑️', link: '/users/deletion-requests?user_type=employer' }
      ]
    },
    {
      title: 'Jobs & hiring',
      stats: [
        { title: 'Total Jobs', value: stats.totalJobs ?? 0, color: '#6C5CE7', icon: '📝', link: '/jobs' },
        { title: 'Active Jobs', value: stats.activeJobs ?? 0, color: '#0984E3', icon: '🔥', link: '/jobs?status=active' },
        { title: 'Total Hired', value: stats.totalHired ?? 0, color: '#2980B9', icon: '💼', link: '/hired-employees?status=hired' },
        { title: 'Total Shortlisted', value: stats.totalShortlisted ?? 0, color: '#3498DB', icon: '⭐', link: '/hired-employees?status=shortlisted' }
      ]
    },
    {
      title: 'Subscriptions & referrals',
      stats: [
        { title: 'Total Subscriptions', value: stats.totalSubscriptions ?? 0, color: '#9B59B6', icon: '💳', link: '/payment-history' },
        { title: 'Active Subscriptions', value: stats.activeSubscriptions ?? 0, color: '#8E44AD', icon: '🟢', link: '/payment-history?status=active' },
        { title: 'Employees Referred', value: stats.employeeReferrals ?? 0, color: '#34495E', icon: '👥', link: '/referrals/employees' },
        { title: 'Employers Referred', value: stats.employerReferrals ?? 0, color: '#34495E', icon: '🏢', link: '/referrals/employers' }
      ]
    },
    {
      title: 'Reports',
      stats: [
        { title: 'Ads Reported', value: stats.totalAdsReported ?? 0, color: '#7F8C8D', icon: '🚩', link: '/violation-reports?report_type=ads' },
        { title: 'Profiles Reported', value: stats.totalProfileReported ?? 0, color: '#95A5A6', icon: '🚩', link: '/violation-reports?report_type=employee' }
      ]
    }
  ];

  const handleMenuClick = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const handleCardClick = (path) => {
    if (!path) return;
    navigate(path);
  };

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            <h1>Dashboard Statistics</h1>
            {!canViewDashboard ? (
              <div className="inline-message error">You do not have permission to view the dashboard.</div>
            ) : (
              <>
                {dashboardError && (
                  <div className="inline-message error" style={{ marginBottom: '12px' }}>
                    {dashboardError}
                  </div>
                )}
                {loadingStats ? (
                  <div>Loading metrics...</div>
                ) : (
                  statGroups.map((group) => (
                    <div key={group.title} style={{ marginBottom: '28px' }}>
                      <h2 style={{ marginBottom: '10px', fontSize: '16px' }}>{group.title}</h2>
                      <div className="stats-grid">
                        {group.stats.map((card) => (
                          <div
                            key={card.title}
                            onClick={() => handleCardClick(card.link)}
                            style={{ cursor: card.link ? 'pointer' : 'default' }}
                          >
                            <StatCard
                              title={card.title}
                              value={card.value}
                              color={card.color}
                              icon={card.icon}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
