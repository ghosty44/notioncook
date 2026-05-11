import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE ?? '') + '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const raw = err.response?.data?.error;
    const message =
      (typeof raw === 'string' && raw) ||
      (raw && typeof raw.message === 'string' && raw.message) ||
      (raw && typeof raw === 'object' && JSON.stringify(raw)) ||
      err.message ||
      'Erreur réseau';
    return Promise.reject(new Error(String(message)));
  }
);

export default api;
