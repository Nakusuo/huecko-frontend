/**
 * Módulos 4 y 5: retrasos, imprevistos y votación exprés.
 *
 * Espejo de los DTO del backend. Se escribe a mano en vez de aceptar
 * `Record<string, unknown>` para que un cambio de contrato salte en `tsc` y no
 * en la cara del usuario.
 */

/* ------------------------------------------------------------------ *
 * Módulo 4 — retrasos (RF-12, RF-14)
 * ------------------------------------------------------------------ */

export interface Retraso {
  usuarioId: string;
  nombreUsuario: string;
  minutosEstimados: number;
  /** ISO-8601 en UTC. */
  reportadoEn: string;
  /** `true` si corrigió su estimación después del primer aviso. */
  corregido: boolean;
}

/* ------------------------------------------------------------------ *
 * Módulo 5 — imprevistos (RF-15 a RF-19)
 * ------------------------------------------------------------------ */

export type OpcionExpres = 'CANCELAR' | 'REAGENDAR' | 'MANTENER';

export type Criticidad = "CRITICA" | "NO_CRITICA";

/** De dónde salió el veredicto de criticidad. Ver EvaluadorCriticidad.Origen. */
export type OrigenCriticidad = "REGLAS" | "IA" | "REGLAS_POR_FALLO";

export type EstadoVotacion = 'ABIERTA' | 'CERRADA';

export interface VotacionExpres {
  id: string;
  planId: string;
  nombreReporta: string;
  motivo: string | null;
  criticidad: Criticidad;
  /** Por qué se clasificó así (RF-16). Se muestra al grupo. */
  razonCriticidad: string;
  /**
   * Quién lo decidió. Se muestra en la interfaz a propósito: un grupo tiene
   * derecho a saber si la decisión que le abrió una votación la tomó una regla
   * o un modelo.
   */
  origenCriticidad: OrigenCriticidad;
  estado: EstadoVotacion;
  opciones: OpcionExpres[];
  /** Recuento por opción. No dice quién votó qué. */
  recuento: Record<OpcionExpres, number>;
  /** Lo que voté yo, o `null` si aún no he votado. */
  miVoto: OpcionExpres | null;
  votosEmitidos: number;
  miembrosDelGrupo: number;
  /** ISO-8601. Es el reloj de la votación. */
  expiraEn: string;
  resultado: OpcionExpres | null;
  /** `true` si el resultado salió de RF-18 y no de los votos. */
  resultadoPorDefecto: boolean;
}

/** Qué pasó al reportar una ausencia: con votación (crítica) o sin ella. */
export interface ResultadoReporte {
  criticidad: Criticidad;
  razon: string;
  /** `null` cuando la ausencia no es crítica (RF-19). */
  votacion: VotacionExpres | null;
}

/* ------------------------------------------------------------------ *
 * Textos de las opciones — en un solo sitio
 * ------------------------------------------------------------------ */

/**
 * Cada opción dice qué le pasa al plan, no solo cómo se llama. Votar
 * "Reagendar" sin saber que eso devuelve el plan a coordinación es votar a
 * ciegas.
 */
export const OPCION_TEXTO: Record<
  OpcionExpres,
  { titulo: string; consecuencia: string; icono: string }
> = {
  MANTENER: {
    titulo: 'Mantener',
    consecuencia: 'El plan sigue con la fecha y hora confirmadas.',
    icono: 'check_circle',
  },
  REAGENDAR: {
    titulo: 'Reagendar',
    consecuencia: 'La fecha deja de valer y el grupo vuelve a coordinar.',
    icono: 'event_repeat',
  },
  CANCELAR: {
    titulo: 'Cancelar',
    consecuencia: 'El plan se cancela para todo el grupo.',
    icono: 'cancel',
  },
};

/** Orden de presentación: de lo más conservador a lo más drástico. */
export const ORDEN_OPCIONES: OpcionExpres[] = ['MANTENER', 'REAGENDAR', 'CANCELAR'];
