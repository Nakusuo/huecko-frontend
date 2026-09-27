import type { AuthUser } from '../types/auth.types';
import type { EstadoRevision, FalloAdmin, ReporteAdmin, TipoReporte } from '../types/admin.types';
import { cambiarSuspensionDemo, leerCuentasDemo, leerSuspendidasDemo, normalizarEmail } from '../services/authService';

/**
 * Fallos y reportes del modo demo, guardados en este navegador. Aplican las
 * mismas reglas que el backend (ReporteService, RegistroFallos) para que el
 * panel se comporte igual con o sin servidor.
 */

const CLAVE_REPORTES = 'huecko-reportes-demo';
const CLAVE_FALLOS = 'huecko-fallos-demo';
const MAX_REPORTES_POR_HORA = 5;
const HORA_MS = 60 * 60 * 1000;

/** Lo que el panel no ve pero la demo necesita para suspender: el id de la cuenta señalada. */
interface ReporteGuardado extends ReporteAdmin {
  autorId: string;
  cuentaReportadaId: string | null;
}

function leer<T>(clave: string): T[] {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(clave) ?? '[]');
    return Array.isArray(datos) ? (datos as T[]) : [];
  } catch {
    return [];
  }
}

function guardar<T>(clave: string, datos: T[]): void {
  try {
    localStorage.setItem(clave, JSON.stringify(datos));
  } catch {
    // Sin almacenamiento la bandeja dura lo que la pestaña.
  }
}

