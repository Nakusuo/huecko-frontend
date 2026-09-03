import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'proposal' | 'incident' | 'confirmation' | 'system';
  groupId?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'Nuevo plan propuesto',
    description: 'Se propuso "Reunión de Trabajo de Grado" en el Grupo Universitario.',
    timestamp: 'Hace 10 min',
    read: false,
    type: 'proposal',
    groupId: '1',
  },
  {
    id: 'n2',
    title: 'Falta reportada',
    description: 'María C. reportó un cruce de examen para la reunión de hoy.',
    timestamp: 'Hace 5 min',
    read: false,
    type: 'incident',
    groupId: '1',
  },
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: INITIAL_NOTIFICATIONS,

      addNotification: (notif) =>
        set((state) => ({
          notifications: [
            {
              ...notif,
              id: `notif-${Date.now()}-${Math.random()}`,
              timestamp: 'Ahora mismo',
              read: false,
            },
            ...state.notifications,
          ],
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
    }),
    {
      name: 'huecko-notifications',
    }
  )
);
