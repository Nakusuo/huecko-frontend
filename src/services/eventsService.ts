import { incidentsService } from './incidentsService';
import type { Criticidad, OpcionExpres } from '../types/incidents.types';

/**
 * Adaptador entre el vocabulario del `groupsStore` y los Módulos 4 y 5 reales.
 *
 * Este archivo era un marcador de posición: sus rutas «todavía no existían en
 * el backend» y el store caía siempre a su simulación local. Ahora existen
 * (`RetrasoController` e `ImprevistoController`), así que aquí solo queda la
 * traducción de nombres.
 *
 * Se mantiene la firma anterior a propósito: el store sigue hablando de
 * `cancel | reschedule | keep` y de correos, y el modo demo sigue funcionando
 * igual cuando no hay servidor.
 */

/** El store usa inglés en minúsculas; el backend, español en mayúsculas. */
const OPCIONES: Record<'cancel' | 'reschedule' | 'keep', OpcionExpres> = {
  cancel: 'CANCELAR',
  reschedule: 'REAGENDAR',
  keep: 'MANTENER',
};

export const eventsService = {
  /**
   * RF-15 y RF-16: reportar un imprevisto.
   *
   * Devuelve la criticidad que decidió el servidor. **El cliente no la
   * calcula**: las reglas viven en `EvaluadorCriticidad`, y duplicarlas aquí
   * garantizaría que las dos copias se separaran.
   */
  async reportIncident(
    planId: string,
    payload: { reason?: string; type?: 'falta' | 'tardanza' | 'imprevisto' },
  ): Promise<{ criticidad: Criticidad | null; razon?: string; abrioVotacion: boolean }> {
    // Una tardanza es Módulo 4, no Módulo 5: son endpoints distintos y solo
    // el imprevisto puede abrir una votación exprés.
    if (payload.type === 'tardanza') {
      await incidentsService.reportarRetraso(planId, minutosDe(payload.reason));
      return { criticidad: null, abrioVotacion: false };
    }

    const resultado = await incidentsService.reportarImprevisto(planId, payload.reason ?? '');
    if (!resultado) return { criticidad: null, abrioVotacion: false };

    return {
      criticidad: resultado.criticidad,
      razon: resultado.razon,
      abrioVotacion: resultado.votacion !== null,
    };
  },

  /** RF-17: votar en la votación exprés. */
  async voteExpress(planId: string, choice: 'cancel' | 'reschedule' | 'keep'): Promise<void> {
    await incidentsService.votarExpres(planId, OPCIONES[choice]);
  },
};

/**
 * Saca los minutos del texto «Llegará con 20 minutos de retraso».
 *
 * Es una costura temporal: el store construye esa frase antes de llamar. Lo
 * correcto es que pase el número, y así lo hace ya el panel nuevo; esto solo
 * cubre el camino viejo mientras siga vivo. Sin número reconocible se asume
 * el valor que ofrece la interfaz por defecto.
 */
function minutosDe(texto: string | undefined): number {
  const encontrado = texto?.match(/(\d+)\s*min/i);
  return encontrado ? Number(encontrado[1]) : 15;
}
