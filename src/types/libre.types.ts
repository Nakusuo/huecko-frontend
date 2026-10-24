/**
 * Espejo de `LibreAhoraResponse` (`GET /api/me/libre-ahora`).
 *
 * RNF-02: de los demás solo llega un recuento por grupo y los nombres de
 * quienes avisaron de que están libres.
 */
export interface LibreAhora {
  /** Tu aviso, o `null` si no avisaste o ya pasó la hora. */
  yo: { hasta: string; nota: string | null } | null;
  /** Si según tu horario ahora tienes un bloque. */
  enClase: boolean;
  /** Hasta cuándo estás libre según tu horario; `null` si estás en clase o ya es de noche. */
  sugerencia: string | null;
  grupos: GrupoLibre[];
}

export interface GrupoLibre {
  grupoId: string;
  nombre: string;
  /** Cuántos no tienen clase a esta hora, contándote a ti. */
  sinClase: number;
  total: number;
  /** Quienes avisaron de que están libres (nunca tú). */
  personas: PersonaLibre[];
}

export interface PersonaLibre {
  usuarioId: string;
  nombre: string;
  fotoActualizadaEn: string | null;
  hasta: string;
  nota: string | null;
}
