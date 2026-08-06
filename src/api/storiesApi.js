import client from './client';

export const getStories = (params = {}) => client.get('/stories', { params });
export const getStoryById = (id) => client.get(`/stories/${id}`);
export const createStory = (data) => client.post('/stories', data);
export const updateStory = (id, data) => client.put(`/stories/${id}`, data);
export const deleteStory = (id) => client.delete(`/stories/${id}`);
export const uploadStoryImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return client.post('/stories/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const updateStoriesSequence = (stories) =>
  client.put('/stories/bulk/sequence', { stories });

const storiesApi = {
  getStories,
  getStoryById,
  createStory,
  updateStory,
  deleteStory,
  uploadStoryImage,
  updateStoriesSequence,
};

export default storiesApi;
