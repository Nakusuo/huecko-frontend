import type { LoginPayload, RegisterPayload, AuthResponse, AuthUser } from '../types/auth.types';
import { apiClient, isApiEnabled } from '../lib/apiClient';

const SIMULATED_NETWORK_DELAY_MS = 1000;

/** Cuenta de ejemplo del modo demo. Siempre existe, aunque no se haya registrado nada. */
export const DEMO_CREDENTIALS = {
  email: 'alex.rodriguez@huecko.com',
  password: 'demo1234',
} as const;

const ID_CUENTA_EJEMPLO = '1';
const TOKEN_CUENTA_EJEMPLO = 'mock-jwt-token-huecko-2026';

const EMAIL_EN_USO = 'El correo ya está en uso. Intenta con otro.';
const CREDENCIALES_INVALIDAS = 'Credenciales incorrectas. Intenta de nuevo.';

const simulateNetworkDelay = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, SIMULATED_NETWORK_DELAY_MS));

/** Igual que el backend: los correos se comparan y guardan sin mayúsculas ni espacios. */
export const normalizarEmail = (email: string): string => email.trim().toLowerCase();

/* ------------------------------------------------------------------------ *
 * Cuentas del modo demo
 *
 * Antes el registro en demo devolvía una cuenta que no se guardaba en ningún
 * sitio: tras cerrar sesión, volver a entrar daba «Credenciales incorrectas».
 * Ahora las cuentas registradas se guardan en este navegador (localStorage),
 * con la contraseña resumida (SHA-256) y no en claro, para que se pueda volver
 * a entrar con ellas. La cuenta de ejemplo va siempre incluida; si se edita su
 * perfil, los cambios se guardan aquí también.
 * ------------------------------------------------------------------------ */

const CLAVE_CUENTAS_DEMO = 'huecko-cuentas-demo';

export interface CuentaDemo extends AuthUser {
  /** Resumen de la contraseña. Sin él (cuenta de ejemplo) vale `DEMO_CREDENTIALS.password`. */
  clave?: string;
}

const CUENTA_EJEMPLO: CuentaDemo = {
  id: ID_CUENTA_EJEMPLO,
  nombre: 'Alex Rodríguez',
  email: DEMO_CREDENTIALS.email,
  creado_en: '2026-01-01T00:00:00.000Z',
};

function guardarCuentasDemo(cuentas: CuentaDemo[]): void {
  try {
    localStorage.setItem(CLAVE_CUENTAS_DEMO, JSON.stringify(cuentas));
  } catch {
    // Sin almacenamiento la cuenta dura lo que dure la sesión abierta.
  }
}

/** Cuentas demo de este navegador, con la de ejemplo siempre presente. */
export function leerCuentasDemo(): CuentaDemo[] {
  let guardadas: CuentaDemo[] = [];
  try {
    const crudo = localStorage.getItem(CLAVE_CUENTAS_DEMO);
    const datos: unknown = crudo ? JSON.parse(crudo) : [];
    if (Array.isArray(datos)) {
      guardadas = datos.filter(
        (c): c is CuentaDemo => !!c && typeof c.id === 'string' && typeof c.email === 'string'
      );
    }
  } catch {
    guardadas = [];
  }
  return guardadas.some((c) => c.id === ID_CUENTA_EJEMPLO) ? guardadas : [CUENTA_EJEMPLO, ...guardadas];
}

const buscarPorEmail = (cuentas: CuentaDemo[], email: string) =>
  cuentas.find((c) => normalizarEmail(c.email) === normalizarEmail(email));

/**
 * Resumen de la contraseña. SHA-256 cuando el navegador lo ofrece (contexto
 * seguro); si no, un hash sencillo. No es seguridad de verdad —es una demo que
 * vive en el navegador—, solo evita dejar la contraseña legible en localStorage.
 */
async function resumirClave(password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const bytes = await subtle.digest('SHA-256', new TextEncoder().encode(password));
    return `sha256:${Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < password.length; i++) {
    hash ^= password.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv:${hash.toString(16)}`;
}

async function claveCorrecta(cuenta: CuentaDemo, password: string): Promise<boolean> {
  if (!cuenta.clave) return cuenta.id === ID_CUENTA_EJEMPLO && password === DEMO_CREDENTIALS.password;
  return cuenta.clave === (await resumirClave(password));
}

const sinClave = ({ clave: _clave, ...usuario }: CuentaDemo): AuthUser => usuario;

const tokenDemo = (id: string) => (id === ID_CUENTA_EJEMPLO ? TOKEN_CUENTA_EJEMPLO : `mock-jwt-token-${id}`);

/**
 * Cambia nombre y correo de una cuenta demo, con la misma regla que el
 * backend: el correo no puede estar en uso por otra cuenta.
 */
export function actualizarCuentaDemo(usuario: AuthUser, cambios: { nombre: string; email: string }): AuthUser {
  const cuentas = leerCuentasDemo();
  const email = normalizarEmail(cambios.email);
  const otra = buscarPorEmail(cuentas, email);
  if (otra && otra.id !== usuario.id) throw new Error(EMAIL_EN_USO);

  const actual = cuentas.find((c) => c.id === usuario.id) ?? { ...usuario };
  const actualizada: CuentaDemo = { ...actual, nombre: cambios.nombre.trim(), email };
  guardarCuentasDemo([...cuentas.filter((c) => c.id !== usuario.id), actualizada]);
  return sinClave(actualizada);
}

/* ------------------------------------------------------------------------ */

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  if (isApiEnabled) {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
      ...payload,
      email: normalizarEmail(payload.email),
    });
    return data;
  }

  await simulateNetworkDelay();

  const cuenta = buscarPorEmail(leerCuentasDemo(), payload.email);
  if (!cuenta || !(await claveCorrecta(cuenta, payload.password))) {
    throw new Error(CREDENCIALES_INVALIDAS);
  }

  return { token: tokenDemo(cuenta.id), user: sinClave(cuenta) };
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const nombre = payload.nombre.trim();
  const email = normalizarEmail(payload.email);

  if (isApiEnabled) {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', { ...payload, nombre, email });
    return data;
  }

  await simulateNetworkDelay();

  const cuentas = leerCuentasDemo();
  if (buscarPorEmail(cuentas, email)) {
    throw new Error(EMAIL_EN_USO);
  }

  const cuenta: CuentaDemo = {
    id: `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    nombre,
    email,
    creado_en: new Date().toISOString(),
    clave: await resumirClave(payload.password),
  };
  guardarCuentasDemo([...cuentas, cuenta]);

  return { token: tokenDemo(cuenta.id), user: sinClave(cuenta) };
}
