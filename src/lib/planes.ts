import type { PlanProposal, TimeWindowProposal } from '../types/groups.types';
import type { DayOfWeek } from '../types/schedule.types';
import { DAY_ORDER } from './formatoBackend';
import { fechaLocalIso } from './horario';

/**
 * Reglas de los planes que la interfaz necesita saber sin preguntar al
 * servidor: cuál es la ventana ganadora, cuál es el próximo plan, si la
 * votación admite votos y si una propuesta tiene sentido antes de enviarla.
 *
 * Vivían repartidas por DashboardPage y GroupDetailPage, y cada copia decidía
 * distinto: el panel de inicio tomaba la primera ventana sugerida como hora
 * del evento aunque hubiera ganado otra, y la tarjeta del grupo daba por
 * abierta cualquier votación que no estuviera confirmada, cancelada incluida.
 */

/** Antelación mínima del plazo de votación. La misma que exige el backend. */
export const MINUTOS_MINIMOS_DE_PLAZO = 5;

/**
 * Fecha de una ventana. Las del servidor la traen; las del modo demo solo
 * dicen «Mié», y se toma el próximo miércoles contando hoy.
 */
export function fechaDeVentana(ventana: Pick<TimeWindowProposal, 'dia' | 'fecha'>, ahora = new Date()): string {
  if (ventana.fecha) return ventana.fecha;
  const hoy = (ahora.getDay() + 6) % 7;
  const objetivo = Math.max(DAY_ORDER.indexOf(ventana.dia), 0);
  const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + ((objetivo - hoy + 7) % 7));
  return fechaLocalIso(fecha);
}

function instante(fechaISO: string, hora: string): Date {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, h, min);
}

export function inicioDeVentana(ventana: TimeWindowProposal, ahora = new Date()): Date {
  return instante(fechaDeVentana(ventana, ahora), ventana.horaInicio);
}

export function finDeVentana(ventana: TimeWindowProposal, ahora = new Date()): Date {
  return instante(fechaDeVentana(ventana, ahora), ventana.horaFin);
}

/**
 * La ventana que ganaría si la votación cerrase ahora, con la misma regla que
 * `SelectorVentanaGanadora` del backend: la más votada y, en empate, la más
 * temprana. Sin ningún voto no gana ninguna y el plan se cancela.
 */
export function elegirGanadora(ventanas: TimeWindowProposal[], ahora = new Date()): TimeWindowProposal | null {
  let mejor: TimeWindowProposal | null = null;
  for (const v of ventanas) {
    if (v.votosUsuarios.length === 0) continue;
    if (
      !mejor ||
      v.votosUsuarios.length > mejor.votosUsuarios.length ||
      (v.votosUsuarios.length === mejor.votosUsuarios.length &&
        inicioDeVentana(v, ahora) < inicioDeVentana(mejor, ahora))
    ) {
      mejor = v;
    }
  }
  return mejor;
}

/**
 * La ventana en la que ocurre un plan confirmado. El servidor dice cuál fue
 * (`ventanaConfirmadaId`); el modo demo no lo guarda y se recalcula.
 */
export function ventanaGanadora(plan: PlanProposal, ahora = new Date()): TimeWindowProposal | null {
  if (plan.ventanaConfirmadaId) {
    return plan.ventanasSugeridas.find((v) => v.id === plan.ventanaConfirmadaId) ?? null;
  }
  if (plan.estado !== 'confirmado') return null;
  return elegirGanadora(plan.ventanasSugeridas, ahora) ?? plan.ventanasSugeridas[0] ?? null;
}

/**
 * El plan confirmado que viene antes, entre los que aún no han terminado. Un
 * plan de la semana pasada ya no es «el próximo», y avisar de un retraso en él
 * solo acababa en un error del servidor.
 */
export function proximoPlanConfirmado(
  planes: PlanProposal[],
  ahora = new Date()
): { plan: PlanProposal; ventana: TimeWindowProposal } | null {
  let proximo: { plan: PlanProposal; ventana: TimeWindowProposal } | null = null;
  for (const plan of planes) {
    if (plan.estado !== 'confirmado') continue;
    const ventana = ventanaGanadora(plan, ahora);
    if (!ventana || finDeVentana(ventana, ahora) <= ahora) continue;
    if (!proximo || inicioDeVentana(ventana, ahora) < inicioDeVentana(proximo.ventana, ahora)) {
      proximo = { plan, ventana };
    }
  }
  return proximo;
}

