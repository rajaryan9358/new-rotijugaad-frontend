import client from '../client';

const referralCreditsApi = {
  get: () => client.get('/masters/referral-credits'),
  update: (data) => client.put('/masters/referral-credits', data),
};

export default referralCreditsApi;
