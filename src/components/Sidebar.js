import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { saveMenuState, getMenuState, saveSidebarScrollPosition, getSidebarScrollPosition } from '../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../utils/permissions';
import './Sidebar.css';

export default function Sidebar({ isOpen }) {
  const [expandedMenu, setExpandedMenu] = useState(null);
  const location = useLocation();
  const sidebarRef = useRef(null);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    const savedMenuId = getMenuState();
    if (savedMenuId) {
      setExpandedMenu(parseInt(savedMenuId));
    }
  }, []);

  useEffect(() => {
    // Restore scroll position after render
    if (sidebarRef.current) {
      const scrollPos = getSidebarScrollPosition();
      setTimeout(() => {
        if (sidebarRef.current) {
          sidebarRef.current.scrollTop = scrollPos;
        }
      }, 0);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Save scroll position when scrolling
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      saveSidebarScrollPosition(sidebar.scrollTop);
    };

    sidebar.addEventListener('scroll', handleScroll);
    return () => sidebar.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { id: 1, label: 'Dashboard', icon: '📊', path: '/dashboard', permission: PERMISSIONS.DASHBOARD_VIEW },
    {
      id: 2,
      label: 'Masters',
      icon: '⚙️',
      permission: PERMISSIONS.MASTERS_VIEW,
      submenu: [
        { label: 'States', path: '/masters/states', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Cities', path: '/masters/cities', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Skills', path: '/masters/skills', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Qualifications', path: '/masters/qualifications', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Shifts', path: '/masters/shifts', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Job Profiles', path: '/masters/job-profiles', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Document Types', path: '/masters/document-types', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Work Natures', path: '/masters/work-natures', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Business Categories', path: '/masters/business-categories', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Experiences', path: '/masters/experiences', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Referral Credits', path: '/masters/referral-credits', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Volunteers', path: '/masters/volunteers', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Salary Types', path: '/masters/salary-types', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Salary Ranges', path: '/masters/salary-ranges', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Distances', path: '/masters/distances', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Employee Call Experience', path: '/masters/employee-call-experience', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Employee Report Reasons', path: '/masters/employee-report-reasons', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Employer Call Experience', path: '/masters/employer-call-experience', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Employer Report Reasons', path: '/masters/employer-report-reasons', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Vacancy Numbers', path: '/masters/vacancy-numbers', permission: PERMISSIONS.MASTERS_VIEW },
        { label: 'Job Benefits', path: '/masters/job-benefits', permission: PERMISSIONS.MASTERS_VIEW },
      ],
    },
    { id: 3, label: 'Employees', icon: '👥', path: '/employees', permission: PERMISSIONS.EMPLOYEES_VIEW },
    { id: 4, label: 'Employers', icon: '🏢', path: '/employers', permission: PERMISSIONS.EMPLOYERS_VIEW },
    {
      id: 5,
      label: 'Users',
      icon: '🙍',
      submenu: [
        { label: 'All Users', path: '/users', permission: PERMISSIONS.USERS_VIEW },
        { label: 'Pending deletions', path: '/users/deletion-requests', permission: PERMISSIONS.PENDING_DELETION_USERS_VIEW },
        { label: 'Deleted users', path: '/users/deleted', permission: PERMISSIONS.DELETED_USERS_VIEW }
      ],
    },
    { id: 6, label: 'Stories', icon: '🎞️', path: '/stories', permission: PERMISSIONS.STORIES_VIEW },
    { id: 7, label: 'Call History', icon: '📞', path: '/call-history', permission: PERMISSIONS.CALL_HISTORY_VIEW },
    { id: 8, label: 'Payment History', icon: '💰', path: '/payment-history', permission: PERMISSIONS.PAYMENT_HISTORY_VIEW },
    { id: 9, label: 'Violation Reports', icon: '⚠️', path: '/violation-reports', permission: PERMISSIONS.VIOLATIONS_VIEW },
    { id: 10, label: 'Jobs', icon: '📝', path: '/jobs', permission: PERMISSIONS.JOBS_VIEW },
    { id: 11, label: 'Hiring History', icon: '✅', path: '/hired-employees', permission: PERMISSIONS.HIRED_EMPLOYEES_VIEW },
    {
      id: 12,
      label: 'Subscriptions',
      icon: '💳',
      permission: PERMISSIONS.SUBSCRIPTIONS_VIEW,
      submenu: [
        { label: 'Employee Subscriptions', path: '/subscriptions/employee', permission: PERMISSIONS.SUBSCRIPTIONS_VIEW },
        { label: 'Employer Subscriptions', path: '/subscriptions/employer', permission: PERMISSIONS.SUBSCRIPTIONS_VIEW },
        { label: 'Plan Benefits', path: '/subscriptions/plan-benefits', permission: PERMISSIONS.SUBSCRIPTIONS_VIEW }
      ]
    },
    {
      id: 13,
      label: 'Notifications',
      icon: '🔔',
      path: '/notifications',
      permission: PERMISSIONS.NOTIFICATIONS_VIEW,
    },
    {
      id: 15,
      label: 'Referrals',
      icon: '🔗',
      permission: PERMISSIONS.REFERRALS_VIEW,
      submenu: [
        { label: 'Employee referrals', path: '/referrals/employees' },
        { label: 'Employer referrals', path: '/referrals/employers' },
      ],
    },
    {
      id: 16,
      label: 'Reviews',
      icon: '⭐',
      path: '/reviews',
      permission: PERMISSIONS.REVIEWS_VIEW,
    },
    {
      id: 16.5,
      label: 'Admin Console',
      icon: '🛠️',
      permission: PERMISSIONS.ADMINS_VIEW,
      submenu: [
        { label: 'Admins', path: '/admins', permission: PERMISSIONS.ADMINS_VIEW },
        { label: 'Roles', path: '/roles', permission: PERMISSIONS.ADMINS_VIEW }
      ],
    },
    {
      id: 16.8,
      label: 'Logs',
      icon: '📝',
      path: '/logs',
      permission: PERMISSIONS.LOGS_VIEW
    },
    {
      id: 17,
      label: 'Settings',
      icon: '⚙️',
      path: '/settings',
      permission: PERMISSIONS.SETTINGS_VIEW
    }
  ];

  const toggleSubmenu = (id) => {
    // Save current scroll position before toggling
    if (sidebarRef.current) {
      scrollPositionRef.current = sidebarRef.current.scrollTop;
    }

    const newId = expandedMenu === id ? null : id;
    setExpandedMenu(newId);
    if (newId !== null) {
      saveMenuState(newId);
    } else {
      localStorage.removeItem('app_expanded_menu');
    }

    // Restore scroll position after state update
    setTimeout(() => {
      if (sidebarRef.current) {
        sidebarRef.current.scrollTop = scrollPositionRef.current;
        saveSidebarScrollPosition(scrollPositionRef.current);
      }
    }, 0);
  };

  const isActive = (path) => location.pathname === path;

  const isMenuActive = (menuItem) => {
    if (menuItem.path) {
      return isActive(menuItem.path);
    }
    if (menuItem.submenu) {
      return menuItem.submenu.some((sub) => isActive(sub.path));
    }
    return false;
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`} ref={sidebarRef}>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          if (item.permission && !hasPermission(item.permission)) return null;
          const submenuItems = item.submenu
            ? item.submenu.filter((sub) => !sub.permission || hasPermission(sub.permission))
            : [];
          if (item.submenu && submenuItems.length === 0) return null;

          return (
            <div key={item.id} className="menu-item-wrapper">
              {item.submenu ? (
                <>
                  <button
                    className={`menu-item expandable ${isMenuActive(item) ? 'active' : ''}`}
                    onClick={() => toggleSubmenu(item.id)}
                  >
                    <span className="icon">{item.icon}</span>
                    <span className="label">{item.label}</span>
                    <span className={`arrow ${expandedMenu === item.id ? 'expanded' : ''}`}>▼</span>
                  </button>
                  {expandedMenu === item.id && (
                    <div className="submenu">
                      {submenuItems.map((subitem, index) => (
                        <Link
                          key={index}
                          to={subitem.path}
                          className={`submenu-item ${isActive(subitem.path) ? 'active' : ''}`}
                        >
                          {subitem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
                >
                  <span className="icon">{item.icon}</span>
                  <span className="label">{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
