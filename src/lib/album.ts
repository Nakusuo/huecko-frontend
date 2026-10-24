import { normalizeTime } from './formatoBackend';

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
