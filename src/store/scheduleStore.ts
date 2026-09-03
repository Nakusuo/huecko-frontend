import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { scheduleService } from '../services/scheduleService';
import {
  type DayOfWeek,
  type TimeSlot,
} from '../types/schedule.types';

export type { DayOfWeek, TimeSlot };

interface ScheduleState {
  slots: TimeSlot[];
  draftSlots: TimeSlot[];
  isLoading: boolean;
  isSynced: boolean;
  syncError: string | null;

  setSlots: (updater: (prev: TimeSlot[]) => TimeSlot[]) => void;
  fetchSchedule: (userId?: string) => Promise<void>;
  addSlot: (slot: Omit<TimeSlot, 'id'>, userId?: string) => Promise<TimeSlot>;
  addMultipleSlots: (slots: Omit<TimeSlot, 'id'>[], userId?: string) => Promise<void>;
  updateSlot: (id: string, updatedSlot: Partial<TimeSlot>, userId?: string) => Promise<void>;
  deleteSlot: (id: string, userId?: string) => Promise<void>;
  confirmDraftSlot: (id: string, updatedSlot: Partial<TimeSlot>, userId?: string) => Promise<void>;
}

const INITIAL_SLOTS: TimeSlot[] = [
  { id: '1', title: 'Universidad - Algoritmos', day: 'Lun', startTime: '08:00', endTime: '11:00', colorClass: '', textColorClass: '', customColor: '#f59e0b', type: 'recurrente', frequency: 'semanal', tag: 'Clase' },
  { id: '2', title: 'Turno Laboral', day: 'Mar', startTime: '10:00', endTime: '14:00', colorClass: '', textColorClass: '', customColor: '#3b82f6', type: 'recurrente', frequency: 'semanal', tag: 'Trabajo' },
  { id: '3', title: 'Universidad - Cálculo Avanzado', day: 'Mié', startTime: '08:00', endTime: '10:00', colorClass: '', textColorClass: '', customColor: '#f59e0b', type: 'recurrente', frequency: 'semanal', tag: 'Clase' },
  { id: '4', title: 'Gimnasio & Entrenamiento', day: 'Mié', startTime: '13:00', endTime: '15:30', colorClass: '', textColorClass: '', customColor: '#10b981', type: 'recurrente', frequency: 'semanal', tag: 'Personal' },
  { id: '5', title: 'Turno Laboral', day: 'Jue', startTime: '10:00', endTime: '14:00', colorClass: '', textColorClass: '', customColor: '#3b82f6', type: 'recurrente', frequency: 'semanal', tag: 'Trabajo' },
  { id: '6', title: 'Universidad - Redes', day: 'Vie', startTime: '08:00', endTime: '11:00', colorClass: '', textColorClass: '', customColor: '#f59e0b', type: 'recurrente', frequency: 'semanal', tag: 'Clase' },
];

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      slots: INITIAL_SLOTS,
      draftSlots: [],
      isLoading: false,
      isSynced: false,
      syncError: null,

      setSlots: (updater) =>
        set((state) => ({
          slots: updater(state.slots),
        })),

      fetchSchedule: async (userId = '') => {
        set({ isLoading: true, syncError: null });
        try {
          const [confirmed, drafts] = await Promise.all([
            scheduleService.getConfirmedBlocks(userId),
            scheduleService.getDraftBlocks(userId).catch(() => []),
          ]);

          if (confirmed.length > 0) {
            set({ slots: confirmed, draftSlots: drafts, isSynced: true, isLoading: false });
          } else {
            set({ draftSlots: drafts, isSynced: true, isLoading: false });
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Error al sincronizar con el servidor';
          set({ syncError: msg, isLoading: false });
        }
      },

      addSlot: async (slot, userId = '') => {
        set({ syncError: null });
        try {
          const created = await scheduleService.createBlock(userId, slot);
          set((state) => ({
            slots: [...state.slots, created],
          }));
          return created;
        } catch (error) {
          // Fallback local
          const fallbackId = `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const fallbackSlot: TimeSlot = { ...slot, id: fallbackId };
          set((state) => ({
            slots: [...state.slots, fallbackSlot],
          }));
          return fallbackSlot;
        }
      },

      addMultipleSlots: async (newSlots, userId = '') => {
        for (const slot of newSlots) {
          await get().addSlot(slot, userId);
        }
      },

      updateSlot: async (id, updatedSlot, userId = '') => {
        try {
          const updated = await scheduleService.updateBlock(userId, id, updatedSlot);
          set((state) => ({
            slots: state.slots.map((s) => (s.id === id ? { ...s, ...updated } : s)),
          }));
        } catch {
          set((state) => ({
            slots: state.slots.map((s) => (s.id === id ? { ...s, ...updatedSlot } : s)),
          }));
        }
      },

      deleteSlot: async (id, userId = '') => {
        try {
          await scheduleService.deleteBlock(userId, id);
        } catch {
          // Continúa borrado local en caso de desconexión
        }
        set((state) => ({
          slots: state.slots.filter((s) => s.id !== id),
        }));
      },

      confirmDraftSlot: async (id, updatedSlot, userId = '') => {
        try {
          const confirmed = await scheduleService.updateBlock(userId, id, {
            ...updatedSlot,
            estado: 'confirmado',
          });
          set((state) => ({
            draftSlots: state.draftSlots.filter((d) => d.id !== id),
            slots: [...state.slots, confirmed],
          }));
        } catch {
          set((state) => ({
            draftSlots: state.draftSlots.filter((d) => d.id !== id),
            slots: [...state.slots, { ...updatedSlot, id, estado: 'confirmado' } as TimeSlot],
          }));
        }
      },
    }),
    {
      name: 'huecko-schedule',
      partialize: (state) => ({ slots: state.slots }),
    }
  )
);
