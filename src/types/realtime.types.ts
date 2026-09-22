/**
 * Espejo de `EventoTiempoReal` del backend (RNF-05).
 *
 * Si el backend añade un tipo y aquí no se refleja, el `switch` que consume
 * los eventos lo ignora en silencio: por eso `RealtimeEventType` se escribe a
 * mano en vez de aceptar cualquier `string`.
 */
export type RealtimeEventType =
  /** RF-11: la votación cerró y hay fecha/hora confirmada. */
  | 'PLAN_CONFIRMADO'
  /** Fuera de RF-11: la votación cerró sin votos y el plan se canceló. */
  | 'PLAN_CANCELADO'
  /** RF-13: alguien llega tarde; el evento no cambia. */
  | 'RETRASO_REPORTADO'
  /** RF-19: baja no crítica, solo se informa. */
  | 'AUSENCIA_REPORTADA'
  /** RF-17: baja crítica, se abre votación exprés. */
  | 'VOTACION_EXPRES_ABIERTA'
  /** RF-17: alguien votó y el recuento cambió. No dice quién ni qué. */
  | 'VOTO_EXPRES_ACTUALIZADO'
  /** RF-17 y RF-18: la votación exprés terminó. */
  | 'VOTACION_EXPRES_CERRADA'
  /** RF-08: alguien propuso un plan nuevo en el grupo. */
  | 'PLAN_PROPUESTO'
  /** Un plan en re-coordinación vuelve a votarse con fechas nuevas. */
  | 'PLAN_REAGENDADO'
  /** RF-09: cambió el recuento de una votación de ventanas. No dice qué se votó. */
  | 'VOTO_ACTUALIZADO';

export interface RealtimeEvent {
  tipo: RealtimeEventType;
  grupoId: string;
  /** ISO-8601 en UTC, tal y como lo serializa Jackson. */
  ocurridoEn: string;
  datos: Record<string, unknown>;
}

/** Estado de la conexión, para poder mostrarlo en la interfaz. */
export type RealtimeStatus = 'desconectado' | 'conectando' | 'conectado';

/** Datos de un PLAN_CONFIRMADO ya tipados. */
export interface PlanConfirmadoDatos {
  planId: string;
  titulo: string;
  lugar?: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}
