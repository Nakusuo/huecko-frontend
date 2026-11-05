import type {
  ConfigGoogle,
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  AuthUser,
  PerfilSocial,
  RespuestaLogin,
  VerificacionPendiente,
} from '../types/auth.types';
import { apiClient, isApiEnabled } from '../lib/apiClient';

const SIMULATED_NETWORK_DELAY_MS = 1000;

/** Cuenta de ejemplo del modo demo. Siempre existe, aunque no se haya registrado nada. */
export const DEMO_CREDENTIALS = {
  email: 'alex.rodriguez@huecko.com',
  password: 'demo1234',
} as const;

/** Administrador del modo demo: las mismas credenciales que el seed del backend. */
export const DEMO_ADMIN_CREDENTIALS = {
  email: 'admin@huecko.com',
  password: 'admin1234',
} as const;

const ID_CUENTA_EJEMPLO = '1';
const ID_CUENTA_ADMIN = 'admin';
const TOKEN_CUENTA_EJEMPLO = 'mock-jwt-token-huecko-2026';

const EMAIL_EN_USO = 'El correo ya está en uso. Intenta con otro.';
/** El mismo texto que devuelve el backend. */
export const CUENTA_SUSPENDIDA = 'Tu cuenta está suspendida. Contacta con la administración de Huecko.';
const CREDENCIALES_INVALIDAS = 'Credenciales incorrectas. Intenta de nuevo.';
/* Los mismos textos que el backend para el código de verificación. */
const CODIGO_INCORRECTO = 'El código no es correcto o ya caducó. Pide otro si hace falta.';
const DESAFIO_CADUCADO = 'Pasó demasiado tiempo. Vuelve a escribir tu contraseña.';
const ESPERA_REENVIO = 'Espera un momento antes de pedir otro código.';

/**
 * Alfabeto de los códigos que llegan por correo (`8JR6`): sin 0/O, 1/I ni L,
 * que se confunden al copiarlos a mano. El mismo que usa el backend.
 */
export const ALFABETO_CODIGO_CORREO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const LARGO_CODIGO_CORREO = 4;
/** Lo que hay que esperar entre un reenvío y el siguiente (el backend responde 429 antes). */
export const ESPERA_REENVIO_MS = 60_000;
const DURACION_CODIGO_MS = 10 * 60_000;

/** Como el backend: sin espacios ni guiones y en mayúsculas. `8jr 6` vale igual que `8JR6`. */
export const limpiarCodigo = (codigo: string): string => codigo.replace(/[\s-]/g, '').toUpperCase();

/** Para el campo mientras se escribe: solo letras y números, así pegar «8jr-6» también funciona. */
export const limpiarEntradaCodigo = (valor: string, largo: number): string =>
  limpiarCodigo(valor).replace(/[^A-Z0-9]/g, '').slice(0, largo);

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

/* ------------------------------------------------------------------------ *
 * Códigos de verificación del modo demo
 *
 * Sin servidor no hay correo que enviar: el código se genera aquí y la
 * pantalla lo enseña («Modo demo: tu código es 8JR6»). Vive en memoria, igual
 * que un desafío del backend caduca: si se recarga la página, se vuelve a
 * entrar con la contraseña y llega otro.
 * ------------------------------------------------------------------------ */

interface CodigoDemo {
  cuentaId: string;
  codigo: string;
  expira: number;
  enviado: number;
}

const codigosDemo = new Map<string, CodigoDemo>();

function codigoAlAzar(): string {
  const azar = globalThis.crypto.getRandomValues(new Uint32Array(LARGO_CODIGO_CORREO));
  return Array.from(azar, (n) => ALFABETO_CODIGO_CORREO[n % ALFABETO_CODIGO_CORREO.length]).join('');
}

function pendienteDemo(cuenta: CuentaDemo): VerificacionPendiente {
  const desafio = `demo-verificacion-${cuenta.id}-${Date.now().toString(36)}`;
  // Un código nuevo anula el anterior de la misma cuenta, como en el backend.
  for (const [clave, valor] of codigosDemo) if (valor.cuentaId === cuenta.id) codigosDemo.delete(clave);
  const codigo = codigoAlAzar();
  const ahora = Date.now();
  codigosDemo.set(desafio, { cuentaId: cuenta.id, codigo, expira: ahora + DURACION_CODIGO_MS, enviado: ahora });
  return { requiereVerificacion: true, desafio, email: cuenta.email, codigoDemo: codigo };
}

/* El mismo perfil que el seed del backend, para que la tarjeta no salga vacía en una demo. */
const CUENTA_EJEMPLO: CuentaDemo = {
  id: ID_CUENTA_EJEMPLO,
  nombre: 'Alex Rodríguez',
  email: DEMO_CREDENTIALS.email,
  creado_en: '2026-01-01T00:00:00.000Z',
  rolSistema: 'USUARIO',
  carrera: 'Ingeniería de Software',
  ciclo: 6,
  bio: 'Organizo los avances del grupo. Si hay café, voy.',
  intereses: ['Café', 'Fútbol', 'Videojuegos'],
};

