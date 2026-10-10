import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `despertarServidor` con backend conectado. En el plan gratuito de Render la
 * API se duerme y tarda en volver: el ping despierta al servidor una sola vez
 * y el login espera a ese ping en vez de agotar su propio timeout.
 */
vi.stubEnv('VITE_API_URL', '/api');
const { apiClient, ApiError } = await import('./apiClient');
const { despertarServidor, useEstadoServidor, reiniciarEstadoServidor } = await import('./servidor');

describe('despertarServidor (con backend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    reiniciarEstadoServidor();
  });

  it('pasa por «despertando» y queda «listo» cuando la API responde', async () => {
    let responder!: () => void;
    vi.spyOn(apiClient, 'get').mockReturnValue(new Promise((r) => { responder = () => r({}); }));

    const ping = despertarServidor();
    expect(useEstadoServidor.getState().estado).toBe('despertando');

    responder();
    await ping;
    expect(useEstadoServidor.getState().estado).toBe('listo');
  });

  it('da tiempo de sobra a que el servidor despierte', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({});

    await despertarServidor();

    expect(get).toHaveBeenCalledWith('/actuator/health', expect.objectContaining({ timeout: 180_000 }));
  });

  it('varias llamadas a la vez comparten un único ping', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({});

    await Promise.all([despertarServidor(), despertarServidor(), despertarServidor()]);
    await despertarServidor();

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('una respuesta de error también cuenta como despierto: el servidor está ahí', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new ApiError('DOWN', 503));

    await despertarServidor();

    expect(useEstadoServidor.getState().estado).toBe('listo');
  });

  it('sin respuesta no rechaza, queda «sin-respuesta» y la siguiente llamada reintenta', async () => {
    const get = vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new ApiError('red', 0, true));

    await expect(despertarServidor()).resolves.toBeUndefined();
    expect(useEstadoServidor.getState().estado).toBe('sin-respuesta');

    get.mockResolvedValueOnce({});
    await despertarServidor();
    expect(get).toHaveBeenCalledTimes(2);
    expect(useEstadoServidor.getState().estado).toBe('listo');
  });
});
