import { describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { despertarServidor, useEstadoServidor } from './servidor';

describe('despertarServidor (modo demo)', () => {
  it('no hay servidor que despertar: no hace peticiones', async () => {
    const get = vi.spyOn(apiClient, 'get');

    await despertarServidor();

    expect(get).not.toHaveBeenCalled();
    expect(useEstadoServidor.getState().estado).toBe('demo');
  });
});
