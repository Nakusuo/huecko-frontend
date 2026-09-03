import axios from 'axios';

// Cliente HTTP de Huecko.
export const isApiEnabled = Boolean(import.meta.env.VITE_API_URL);

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const rawAuth = localStorage.getItem('huecko-auth');
  if (!rawAuth) return config;

  try {
    const token = JSON.parse(rawAuth)?.state?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // Ignora datos locales inválidos.
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.response?.data?.error;
    return Promise.reject(new Error(message || 'No fue posible comunicarse con el servidor.'));
  }
);
