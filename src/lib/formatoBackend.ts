import type { DayOfWeek } from '../types/schedule.types';

/**
 * Traducciones entre el formato del backend y el de la interfaz.
 *
 * Estaban copiadas en `scheduleService`, `groupsService`, `plansService` y
 * `eventoTexto`. Cuatro copias de lo mismo acaban divergiendo: basta con que
 * una sola cambie cómo trata un `null`.
 */

/** El backend numera 1 = lunes … 7 = domingo. */
export const DAY_ORDER: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function dayToNumber(day: DayOfWeek): number {
  const index = DAY_ORDER.indexOf(day);
  return index >= 0 ? index + 1 : 1;
}

/** Un número fuera de rango (o ausente) cae en lunes en vez de romper la rejilla. */
export function numberToDay(diaSemana: number | null | undefined): DayOfWeek {
  if (!diaSemana || diaSemana < 1 || diaSemana > 7) return 'Lun';
  return DAY_ORDER[diaSemana - 1];
}

/** Día de la semana de una fecha ISO (`YYYY-MM-DD`), leída como fecha de calendario y no como instante UTC. */
export function dayFromIsoDate(fecha: string): DayOfWeek {
  const [year, month, day] = fecha.split('-').map(Number);
  const jsDay = new Date(year, (month ?? 1) - 1, day ?? 1).getDay(); // 0 = domingo
  return DAY_ORDER[(jsDay + 6) % 7];
}

/** El backend serializa `LocalTime` como "HH:mm" o "HH:mm:ss"; la interfaz usa "HH:mm". */
export function normalizeTime(value: string | null | undefined): string {
  if (!value) return '00:00';
  return value.slice(0, 5);
}
