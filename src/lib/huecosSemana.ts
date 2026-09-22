import type { GroupAvailability, SuggestedWindow } from '../types/groups.types';
import type { DayOfWeek, TimeSlot } from '../types/schedule.types';
import { calcularCelda, HORA_DESDE, HORA_HASTA, type BloqueDePersona } from './disponibilidad';
import { DAY_ORDER } from './formatoBackend';
import { fechasDeSemana, ocupaFecha, parsearFechaIso } from './horario';

/**
 * Lo que el panel de inicio cuenta del cruce de disponibilidad de cada grupo.
 *
 * Antes la tarjeta «Huecos coincidentes» sumaba las horas de las ventanas de
 * TODOS los planes —cancelados, pasados y repetidos incluidos— truncando los
 * minutos, y el resumen de cada grupo enseñaba el umbral como si fuera la
 * disponibilidad. Aquí solo se cuenta lo que dice el cruce de la semana: las
 * casillas que cumplen el umbral de su grupo y las ventanas que salen de él.
 */

/** Lo mínimo del cruce que hace falta: el del servidor ya tiene esta forma. */
export type CruceSemanal = Pick<GroupAvailability, 'weekFrom' | 'cells' | 'windows'>;

/** Una ventana del cruce ya situada en su fecha. */
export type VentanaConFecha = SuggestedWindow & { fecha: string };

const aHora = (h: number) => `${String(h).padStart(2, '0')}:00`;

function instante(fechaISO: string, hora: number | string): Date {
  const fecha = parsearFechaIso(fechaISO);
  if (typeof hora === 'number') {
    fecha.setHours(hora, 0, 0, 0);
  } else {
    const [h, m] = hora.split(':').map(Number);
    fecha.setHours(h, m ?? 0, 0, 0);
  }
  return fecha;
}

/** Fecha de un día de la semana del cruce (`weekFrom` es su lunes). */
function fechaDelDia(lunes: string, dia: DayOfWeek): string {
  return fechasDeSemana(lunes)[Math.max(DAY_ORDER.indexOf(dia), 0)].fecha;
}

/**
 * Bloques ocupados de la semana para el cruce del modo demo: los de ejemplo
 * del resto del grupo más «Mi horario» de quien usa la app.
 *
 * Mismas reglas que el heatmap del grupo: un puntual solo cuenta el día que
 * ocurre y un borrador de OCR sin revisar no bloquea a nadie, como en el
 * backend. Si el panel contara distinto, el inicio y el grupo darían cifras
 * diferentes para la misma semana.
 */
export function bloquesDemoDeLaSemana(
  ocupadosDelGrupo: readonly { userEmail: string; day: DayOfWeek; startTime: string; endTime: string }[],
  misBloques: readonly TimeSlot[],
  miCorreo: string,
  lunes: string,
): Map<DayOfWeek, BloqueDePersona[]> {
  const porDia = new Map<DayOfWeek, BloqueDePersona[]>();
  const anadir = (dia: DayOfWeek, bloque: BloqueDePersona) =>
    porDia.set(dia, [...(porDia.get(dia) ?? []), bloque]);

  const yo = miCorreo.toLowerCase();
  for (const s of ocupadosDelGrupo) {
    // Lo mío sale de «Mi horario», no de los datos de ejemplo.
    if (s.userEmail.toLowerCase() === yo) continue;
    anadir(s.day, { persona: s.userEmail, startTime: s.startTime, endTime: s.endTime });
  }
  for (const { day, fecha } of fechasDeSemana(lunes)) {
    for (const b of misBloques) {
      if (b.isOcrImported && !b.confirmado) continue;
      if (!ocupaFecha(b, fecha)) continue;
      anadir(day, { persona: miCorreo, startTime: b.startTime, endTime: b.endTime });
    }
  }
  return porDia;
}

/**
 * Cruce de una semana calculado en el cliente (modo demo), con la misma forma
 * que el del servidor. Las ventanas son las horas seguidas que cumplen el
 * umbral, con la disponibilidad de la peor de ellas, que es como las mide el
 * backend.
 */
