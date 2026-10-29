import { describe, expect, it, vi } from 'vitest';

/* Modo demo pase lo que pase en el .env.local de quien corre las pruebas. */
vi.stubEnv('VITE_API_URL', '');
const { apiClient } = await import('./apiClient');
const { despertarServidor, useEstadoServidor } = await import('./servidor');

describe('despertarServidor (modo demo)', () => {
  it('no hay servidor que despertar: no hace peticiones', async () => {
    const get = vi.spyOn(apiClient, 'get');

    await despertarServidor();

    expect(get).not.toHaveBeenCalled();
    expect(useEstadoServidor.getState().estado).toBe('demo');
  });
});
