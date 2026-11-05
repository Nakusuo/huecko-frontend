import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/** Modo demo: las cuentas registradas viven en este navegador. */
vi.stubEnv('VITE_API_URL', '');
instalarAlmacenamientoEnMemoria();
const { configGoogle, loginUser, registerUser, verificarCorreo, reenviarCodigo, actualizarCuentaDemo, leerCuentasDemo, cambiarSuspensionDemo, DEMO_CREDENTIALS, DEMO_ADMIN_CREDENTIALS } = await import('./authService');

/** En el modo demo el login siempre da la sesión, nunca un desafío de dos pasos. */
function sesion<T extends object>(respuesta: T): Extract<T, { token: string }> {
  if (!('token' in respuesta)) throw new Error('Se esperaba una sesión');
  return respuesta as Extract<T, { token: string }>;
}

/** El servicio simula un segundo de red: se adelanta el reloj en vez de esperarlo. */
async function sinEspera<T>(promesa: Promise<T>): Promise<T> {
  promesa.catch(() => {});
  await vi.runAllTimersAsync();
  return promesa;
}

/** Registro completo: alta y código del correo (en demo, el que devuelve el propio registro). */
async function registrarConfirmada(datos: { nombre: string; email: string; password: string }) {
  const pendiente = await sinEspera(registerUser(datos));
  return sinEspera(verificarCorreo(pendiente.desafio, pendiente.codigoDemo!));
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
    const res = sesion(await sinEspera(loginUser({ email: '  Alex.Rodriguez@HUECKO.com ', password: DEMO_CREDENTIALS.password })));
    expect(res.user.id).toBe('1');
    expect(res.token).toBe('mock-jwt-token-huecko-2026');
  });

  it('una cuenta registrada puede volver a entrar tras cerrar sesión', async () => {
    const alta = await registrarConfirmada({ nombre: '  Lucía Pérez ', email: ' Lucia@Correo.com ', password: 'secreta123' });
    expect(alta.user.nombre).toBe('Lucía Pérez');
    expect(alta.user.email).toBe('lucia@correo.com');

    const entrada = sesion(await sinEspera(loginUser({ email: 'LUCIA@correo.com', password: 'secreta123' })));
    expect(entrada.user).toEqual(alta.user);
  });

  it('la contraseña no se guarda en claro y una equivocada no entra', async () => {
    await registrarConfirmada({ nombre: 'Lucía', email: 'lucia@correo.com', password: 'secreta123' });
    expect(localStorage.getItem('huecko-cuentas-demo')).not.toContain('secreta123');

    await expect(sinEspera(loginUser({ email: 'lucia@correo.com', password: 'otra-cosa' }))).rejects.toThrow(
      'Credenciales incorrectas'
    );
  });

  it('el correo duplicado se detecta sin distinguir mayúsculas', async () => {
    await expect(
      sinEspera(registerUser({ nombre: 'Otro', email: 'ALEX.RODRIGUEZ@huecko.com', password: 'secreta123' }))
    ).rejects.toThrow('El correo ya está en uso');

    await registrarConfirmada({ nombre: 'Lucía', email: 'lucia@correo.com', password: 'secreta123' });
    await expect(
      sinEspera(registerUser({ nombre: 'Lucía 2', email: 'Lucia@Correo.COM', password: 'secreta123' }))
    ).rejects.toThrow('El correo ya está en uso');
  });

  it('editar el perfil cambia la cuenta guardada: se entra con el correo nuevo', async () => {
    const { user } = await registrarConfirmada({ nombre: 'Lucía', email: 'lucia@correo.com', password: 'secreta123' });

    const editado = actualizarCuentaDemo(user, { nombre: ' Lucía P. ', email: 'LP@correo.com' });
    expect(editado).toMatchObject({ id: user.id, nombre: 'Lucía P.', email: 'lp@correo.com' });

    const entrada = sesion(await sinEspera(loginUser({ email: 'lp@correo.com', password: 'secreta123' })));
    expect(entrada.user.nombre).toBe('Lucía P.');
  });

  it('no se puede poner el correo de otra cuenta', async () => {
    const { user } = await registrarConfirmada({ nombre: 'Lucía', email: 'lucia@correo.com', password: 'secreta123' });
    expect(() => actualizarCuentaDemo(user, { nombre: 'Lucía', email: DEMO_CREDENTIALS.email.toUpperCase() })).toThrow(
      'El correo ya está en uso'
    );
    // Mantener el propio correo sí vale.
    expect(actualizarCuentaDemo(user, { nombre: 'Lucía', email: 'Lucia@correo.com' }).email).toBe('lucia@correo.com');
    expect(leerCuentasDemo().filter((c) => c.id === user.id)).toHaveLength(1);
  });
});

