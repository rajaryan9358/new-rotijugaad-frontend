import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
console.log('[API Client] Initializing with baseURL:', baseURL); // added

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // added 10s timeout
});

// Add request interceptor
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('[API Client] >>>>>>> REQUEST START <<<<<<<'); // enhanced
    console.log('[API Client] Method:', config.method?.toUpperCase()); // added
    console.log('[API Client] URL:', config.url); // added
    console.log('[API Client] Full URL:', `${config.baseURL}${config.url}`); // added
    console.log('[API Client] Params:', config.params); // added
    console.log('[API Client] Headers:', config.headers); // added
    console.log('[API Client] >>>>>>> REQUEST END <<<<<<<'); // enhanced
    return config;
  },
  (error) => {
    console.error('[API Client] >>>>>>> REQUEST ERROR <<<<<<<', error); // enhanced
    return Promise.reject(error);
  }
);

// Add response interceptor
client.interceptors.response.use(
  (response) => {
    console.log('[API Client] <<<<<<< RESPONSE START >>>>>>>'); // enhanced
    console.log('[API Client] Status:', response.status); // added
    console.log('[API Client] URL:', response.config.url); // added
    console.log('[API Client] Data:', response.data); // added
    console.log('[API Client] <<<<<<< RESPONSE END >>>>>>>'); // enhanced
    return response;
  },
  (error) => {
    console.error('[API Client] <<<<<<< RESPONSE ERROR >>>>>>>'); // enhanced
    console.error('[API Client] Error:', error); // added
    console.error('[API Client] Error message:', error.message); // added
    console.error('[API Client] Error response:', error.response); // added
    console.error('[API Client] Error config:', error.config); // added
    return Promise.reject(error);
  }
);

console.log('[API Client] Client configured and exported'); // added
export default client;
