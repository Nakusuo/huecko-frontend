import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { resumenDemo } from '../lib/adminDemo';
import type { ResumenAdmin } from '../types/admin.types';

const SIMULATED_NETWORK_DELAY_MS = 400;

export const adminService = {
  /** Métricas de la plataforma. En demo, cifras de ejemplo (la página lo avisa). */
  async getResumen(): Promise<ResumenAdmin> {
    if (!isApiEnabled) {
      await new Promise((resolve) => setTimeout(resolve, SIMULATED_NETWORK_DELAY_MS));
      return resumenDemo();
    }
    const { data } = await apiClient.get<ResumenAdmin>(endpoints.admin.resumen);
    return data;
  },
};