describe('cuenta admin del modo demo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('entra con su contraseña fija y trae el rol ADMIN', async () => {
    const res = sesion(await sinEspera(loginUser(DEMO_ADMIN_CREDENTIALS)));
    expect(res.user.rolSistema).toBe('ADMIN');
  });

  it('con la contraseña de la cuenta de ejemplo no entra', async () => {
    await expect(
      sinEspera(loginUser({ email: DEMO_ADMIN_CREDENTIALS.email, password: DEMO_CREDENTIALS.password }))
    ).rejects.toThrow('Credenciales incorrectas');
  });

  it('registrarse nunca da el rol ADMIN, ni con el correo del admin', async () => {
    const alta = await registrarConfirmada({ nombre: 'Lucía', email: 'lucia@correo.com', password: 'secreta123' });
    expect(alta.user.rolSistema).toBe('USUARIO');

    await expect(
      sinEspera(registerUser({ nombre: 'Intrusa', email: DEMO_ADMIN_CREDENTIALS.email, password: 'secreta123' }))
    ).rejects.toThrow('El correo ya está en uso');
  });
});

describe('suspensión en el modo demo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('una cuenta suspendida no entra y al reactivarla vuelve a entrar', async () => {
    cambiarSuspensionDemo('1', true);
    await expect(sinEspera(loginUser(DEMO_CREDENTIALS))).rejects.toThrow('suspendida');

    cambiarSuspensionDemo('1', false);
    await expect(sinEspera(loginUser(DEMO_CREDENTIALS))).resolves.toMatchObject({ user: { id: '1' } });
  });

  it('con la contraseña mal no se revela la suspensión', async () => {
    cambiarSuspensionDemo('1', true);
    await expect(sinEspera(loginUser({ email: DEMO_CREDENTIALS.email, password: 'otra' }))).rejects.toThrow(
      'Credenciales incorrectas'
    );
  });

  it('al admin no se le suspende', () => {
    expect(() => cambiarSuspensionDemo('admin', true)).toThrow('administrador');
  });
});

describe('verificación del correo en el modo demo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const datos = { nombre: 'Lucía', email: 'Lucia@Correo.com', password: 'secreta123' };

  it('el registro no abre sesión: pide el código de 4 caracteres que se envió', async () => {
    const pendiente = await sinEspera(registerUser(datos));
    expect(pendiente).toMatchObject({ requiereVerificacion: true, email: 'lucia@correo.com' });
    expect(pendiente).not.toHaveProperty('token');
    expect(pendiente.codigoDemo).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
  });

  it('con el código correcto abre sesión, aunque se escriba en minúsculas y con espacios', async () => {
    const pendiente = await sinEspera(registerUser(datos));
    const codigo = pendiente.codigoDemo!;
    const res = await sinEspera(verificarCorreo(pendiente.desafio, ` ${codigo.slice(0, 2)} ${codigo.slice(2)} `.toLowerCase()));
    expect(res.user).toMatchObject({ email: 'lucia@correo.com', emailVerificado: true });
    expect(res.token).toBeTruthy();
  });

  it('un código equivocado no entra', async () => {
    const pendiente = await sinEspera(registerUser(datos));
    const otro = pendiente.codigoDemo === 'AAAA' ? 'BBBB' : 'AAAA';
    await expect(sinEspera(verificarCorreo(pendiente.desafio, otro))).rejects.toThrow('no es correcto');
  });

  it('el código caduca a los 10 minutos', async () => {
    const pendiente = await sinEspera(registerUser(datos));
    vi.setSystemTime(Date.now() + 11 * 60_000);
    await expect(sinEspera(verificarCorreo(pendiente.desafio, pendiente.codigoDemo!))).rejects.toThrow('caducó');
  });

  it('sin confirmar el correo, el login vuelve a pedir el código', async () => {
    await sinEspera(registerUser(datos));
    const res = await sinEspera(loginUser({ email: datos.email, password: datos.password }));
    expect(res).toMatchObject({ requiereVerificacion: true, email: 'lucia@correo.com' });
  });

  it('una cuenta sin confirmar no bloquea el correo: registrarse otra vez la reemplaza', async () => {
    await sinEspera(registerUser(datos));
    const segunda = await sinEspera(registerUser({ ...datos, nombre: 'Lucía Pérez', password: 'otra-clave1' }));
    const res = await sinEspera(verificarCorreo(segunda.desafio, segunda.codigoDemo!));
    expect(res.user.nombre).toBe('Lucía Pérez');
    expect(leerCuentasDemo().filter((c) => c.email === 'lucia@correo.com')).toHaveLength(1);
  });

  it('reenviar espera un minuto y el código anterior deja de valer', async () => {
    const pendiente = await sinEspera(registerUser(datos));
    await expect(reenviarCodigo(pendiente.desafio)).rejects.toThrow('Espera un momento');

    vi.setSystemTime(Date.now() + 61_000);
    const nuevo = await reenviarCodigo(pendiente.desafio);
    expect(nuevo).toMatch(/^[A-Z2-9]{4}$/);
    if (nuevo !== pendiente.codigoDemo) {
      await expect(sinEspera(verificarCorreo(pendiente.desafio, pendiente.codigoDemo!))).rejects.toThrow('no es correcto');
    }
    await expect(sinEspera(verificarCorreo(pendiente.desafio, nuevo!))).resolves.toHaveProperty('token');
  });

  it('las cuentas fijas y las guardadas antes de la verificación entran sin código', async () => {
    const res = sesion(await sinEspera(loginUser(DEMO_CREDENTIALS)));
    expect(res.user.id).toBe('1');
  });
});

describe('Google en el modo demo', () => {
  it('no hay Client ID sin backend: el botón no aparece', async () => {
    expect(await configGoogle()).toBeNull();
  });
});
