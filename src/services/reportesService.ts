import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { anotarFalloDemo, guardarReporteDemo, type DatosReporte } from '../lib/bandejaDemo';
import type { AuthUser } from '../types/auth.types';

export interface ErrorCliente {
  tipo: string;
  mensaje: string;
  traza: string | null;
  ruta: string;
}

export const reportesService = {
  /** «Reportar un problema». Lanza con el motivo si no se aceptó. */
  async enviarReporte(datos: DatosReporte, autor: AuthUser): Promise<void> {
    if (!isApiEnabled) {
      guardarReporteDemo(datos, autor);
      return;
    }
    await apiClient.post(endpoints.reportes.crear, {
      ...datos,
      emailReportado: datos.tipo === 'CONDUCTA' ? datos.emailReportado?.trim() : undefined,
    });
  },

  /** Error de JavaScript. Nunca lanza: si no se puede avisar, se pierde (reportarlo fallaría igual). */
  async enviarErrorCliente(error: ErrorCliente): Promise<void> {
    try {
      if (!isApiEnabled) {
        anotarFalloDemo(error.tipo, error.mensaje, error.traza, error.ruta);
        return;
      }
      await apiClient.post(endpoints.reportes.errores, error);
    } catch {
      // Silencio a propósito.
    }
  },
};