const nuevoId = () => `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface DatosReporte {
  tipo: TipoReporte;
  descripcion: string;
  ruta: string;
  emailReportado?: string;
}

export function guardarReporteDemo(datos: DatosReporte, autor: AuthUser, ahora: Date = new Date()): void {
  const reportes = leer<ReporteGuardado>(CLAVE_REPORTES);
  const recientes = reportes.filter(
    (r) => r.autorId === autor.id && ahora.getTime() - new Date(r.creadoEn).getTime() < HORA_MS
  );
  if (recientes.length >= MAX_REPORTES_POR_HORA) {
    throw new Error('Ya enviaste varios reportes en la última hora. Espera un poco antes de mandar otro.');
  }

  let cuenta: { id: string; nombre: string; email: string } | null = null;
  if (datos.tipo === 'CONDUCTA') {
    if (!datos.emailReportado?.trim()) throw new Error('Indica el correo de la cuenta de la que informas.');
    const encontrada = leerCuentasDemo().find((c) => normalizarEmail(c.email) === normalizarEmail(datos.emailReportado!));
    if (!encontrada) throw new Error('No hay ninguna cuenta de Huecko con ese correo.');
    if (encontrada.id === autor.id) throw new Error('No puedes reportar tu propia cuenta.');
    if (encontrada.rolSistema === 'ADMIN') throw new Error('Esa cuenta es de administración.');
    cuenta = encontrada;
  }

  const momento = ahora.toISOString();
  reportes.push({
    id: nuevoId(),
    tipo: datos.tipo,
    descripcion: datos.descripcion.trim(),
    ruta: datos.ruta,
    navegador: typeof navigator === 'undefined' ? null : navigator.userAgent,
    autorId: autor.id,
    autorNombre: autor.nombre,
    autorEmail: autor.email,
    cuentaReportadaId: cuenta?.id ?? null,
    cuentaReportadaNombre: cuenta?.nombre ?? null,
    cuentaReportadaEmail: cuenta?.email ?? null,
    cuentaReportadaSuspendida: null,
    estado: 'NUEVO',
    creadoEn: momento,
    actualizadoEn: momento,
  });
  guardar(CLAVE_REPORTES, reportes);
}

const ORDEN_ESTADO: Record<EstadoRevision, number> = { NUEVO: 0, REVISADO: 1, RESUELTO: 2 };

/** Como el backend: los nuevos primero y, dentro de cada estado, los más recientes. */
export function leerReportesDemo(): ReporteAdmin[] {
  const suspendidas = leerSuspendidasDemo();
  return leer<ReporteGuardado>(CLAVE_REPORTES)
    .map(({ autorId: _a, cuentaReportadaId, ...r }) => ({
      ...r,
      cuentaReportadaSuspendida: cuentaReportadaId ? suspendidas.has(cuentaReportadaId) : null,
    }))
    .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || b.creadoEn.localeCompare(a.creadoEn));
}

export function cambiarEstadoReporteDemo(id: string, estado: EstadoRevision): ReporteAdmin {
  const reportes = leer<ReporteGuardado>(CLAVE_REPORTES);
  const reporte = reportes.find((r) => r.id === id);
  if (!reporte) throw new Error('Ese reporte no existe.');
  reporte.estado = estado;
  reporte.actualizadoEn = new Date().toISOString();
  guardar(CLAVE_REPORTES, reportes);
  return leerReportesDemo().find((r) => r.id === id)!;
}

export function suspensionDesdeReporteDemo(id: string, suspendido: boolean): ReporteAdmin {
  const reportes = leer<ReporteGuardado>(CLAVE_REPORTES);
  const reporte = reportes.find((r) => r.id === id);
  if (!reporte) throw new Error('Ese reporte no existe.');
  if (reporte.tipo !== 'CONDUCTA' || !reporte.cuentaReportadaId) throw new Error('Este reporte no señala a ninguna cuenta.');
  cambiarSuspensionDemo(reporte.cuentaReportadaId, suspendido);
  if (reporte.estado === 'NUEVO') reporte.estado = 'REVISADO';
  reporte.actualizadoEn = new Date().toISOString();
  guardar(CLAVE_REPORTES, reportes);
  return leerReportesDemo().find((r) => r.id === id)!;
}

/* ------------------------------ Fallos ------------------------------ */

/** Mismo agrupado que el backend: tipo + página + primera línea de la traza. */
export function anotarFalloDemo(tipo: string, mensaje: string, traza: string | null, ruta: string): void {
  const fallos = leer<FalloAdmin>(CLAVE_FALLOS);
  const ubicacion = ruta.replace(/\/(\d+|[0-9a-f-]{20,})(?=\/|$)/gi, '/{id}');
  const primeraLinea = (traza ?? '').split('\n')[1]?.trim() ?? '';
  const id = `demo-${[tipo, ubicacion, primeraLinea].join('|')}`;
  const ahora = new Date().toISOString();

  const existente = fallos.find((f) => f.id === id);
  if (existente) {
    existente.ocurrencias += 1;
    existente.ultimaVez = ahora;
    existente.mensaje = mensaje;
    if (existente.estado === 'RESUELTO') {
      existente.estado = 'NUEVO';
      existente.reabierto = true;
    }
  } else {
    fallos.push({
      id,
      origen: 'CLIENTE',
      tipo,
      mensaje,
      ubicacion,
      traza,
      navegador: typeof navigator === 'undefined' ? null : navigator.userAgent,
      ocurrencias: 1,
      primeraVez: ahora,
      ultimaVez: ahora,
      estado: 'NUEVO',
      reabierto: false,
    });
  }
  guardar(CLAVE_FALLOS, fallos);
}

export function leerFallosDemo(): FalloAdmin[] {
  return leer<FalloAdmin>(CLAVE_FALLOS).sort((a, b) => b.ultimaVez.localeCompare(a.ultimaVez));
}

export function cambiarEstadoFalloDemo(id: string, estado: EstadoRevision): FalloAdmin {
  const fallos = leer<FalloAdmin>(CLAVE_FALLOS);
  const fallo = fallos.find((f) => f.id === id);
  if (!fallo) throw new Error('Ese fallo no existe.');
  fallo.estado = estado;
  if (estado === 'RESUELTO') fallo.reabierto = false;
  guardar(CLAVE_FALLOS, fallos);
  return fallo;
}
