/** Espejo de `MuroResponse`: el muro del grupo, de lo más nuevo a lo más antiguo. */
export interface Muro {
  entradas: EntradaMuro[];
  /** Para pedir las anteriores; `null` si no hay más. */
  siguiente: string | null;
}

export type TipoEntradaMuro =
  | 'MIEMBRO_UNIDO'
  | 'PLAN_PROPUESTO'
  | 'PLAN_CONFIRMADO'
  | 'PLAN_CANCELADO'
  | 'FOTOS_SUBIDAS'
  | 'LLEGARON';

export interface PersonaMuro {
  usuarioId: string;
  nombre: string;
  fotoActualizadaEn: string | null;
}

/** Según el tipo van unos campos u otros (ver `MuroResponse.Entrada`). */
export interface EntradaMuro {
  tipo: TipoEntradaMuro;
  ocurridoEn: string;
  actor: PersonaMuro | null;
  planId: string | null;
  titulo: string | null;
  fecha: string | null;
  horaInicio: string | null;
  cantidad: number | null;
  fotoIds: string[] | null;
  personas: PersonaMuro[] | null;
}
