import apiClient from '../utils/apiClient';

const referralsApi = {
  list: (params = {}) => apiClient.get('/referrals', { params }),
};

export default referralsApi;
