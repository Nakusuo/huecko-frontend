/**
 * Tipos del módulo de horario.
 *
 * Viven aquí y no dentro del store porque los consumen tanto el store como
 * `services/scheduleService`; tenerlos en el store obligaría al servicio a
 * importarlo y crearía un ciclo.
 */

export type DayOfWeek = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

/** Bloque tal como lo dibuja la rejilla semanal. */
export interface TimeSlot {
  id: string;
  title: string;
  day: DayOfWeek;
  startTime: string; // p. ej. "08:00"
  endTime: string;   // p. ej. "11:00"
  /** Color de la categoría, de `theme/palette`. */
  customColor?: string;
  type?: 'recurrente' | 'puntual';
  tag?: string;
  frequency?: 'semanal' | 'unica';
  specificDate?: string;
  specificEndDate?: string;
  isOcrImported?: boolean;
}

/* ------------------------------------------------------------------ *
 * Contrato del backend (com.huecko.backend.horario)
 * ------------------------------------------------------------------ */

export type BloqueTipo = 'RECURRENTE' | 'PUNTUAL';
export type BloqueFuente = 'MANUAL' | 'OCR';
export type BloqueEstado = 'BORRADOR' | 'CONFIRMADO';

/** Espejo de `BloqueHorarioResponse`. */
export interface BloqueHorarioResponse {
  id: string;
  usuarioId: string;
  tipo: BloqueTipo;
  /** 1 = lunes … 7 = domingo. Solo en bloques recurrentes. */
  diaSemana: number | null;
  /** ISO `YYYY-MM-DD`. Solo en bloques puntuales. */
  fecha: string | null;
  horaInicio: string; // "HH:mm" o "HH:mm:ss"
  horaFin: string;
  etiqueta: string | null;
  fuente: BloqueFuente;
  estado: BloqueEstado;
}

/** Espejo de `BloqueHorarioRequest`. */
export interface BloqueHorarioRequest {
  tipo: BloqueTipo;
  diaSemana?: number | null;
  fecha?: string | null;
  horaInicio: string;
  horaFin: string;
  etiqueta?: string | null;
}