/**
 * Si el plan acepta votos ahora. Con backend manda su `votacionAbierta`,
 * calculada con el reloj del servidor; en demo basta con que siga propuesto.
 */
export function votacionAbierta(plan: PlanProposal): boolean {
  return plan.votacionAbierta ?? plan.estado === 'propuesto';
}

/** Qué etiqueta de estado corresponde a una tarjeta de plan. */
export function estadoVisible(
  plan: PlanProposal
): 'abierta' | 'cerrando' | 'confirmado' | 'cancelado' | 'recoordinacion' {
  if (plan.estado === 'confirmado') return 'confirmado';
  if (plan.estado === 'cancelado') return 'cancelado';
  if (plan.estado === 'en_recoordinacion') return 'recoordinacion';
  // Propuesto con el plazo vencido: el barrido del servidor tarda hasta un
  // minuto en cerrarlo, y mientras tanto no se puede votar.
  return votacionAbierta(plan) ? 'abierta' : 'cerrando';
}

export interface VentanaPropuesta {
  dia: DayOfWeek;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

/**
 * Lo que el backend rechazaría de una propuesta, dicho antes de enviarla y en
 * términos de la persona que la está escribiendo.
 */
export function problemasDePropuesta(
  ventanas: VentanaPropuesta[],
  plazoISO: string,
  ahora = new Date()
): string[] {
  const problemas: string[] = [];
  const etiqueta = (v: VentanaPropuesta) => `${v.dia} ${v.horaInicio}–${v.horaFin}`;

  if (ventanas.length < 2 || ventanas.length > 5) {
    problemas.push('Propón entre 2 y 5 opciones de horario.');
  }

  for (const v of ventanas) {
    if (v.horaFin <= v.horaInicio) {
      problemas.push(`La opción ${etiqueta(v)} termina antes de empezar.`);
    } else if (instante(v.fecha, v.horaInicio) <= ahora) {
      problemas.push(`La opción ${etiqueta(v)} ya empezó o ya pasó.`);
    }
  }

  for (let i = 0; i < ventanas.length; i++) {
    for (let j = i + 1; j < ventanas.length; j++) {
      const a = ventanas[i];
      const b = ventanas[j];
      if (a.fecha === b.fecha && a.horaInicio < b.horaFin && b.horaInicio < a.horaFin) {
        problemas.push(`Las opciones ${etiqueta(a)} y ${etiqueta(b)} se solapan.`);
      }
    }
  }

  const plazo = new Date(plazoISO);
  if (plazo.getTime() < ahora.getTime() + MINUTOS_MINIMOS_DE_PLAZO * 60_000) {
    problemas.push(`El plazo de votación tiene que cerrar dentro de ${MINUTOS_MINIMOS_DE_PLAZO} minutos como mínimo.`);
  }
  const validas = ventanas.filter((v) => v.horaFin > v.horaInicio);
  if (validas.length > 0) {
    const primera = validas
      .map((v) => instante(v.fecha, v.horaInicio))
      .reduce((a, b) => (a < b ? a : b));
    if (plazo >= primera) {
      problemas.push(
        'La votación cerraría después de que empiece la primera opción: acorta el plazo o elige fechas más adelante.'
      );
    }
  }

  return problemas;
}

/** Plazo legible: si es un instante ISO se formatea; si es texto, tal cual. */
export function formatearPlazo(plazo: string): string {
  const fecha = new Date(plazo);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(plazo) || Number.isNaN(fecha.getTime())) return plazo;
  return fecha.toLocaleString('es-PE', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/** «sáb 26 sep · 16:00–18:00». Con fecha concreta, no solo el día de la semana. */
export function formatearVentana(ventana: TimeWindowProposal, ahora = new Date()): string {
  const dia = instante(fechaDeVentana(ventana, ahora), '00:00').toLocaleDateString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
  return `${dia} · ${ventana.horaInicio}–${ventana.horaFin}`;
}
