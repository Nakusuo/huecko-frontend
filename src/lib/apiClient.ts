import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * Cliente HTTP de Huecko.
 *
 * `VITE_API_URL` es el único interruptor entre los dos modos de la app:
 *   - vacía  → modo demo: los servicios responden con datos simulados.
 *   - con valor → modo conectado: todo sale contra `huecko-backend`.
 *
 * En desarrollo conviene dejarla en `/api` y apoyarse en el proxy de Vite
 * (ver `vite.config.ts`): así el navegador habla con el mismo origen y no
 * hay CORS que configurar en el backend.
 */

const rawBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim();

/** Base normalizada, sin barra final. */
export const apiBaseUrl = rawBaseUrl.replace(/\/+$/, '');

/** `true` cuando la app debe hablar con el backend real. */
export const isApiEnabled = apiBaseUrl.length > 0;

/** Error de API con el status HTTP a mano, para que la UI pueda reaccionar. */
export class ApiError extends Error {
  status: number;
  isNetworkError: boolean;

  constructor(message: string, status: number, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

/** Se emite cuando el backend responde 401: la UI puede mandar al login. */
export const UNAUTHORIZED_EVENT = 'huecko:unauthorized';

export const apiClient = axios.create({
  baseURL: apiBaseUrl || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* El backend devuelve `{timestamp, error, mensaje}` (GlobalExceptionHandler);
   Spring Security y los errores de validación usan `message`. Se prueban los
   tres para no acabar mostrando "[object Object]" al usuario. */
function readServerMessage(data: unknown): string | null {
  if (typeof data === 'string' && data.trim()) return data;
  if (!data || typeof data !== 'object') return null;

  const body = data as Record<string, unknown>;
  for (const key of ['mensaje', 'message', 'error'] as const) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!error.response) {
      const detail = error.code === 'ECONNABORTED' ? 'la petición tardó demasiado' : 'sin respuesta';
      return Promise.reject(
        new ApiError(
          `No fue posible conectar con el backend en ${apiBaseUrl || '/api'} (${detail}). ` +
            'Verifica que huecko-backend esté levantado.',
          0,
          true
        )
      );
    }

    const { status, data } = error.response;

    if (status === 401) {
      useAuthStore.getState().logout();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      return Promise.reject(new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', status));
    }

    return Promise.reject(
      new ApiError(readServerMessage(data) ?? 'No fue posible comunicarse con el servidor.', status)
    );
  }
);

/**
 * Comprueba que el backend responda. Útil para un aviso en la UI o para
 * depurar la conexión desde la consola: `await checkBackendHealth()`.
 */
export async function checkBackendHealth(): Promise<{ ok: boolean; detail: string }> {
  if (!isApiEnabled) {
    return { ok: false, detail: 'VITE_API_URL vacía: la app corre en modo demo.' };
  }

  try {
    await apiClient.get('/actuator/health', { timeout: 4000 });
    return { ok: true, detail: `Backend accesible en ${apiBaseUrl}` };
  } catch (error) {
    if (error instanceof ApiError && !error.isNetworkError) {
      // Responde (aunque sea 404): el servidor está ahí, solo falta el endpoint.
      return { ok: true, detail: `Backend accesible en ${apiBaseUrl} (HTTP ${error.status})` };
    }
    return { ok: false, detail: error instanceof Error ? error.message : 'Error desconocido' };
  }
}
