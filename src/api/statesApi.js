import client from './client';

export const getStates = async () => {
  return client.get('/masters/states');
};

export const getStateById = async (id) => {
  return client.get(`/masters/states/${id}`);
};

export const createState = async (data) => {
  return client.post('/masters/states', data);
};

export const updateState = async (id, data) => {
  return client.put(`/masters/states/${id}`, data);
};

export const deleteState = async (id) => {
  return client.delete(`/masters/states/${id}`);
};

export const updateSequence = async (states) => {
  return client.put('/masters/states/bulk/sequence', { states });
};
