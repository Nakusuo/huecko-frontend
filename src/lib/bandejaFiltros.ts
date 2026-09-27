import type { EstadoRevision } from '../types/admin.types';

export type FiltroBandeja = 'pendientes' | 'resueltos' | 'todos';

/** Pendiente = nuevo o revisado: lo que aún pide que alguien haga algo. */
export function filtrarPorEstado<T extends { estado: EstadoRevision }>(items: T[], filtro: FiltroBandeja): T[] {
  switch (filtro) {
    case 'pendientes':
      return items.filter((i) => i.estado !== 'RESUELTO');
    case 'resueltos':
      return items.filter((i) => i.estado === 'RESUELTO');
    default:
      return items;
  }
}

/** Resume un user agent en «Firefox · Linux» sin librerías: basta para saber dónde mirar. */
export function navegadorCorto(ua: string | null): string | null {
  if (!ua) return null;
  const navegador =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : null;
  const sistema =
    /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : null;
  return [navegador, sistema].filter(Boolean).join(' · ') || ua.slice(0, 40);
}
