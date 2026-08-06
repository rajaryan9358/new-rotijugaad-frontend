import client from './client';

export const getContactUnlocks = (params = {}) => client.get('/contact-unlocks', { params });

export default {
  getContactUnlocks,
};
