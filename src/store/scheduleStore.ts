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
}

interface ScheduleState {
  slots: TimeSlot[];
  addSlot: (slot: Omit<TimeSlot, 'id'>) => void;
  addMultipleSlots: (slots: Omit<TimeSlot, 'id'>[]) => void;
  updateSlot: (id: string, updatedSlot: Partial<TimeSlot>) => void;
  deleteSlot: (id: string) => void;
  importMockCalendar: () => void;
}

const INITIAL_SLOTS: TimeSlot[] = [
  { id: '1', title: 'Universidad', day: 'Lun', startTime: '08:00', endTime: '11:00', colorClass: '', textColorClass: '', customColor: '#f59e0b' },
  { id: '2', title: 'Trabajo', day: 'Mar', startTime: '10:00', endTime: '14:00', colorClass: '', textColorClass: '', customColor: '#3b82f6' },
  { id: '3', title: 'Universidad', day: 'Mié', startTime: '08:00', endTime: '10:00', colorClass: '', textColorClass: '', customColor: '#f59e0b' },
  { id: '4', title: 'Gimnasio', day: 'Mié', startTime: '13:00', endTime: '15:30', colorClass: '', textColorClass: '', customColor: '#10b981' },
  { id: '5', title: 'Trabajo', day: 'Jue', startTime: '10:00', endTime: '14:00', colorClass: '', textColorClass: '', customColor: '#3b82f6' },
  { id: '6', title: 'Universidad', day: 'Vie', startTime: '08:00', endTime: '11:00', colorClass: '', textColorClass: '', customColor: '#f59e0b' },
];

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      slots: INITIAL_SLOTS,

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

      importMockCalendar: () =>
        set((state) => {
          const imported: TimeSlot[] = [
            { id: `imp-1-${Date.now()}`, title: 'Estudio de Proyecto', day: 'Mar', startTime: '16:00', endTime: '18:00', colorClass: '', textColorClass: '', customColor: '#ec4899' },
            { id: `imp-2-${Date.now()}`, title: 'Reunión Familiar', day: 'Sáb', startTime: '11:00', endTime: '14:00', colorClass: '', textColorClass: '', customColor: '#8b5cf6' },
          ];
          return { slots: [...state.slots, ...imported] };
        }),
    }),
    {
      name: 'huecko-schedule',
    }
  )
);
