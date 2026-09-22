import type { DayOfWeek, TimeSlot } from '../types/schedule.types';
import { DAY_ORDER } from './formatoBackend';

/**
 * Reglas puras del horario personal: fechas locales, en qué días cae un bloque,
 * cuándo dos bloques chocan y qué hace falta para que uno sea válido.
 *
 * Viven fuera de la página porque las usan la rejilla, el borrador del OCR y el
 * resumen del Dashboard; con una copia en cada sitio, cada pantalla acababa
 * contando una historia distinta del mismo horario.
 */

/** Lo mínimo de un bloque que hace falta para ubicarlo en el calendario. */
export type BloqueUbicable = Pick<TimeSlot, 'day' | 'startTime' | 'endTime'> &
  Partial<Pick<TimeSlot, 'type' | 'frequency' | 'specificDate' | 'specificEndDate'>>;

/* ------------------------------------------------------------------ *
 * Fechas locales
 * ------------------------------------------------------------------ */

const dosDigitos = (n: number) => n.toString().padStart(2, '0');

/**
 * Fecha `YYYY-MM-DD` en la zona horaria del navegador.
 *
 * `toISOString()` da la fecha en UTC: en Lima (GMT-5), a partir de las 19:00 ya
 * es "mañana" y el formulario proponía el día siguiente.
 */
export function fechaLocalIso(fecha: Date = new Date()): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** Lee `YYYY-MM-DD` como medianoche local (`new Date(iso)` la leería en UTC). */
export function parsearFechaIso(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, (mes ?? 1) - 1, dia ?? 1);
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = parsearFechaIso(iso);
  fecha.setDate(fecha.getDate() + dias);
  return fechaLocalIso(fecha);
}

/** Día de la semana de una fecha ISO. */
export function diaDeFecha(iso: string): DayOfWeek {
  return DAY_ORDER[(parsearFechaIso(iso).getDay() + 6) % 7];
}

/** Lunes de la semana que contiene la fecha dada. */
export function inicioDeSemana(iso: string): string {
  return sumarDias(iso, -DAY_ORDER.indexOf(diaDeFecha(iso)));
}

