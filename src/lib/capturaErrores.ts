import type { ErrorCliente } from '../services/reportesService';

/**
 * Envía al panel de administración los errores de JavaScript que nadie
 * captura. Sin esto, un fallo en el navegador de alguien solo se conocía si
 * esa persona se tomaba la molestia de contarlo.
 */

/** Por página cargada: un bucle de errores no debe inundar la red ni la bandeja. */
const MAX_POR_CARGA = 10;
const MAX_MENSAJE = 2000;
const MAX_TRAZA = 8000;

/** Ruido conocido que no es un fallo de Huecko. */
const IGNORADOS = [/ResizeObserver loop/i, /^Script error\.?$/i];

/** Scripts de extensiones del navegador: no son código nuestro. */
const DE_EXTENSION = /^(chrome|moz|safari(-web)?)-extension:/;

export function describirError(
  valor: unknown,
  archivo?: string
): Omit<ErrorCliente, 'ruta'> | null {
  if (archivo && DE_EXTENSION.test(archivo)) return null;

  const tipo = valor instanceof Error ? valor.name || 'Error' : 'Error';
  const mensaje =
    valor instanceof Error ? valor.message : typeof valor === 'string' ? valor : safeString(valor);
  if (!mensaje || IGNORADOS.some((patron) => patron.test(mensaje))) return null;

  const traza = valor instanceof Error && valor.stack ? valor.stack.slice(0, MAX_TRAZA) : null;
  // Si el primer marco de la pila es de una extensión, el error no es nuestro.
  const primerMarco = traza?.split('\n').find((linea) => /\bat\b|@/.test(linea)) ?? '';
  if (/(chrome|moz|safari(-web)?)-extension:/.test(primerMarco)) return null;

  return { tipo: tipo.slice(0, 120), mensaje: mensaje.slice(0, MAX_MENSAJE), traza };
}

function safeString(valor: unknown): string {
  try {
    return JSON.stringify(valor) ?? String(valor);
  } catch {
    return String(valor);
  }
}

/**
 * Engancha los manejadores globales. `puedeEnviar` decide en cada error (p. ej.
 * «hay sesión»), porque el endpoint pide autenticación. Devuelve cómo quitarlos.
 */
export function instalarCapturaErrores(
  enviar: (error: ErrorCliente) => void,
  puedeEnviar: () => boolean,
  ventana: Pick<Window, 'addEventListener' | 'removeEventListener' | 'location'> = window
): () => void {
  const vistos = new Set<string>();
  let enviados = 0;

  const procesar = (valor: unknown, archivo?: string) => {
    if (enviados >= MAX_POR_CARGA || !puedeEnviar()) return;
    const error = describirError(valor, archivo);
    if (!error) return;
    // El mismo error repetido en esta carga cuenta una vez: el backend ya suma ocurrencias entre cargas.
    const clave = `${error.tipo}|${error.mensaje}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    enviados += 1;
    enviar({ ...error, ruta: ventana.location.pathname });
  };

  const alError = (evento: Event) => {
    const e = evento as ErrorEvent;
    procesar(e.error ?? e.message, e.filename);
  };
  const alRechazo = (evento: Event) => procesar((evento as PromiseRejectionEvent).reason);

  ventana.addEventListener('error', alError);
  ventana.addEventListener('unhandledrejection', alRechazo);
  return () => {
    ventana.removeEventListener('error', alError);
    ventana.removeEventListener('unhandledrejection', alRechazo);
  };
}
