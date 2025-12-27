export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',

  MASTERS_VIEW: 'masters.view',
  MASTERS_MANAGE: 'masters.manage',
  MASTERS_DELETE: 'masters.delete',

  USERS_VIEW: 'users.view',
  USERS_DELETE: 'users.delete',
  USERS_ACTIVATE: 'users.activate',
  USERS_EXPORT: 'users.export',

  PENDING_DELETION_USERS_VIEW: 'pending_deletion_users.view',
  PENDING_DELETION_USERS_DELETE: 'pending_deletion_users.delete',
  PENDING_DELETION_USERS_EXPORT: 'pending_deletion_users.export',

  DELETED_USERS_VIEW: 'deleted_users.view',
  DELETED_USERS_EXPORT: 'deleted_users.export',

  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_MANAGE: 'employees.manage',
  EMPLOYEES_DELETE: 'employees.delete',
  EMPLOYEES_STATUS_TOGGLE: 'employees.status_toggle',
  EMPLOYEES_VERIFY: 'employees.verify',
  EMPLOYEES_KYC_GRANT: 'employees.kyc_grant',
  EMPLOYEES_SUBSCRIPTION_CHANGE: 'employees.subscription_change',
  EMPLOYEES_ADD_CREDIT: 'employees.add_credit',
  EMPLOYEES_EXPORT: 'employees.export',

  EMPLOYEES_SHOW_PHONE_ADDRESS: 'employees.show_phone_address',

  EMPLOYERS_VIEW: 'employers.view',
  EMPLOYERS_MANAGE: 'employers.manage',
  EMPLOYERS_DELETE: 'employers.delete',
  EMPLOYERS_STATUS_TOGGLE: 'employers.status_toggle',
  EMPLOYERS_VERIFY: 'employers.verify',
  EMPLOYERS_KYC_GRANT: 'employers.kyc_grant',
  EMPLOYERS_CHANGE_SUBSCRIPTION: 'employers.subscription_change',
  EMPLOYERS_SUBSCRIPTION_CHANGE: 'employers.subscription_change', // alias for compatibility
  EMPLOYERS_ADD_CREDIT: 'employers.add_credit',
  EMPLOYERS_EXPORT: 'employers.export',

  EMPLOYERS_SHOW_PHONE_ADDRESS: 'employers.show_phone_address',

  STORIES_VIEW: 'stories.view',
  STORIES_MANAGE: 'stories.manage',
  STORIES_DELETE: 'stories.delete',
  STORIES_EXPORT: 'stories.export',

  CALL_HISTORY_VIEW: 'call_history.view',
  CALL_HISTORY_MANAGE: 'call_history.manage',
  CALL_HISTORY_DELETE: 'call_history.delete',
  CALL_HISTORY_EXPORT: 'call_history.export',

  PAYMENT_HISTORY_VIEW: 'payment_history.view',
  PAYMENT_HISTORY_DELETE: 'payment_history.delete',
  PAYMENT_HISTORY_EXPORT: 'payment_history.export',

  VIOLATIONS_VIEW: 'violations.view',
  VIOLATIONS_MANAGE: 'violations.manage',
  VIOLATIONS_DELETE: 'violations.delete',
  VIOLATIONS_EXPORT: 'violations.export',

  JOBS_VIEW: 'jobs.view',
  JOBS_MANAGE: 'jobs.manage',
  JOBS_DELETE: 'jobs.delete',
  JOBS_STATUS_TOGGLE: 'jobs.status_toggle',
  JOBS_REPOST: 'jobs.repost',
  JOBS_EXPORT: 'jobs.export',

  HIRED_EMPLOYEES_VIEW: 'hired_employees.view',
  HIRED_EMPLOYEES_EXPORT: 'hired_employees.export',

  SUBSCRIPTIONS_VIEW: 'subscriptions.view',
  SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',
  SUBSCRIPTIONS_DELETE: 'subscriptions.delete',

  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
  NOTIFICATIONS_DELETE: 'notifications.delete',

  REFERRALS_VIEW: 'referrals.view',
  REFERRALS_EXPORT: 'referrals.export',

  REVIEWS_VIEW: 'reviews.view',
  REVIEWS_MANAGE: 'reviews.manage',
  REVIEWS_EXPORT: 'reviews.export',

  ADMINS_VIEW: 'admins.view',
  ADMINS_MANAGE: 'admins.manage',
  ADMINS_DELETE: 'admins.delete',

  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',

  LOGS_VIEW: 'logs.view',
  LOGS_EXPORT: 'logs.export',
};

