import { incidentsService } from './incidentsService';
import type { OpcionExpres } from '../types/incidents.types';

/**
 * Adaptador entre el vocabulario del `groupsStore` y el Módulo 5 real.
 *
 * El reporte de tardanzas e imprevistos ya no pasa por aquí: el store usa
 * `incidentsStore`, que además deja el retraso o la votación exprés a la vista
 * en el panel del evento sin esperar al WebSocket.
 */

/** El store usa inglés en minúsculas; el backend, español en mayúsculas. */
const OPCIONES: Record<'cancel' | 'reschedule' | 'keep', OpcionExpres> = {
  cancel: 'CANCELAR',
  reschedule: 'REAGENDAR',
  keep: 'MANTENER',
};

export const eventsService = {
  /** RF-17: votar en la votación exprés. */
  async voteExpress(planId: string, choice: 'cancel' | 'reschedule' | 'keep'): Promise<void> {
    await incidentsService.votarExpres(planId, OPCIONES[choice]);
  },
};
