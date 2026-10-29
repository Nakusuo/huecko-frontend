import { apiClient } from '../lib/apiClient';
import type { ConfiguracionDosPasos, EstadoDosPasos } from '../types/auth.types';

/**
 * Verificación en dos pasos de la propia cuenta (`/api/me/dos-pasos`). Solo
 * con backend: en el modo demo no hay servidor que compruebe los códigos.
 */

export async function estadoDosPasos(): Promise<EstadoDosPasos> {
  const { data } = await apiClient.get<EstadoDosPasos>('/me/dos-pasos');
  return data;
}

/** Secreto nuevo y dirección del QR. No activa nada hasta `activarDosPasos`. */
export async function iniciarDosPasos(): Promise<ConfiguracionDosPasos> {
  const { data } = await apiClient.post<ConfiguracionDosPasos>('/me/dos-pasos/iniciar');
  return data;
}

/** Con el primer código de la app queda activa. Devuelve los códigos de respaldo (solo se ven ahora). */
export async function activarDosPasos(codigo: string): Promise<string[]> {
  const { data } = await apiClient.post<{ codigosRespaldo: string[] }>('/me/dos-pasos/activar', {
    codigo: codigo.trim(),
  });
  return data.codigosRespaldo;
}

/** Otros 10 códigos de respaldo; los anteriores dejan de valer. */
export async function regenerarCodigosRespaldo(codigo: string): Promise<string[]> {
  const { data } = await apiClient.post<{ codigosRespaldo: string[] }>('/me/dos-pasos/codigos-respaldo', {
    codigo: codigo.trim(),
  });
  return data.codigosRespaldo;
}

export async function desactivarDosPasos(password: string, codigo: string): Promise<void> {
  await apiClient.post('/me/dos-pasos/desactivar', { password, codigo: codigo.trim() });
}
