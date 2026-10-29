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

  it('un error del servidor trae el id de la petición para poder reportarlo', async () => {
    const fallo = apiClient.get('/grupos', {
      adapter: async (config) =>
        Promise.reject(
          Object.assign(new Error('500'), {
            isAxiosError: true,
            config,
            response: {
              status: 500,
              statusText: 'Error',
              headers: { 'x-request-id': 'abc123def456' },
              config,
              data: { mensaje: 'Ocurrió un error inesperado.', idPeticion: 'abc123def456' },
            },
          })
        ),
    });

    await expect(fallo).rejects.toMatchObject({
      status: 500,
      idPeticion: 'abc123def456',
      message: 'Ocurrió un error inesperado. (código: abc123def456)',
    });
  });

  it('en un 4xx el mensaje queda igual, pero el id viaja en el error', async () => {
    const fallo = apiClient.get('/grupos', {
      adapter: async (config) =>
        Promise.reject(
          Object.assign(new Error('400'), {
            isAxiosError: true,
            config,
            response: { status: 400, statusText: 'Bad', headers: { 'x-request-id': 'zzz999yyy888' }, config, data: { mensaje: 'Falta el título.' } },
          })
        ),
    });

    await expect(fallo).rejects.toMatchObject({ status: 400, idPeticion: 'zzz999yyy888', message: 'Falta el título.' });
  });
});
