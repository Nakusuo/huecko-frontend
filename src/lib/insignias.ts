import type { Insignia } from '../types/profile.types';

export const INSIGNIAS: Record<Insignia, { titulo: string; detalle: string; icono: string }> = {
  PRIMER_PLAN: { titulo: 'Primer plan', detalle: 'El primer plan vivido en grupo.', icono: 'celebration' },
  HABITUAL: { titulo: 'De la casa', detalle: '5 planes vividos o más.', icono: 'local_fire_department' },
  PUNTUAL: { titulo: 'Puntual', detalle: 'A tiempo en 9 de cada 10 planes (desde 3).', icono: 'alarm_on' },
  ORGANIZA: { titulo: 'Organiza', detalle: '3 planes propuestos o más.', icono: 'campaign' },
};

export const ORDEN_INSIGNIAS: Insignia[] = ['PRIMER_PLAN', 'HABITUAL', 'PUNTUAL', 'ORGANIZA'];

/** Las insignias que llegan del servidor, sin códigos desconocidos y en su orden. */
export function insigniasConocidas(codigos: readonly string[]): Insignia[] {
  return ORDEN_INSIGNIAS.filter((i) => codigos.includes(i));
}

/**
 * Las mismas reglas que `PerfilPublicoService.insignias` del backend. Solo las
 * usa el modo demo, que no tiene servidor que las calcule.
 */
export function insigniasDe(planesVividos: number, aTiempo: number, propuestos: number): Insignia[] {
  const ganadas: Insignia[] = [];
  if (planesVividos >= 1) ganadas.push('PRIMER_PLAN');
  if (planesVividos >= 5) ganadas.push('HABITUAL');
  if (planesVividos >= 3 && aTiempo * 10 >= planesVividos * 9) ganadas.push('PUNTUAL');
  if (propuestos >= 3) ganadas.push('ORGANIZA');
  return ganadas;
}

/** «6.º ciclo». */
export const textoCiclo = (ciclo: number) => `${ciclo}.º ciclo`;
