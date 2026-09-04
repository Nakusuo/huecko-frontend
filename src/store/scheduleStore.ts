import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SUBJECT_COLORS, CATEGORY_HEXES } from '../theme/palette';
import { isApiEnabled } from '../lib/apiClient';
import { fetchSlots, syncSlots } from '../services/scheduleService';
import type { TimeSlot } from '../types/schedule.types';

export type { DayOfWeek, TimeSlot } from '../types/schedule.types';

export type ScheduleStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ScheduleState {
  slots: TimeSlot[];
  /** Estado de la sincronización con el backend. En modo demo se queda en 'idle'. */
  status: ScheduleStatus;
  error: string | null;
  lastSyncedAt: string | null;
  setSlots: (updater: (prev: TimeSlot[]) => TimeSlot[]) => void;
  addSlot: (slot: Omit<TimeSlot, 'id'>) => void;
  addMultipleSlots: (slots: Omit<TimeSlot, 'id'>[]) => void;
  updateSlot: (id: string, updatedSlot: Partial<TimeSlot>) => void;
  deleteSlot: (id: string) => void;
  /** Trae los bloques del backend. No hace nada en modo demo. */
  hydrate: () => Promise<void>;
  clearError: () => void;
}

/* Horario de ejemplo. Cada categoría lleva un tono distinto a propósito: dos
   categorías del mismo color hacen ilegible la rejilla de un vistazo.
   Solo se usa en modo demo; con backend conectado, `hydrate()` lo reemplaza. */
const CLASE_ALGORITMOS = SUBJECT_COLORS.algoritmos; // Ciruela
const CLASE_CALCULO = SUBJECT_COLORS.calculo; // Pizarra
const CLASE_REDES = SUBJECT_COLORS.redes; // Bosque
const TRABAJO = CATEGORY_HEXES[7]; // Cobre
const PERSONAL = CATEGORY_HEXES[5]; // Terracota

const INITIAL_SLOTS: TimeSlot[] = [
  { id: '1', title: 'Universidad - Algoritmos', day: 'Lun', startTime: '08:00', endTime: '11:00', customColor: CLASE_ALGORITMOS, type: 'recurrente', frequency: 'semanal', tag: 'Clase' },
  { id: '2', title: 'Turno Laboral', day: 'Mar', startTime: '10:00', endTime: '14:00', customColor: TRABAJO, type: 'recurrente', frequency: 'semanal', tag: 'Trabajo' },
  { id: '3', title: 'Universidad - Cálculo Avanzado', day: 'Mié', startTime: '08:00', endTime: '10:00', customColor: CLASE_CALCULO, type: 'recurrente', frequency: 'semanal', tag: 'Clase' },
  { id: '4', title: 'Gimnasio & Entrenamiento', day: 'Mié', startTime: '13:00', endTime: '15:30', customColor: PERSONAL, type: 'recurrente', frequency: 'semanal', tag: 'Personal' },
  { id: '5', title: 'Turno Laboral', day: 'Jue', startTime: '10:00', endTime: '14:00', customColor: TRABAJO, type: 'recurrente', frequency: 'semanal', tag: 'Trabajo' },
  { id: '6', title: 'Universidad - Redes', day: 'Vie', startTime: '08:00', endTime: '11:00', customColor: CLASE_REDES, type: 'recurrente', frequency: 'semanal', tag: 'Clase' },
];

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => {
      /**
       * Aplica el cambio en local (la rejilla responde al instante) y, si hay
       * backend, lo empuja en segundo plano. Los ids provisionales que crea el
       * cliente se reemplazan por los que devuelve el servidor.
       */
      const applyAndSync = (updater: (prev: TimeSlot[]) => TimeSlot[]) => {
        const previous = get().slots;
        const next = updater(previous);
        set({ slots: next });

        if (!isApiEnabled) return;

        set({ status: 'loading', error: null });
        void syncSlots(previous, next)
          .then((idMap) => {
            set((state) => ({
              status: 'ready',
              lastSyncedAt: new Date().toISOString(),
              slots: Object.keys(idMap).length
                ? state.slots.map((slot) =>
                    idMap[slot.id] ? { ...slot, id: idMap[slot.id] } : slot
                  )
                : state.slots,
            }));
          })
          .catch((error: unknown) => {
            set({
              status: 'error',
              error: error instanceof Error ? error.message : 'No se pudo guardar el horario.',
            });
          });
      };

      return {
        // Con backend conectado la rejilla arranca vacía y la llena hydrate().
        slots: isApiEnabled ? [] : INITIAL_SLOTS,
        status: 'idle',
        error: null,
        lastSyncedAt: null,

        setSlots: (updater) => applyAndSync(updater),

        addSlot: (slot) =>
          applyAndSync((prev) => [...prev, { ...slot, id: `slot-${Date.now()}-${Math.random()}` }]),

        addMultipleSlots: (newSlots) =>
          applyAndSync((prev) => [
            ...prev,
            ...newSlots.map((s, idx) => ({ ...s, id: `slot-${Date.now()}-${idx}` })),
          ]),

        updateSlot: (id, updatedSlot) =>
          applyAndSync((prev) => prev.map((s) => (s.id === id ? { ...s, ...updatedSlot } : s))),

        deleteSlot: (id) => applyAndSync((prev) => prev.filter((s) => s.id !== id)),

        hydrate: async () => {
          if (!isApiEnabled) return;

          set({ status: 'loading', error: null });
          try {
            const slots = await fetchSlots(get().slots);
            set({ slots, status: 'ready', lastSyncedAt: new Date().toISOString() });
          } catch (error: unknown) {
            set({
              status: 'error',
              error: error instanceof Error ? error.message : 'No se pudo cargar el horario.',
            });
          }
        },

        clearError: () => set({ error: null }),
      };
    },
    {
      name: 'huecko-schedule',
      // El estado de sincronización es efímero: no tiene sentido persistirlo.
      partialize: (state) => ({ slots: state.slots }),
    }
  )
);
