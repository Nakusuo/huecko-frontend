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
/** Lo que ofrece la interfaz cuando nadie indica minutos. */
const MINUTOS_POR_DEFECTO = 15;

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
    payload: {
      reason?: string;
      type?: 'falta' | 'tardanza' | 'imprevisto';
      /** Minutos de retraso. Solo tiene sentido con `type: 'tardanza'`. */
      minutos?: number;
    },
  ): Promise<{ criticidad: Criticidad | null; razon?: string; abrioVotacion: boolean }> {
    // Una tardanza es Módulo 4, no Módulo 5: son endpoints distintos y solo
    // el imprevisto puede abrir una votación exprés.
    if (payload.type === 'tardanza') {
      await incidentsService.reportarRetraso(planId, payload.minutos ?? MINUTOS_POR_DEFECTO);
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

