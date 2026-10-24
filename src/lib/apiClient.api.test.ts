import { describe, expect, it, vi } from 'vitest';

/** El cliente de la API con backend conectado. */
vi.stubEnv('VITE_API_URL', '/api');
const { apiClient, ApiError } = await import('./apiClient');

describe('apiClient', () => {
  it('una «respuesta» con estado 0 es una conexión cortada, no un éxito vacío', async () => {
    // Así llega una petición en curso cuando se recarga la página.
    const cortada = apiClient.get('/admin/pendientes', {
      adapter: async (config) => ({ data: '', status: 0, statusText: '', headers: {}, config }),
    });

    await expect(cortada).rejects.toBeInstanceOf(ApiError);
    await expect(cortada).rejects.toMatchObject({ status: 0, isNetworkError: true });
  });

  it('una respuesta normal pasa tal cual', async () => {
    const { data } = await apiClient.get('/admin/pendientes', {
      adapter: async (config) => ({ data: { fallosNuevos: 1, reportesNuevos: 2 }, status: 200, statusText: 'OK', headers: {}, config }),
    });

    expect(data).toEqual({ fallosNuevos: 1, reportesNuevos: 2 });
  });
});
