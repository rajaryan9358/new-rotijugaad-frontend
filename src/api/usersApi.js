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

export const updateUserStatus = async (id, isActive) => {
  console.log('[usersApi] updateUserStatus id=', id, 'is_active=', isActive);
  return client.patch(`/users/${id}/status`, { is_active: isActive });
};

// New methods for backend endpoints
export const getPendingDeletionUsers = (params = {}) => client.get('/users/deletion-requests', { params });
export const purgeUserData = (userId) => client.post(`/users/${userId}/delete-permanently`);
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
