import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/** Modo demo: las cuentas registradas viven en este navegador. */
vi.stubEnv('VITE_API_URL', '');
instalarAlmacenamientoEnMemoria();
const { loginUser, registerUser, actualizarCuentaDemo, leerCuentasDemo, DEMO_CREDENTIALS } = await import('./authService');

/** El servicio simula un segundo de red: se adelanta el reloj en vez de esperarlo. */
async function sinEspera<T>(promesa: Promise<T>): Promise<T> {
  promesa.catch(() => {});
  await vi.runAllTimersAsync();
  return promesa;
}

describe('cuentas demo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('la cuenta de ejemplo existe siempre y acepta el correo con mayúsculas', async () => {
    const res = await sinEspera(loginUser({ email: '  Alex.Rodriguez@HUECKO.com ', password: DEMO_CREDENTIALS.password }));
    expect(res.user.id).toBe('1');
    expect(res.token).toBe('mock-jwt-token-huecko-2026');
  });

  it('una cuenta registrada puede volver a entrar tras cerrar sesión', async () => {
    const alta = await sinEspera(registerUser({ nombre: '  Lucía Pérez ', email: ' Lucia@Correo.com ', password: 'secreta123' }));
    expect(alta.user.nombre).toBe('Lucía Pérez');
    expect(alta.user.email).toBe('lucia@correo.com');

    const entrada = await sinEspera(loginUser({ email: 'LUCIA@correo.com', password: 'secreta123' }));
    expect(entrada.user).toEqual(alta.user);
  });

  it('la contraseña no se guarda en claro y una equivocada no entra', async () => {
    await sinEspera(registerUser({ nombre: 'Lucía', email: 'lucia@correo.com', password: 'secreta123' }));
    expect(localStorage.getItem('huecko-cuentas-demo')).not.toContain('secreta123');

    await expect(sinEspera(loginUser({ email: 'lucia@correo.com', password: 'otra-cosa' }))).rejects.toThrow(
      'Credenciales incorrectas'
    );
  });

  it('el correo duplicado se detecta sin distinguir mayúsculas', async () => {
    await expect(
      sinEspera(registerUser({ nombre: 'Otro', email: 'ALEX.RODRIGUEZ@huecko.com', password: 'secreta123' }))
    ).rejects.toThrow('El correo ya está en uso');

    await sinEspera(registerUser({ nombre: 'Lucía', email: 'lucia@correo.com', password: 'secreta123' }));
    await expect(
      sinEspera(registerUser({ nombre: 'Lucía 2', email: 'Lucia@Correo.COM', password: 'secreta123' }))
    ).rejects.toThrow('El correo ya está en uso');
  });

  it('editar el perfil cambia la cuenta guardada: se entra con el correo nuevo', async () => {
    const { user } = await sinEspera(registerUser({ nombre: 'Lucía', email: 'lucia@correo.com', password: 'secreta123' }));

    const editado = actualizarCuentaDemo(user, { nombre: ' Lucía P. ', email: 'LP@correo.com' });
    expect(editado).toMatchObject({ id: user.id, nombre: 'Lucía P.', email: 'lp@correo.com' });

    const entrada = await sinEspera(loginUser({ email: 'lp@correo.com', password: 'secreta123' }));
    expect(entrada.user.nombre).toBe('Lucía P.');
  });

  it('no se puede poner el correo de otra cuenta', async () => {
    const { user } = await sinEspera(registerUser({ nombre: 'Lucía', email: 'lucia@correo.com', password: 'secreta123' }));
    expect(() => actualizarCuentaDemo(user, { nombre: 'Lucía', email: DEMO_CREDENTIALS.email.toUpperCase() })).toThrow(
      'El correo ya está en uso'
    );
    // Mantener el propio correo sí vale.
    expect(actualizarCuentaDemo(user, { nombre: 'Lucía', email: 'Lucia@correo.com' }).email).toBe('lucia@correo.com');
    expect(leerCuentasDemo().filter((c) => c.id === user.id)).toHaveLength(1);
  });
});