/** Las siete fechas (lunes a domingo) de la semana que empieza en `lunes`. */
export function fechasDeSemana(lunes: string): { day: DayOfWeek; fecha: string }[] {
  return DAY_ORDER.map((day, i) => ({ day, fecha: sumarDias(lunes, i) }));
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "21 – 27 sep 2026" o, si la semana cambia de mes, "28 sep – 4 oct 2026". */
export function etiquetaSemana(lunes: string): string {
  const inicio = parsearFechaIso(lunes);
  const fin = parsearFechaIso(sumarDias(lunes, 6));
  const mesInicio = MESES[inicio.getMonth()];
  const mesFin = MESES[fin.getMonth()];
  const anioInicio = inicio.getFullYear();
  const anioFin = fin.getFullYear();

  if (anioInicio !== anioFin) {
    return `${inicio.getDate()} ${mesInicio} ${anioInicio} – ${fin.getDate()} ${mesFin} ${anioFin}`;
  }
  if (mesInicio !== mesFin) {
    return `${inicio.getDate()} ${mesInicio} – ${fin.getDate()} ${mesFin} ${anioFin}`;
  }
  return `${inicio.getDate()} – ${fin.getDate()} ${mesFin} ${anioFin}`;
}

/* ------------------------------------------------------------------ *
 * Ubicación de un bloque
 * ------------------------------------------------------------------ */

/** Mismo criterio que `toBloqueRequest`: basta con cualquiera de las dos marcas. */
export function esPuntual(bloque: BloqueUbicable): boolean {
  return bloque.type === 'puntual' || bloque.frequency === 'unica';
}

/** Primer y último día de un puntual. Un puntual sin fecha no tiene rango. */
function rangoDe(bloque: BloqueUbicable): [string, string] | null {
  if (!bloque.specificDate) return null;
  const fin = bloque.specificEndDate || bloque.specificDate;
  // Un rango al revés se trata como un solo día en vez de desaparecer.
  return [bloque.specificDate, fin < bloque.specificDate ? bloque.specificDate : fin];
}

/**
 * ¿Ocupa el bloque la fecha dada?
 *
 * - Recurrente: todas las semanas, en su día.
 * - Puntual: solo en los días entre `specificDate` y `specificEndDate` (o solo
 *   `specificDate`), igual que calcula el backend la disponibilidad. Antes se
 *   pintaba en su día de la semana todas las semanas, para siempre, y un rango
 *   de varios días solo aparecía en el primero.
 *
 * Un puntual antiguo sin fecha se sigue mostrando en su día de la semana: es
 * mejor verlo (y poder corregirlo) que perderlo de vista.
 */
export function ocupaFecha(bloque: BloqueUbicable, fecha: string): boolean {
  if (!esPuntual(bloque)) return bloque.day === diaDeFecha(fecha);

  const rango = rangoDe(bloque);
  if (!rango) return bloque.day === diaDeFecha(fecha);
  return rango[0] <= fecha && fecha <= rango[1];
}

/* ------------------------------------------------------------------ *
 * Solapes
 * ------------------------------------------------------------------ */

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** ¿Algún día del rango del puntual cae en ese día de la semana? */
function rangoIncluyeDia(rango: [string, string], dia: DayOfWeek): boolean {
  // A partir de siete días seguidos el rango contiene todos los días de la semana.
  for (let i = 0, fecha = rango[0]; fecha <= rango[1] && i < 7; i += 1, fecha = sumarDias(fecha, 1)) {
    if (diaDeFecha(fecha) === dia) return true;
  }
  return false;
}

/**
 * ¿Chocan dos bloques?
 *
 * El solape horario es estricto: 08:00–10:00 y 10:00–12:00 solo se tocan, y
 * encadenar clases así es lo normal.
 */
export function seSolapan(a: BloqueUbicable, b: BloqueUbicable): boolean {
  const chocanLasHoras =
    aMinutos(a.startTime) < aMinutos(b.endTime) && aMinutos(b.startTime) < aMinutos(a.endTime);
  if (!chocanLasHoras) return false;

  /* Un puntual antiguo sin fecha se compara por su día, igual que se dibuja:
     a efectos de choque se porta como un recurrente. */
  const rangoA = esPuntual(a) ? rangoDe(a) : null;
  const rangoB = esPuntual(b) ? rangoDe(b) : null;

  if (rangoA && rangoB) return rangoA[0] <= rangoB[1] && rangoB[0] <= rangoA[1];
  if (rangoA) return rangoIncluyeDia(rangoA, b.day);
  if (rangoB) return rangoIncluyeDia(rangoB, a.day);
  return a.day === b.day;
}

/** Primer bloque de `existentes` que choca con `candidato`, o `null`. */
export function buscarSolape<T extends BloqueUbicable & { id?: string }>(
  candidato: BloqueUbicable,
  existentes: readonly T[],
  excluirId?: string | null
): T | null {
  return existentes.find((otro) => otro.id !== excluirId && seSolapan(candidato, otro)) ?? null;
}

/** «Cálculo II» (Lun 08:00–11:00), o con la fecha si es puntual. */
export function describirBloque(bloque: BloqueUbicable & { title: string }): string {
  const rango = esPuntual(bloque) ? rangoDe(bloque) : null;
  const cuando = !rango
    ? bloque.day
    : rango[0] === rango[1]
      ? `${bloque.day} ${formatoCorto(rango[0])}`
      : `${formatoCorto(rango[0])} al ${formatoCorto(rango[1])}`;
  return `«${bloque.title}» (${cuando} ${bloque.startTime}–${bloque.endTime})`;
}

function formatoCorto(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

export function mensajeSolape(conflicto: BloqueUbicable & { title: string }): string {
  return `Se solapa con ${describirBloque(conflicto)}.`;
}

/**
 * Separa los candidatos nuevos de los que ya están en el horario o se repiten
 * entre sí. Cada aceptado cuenta para los siguientes, así que dos filas iguales
 * del mismo lote dejan pasar solo la primera.
 */
export function separarRepetidos<T extends BloqueUbicable>(
  candidatos: readonly T[],
  existentes: readonly BloqueUbicable[]
): { aceptados: T[]; descartados: T[] } {
  const aceptados: T[] = [];
  const descartados: T[] = [];
  for (const candidato of candidatos) {
    const choca = [...existentes, ...aceptados].some((otro) => seSolapan(candidato, otro));
    (choca ? descartados : aceptados).push(candidato);
  }
  return { aceptados, descartados };
}

/* ------------------------------------------------------------------ *
 * Validación
 * ------------------------------------------------------------------ */

const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Motivo por el que un bloque no se puede guardar, o `null` si está bien.
 *
 * `rangoActivo` es la casilla "¿Es un rango de fechas?" del formulario: con ella
 * marcada, la fecha de fin deja de ser opcional.
 */
export function validarBloque(
  bloque: BloqueUbicable & { title: string },
  opciones: { rangoActivo?: boolean } = {}
): string | null {
  if (!bloque.title.trim()) return 'Ponle un nombre al bloque.';

  if (!HORA_VALIDA.test(bloque.startTime) || !HORA_VALIDA.test(bloque.endTime)) {
    return 'Indica la hora de inicio y la de fin.';
  }
  if (aMinutos(bloque.endTime) <= aMinutos(bloque.startTime)) {
    return (
      'La hora de fin debe ser posterior a la de inicio. Un bloque no puede cruzar la ' +
      'medianoche: si termina al día siguiente, divídelo en dos bloques.'
    );
  }

  if (esPuntual(bloque)) {
    if (!bloque.specificDate) return 'Elige la fecha del evento.';
    if (opciones.rangoActivo && !bloque.specificEndDate) {
      return 'Indica la fecha de fin del rango o desmarca «¿Es un rango de fechas?».';
    }
    if (bloque.specificEndDate && bloque.specificEndDate < bloque.specificDate) {
      return 'La fecha de fin no puede ser anterior a la de inicio.';
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Rejilla
 * ------------------------------------------------------------------ */

/**
 * Horas que abarca la rejilla: 08–20 como mínimo, ampliadas a lo que pidan los
 * bloques. Con el rango fijo, un bloque a las 06:00 se pegaba arriba del todo y
 * uno a las 21:00 quedaba fuera. Se redondea a horas pares porque las marcas
 * van de dos en dos.
 */
export function rangoRejilla(bloques: readonly Pick<TimeSlot, 'startTime' | 'endTime'>[]): {
  inicio: number;
  fin: number;
} {
  let inicio = 8;
  let fin = 20;
  for (const bloque of bloques) {
    inicio = Math.min(inicio, Math.floor(aMinutos(bloque.startTime) / 60));
    fin = Math.max(fin, Math.ceil(aMinutos(bloque.endTime) / 60));
  }
  inicio = Math.max(0, inicio - (inicio % 2));
  fin = Math.min(24, fin + (fin % 2));
  return { inicio, fin };
}
