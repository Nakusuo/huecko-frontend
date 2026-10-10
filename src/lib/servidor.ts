import { create } from 'zustand';
import { ApiError, apiClient, isApiEnabled } from './apiClient';

/**
 * Despertar la API antes de usarla.
 *
 * En el plan gratuito de Render la API se duerme tras unos minutos sin uso y
 * puede tardar un par de minutos en volver. Las peticiones normales se rinden a
 * los 15 s (`apiClient`), así que el primer login tras una siesta fallaría.
 * Al cargar la app se lanza un ping con margen amplio; el login espera a ese
 * mismo ping y la pantalla avisa mientras tanto.
 */

export type EstadoServidor = 'demo' | 'sin-comprobar' | 'despertando' | 'listo' | 'sin-respuesta';

/** Un arranque en frío de la API en el plan gratuito (0,1 CPU) puede pasar de un minuto. */
const ESPERA_MAXIMA_MS = 180_000;

const estadoInicial = (): EstadoServidor => (isApiEnabled ? 'sin-comprobar' : 'demo');

export const useEstadoServidor = create<{ estado: EstadoServidor }>(() => ({
  estado: estadoInicial(),
}));

let pingEnCurso: Promise<void> | null = null;

/**
 * Comprueba que la API responde, una sola vez por carga de la app. Nunca
 * rechaza: si no hay respuesta queda `sin-respuesta` y la petición que venga
 * detrás mostrará su propio error. La siguiente llamada vuelve a intentarlo.
 */
export function despertarServidor(): Promise<void> {
  if (!isApiEnabled || useEstadoServidor.getState().estado === 'listo') {
    return Promise.resolve();
  }
  if (pingEnCurso) return pingEnCurso;

  useEstadoServidor.setState({ estado: 'despertando' });
  pingEnCurso = apiClient
    .get('/actuator/health', { timeout: ESPERA_MAXIMA_MS })
    .then(
      () => 'listo' as const,
      // Cualquier respuesta HTTP, aunque sea un error, demuestra que está despierta.
      (error) => (error instanceof ApiError && !error.isNetworkError ? 'listo' : 'sin-respuesta') as EstadoServidor,
    )
    .then((estado) => {
      useEstadoServidor.setState({ estado });
      pingEnCurso = null;
    });
  return pingEnCurso;
}

/** Solo para tests. */
export function reiniciarEstadoServidor(): void {
  pingEnCurso = null;
  useEstadoServidor.setState({ estado: estadoInicial() });
}
