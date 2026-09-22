import type { AppNotification } from '../store/notificationStore';

type Notificar = (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;

/**
 * Avisa de las altas que no se pudieron hacer.
 *
 * Lo comparten la creación de un grupo y la edición de integrantes. Antes, en
 * la creación, un correo sin cuenta se descartaba sin decir nada.
 */
export function avisarAltasPendientes(
  notificar: Notificar,
  sinCuenta: string[],
  fallidos: string[],
  groupId: string,
): void {
  if (sinCuenta.length > 0) {
    notificar({
      title: 'No se pudo añadir a todos',
      description: `Sin cuenta en Huecko: ${sinCuenta.join(', ')}. Pídeles que se registren y vuelve a intentarlo.`,
      type: 'system',
      groupId,
    });
  }

  if (fallidos.length > 0) {
    notificar({
      title: 'Algunas altas fallaron',
      description: `No se pudo añadir a ${fallidos.join(', ')}. Inténtalo de nuevo desde «Editar grupo».`,
      type: 'system',
      groupId,
    });
  }
}
