import { apiClient } from '../lib/apiClient';
import { limpiarCodigo } from './authService';
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

/* --- Por correo: el código de 4 caracteres llega al correo de la cuenta. --- */

/** Manda el primer código al correo. No activa nada hasta `activarDosPasosCorreo`. */
export async function iniciarDosPasosCorreo(): Promise<void> {
  await apiClient.post('/me/dos-pasos/correo/iniciar');
}

/** Con el código del correo queda activa por correo. Devuelve los códigos de respaldo. */
export async function activarDosPasosCorreo(codigo: string): Promise<string[]> {
  const { data } = await apiClient.post<{ codigosRespaldo: string[] }>('/me/dos-pasos/correo/activar', {
    codigo: limpiarCodigo(codigo),
  });
  return data.codigosRespaldo;
}

/**
 * Ya activa por correo: manda un código para confirmar otra acción
 * (regenerar los códigos de respaldo o desactivar).
 */
export async function enviarCodigoDosPasos(): Promise<void> {
  await apiClient.post('/me/dos-pasos/enviar-codigo');
}
