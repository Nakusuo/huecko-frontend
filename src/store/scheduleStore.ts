import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SUBJECT_COLORS, CATEGORY_HEXES } from '../theme/palette';

export type DayOfWeek = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

export interface TimeSlot {
  id: string;
  title: string;
  day: DayOfWeek;
  startTime: string; // p. ej. "08:00"
  endTime: string;   // p. ej. "11:00"
  /** Color de la categoría, de `theme/palette`. */
  customColor?: string;
  type?: 'recurrente' | 'puntual';
  tag?: string;
  frequency?: 'semanal' | 'unica';
  specificDate?: string;
  specificEndDate?: string;
  isOcrImported?: boolean;
}

interface ScheduleState {
  slots: TimeSlot[];
  setSlots: (updater: (prev: TimeSlot[]) => TimeSlot[]) => void;
  addSlot: (slot: Omit<TimeSlot, 'id'>) => void;
  addMultipleSlots: (slots: Omit<TimeSlot, 'id'>[]) => void;
  updateSlot: (id: string, updatedSlot: Partial<TimeSlot>) => void;
  deleteSlot: (id: string) => void;
}

/* Horario de ejemplo. Cada categoría lleva un tono distinto a propósito: dos
   categorías del mismo color hacen ilegible la rejilla de un vistazo. */
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
    (set) => ({
      slots: INITIAL_SLOTS,
      setSlots: (updater) =>
        set((state) => ({
          slots: updater(state.slots),
        })),

      addSlot: (slot) =>
        set((state) => ({
          slots: [...state.slots, { ...slot, id: `slot-${Date.now()}-${Math.random()}` }],
        })),

      addMultipleSlots: (newSlots) =>
        set((state) => ({
          slots: [
            ...state.slots,
            ...newSlots.map((s, idx) => ({ ...s, id: `slot-${Date.now()}-${idx}` })),
          ],
        })),

      updateSlot: (id, updatedSlot) =>
        set((state) => ({
          slots: state.slots.map((s) => (s.id === id ? { ...s, ...updatedSlot } : s)),
        })),

      deleteSlot: (id) =>
        set((state) => ({
          slots: state.slots.filter((s) => s.id !== id),
        })),

    }),
    {
      name: 'huecko-schedule',
    }
  )
);
