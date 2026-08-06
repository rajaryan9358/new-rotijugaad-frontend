import client from './client';

export const getSettings = () => client.get('/settings');
export const updateSettings = (payload) => client.post('/settings', payload);

const settingsApi = {
  getSettings,
  updateSettings
};

export default settingsApi;
