import client from './client';

const jobProfilesApi = {
  getAll: async () => {
    try {
      const res = await client.get('/masters/job-profiles');
      return res;
    } catch (e) {
      console.error('[jobProfilesApi] fetch error:', e?.response?.data || e.message);
      throw e;
    }
  },
  getById: async (id) => {
    try {
      return await client.get(`/masters/job-profiles/${id}`);
    } catch (e) {
      console.error('[jobProfilesApi] fetch single error:', e?.response?.data || e.message);
      throw e;
    }
  },
  create: async (payload) => {
    try {
      return await client.post('/masters/job-profiles', payload);
    } catch (e) {
      console.error('[jobProfilesApi] create error:', e?.response?.data || e.message);
      throw e;
    }
  },
  update: async (id, payload) => {
    try {
      return await client.put(`/masters/job-profiles/${id}`, payload);
    } catch (e) {
      console.error('[jobProfilesApi] update error:', e?.response?.data || e.message);
      throw e;
    }
  },
  uploadImage: async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    try {
      return await client.post('/masters/job-profiles/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (e) {
      console.error('[jobProfilesApi] upload error:', e?.response?.data || e.message);
      throw e;
    }
  }
};

export default jobProfilesApi;
