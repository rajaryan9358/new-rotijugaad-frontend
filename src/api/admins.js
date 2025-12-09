import client from './client';

export const adminsApi = {
  list: () => client.get('/admins'),
  create: (payload) => client.post('/admins', payload),
  update: (id, payload) => client.put(`/admins/${id}`, payload),
  remove: (id) => client.delete(`/admins/${id}`)
};
