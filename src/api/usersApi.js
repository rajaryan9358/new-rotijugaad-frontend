import client from './client';

console.log('[usersApi] Module loading...'); // added
console.log('[usersApi] client:', client); // added

// List users (optional params: page, limit, etc.)
export const getUsers = async (params = {}) => {
  console.log('[usersApi] ========== getUsers START =========='); // enhanced
  console.log('[usersApi] params:', params); // added
  const result = await client.get('/users', { params });
  console.log('[usersApi] ========== getUsers END =========='); // enhanced
  return result;
};

// Get single user
export const getUserById = async (id) => {
  console.log('[usersApi] getUserById called with id:', id);
  return client.get(`/users/${id}`);
};

// Create user
export const createUser = async (data) => {
  console.log('[usersApi] createUser called');
  return client.post('/users', data);
};

// Update user
export const updateUser = async (id, data) => {
  console.log('[usersApi] updateUser called with id:', id);
  return client.put(`/users/${id}`, data);
};

// Delete user (soft delete via paranoid)
export const deleteUser = async (id) => {
  console.log('[usersApi] deleteUser id=', id);
  return client.delete(`/users/${id}`);
};

const getStoredAdminId = () => {
  try {
    const raw = localStorage.getItem('admin');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = Number(parsed?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
};

export const updateUserStatus = async (id, isActive, deactivationReason) => {
  console.log('[usersApi] updateUserStatus id=', id, 'is_active=', isActive);
  const payload = { is_active: isActive };
  if (isActive === false) payload.deactivation_reason = (deactivationReason || '').toString();

  const adminId = getStoredAdminId();
  const config = adminId ? { headers: { 'x-admin-id': String(adminId) } } : undefined;

  return client.patch(`/users/${id}/status`, payload, config);
};

// New methods for backend endpoints
export const getPendingDeletionUsers = (params = {}) => client.get('/users/deletion-requests', { params });
export const purgeUserData = (userId) => {
  const adminId = getStoredAdminId();
  const config = adminId ? { headers: { 'x-admin-id': String(adminId) } } : undefined;
  return client.post(`/users/${userId}/delete-permanently`, undefined, config);
};
export const getDeletedUsers = (params = {}) => client.get('/users/deleted', { params });

// Backward compatibility aliases (old code expecting these)
export const getAll = getUsers;
export const get = getUserById;
export const create = createUser;
export const update = updateUser;
export const remove = deleteUser;

// Default export keeps both new and legacy names
const usersApi = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAll,
  get,
  create,
  update,
  remove,
  updateUserStatus,
  getPendingDeletionUsers,
  purgeUserData,
  getDeletedUsers
};

console.log('[usersApi] Module loaded, usersApi:', usersApi); // added
console.log('[usersApi] usersApi.getAll:', usersApi.getAll); // added

export default usersApi;
// (No changes needed for employee documents update)
