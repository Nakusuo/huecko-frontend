import type { AppNotification } from '../store/notificationStore';

type Notificar = (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;

/**
 * Avisa de las altas que no se pudieron hacer.
 *
 * Lo comparten la creación de un grupo y la edición de integrantes. Antes, en
 * la creación, un correo sin cuenta se descartaba sin decir nada.
 *
 * `soyOrganizador` decide qué se propone hacer después: reintentar desde
 * «Integrantes y ajustes» solo lo puede quien organiza el grupo; al resto el
 * backend le respondería 403. Por defecto `true`: hoy solo avisan quien
 * acaba de crear el grupo (onboarding, «Crear grupo») y quien lo organiza.
 */
export function avisarAltasPendientes(
  notificar: Notificar,
  sinCuenta: string[],
  fallidos: string[],
  groupId: string,
  soyOrganizador = true,
): void {
  if (sinCuenta.length > 0) {
    notificar({
      title: 'No se pudo añadir a todos',
      description: soyOrganizador
        ? `Sin cuenta en Huecko: ${sinCuenta.join(', ')}. Pídeles que se registren y vuelve a intentarlo.`
        : `Sin cuenta en Huecko: ${sinCuenta.join(', ')}. Cuando se registren, quien organiza el grupo puede añadirles.`,
      type: 'system',
      groupId,
    });
  }

  if (fallidos.length > 0) {
    notificar({
      title: 'Algunas altas fallaron',
      description: soyOrganizador
        ? `No se pudo añadir a ${fallidos.join(', ')}. Inténtalo de nuevo desde «Integrantes y ajustes».`
        : `No se pudo añadir a ${fallidos.join(', ')}. Pídele a quien organiza el grupo que lo vuelva a intentar.`,
      type: 'system',
      groupId,
    });
  }
}
