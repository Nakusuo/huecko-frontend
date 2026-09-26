import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { resumenDemo } from '../lib/adminDemo';
import { cambiarSuspensionDemo, leerCuentasDemo, leerSuspendidasDemo } from './authService';
import type { ResumenAdmin, UsuarioAdmin } from '../types/admin.types';

const SIMULATED_NETWORK_DELAY_MS = 400;
const esperar = () => new Promise((resolve) => setTimeout(resolve, SIMULATED_NETWORK_DELAY_MS));

/**
 * Cuentas del modo demo vistas como en el panel. Son las de este navegador, así
 * que no hay actividad ni grupos que contar: salen a cero.
 */
function usuariosDemo(): UsuarioAdmin[] {
  const suspendidas = leerSuspendidasDemo();
  return leerCuentasDemo()
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      rolSistema: c.rolSistema ?? 'USUARIO',
      creadoEn: c.creado_en,
      suspendido: suspendidas.has(c.id),
      grupos: 0,
      planesPropuestos: 0,
      ultimaActividad: null,
    }))
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
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

  async getUsuarios(): Promise<UsuarioAdmin[]> {
    if (!isApiEnabled) {
      await esperar();
      return usuariosDemo();
    }
    const { data } = await apiClient.get<UsuarioAdmin[]>(endpoints.admin.usuarios);
    return data;
  },

  /** Devuelve la cuenta ya actualizada. Lanza con el motivo si no se pudo. */
  async cambiarSuspension(usuarioId: string, suspendido: boolean): Promise<UsuarioAdmin> {
    if (!isApiEnabled) {
      await esperar();
      cambiarSuspensionDemo(usuarioId, suspendido);
      const cuenta = usuariosDemo().find((u) => u.id === usuarioId);
      if (!cuenta) throw new Error('Esa cuenta no existe.');
      return cuenta;
    }
    const { data } = await apiClient.patch<UsuarioAdmin>(endpoints.admin.suspension(usuarioId), { suspendido });
    return data;
  },
};
