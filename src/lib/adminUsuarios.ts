import type { UsuarioAdmin } from '../types/admin.types';

export type FiltroUsuarios = 'todas' | 'activas' | 'inactivas' | 'suspendidas';

const DIAS_ACTIVA = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Hizo algo en la app en los últimos 30 días. Mismo criterio que el resumen. */
export const estaActiva = (u: UsuarioAdmin, ahora: Date = new Date()): boolean =>
  u.ultimaActividad !== null && ahora.getTime() - new Date(u.ultimaActividad).getTime() <= DIAS_ACTIVA * DIA_MS;

/** Sin tildes ni mayúsculas: «jose» encuentra a «José». */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export function filtrarUsuarios(
  usuarios: UsuarioAdmin[],
  busqueda: string,
  filtro: FiltroUsuarios,
  ahora: Date = new Date()
): UsuarioAdmin[] {
  const texto = normalizar(busqueda);
  return usuarios.filter((u) => {
    if (texto && !normalizar(`${u.nombre} ${u.email}`).includes(texto)) return false;
    switch (filtro) {
      case 'activas':
        return !u.suspendido && estaActiva(u, ahora);
      case 'inactivas':
        return !u.suspendido && !estaActiva(u, ahora);
      case 'suspendidas':
        return u.suspendido;
      default:
        return true;
    }
  });
}
