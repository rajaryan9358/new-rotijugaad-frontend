import client from './client';

export const getCities = async () => {
  return client.get('/masters/cities');
};

export const getCitiesByStateId = async (stateId) => {
  return client.get(`/masters/cities?state_id=${stateId}`);
};

export const getCityById = async (id) => {
  return client.get(`/masters/cities/${id}`);
};

export const createCity = async (data) => {
  return client.post('/masters/cities', data);
};

export const updateCity = async (id, data) => {
  return client.put(`/masters/cities/${id}`, data);
};

export const deleteCity = async (id) => {
  return client.delete(`/masters/cities/${id}`);
};

export const updateSequence = async (cities) => {
  return client.put('/masters/cities/bulk/sequence', { cities });
};
