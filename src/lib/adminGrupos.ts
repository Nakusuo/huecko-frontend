import type { GrupoAdmin } from '../types/admin.types';

export type FiltroGrupos = 'todos' | 'activos' | 'dormidos' | 'sinPlanes';

const DIA_MS = 24 * 60 * 60 * 1000;

/** Pasó algo en el grupo (plan, retraso o ausencia) en los últimos 30 días. */
export const grupoActivo = (g: GrupoAdmin, ahora: Date = new Date()): boolean =>
  g.ultimaActividad !== null && ahora.getTime() - new Date(g.ultimaActividad).getTime() <= 30 * DIA_MS;

const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/** Busca por nombre del grupo o de quien lo organiza. */
export function filtrarGrupos(grupos: GrupoAdmin[], busqueda: string, filtro: FiltroGrupos, ahora: Date = new Date()) {
  const texto = normalizar(busqueda);
  return grupos.filter((g) => {
    if (texto && !normalizar(`${g.nombre} ${g.organizadores.join(' ')}`).includes(texto)) return false;
    switch (filtro) {
      case 'activos':
        return grupoActivo(g, ahora);
      case 'dormidos':
        return !grupoActivo(g, ahora);
      case 'sinPlanes':
        return g.planes === 0;
      default:
        return true;
    }
  });
}
