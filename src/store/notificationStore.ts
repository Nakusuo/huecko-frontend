import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { esFechaValida } from '../lib/tiempoRelativo';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  /**
   * Cuándo llegó, en ISO. El texto («Hace 5 min») se calcula al pintar con
   * `tiempoRelativo`: guardarlo ya formateado lo congelaba para siempre.
   */
  timestamp: string;
  read: boolean;
  type: 'proposal' | 'incident' | 'confirmation' | 'system';
  groupId?: string;
}

/**
 * Tope de avisos guardados. La bandeja se persiste en localStorage y antes
 * crecía sin límite: se conservan los más recientes.
 */
export const MAX_NOTIFICACIONES = 50;

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  /** Descarta un aviso de la bandeja. */
  clearNotification: (id: string) => void;
  /** Vacía la bandeja. Se llama al cambiar de cuenta: los avisos son de quien los recibió. */
  reset: () => void;
}

/* No hay avisos de ejemplo. Los que había («María C. reportó un cruce…») eran
   inventados, salían desordenados y, en demo, `reset` los volvía a meter como
   no leídos cada vez que se cambiaba de cuenta. */

/**
 * Pasa lo persistido por versiones anteriores al formato actual: `timestamp`
 * era un texto fijo («Ahora mismo», «Hace 10 min»). Se convierte a ISO
 * estimando la hora cuando el texto lo permite; si no, se toma la de ahora
 * (al menos a partir de aquí envejece). Los avisos de ejemplo se descartan.
 */
export function migrarNotificaciones(guardadas: unknown, ahora: Date = new Date()): AppNotification[] {
  if (!Array.isArray(guardadas)) return [];

  return guardadas
    .filter((n): n is AppNotification => !!n && typeof n === 'object' && typeof (n as AppNotification).id === 'string')
    .filter((n) => n.id !== 'n1' && n.id !== 'n2')
    .map((n) => {
      if (esFechaValida(n.timestamp)) return n;
      const minutos = /hace\s+(\d+)\s*min/i.exec(String(n.timestamp ?? ''));
      const fecha = new Date(ahora.getTime() - (minutos ? Number(minutos[1]) * 60_000 : 0));
      return { ...n, timestamp: fecha.toISOString() };
    })
    .slice(0, MAX_NOTIFICACIONES);
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],

      addNotification: (notif) =>
        set((state) => ({
          notifications: [
            {
              ...notif,
              id: `notif-${Date.now()}-${Math.random()}`,
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...state.notifications,
          ].slice(0, MAX_NOTIFICACIONES),
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      reset: () => set({ notifications: [] }),
    }),
    {
      name: 'huecko-notifications',
      version: 1,
      migrate: (persistido) => ({
        notifications: migrarNotificaciones((persistido as { notifications?: unknown } | null)?.notifications),
      }),
    }
  )
);
