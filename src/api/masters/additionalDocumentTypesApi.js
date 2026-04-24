import client from '../client';

const additionalDocumentTypesApi = {
  getAll: () => client.get('/masters/additional-document-types'),
  getById: (id) => client.get(`/masters/additional-document-types/${id}`),
  create: (data) => client.post('/masters/additional-document-types', data),
  update: (id, data) => client.put(`/masters/additional-document-types/${id}`, data),
  delete: (id) => client.delete(`/masters/additional-document-types/${id}`),
  updateSequence: (types) => client.put('/masters/additional-document-types/bulk/sequence', { types }),
};

export default additionalDocumentTypesApi;