import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';

/**
 * Módulos 4 y 5: retrasos, imprevistos y votación exprés.
 *
 * Las propuestas y su votación (Módulo 3) se fueron a `plansService`, contra
 * las rutas reales de `PlanController`. Lo que queda aquí **todavía no existe
 * en el backend**: son las llamadas que el frontend ya sabe hacer y que hoy
 * fallan, con el store cayendo a su simulación local.
 */
export const eventsService = {
  /** RF-15, RF-16: reportar un imprevisto y recibir su criticidad evaluada. */
  async reportIncident(
    planId: string,
    payload: { reason?: string; type?: 'falta' | 'tardanza' | 'imprevisto' }
  ): Promise<{ criticidad: 'BAJA' | 'MEDIA' | 'ALTA'; expressVoteId?: string }> {
    if (!isApiEnabled) {
      return { criticidad: 'MEDIA' };
    }

    const { data } = await apiClient.post(endpoints.incidents.byPlan(planId), payload);
    return data;
  },

  /** RF-17: votar en la votación exprés de replanificación. */
  async voteExpress(planId: string, choice: 'cancel' | 'reschedule' | 'keep'): Promise<void> {
    if (!isApiEnabled) {
      return;
    }

    await apiClient.post(`${endpoints.incidents.byPlan(planId)}/votacion-expres`, { choice });
  },
};
