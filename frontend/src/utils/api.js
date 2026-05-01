import axios from 'axios';

// In production (Vercel), backend is at /_/backend. In dev, Vite proxies /api → localhost:3001.
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE ?? '') + '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Erreur réseau';
    return Promise.reject(new Error(message));
  }
);

export default api;
