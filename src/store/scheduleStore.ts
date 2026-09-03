import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DayOfWeek = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

export interface TimeSlot {
  id: string;
  title: string;
  day: DayOfWeek;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "11:00"
  colorClass: string;
  textColorClass: string;
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