export const PERMISSION_GROUPS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    permissions: [
      { code: PERMISSIONS.DASHBOARD_VIEW, label: 'View dashboard' },
    ],
  },
  {
    key: 'masters',
    label: 'Masters',
    permissions: [
      { code: PERMISSIONS.MASTERS_VIEW, label: 'View masters' },
      { code: PERMISSIONS.MASTERS_MANAGE, label: 'Manage masters' },
      { code: PERMISSIONS.MASTERS_DELETE, label: 'Delete masters' },
    ],
  },
  {
    key: 'employees',
    label: 'Employees',
    permissions: [
      { code: PERMISSIONS.EMPLOYEES_VIEW, label: 'View employees' },
      { code: PERMISSIONS.EMPLOYEES_MANAGE, label: 'Create/Update employees' },
      { code: PERMISSIONS.EMPLOYEES_DELETE, label: 'Delete employees' },
      { code: PERMISSIONS.EMPLOYEES_STATUS_TOGGLE, label: 'Activate/Deactivate employees' },
      { code: PERMISSIONS.EMPLOYEES_VERIFY, label: 'Verify employees' },
      { code: PERMISSIONS.EMPLOYEES_KYC_GRANT, label: 'Grant KYC' },
      { code: PERMISSIONS.EMPLOYEES_SUBSCRIPTION_CHANGE, label: 'Change subscriptions' },
      { code: PERMISSIONS.EMPLOYEES_ADD_CREDIT, label: 'Add credits' },
      { code: PERMISSIONS.EMPLOYEES_EXPORT, label: 'Export employees' },
      { code: PERMISSIONS.EMPLOYEES_SHOW_PHONE_ADDRESS, label: 'Show phone & address' },
    ],
  },
  {
    key: 'employers',
    label: 'Employers',
    permissions: [
      { code: PERMISSIONS.EMPLOYERS_VIEW, label: 'View employers' },
      { code: PERMISSIONS.EMPLOYERS_MANAGE, label: 'Create/Update employers' },
      { code: PERMISSIONS.EMPLOYERS_DELETE, label: 'Delete employers' },
      { code: PERMISSIONS.EMPLOYERS_STATUS_TOGGLE, label: 'Activate/Deactivate employers' },
      { code: PERMISSIONS.EMPLOYERS_VERIFY, label: 'Verify employers' },
      { code: PERMISSIONS.EMPLOYERS_KYC_GRANT, label: 'Grant KYC' },
      { code: PERMISSIONS.EMPLOYERS_CHANGE_SUBSCRIPTION, label: 'Change subscriptions' },
      { code: PERMISSIONS.EMPLOYERS_ADD_CREDIT, label: 'Add credits' },
      { code: PERMISSIONS.EMPLOYERS_EXPORT, label: 'Export employers' },
      { code: PERMISSIONS.EMPLOYERS_SHOW_PHONE_ADDRESS, label: 'Show phone & address' },
    ],
  },
  {
    key: 'users',
    label: 'Users',
    permissions: [
      { code: PERMISSIONS.USERS_VIEW, label: 'View users' },
      { code: PERMISSIONS.USERS_ACTIVATE, label: 'Activate/Deactivate users' },
      { code: PERMISSIONS.USERS_DELETE, label: 'Delete users' },
      { code: PERMISSIONS.USERS_EXPORT, label: 'Export users' },
    ],
  },
  {
    key: 'pending_deletion_users',
    label: 'Pending Deletion Users',
    permissions: [
      { code: PERMISSIONS.PENDING_DELETION_USERS_VIEW, label: 'View pending deletion users' },
      { code: PERMISSIONS.PENDING_DELETION_USERS_EXPORT, label: 'Export pending deletion users' },
      { code: PERMISSIONS.PENDING_DELETION_USERS_DELETE, label: 'Delete permanently' },
    ],
  },
  {
    key: 'deleted_users',
    label: 'Deleted Users',
    permissions: [
      { code: PERMISSIONS.DELETED_USERS_VIEW, label: 'View deleted users' },
      { code: PERMISSIONS.DELETED_USERS_EXPORT, label: 'Export deleted users' },
    ],
  },
  {
    key: 'stories',
    label: 'Stories',
    permissions: [
      { code: PERMISSIONS.STORIES_VIEW, label: 'View stories' },
      { code: PERMISSIONS.STORIES_MANAGE, label: 'Manage stories' },
      { code: PERMISSIONS.STORIES_DELETE, label: 'Delete stories' },
      { code: PERMISSIONS.STORIES_EXPORT, label: 'Export stories' },
    ],
  },
  {
    key: 'call_history',
    label: 'Call History',
    permissions: [
      { code: PERMISSIONS.CALL_HISTORY_VIEW, label: 'View call history' },
      { code: PERMISSIONS.CALL_HISTORY_MANAGE, label: 'Manage notes/status' },
      { code: PERMISSIONS.CALL_HISTORY_DELETE, label: 'Delete call history' },
      { code: PERMISSIONS.CALL_HISTORY_EXPORT, label: 'Export call history' },
    ],
  },
  {
    key: 'payment_history',
    label: 'Payment History',
    permissions: [
      { code: PERMISSIONS.PAYMENT_HISTORY_VIEW, label: 'View payment history' },
      { code: PERMISSIONS.PAYMENT_HISTORY_DELETE, label: 'Delete payment records' },
      { code: PERMISSIONS.PAYMENT_HISTORY_EXPORT, label: 'Export payment history' },
    ],
  },
  {
    key: 'violations',
    label: 'Violation Reports',
    permissions: [
      { code: PERMISSIONS.VIOLATIONS_VIEW, label: 'View reports' },
      { code: PERMISSIONS.VIOLATIONS_MANAGE, label: 'Manage reports' },
      { code: PERMISSIONS.VIOLATIONS_DELETE, label: 'Delete reports' },
      { code: PERMISSIONS.VIOLATIONS_EXPORT, label: 'Export reports' },
    ],
  },
  {
    key: 'jobs',
    label: 'Jobs',
    permissions: [
      { code: PERMISSIONS.JOBS_VIEW, label: 'View jobs' },
      { code: PERMISSIONS.JOBS_MANAGE, label: 'Manage jobs' },
      { code: PERMISSIONS.JOBS_DELETE, label: 'Delete jobs' },
      { code: PERMISSIONS.JOBS_STATUS_TOGGLE, label: 'Activate/Deactivate jobs' },
      { code: PERMISSIONS.JOBS_REPOST, label: 'Repost jobs' },
      { code: PERMISSIONS.JOBS_EXPORT, label: 'Export jobs' },
    ],
  },
  {
    key: 'hiring_history',
    label: 'Hiring History',
    permissions: [
      { code: PERMISSIONS.HIRED_EMPLOYEES_VIEW, label: 'View hiring history' },
      { code: PERMISSIONS.HIRED_EMPLOYEES_EXPORT, label: 'Export hiring history' },
    ],
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions & Benefits',
    permissions: [
      { code: PERMISSIONS.SUBSCRIPTIONS_VIEW, label: 'View plans/benefits' },
      { code: PERMISSIONS.SUBSCRIPTIONS_MANAGE, label: 'Manage subscriptions/benefits' },
      { code: PERMISSIONS.SUBSCRIPTIONS_DELETE, label: 'Delete subscriptions/benefits' },
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    permissions: [
      { code: PERMISSIONS.NOTIFICATIONS_VIEW, label: 'View notifications' },
      { code: PERMISSIONS.NOTIFICATIONS_MANAGE, label: 'Manage notifications' },
      { code: PERMISSIONS.NOTIFICATIONS_DELETE, label: 'Delete notifications' },
    ],
  },
  {
    key: 'referrals',
    label: 'Referrals',
    permissions: [
      { code: PERMISSIONS.REFERRALS_VIEW, label: 'View referrals' },
      { code: PERMISSIONS.REFERRALS_EXPORT, label: 'Export referrals' },
    ],
  },
  {
    key: 'reviews',
    label: 'Reviews',
    permissions: [
      { code: PERMISSIONS.REVIEWS_VIEW, label: 'View reviews' },
      { code: PERMISSIONS.REVIEWS_MANAGE, label: 'Manage reviews' },
      { code: PERMISSIONS.REVIEWS_EXPORT, label: 'Export reviews' },
    ],
  },
  {
    key: 'admin_console',
    label: 'Admin Console',
    permissions: [
      { code: PERMISSIONS.ADMINS_VIEW, label: 'View admins & roles' },
      { code: PERMISSIONS.ADMINS_MANAGE, label: 'Manage admins & roles' },
      { code: PERMISSIONS.ADMINS_DELETE, label: 'Delete admins & roles' },
    ],
  },
  {
    key: 'logs',
    label: 'Audit Logs',
    permissions: [
      { code: PERMISSIONS.LOGS_VIEW, label: 'View logs' },
      { code: PERMISSIONS.LOGS_EXPORT, label: 'Export logs' },
    ],
  },
  {
    key: 'settings',
    label: 'Platform Settings',
    permissions: [
      { code: PERMISSIONS.SETTINGS_VIEW, label: 'View settings' },
      { code: PERMISSIONS.SETTINGS_UPDATE, label: 'Update settings' },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((perm) => perm.code)
);

const readAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('admin') || '{}');
  } catch {
    return {};
  }
};

export const hasPermission = (permission) => {
  const admin = readAdmin();
  const rolePermissions = admin?.permissions || admin?.role?.permissions || [];
  return rolePermissions.includes('*') || rolePermissions.includes(permission);
};

export const anyPermission = (permissions = []) =>
  permissions.some((permission) => hasPermission(permission));
