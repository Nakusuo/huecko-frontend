import { normalizeTime } from './formatoBackend';
import type { Reaccion } from '../types/album.types';

/**
 * «jue 23 oct · 18:00». La fecha se lee como fecha de calendario: con
 * `new Date("2026-10-23")` se interpretaría como UTC y en Lima saldría el 22.
 */
export function fechaDelPlan(fecha: string | null, horaInicio: string | null): string {
  if (!fecha) return 'Sin fecha';
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const texto = new Date(anio, (mes ?? 1) - 1, dia ?? 1)
    .toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\.(?=\s|$)/g, '')
    .replace(',', '');
  return horaInicio ? `${texto} · ${normalizeTime(horaInicio)}` : texto;
}

/** «3 fotos», «1 foto», «Aún sin fotos». */
export function cuantasFotos(n: number): string {
  if (n === 0) return 'Aún sin fotos';
  return `${n} ${n === 1 ? 'foto' : 'fotos'}`;
}

/** Las que se ofrecen, en este orden (el mismo que el backend). */
export const REACCIONES: { codigo: Reaccion; emoji: string; nombre: string }[] = [
  { codigo: 'CORAZON', emoji: '❤️', nombre: 'Me encanta' },
  { codigo: 'RISA', emoji: '😂', nombre: 'Me da risa' },
  { codigo: 'FUEGO', emoji: '🔥', nombre: 'Fuego' },
  { codigo: 'ASOMBRO', emoji: '😮', nombre: 'Me asombra' },
  { codigo: 'APLAUSO', emoji: '👏', nombre: 'Aplausos' },
];

export const MAX_COMENTARIO = 300;

/** Total de reacciones de una foto, para la miniatura. */
export function totalReacciones(reacciones: Partial<Record<Reaccion, number>>): number {
  return Object.values(reacciones).reduce<number>((suma, n) => suma + (n ?? 0), 0);
}

/** Pone o quita una reacción en local, igual que hará el servidor. */
export function alternarReaccion<T extends { reacciones: Partial<Record<Reaccion, number>>; misReacciones: Reaccion[] }>(
  foto: T,
  reaccion: Reaccion
): T {
  const tenia = foto.misReacciones.includes(reaccion);
  const cuenta = (foto.reacciones[reaccion] ?? 0) + (tenia ? -1 : 1);
  const reacciones = { ...foto.reacciones };
  if (cuenta > 0) reacciones[reaccion] = cuenta;
  else delete reacciones[reaccion];
  return {
    ...foto,
    reacciones,
    misReacciones: tenia ? foto.misReacciones.filter((r) => r !== reaccion) : [...foto.misReacciones, reaccion],
  };
}
