/**
 * Direcciones que llevan una intención: no solo a qué pantalla ir, sino qué
 * abrir al llegar.
 *
 * Antes «Proponer plan» y «Crear grupo» llevaban los dos a la lista de grupos
 * sin abrir nada, e «Importar horario» a «Mi horario» sin abrir el lector: la
 * persona tenía que volver a buscar el botón que ya había pulsado. La página
 * de destino lee el parámetro al montar, abre lo que toca y lo quita de la URL.
 */

/** Lista de grupos con el formulario de crear abierto. */
export const RUTA_CREAR_GRUPO = '/groups?crear=1';

/** «Mi horario» con la subida del OCR abierta. */
export const RUTA_IMPORTAR_HORARIO = '/schedule?importar=1';

/**
 * Adónde lleva «Proponer plan». Un plan siempre es de un grupo, así que:
 *
 * - con un solo grupo, directo a él con el formulario abierto;
 * - con varios, a la lista con un aviso para elegir en cuál;
 * - sin ninguno, a crear el primero: no hay dónde proponer nada.
 */
export function rutaProponerPlan(grupos: readonly { id: string }[]): string {
  if (grupos.length === 0) return RUTA_CREAR_GRUPO;
  if (grupos.length === 1) return `/groups/${encodeURIComponent(grupos[0].id)}?proponer=1`;
  return '/groups?proponer=1';
}
