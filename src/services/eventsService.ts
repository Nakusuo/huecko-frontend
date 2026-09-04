import { apiClient, isApiEnabled } from '../lib/apiClient';
import type { PlanProposal } from '../types/groups.types';

export const eventsService = {
  /**
   * Obtiene eventos, planes y propuestas de un grupo.
   */
  async getGroupEvents(groupId: string): Promise<PlanProposal[]> {
    if (!isApiEnabled) {
      return [];
    }

    try {
      const { data } = await apiClient.get<PlanProposal[]>(`/groups/${groupId}/events`);
      return data;
    } catch (error) {
      console.warn('[eventsService] Error al obtener eventos del grupo:', error);
      throw error;
    }
  },

  /**
   * Crea una propuesta de plan con 2 a 5 ventanas sugeridas.
   */
  async createProposal(
    groupId: string,
    payload: {
      titulo: string;
      lugar?: string;
      fecha_cierre?: string;
      ventanas: Array<{ dia: string; hora_inicio: string; hora_fin: string }>;
    }
  ): Promise<PlanProposal> {
    if (!isApiEnabled) {
      throw new Error('API no habilitada.');
    }

    const { data } = await apiClient.post<PlanProposal>(`/groups/${groupId}/events`, payload);
    return data;
  },

  /**
   * Emite un voto por una ventana sugerida.
   */
  async voteWindow(eventId: string, windowId: string): Promise<void> {
    if (!isApiEnabled) {
      return;
    }

    await apiClient.post(`/events/${eventId}/votes`, { window_id: windowId });
  },

  /**
   * Cierra la votación de una propuesta y confirma la ventana ganadora.
   */
  async closeVoting(eventId: string): Promise<void> {
    if (!isApiEnabled) {
      return;
    }

    await apiClient.post(`/events/${eventId}/close-voting`);
  },

  /**
   * Reporta retraso en minutos para un evento en curso o próximo.
   */
  async reportDelay(eventId: string, minutes: number): Promise<void> {
    if (!isApiEnabled) {
      return;
    }

    await apiClient.post(`/events/${eventId}/delays`, { minutes });
  },

  /**
   * Reporta un imprevisto / incidencia.
   */
  async reportIncident(
    eventId: string,
    payload: { reason?: string; type?: 'falta' | 'tardanza' | 'imprevisto' }
  ): Promise<{ criticidad: 'BAJA' | 'MEDIA' | 'ALTA'; expressVoteId?: string }> {
    if (!isApiEnabled) {
      return { criticidad: 'MEDIA' };
    }

    const { data } = await apiClient.post(`/events/${eventId}/incidents`, payload);
    return data;
  },

  /**
   * Emite un voto en una votación exprés de replanificación.
   */
  async voteExpress(
    expressVoteId: string,
    choice: 'cancel' | 'reschedule' | 'keep'
  ): Promise<void> {
    if (!isApiEnabled) {
      return;
    }

    await apiClient.post(`/express-votes/${expressVoteId}/votes`, { choice });
  },
};