export function cruceLocal(
  personas: readonly string[],
  bloquesPorDia: ReadonlyMap<DayOfWeek, readonly BloqueDePersona[]>,
  umbral: number,
  lunes: string,
): CruceSemanal {
  const cells: CruceSemanal['cells'] = {};
  const windows: SuggestedWindow[] = [];

  for (const dia of DAY_ORDER) {
    let abierta: { inicio: number; fin: number; minimo: number } | null = null;
    const cerrar = () => {
      if (!abierta) return;
      windows.push({
        id: `local-${dia}-${abierta.inicio}`,
        dia,
        horaInicio: aHora(abierta.inicio),
        horaFin: aHora(abierta.fin),
        disponibilidadPorcentaje: abierta.minimo,
        votosUsuarios: [],
      });
      abierta = null;
    };

    for (let hora = HORA_DESDE; hora < HORA_HASTA; hora++) {
      const celda = calcularCelda(personas, bloquesPorDia.get(dia) ?? [], hora, umbral);
      cells[`${dia}-${hora}`] = {
        freeCount: celda.libres,
        freePercentage: celda.porcentaje,
        meetsThreshold: celda.cumpleUmbral,
      };
      if (!celda.cumpleUmbral) {
        cerrar();
      } else if (abierta) {
        abierta.fin = hora + 1;
        abierta.minimo = Math.min(abierta.minimo, celda.porcentaje);
      } else {
        abierta = { inicio: hora, fin: hora + 1, minimo: celda.porcentaje };
      }
    }
    cerrar();
  }

  return { weekFrom: lunes, cells, windows };
}

/**
 * Horas que quedan esta semana en las que al menos uno de mis grupos llega a
 * su umbral.
 *
 * - Solo casillas que cumplen el umbral de SU grupo (cada grupo tiene el suyo).
 * - Solo las que aún no han empezado: las del lunes pasado ya no sirven.
 * - La misma hora libre en dos grupos cuenta una vez: son horas de mi semana,
 *   no una suma que podría pasar de las que tiene la semana.
 *
 * Cada casilla del cruce es una franja de una hora, así que no hay minutos
 * que truncar.
 */
export function horasCoincidentesRestantes(cruces: readonly CruceSemanal[], ahora = new Date()): number {
  const horas = new Set<string>();
  for (const cruce of cruces) {
    for (const [clave, celda] of Object.entries(cruce.cells)) {
      if (!celda.meetsThreshold) continue;
      const separador = clave.lastIndexOf('-');
      const dia = clave.slice(0, separador) as DayOfWeek;
      const hora = Number(clave.slice(separador + 1));
      if (!DAY_ORDER.includes(dia) || Number.isNaN(hora)) continue;
      const fecha = fechaDelDia(cruce.weekFrom, dia);
      if (instante(fecha, hora) < ahora) continue;
      horas.add(`${fecha}-${hora}`);
    }
  }
  return horas.size;
}

/**
 * La mejor ventana del cruce que aún no ha empezado: la de más disponibilidad
 * y, a igualdad, la más temprana. `null` si ya no queda ninguna esta semana.
 */
export function mejorVentanaFutura(cruce: CruceSemanal, ahora = new Date()): VentanaConFecha | null {
  let mejor: VentanaConFecha | null = null;
  for (const ventana of cruce.windows) {
    const fecha = ventana.fecha ?? fechaDelDia(cruce.weekFrom, ventana.dia);
    const inicio = instante(fecha, ventana.horaInicio);
    if (inicio < ahora) continue;
    if (
      !mejor ||
      ventana.disponibilidadPorcentaje > mejor.disponibilidadPorcentaje ||
      (ventana.disponibilidadPorcentaje === mejor.disponibilidadPorcentaje &&
        inicio < instante(mejor.fecha, mejor.horaInicio))
    ) {
      mejor = { ...ventana, fecha };
    }
  }
  return mejor;
}
