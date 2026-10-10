import { beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/**
 * Con backend: cambiar el correo pide la contraseña actual (el servidor la
 * exige, porque el correo es la llave de la cuenta). Cambiar solo el nombre
 * no la pide ni la envía.
 */
vi.stubEnv('VITE_API_URL', '/api');
instalarAlmacenamientoEnMemoria();
const { useAuthStore } = await import('./authStore');
const { useProfileStore } = await import('./profileStore');
const { apiClient } = await import('../lib/apiClient');

const cuenta = { id: 'u-1', nombre: 'Lucía', email: 'lucia@correo.com', creado_en: '' };

describe('profileStore.guardarPerfil (con backend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().login(cuenta, 'tok');
  });

  it('cambiar solo el nombre no envía contraseña', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { ...cuenta, nombre: 'Lucía P.' } });

    await useProfileStore.getState().guardarPerfil({ nombre: 'Lucía P.', email: 'LUCIA@correo.com' });

    expect(patch).toHaveBeenCalledWith('/me', { nombre: 'Lucía P.', email: 'lucia@correo.com' });
  });

  it('cambiar el correo sin contraseña avisa sin llamar al servidor', async () => {
    const patch = vi.spyOn(apiClient, 'patch');

    await expect(
      useProfileStore.getState().guardarPerfil({ nombre: 'Lucía', email: 'nueva@correo.com' }),
    ).rejects.toThrow(/contraseña/);
    expect(patch).not.toHaveBeenCalled();
  });

  it('cambiar el correo envía la contraseña actual', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { ...cuenta, email: 'nueva@correo.com' } });

    await useProfileStore.getState().guardarPerfil({
      nombre: 'Lucía', email: 'nueva@correo.com', passwordActual: 'secreta123',
    });

    expect(patch).toHaveBeenCalledWith('/me', {
      nombre: 'Lucía', email: 'nueva@correo.com', passwordActual: 'secreta123',
    });
    expect(useAuthStore.getState().user?.email).toBe('nueva@correo.com');
  });
});
