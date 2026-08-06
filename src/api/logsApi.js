import client from './client';

const logsApi = {
  list: (params) => client.get('/logs', { params }),
  meta: () => client.get('/logs/meta'),
  admins: () => client.get('/logs/admins'),
  create: (data) => client.post('/logs', data),
};

export default logsApi;
