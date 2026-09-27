import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { resumenDemo } from '../lib/adminDemo';
import {
  cambiarEstadoFalloDemo,
  cambiarEstadoReporteDemo,
  leerFallosDemo,
  leerReportesDemo,
  suspensionDesdeReporteDemo,
} from '../lib/bandejaDemo';
import type {
  EstadoRevision,
  FalloAdmin,
  NivelLog,
  PaginaLogs,
  PendientesAdmin,
  PropiedadConfig,
  ReporteAdmin,
  ResumenAdmin,
  SaludAdmin,
} from '../types/admin.types';

const SIMULATED_NETWORK_DELAY_MS = 400;
const esperar = () => new Promise((resolve) => setTimeout(resolve, SIMULATED_NETWORK_DELAY_MS));

/** Salud y consola miden un servidor: sin él no hay nada honesto que enseñar. */
export class SinServidorError extends Error {
  constructor() {
    super('Esta sección necesita el backend conectado.');
    this.name = 'SinServidorError';
  }
}

function exigirServidor(): void {
  if (!isApiEnabled) throw new SinServidorError();
}

export const adminService = {
  /** Métricas de la plataforma. En demo, cifras de ejemplo (la página lo avisa). */
  async getResumen(): Promise<ResumenAdmin> {
    if (!isApiEnabled) {
      await esperar();
      return resumenDemo();
    }
    const { data } = await apiClient.get<ResumenAdmin>(endpoints.admin.resumen);
    return data;
  },

  /** Fallos y reportes nuevos, para los contadores de la barra. */
  async getPendientes(): Promise<PendientesAdmin> {
    if (!isApiEnabled) {
      return {
        fallosNuevos: leerFallosDemo().filter((f) => f.estado === 'NUEVO').length,
        reportesNuevos: leerReportesDemo().filter((r) => r.estado === 'NUEVO').length,
      };
    }
    const { data } = await apiClient.get<PendientesAdmin>(endpoints.admin.pendientes);
    return data;
  },

  async getSalud(): Promise<SaludAdmin> {
    exigirServidor();
    const { data } = await apiClient.get<SaludAdmin>(endpoints.admin.salud);
    return data;
  },

  async getFallos(): Promise<FalloAdmin[]> {
    if (!isApiEnabled) {
      await esperar();
      return leerFallosDemo();
    }
    const { data } = await apiClient.get<FalloAdmin[]>(endpoints.admin.fallos);
    return data;
  },

  async cambiarEstadoFallo(id: string, estado: EstadoRevision): Promise<FalloAdmin> {
    if (!isApiEnabled) return cambiarEstadoFalloDemo(id, estado);
    const { data } = await apiClient.patch<FalloAdmin>(endpoints.admin.estadoFallo(id), { estado });
    return data;
  },

  async getReportes(): Promise<ReporteAdmin[]> {
    if (!isApiEnabled) {
      await esperar();
      return leerReportesDemo();
    }
    const { data } = await apiClient.get<ReporteAdmin[]>(endpoints.admin.reportes);
    return data;
  },

  async cambiarEstadoReporte(id: string, estado: EstadoRevision): Promise<ReporteAdmin> {
    if (!isApiEnabled) return cambiarEstadoReporteDemo(id, estado);
    const { data } = await apiClient.patch<ReporteAdmin>(endpoints.admin.estadoReporte(id), { estado });
    return data;
  },

  /** La única acción sobre una cuenta: la que señala un reporte de conducta. */
  async suspensionDesdeReporte(id: string, suspendido: boolean): Promise<ReporteAdmin> {
    if (!isApiEnabled) {
      await esperar();
      return suspensionDesdeReporteDemo(id, suspendido);
    }
    const { data } = await apiClient.patch<ReporteAdmin>(endpoints.admin.suspensionReporte(id), { suspendido });
    return data;
  },

  async getLogs(desde: number, nivel: NivelLog): Promise<PaginaLogs> {
    exigirServidor();
    const { data } = await apiClient.get<PaginaLogs>(endpoints.admin.logs, { params: { desde, nivel } });
    return data;
  },

  async getConfiguracion(): Promise<PropiedadConfig[]> {
    exigirServidor();
    const { data } = await apiClient.get<PropiedadConfig[]>(endpoints.admin.configuracion);
    return data;
  },
};
