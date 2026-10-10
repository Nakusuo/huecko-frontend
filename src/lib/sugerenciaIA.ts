import { OPCION_TEXTO, type OpcionExpres, type VotacionExpres } from '../types/incidents.types';

export interface Sugerencia {
  opcion: OpcionExpres;
  titulo: string;
  razon: string;
}

/**
 * La sugerencia de la IA para una votación exprés, o `null` si no hay que
 * mostrar ninguna.
 *
 * Solo mientras se vota: una vez cerrada, lo que cuenta es lo que decidió el
 * grupo, y enseñar al lado lo que «habría convenido» sería reabrir la discusión.
 */
export function sugerenciaDe(votacion: VotacionExpres): Sugerencia | null {
  const { recomendacion, razonRecomendacion } = votacion;
  if (votacion.estado !== 'ABIERTA' || !recomendacion || !razonRecomendacion?.trim()) {
    return null;
  }
  const texto = OPCION_TEXTO[recomendacion];
  if (!texto) return null;

  return { opcion: recomendacion, titulo: texto.titulo, razon: sinPuntoFinal(razonRecomendacion) };
}

/**
 * Las razones (de la IA o de las reglas) se pintan dentro de una frase que ya
 * pone su punto: «Porque {razón}.». Si la razón traía el suyo, salía «..».
 */
export function sinPuntoFinal(texto: string): string {
  return texto.trim().replace(/[.。]+$/u, '').trimEnd();
}