/** Si la sesión es la de la cuenta de ejemplo del modo demo. */
export const esCuentaEjemplo = (usuario: Pick<AuthUser, 'id'>): boolean => usuario.id === ID_CUENTA_EJEMPLO;

const CUENTA_ADMIN: CuentaDemo = {
  id: ID_CUENTA_ADMIN,
  nombre: 'Administración Huecko',
  email: DEMO_ADMIN_CREDENTIALS.email,
  creado_en: '2026-01-01T00:00:00.000Z',
  rolSistema: 'ADMIN',
};

/** Siempre presentes, aunque no se haya registrado nada. Entran con su contraseña fija. */
const CUENTAS_FIJAS: CuentaDemo[] = [CUENTA_EJEMPLO, CUENTA_ADMIN];
const CLAVE_FIJA: Record<string, string> = {
  [ID_CUENTA_EJEMPLO]: DEMO_CREDENTIALS.password,
  [ID_CUENTA_ADMIN]: DEMO_ADMIN_CREDENTIALS.password,
};

function guardarCuentasDemo(cuentas: CuentaDemo[]): void {
  try {
    localStorage.setItem(CLAVE_CUENTAS_DEMO, JSON.stringify(cuentas));
  } catch {
    // Sin almacenamiento la cuenta dura lo que dure la sesión abierta.
  }
}

/** Cuentas demo de este navegador, con las fijas (ejemplo y admin) siempre presentes. */
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
  /* Las fijas van delante: si en este navegador se registró antes una cuenta
     con el correo del admin, al entrar gana la fija. */
  const faltan = CUENTAS_FIJAS.filter((fija) => !guardadas.some((c) => c.id === fija.id));
  return [...faltan, ...guardadas];
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
  if (!cuenta.clave) return CLAVE_FIJA[cuenta.id] === password;
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

/** Guarda el perfil social de una cuenta demo en este navegador. */
export function actualizarPerfilSocialDemo(usuario: AuthUser, perfil: PerfilSocial): AuthUser {
  const cuentas = leerCuentasDemo();
  const actual = cuentas.find((c) => c.id === usuario.id) ?? { ...usuario };
  const actualizada: CuentaDemo = { ...actual, ...perfil };
  guardarCuentasDemo([...cuentas.filter((c) => c.id !== usuario.id), actualizada]);
  return sinClave(actualizada);
}

/* Cuentas suspendidas por el admin en el modo demo. Van aparte de las cuentas
   para que la de ejemplo, que no se guarda hasta que se edita, también pueda
   suspenderse. */
const CLAVE_SUSPENDIDAS_DEMO = 'huecko-suspendidas-demo';

