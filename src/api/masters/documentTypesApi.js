import client from '../client';

const documentTypesApi = {
  getAll: () => client.get('/masters/document-types'),
  getById: (id) => client.get(`/masters/document-types/${id}`),
  create: (data) => client.post('/masters/document-types', data),
  update: (id, data) => client.put(`/masters/document-types/${id}`, data),
  delete: (id) => client.delete(`/masters/document-types/${id}`),
  updateSequence: (types) => client.put('/masters/document-types/bulk/sequence', { types }),
};

export default documentTypesApi;
