import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Request Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default axiosClient;