export function leerSuspendidasDemo(): Set<string> {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(CLAVE_SUSPENDIDAS_DEMO) ?? '[]');
    return new Set(Array.isArray(datos) ? datos.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

/** Misma regla que el backend: a un admin no se le suspende. */
export function cambiarSuspensionDemo(usuarioId: string, suspendido: boolean): void {
  const cuenta = leerCuentasDemo().find((c) => c.id === usuarioId);
  if (!cuenta) throw new Error('Esa cuenta no existe.');
  if (cuenta.rolSistema === 'ADMIN') throw new Error('No se puede suspender a un administrador.');

  const ids = leerSuspendidasDemo();
  if (suspendido) ids.add(usuarioId);
  else ids.delete(usuarioId);
  try {
    localStorage.setItem(CLAVE_SUSPENDIDAS_DEMO, JSON.stringify([...ids]));
  } catch {
    // Sin almacenamiento no hay nada que recordar.
  }
}

/* ------------------------------------------------------------------------ */

/**
 * Primer paso del login. Si la cuenta tiene la verificación en dos pasos,
 * devuelve un desafío en vez de la sesión (ver `verificarDosPasos`); en el
 * modo demo nunca, porque no hay servidor que compruebe los códigos. Si la
 * cuenta no confirmó su correo, devuelve la verificación pendiente y se manda
 * otro código.
 */
export async function loginUser(payload: LoginPayload): Promise<RespuestaLogin> {
  if (isApiEnabled) {
    const { data } = await apiClient.post<RespuestaLogin>('/auth/login', {
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
  // Después de la contraseña, como el backend: no delata qué cuentas existen.
  if (leerSuspendidasDemo().has(cuenta.id)) {
    throw new Error(CUENTA_SUSPENDIDA);
  }
  // Con la contraseña bien pero el correo sin confirmar, se manda otro código.
  if (cuenta.emailVerificado === false) {
    return pendienteDemo(cuenta);
  }

  return { token: tokenDemo(cuenta.id), user: sinClave(cuenta) };
}

/** Segundo paso: el código de 6 dígitos de la app, el de 4 del correo o uno de respaldo. */
export async function verificarDosPasos(desafio: string, codigo: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/dos-pasos', { desafio, codigo: codigo.trim() });
  return data;
}

/**
 * Crea la cuenta y manda el código al correo. La sesión no se abre todavía:
 * hace falta `verificarCorreo` con ese código.
 */
export async function registerUser(payload: RegisterPayload): Promise<VerificacionPendiente> {
  const nombre = payload.nombre.trim();
  const email = normalizarEmail(payload.email);

  if (isApiEnabled) {
    const { data } = await apiClient.post<VerificacionPendiente>('/auth/register', { ...payload, nombre, email });
    return data;
  }

  await simulateNetworkDelay();

  const cuentas = leerCuentasDemo();
  const existente = buscarPorEmail(cuentas, email);
  // Como el backend: una cuenta que nunca confirmó el correo no bloquea ese correo.
  if (existente && existente.emailVerificado !== false) {
    throw new Error(EMAIL_EN_USO);
  }

  const cuenta: CuentaDemo = {
    id: existente?.id ?? `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    nombre,
    email,
    creado_en: existente?.creado_en ?? new Date().toISOString(),
    rolSistema: 'USUARIO',
    emailVerificado: false,
    clave: await resumirClave(payload.password),
  };
  guardarCuentasDemo([...cuentas.filter((c) => c.id !== cuenta.id), cuenta]);

  return pendienteDemo(cuenta);
}

/** El código de 4 caracteres que llegó al correo. Si es correcto, abre la sesión. */
export async function verificarCorreo(desafio: string, codigo: string): Promise<AuthResponse> {
  if (isApiEnabled) {
    const { data } = await apiClient.post<AuthResponse>('/auth/verificar-correo', {
      desafio,
      codigo: limpiarCodigo(codigo),
    });
    return data;
  }

  await simulateNetworkDelay();

  const pendiente = codigosDemo.get(desafio);
  const cuentas = leerCuentasDemo();
  const cuenta = pendiente && cuentas.find((c) => c.id === pendiente.cuentaId);
  if (!pendiente || !cuenta) throw new Error(DESAFIO_CADUCADO);
  if (pendiente.expira < Date.now() || pendiente.codigo !== limpiarCodigo(codigo)) {
    throw new Error(CODIGO_INCORRECTO);
  }

  codigosDemo.delete(desafio);
  const verificada: CuentaDemo = { ...cuenta, emailVerificado: true };
  guardarCuentasDemo([...cuentas.filter((c) => c.id !== cuenta.id), verificada]);
  return { token: tokenDemo(verificada.id), user: sinClave(verificada) };
}

/**
 * Otro código al correo, para la verificación del registro o para el segundo
 * paso del login por correo. Como mucho uno por minuto. En el modo demo
 * devuelve el código nuevo para enseñarlo.
 */
export async function reenviarCodigo(desafio: string): Promise<string | undefined> {
  if (isApiEnabled) {
    await apiClient.post('/auth/reenviar-codigo', { desafio });
    return undefined;
  }

  const pendiente = codigosDemo.get(desafio);
  const cuenta = pendiente && leerCuentasDemo().find((c) => c.id === pendiente.cuentaId);
  if (!pendiente || !cuenta) throw new Error(DESAFIO_CADUCADO);
  if (Date.now() - pendiente.enviado < ESPERA_REENVIO_MS) throw new Error(ESPERA_REENVIO);

  const codigo = codigoAlAzar();
  const ahora = Date.now();
  codigosDemo.set(desafio, { ...pendiente, codigo, expira: ahora + DURACION_CODIGO_MS, enviado: ahora });
  return codigo;
}

/* ------------------------------------------------------------------------ *
 * Iniciar sesión con Google
 *
 * El botón oficial de Google entrega un ID token (`credential`) y el backend
 * lo verifica. Responde como el login: la sesión, o el paso de dos pasos si
 * la cuenta lo tiene. Nunca pide verificar el correo: Google ya lo hizo.
 * Solo con backend: en el modo demo no hay botón.
 * ------------------------------------------------------------------------ */

let configGoogleCache: Promise<string | null> | null = null;

/**
 * El Client ID público de Google, o `null` si el backend no lo tiene (y
 * entonces no se muestra el botón). Se pide una vez; si falla (la API está
 * despertando) no se guarda, para volver a intentarlo en la próxima visita.
 */
export function configGoogle(): Promise<string | null> {
  if (!isApiEnabled) return Promise.resolve(null);
  if (!configGoogleCache) {
    configGoogleCache = apiClient
      .get<ConfigGoogle>('/auth/google')
      .then(({ data }) => (typeof data?.clientId === 'string' && data.clientId ? data.clientId : null))
      .catch(() => {
        configGoogleCache = null;
        return null;
      });
  }
  return configGoogleCache;
}

/** Solo para pruebas: olvida el Client ID guardado. */
export function reiniciarConfigGoogle(): void {
  configGoogleCache = null;
}

export async function loginConGoogle(credential: string): Promise<RespuestaLogin> {
  const { data } = await apiClient.post<RespuestaLogin>('/auth/google', { credential });
  return data;
}
