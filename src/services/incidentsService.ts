import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import * as simulador from '../lib/simuladorIncidencias';
import type {
  Ausencia,
  OpcionExpres,
  ResultadoReporte,
  Retraso,
  VotacionExpres,
} from '../types/incidents.types';

/**
 * Módulos 4 y 5 contra el backend.
 *
 * En modo demo (`VITE_API_URL` vacía) responde `simuladorIncidencias`, que
 * aplica las mismas reglas que el servidor. Antes devolvía valores vacíos y el
 * demo tenía su propia versión de las reglas, distinta de la real.
 */

export const incidentsService = {
  /* --- Módulo 4 --- */

  /** RF-12: avisar de un retraso. Repetir corrige la estimación. */
  async reportarRetraso(planId: string, minutosEstimados: number): Promise<Retraso | null> {
    if (!isApiEnabled) return simulador.reportarRetraso(planId, minutosEstimados);
    const { data } = await apiClient.put<Retraso>(
      endpoints.incidents.miRetraso(planId),
      { minutosEstimados },
    );
    return data;
  },

  /** RF-14: quién llega tarde y cuánto. */
  async listarRetrasos(planId: string): Promise<Retraso[]> {
    if (!isApiEnabled) return simulador.listarRetrasos(planId);
    const { data } = await apiClient.get<Retraso[]>(endpoints.incidents.retrasos(planId));
    return data;
  },

  async retirarRetraso(planId: string): Promise<void> {
    if (!isApiEnabled) return simulador.retirarRetraso(planId);
    await apiClient.delete(endpoints.incidents.miRetraso(planId));
  },

  /* --- Módulo 5 --- */

  /**
   * RF-15 y RF-16: reportar que no podré ir.
   *
   * La respuesta dice si la ausencia abrió una votación exprés o solo se
   * informó. El cliente no decide eso: las reglas viven en el servidor.
   */
  async reportarImprevisto(planId: string, motivo: string): Promise<ResultadoReporte | null> {
    if (!isApiEnabled) return simulador.reportarImprevisto(planId, motivo);
    const { data } = await apiClient.post<ResultadoReporte>(
      endpoints.incidents.imprevistos(planId),
      { motivo: motivo.trim() || null },
    );
    return data;
  },

  /**
   * La votación exprés abierta de un plan, si la hay.
   *
   * El backend devuelve 204 cuando no hay ninguna, porque no encontrarla es el
   * caso normal. Axios entrega `''` en ese caso, de ahí la comprobación.
   */
  async votacionAbierta(planId: string): Promise<VotacionExpres | null> {
    if (!isApiEnabled) return simulador.votacionAbierta(planId);
    const { data, status } = await apiClient.get<VotacionExpres | ''>(
      endpoints.incidents.votacionExpres(planId),
    );
    if (status === 204 || !data) return null;
    return data;
  },

  /** Quién avisó de que no irá. */
  async listarAusencias(planId: string): Promise<Ausencia[]> {
    if (!isApiEnabled) return simulador.listarAusencias(planId);
    const { data } = await apiClient.get<Ausencia[]>(endpoints.incidents.ausencias(planId));
    return data;
  },

  /** RF-17: votar. Cambiar de opinión sustituye el voto anterior. */
  async votarExpres(planId: string, opcion: OpcionExpres): Promise<VotacionExpres | null> {
    if (!isApiEnabled) return simulador.votarExpres(planId, opcion);
    const { data } = await apiClient.put<VotacionExpres>(
      endpoints.incidents.votoExpres(planId),
      { opcion },
    );
    return data;
  },
};
