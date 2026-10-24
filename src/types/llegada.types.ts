/**
 * Espejo de `LlegadasResponse`: «Llegué» de un plan. El servidor decide si
 * se puede marcar ahora, para no depender del reloj del navegador.
 */
export interface Llegadas {
  /** SIN_FECHA: no está confirmado. ANTES / ABIERTA / CERRADA: según la hora del plan. */
  estado: 'SIN_FECHA' | 'ANTES' | 'ABIERTA' | 'CERRADA';
  abre: string | null;
  cierra: string | null;
  yaLlegue: boolean;
  llegadas: PersonaQueLlego[];
}

export interface PersonaQueLlego {
  usuarioId: string;
  nombre: string;
  fotoActualizadaEn: string | null;
  llegoEn: string;
  /** Hasta diez minutos después del inicio. */
  aTiempo: boolean;
}
