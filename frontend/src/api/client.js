import axios from "axios";

const fallbackOrigin = 'http://127.0.0.1:8000';
const fallbackApiBase = `${fallbackOrigin}/api`;

const envApiBase = import.meta.env?.VITE_API_BASE?.trim();
const API_BASE = (envApiBase && envApiBase.length ? envApiBase : fallbackApiBase).replace(/\/+$/, '');

const envApiOrigin = import.meta.env?.VITE_API_ORIGIN?.trim();
export const API_ORIGIN = (envApiOrigin && envApiOrigin.length ? envApiOrigin : API_BASE.replace(/\/api$/, '') || fallbackOrigin).replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('Making API request to:', `${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API response received:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API response error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

export default api;
