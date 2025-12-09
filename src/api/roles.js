import client from './client';

export const rolesApi = {
  list: () => client.get('/admins/roles'),
  create: (payload) => client.post('/admins/roles', payload),
  update: (id, payload) => client.put(`/admins/roles/${id}`, payload),
  remove: (id) => client.delete(`/admins/roles/${id}`)
};
