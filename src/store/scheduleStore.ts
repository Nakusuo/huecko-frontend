import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SUBJECT_COLORS, CATEGORY_HEXES } from '../theme/palette';
import { isApiEnabled } from '../lib/apiClient';
import { emptyProgress, fetchSlots, syncSlots, type SyncProgress } from '../services/scheduleService';
import type { TimeSlot } from '../types/schedule.types';

export type { DayOfWeek, TimeSlot } from '../types/schedule.types';

export type ScheduleStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ScheduleState {
  slots: TimeSlot[];
  /** Estado de la sincronización con el backend. En modo demo se queda en 'idle'. */
  status: ScheduleStatus;
  error: string | null;
  lastSyncedAt: string | null;
  /**
   * Ids de los bloques que tienen una operación en curso contra el servidor.
   * Un bloque recién creado lleva aquí un id provisional hasta que responde el
   * POST: editarlo o borrarlo antes mandaría un PUT/DELETE a un id que el
   * servidor no conoce. La página los muestra como "guardando" y no los deja tocar.
   */
  pendientes: string[];
  /*
   * Todas las mutaciones devuelven si el cambio quedó guardado. En modo demo es
   * siempre `true` al instante; con backend se resuelve cuando el servidor
   * responde, y si lo rechaza el cambio ya se ha deshecho y `error` trae su
   * mensaje. Así la página solo dice "guardado" cuando es verdad.
   */
  setSlots: (updater: (prev: TimeSlot[]) => TimeSlot[]) => Promise<boolean>;
  addSlot: (slot: Omit<TimeSlot, 'id'>) => Promise<boolean>;
  addMultipleSlots: (slots: Omit<TimeSlot, 'id'>[]) => Promise<boolean>;
  updateSlot: (id: string, updatedSlot: Partial<TimeSlot>) => Promise<boolean>;
  deleteSlot: (id: string) => Promise<boolean>;
  /** Trae los bloques del backend. No hace nada en modo demo. */
  hydrate: () => Promise<void>;
  clearError: () => void;
  /** Vuelve al estado inicial. Se llama al cerrar sesión. */
  reset: () => void;
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

/** Id provisional para un bloque que aún no tiene el del servidor. */
export function provisionalId(prefix = 'slot'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Quita una aparición de cada id: un bloque puede tener dos operaciones en cola. */
function quitarPendientes(pendientes: string[], ids: string[]): string[] {
  const restantes = [...pendientes];
  for (const id of ids) {
    const i = restantes.indexOf(id);
    if (i >= 0) restantes.splice(i, 1);
  }
  return restantes;
}

function aplicarIdsReales(slots: TimeSlot[], creados: Record<string, string>): TimeSlot[] {
  if (!Object.keys(creados).length) return slots;
  return slots.map((slot) => (creados[slot.id] ? { ...slot, id: creados[slot.id] } : slot));
}

/**
 * Deshace en `actual` lo que el servidor no llegó a aceptar de un cambio
 * `previous → next`, y conserva lo que sí aceptó.
 *
 * Se aplica sobre el estado actual y no se vuelve sin más a `previous` porque
 * entretanto puede haber entrado otro cambio: pisarlo borraría trabajo ajeno.
 * Y se respeta lo ya hecho porque si un lote de cinco bloques falla en el
 * cuarto, los tres primeros existen en el servidor: quitarlos en local los
 * haría reaparecer al recargar, y reintentar los duplicaría.
 */
export function revertirCambio(
  actual: TimeSlot[],
  previous: TimeSlot[],
  next: TimeSlot[],
  progress: SyncProgress
): TimeSlot[] {
  const previousById = new Map(previous.map((slot) => [slot.id, slot]));
  const nextById = new Map(next.map((slot) => [slot.id, slot]));

  const revertidos = actual.flatMap((slot): TimeSlot[] => {
    const antes = previousById.get(slot.id);
    const despues = nextById.get(slot.id);
    if (!antes && despues) {
      const idReal = progress.creados[slot.id];
      return idReal ? [{ ...slot, id: idReal }] : [];
    }
    // Los updaters devuelven el mismo objeto para los bloques que no tocan.
    if (antes && despues && antes !== despues && !progress.actualizados.has(slot.id)) {
      return [antes];
    }
    return [slot];
  });

  const presentes = new Set(revertidos.map((slot) => slot.id));
  for (const antes of previous) {
    if (!nextById.has(antes.id) && !progress.borrados.has(antes.id) && !presentes.has(antes.id)) {
      revertidos.push(antes);
    }
  }
  return revertidos;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => {
      /* Las sincronizaciones van en fila: cada una calcula su diff sobre el
         estado en que la dejó la anterior, y un cambio no adelanta al POST del
         que depende. */
      let cola: Promise<unknown> = Promise.resolve();

      /**
       * Aplica el cambio en local para que la rejilla responda al instante y, si
       * hay backend, lo empuja al servidor. La promesa se resuelve cuando el
       * servidor contesta; si lo rechaza, el cambio se deshace y queda el
       * mensaje en `error`. Antes se daba por bueno sin esperar y un rechazo
       * solo se notaba al recargar, cuando el bloque ya no estaba.
       */
      const applyAndSync = (updater: (prev: TimeSlot[]) => TimeSlot[]): Promise<boolean> => {
        const previous = get().slots;
        const next = updater(previous);

        if (!isApiEnabled) {
          set({ slots: next });
          return Promise.resolve(true);
        }

        const previousById = new Map(previous.map((slot) => [slot.id, slot]));
        const afectados = next
          .filter((slot) => previousById.get(slot.id) !== slot)
          .map((slot) => slot.id);

        set((state) => ({
          slots: next,
          pendientes: [...state.pendientes, ...afectados],
          status: 'loading',
          error: null,
        }));

        const tarea = cola.then(async () => {
          const progress = emptyProgress();
          try {
            await syncSlots(previous, next, progress);
            set((state) => ({
              status: 'ready',
              lastSyncedAt: new Date().toISOString(),
              slots: aplicarIdsReales(state.slots, progress.creados),
              pendientes: quitarPendientes(state.pendientes, afectados),
            }));
            return true;
          } catch (error: unknown) {
            set((state) => ({
              status: 'error',
              error: error instanceof Error ? error.message : 'No se pudo guardar el horario.',
              slots: revertirCambio(state.slots, previous, next, progress),
              pendientes: quitarPendientes(state.pendientes, afectados),
            }));
            return false;
          }
        });
        cola = tarea;
        return tarea;
      };

      /** Red de seguridad por si alguien llama al store sin pasar por la página. */
      const rechazarSiPendiente = (id: string): Promise<boolean> | null => {
        if (!get().pendientes.includes(id)) return null;
        set({ error: 'Este bloque aún se está guardando. Espera un momento e inténtalo de nuevo.' });
        return Promise.resolve(false);
      };

      return {
        // Con backend conectado la rejilla arranca vacía y la llena hydrate().
        slots: isApiEnabled ? [] : INITIAL_SLOTS,
        status: 'idle',
        error: null,
        lastSyncedAt: null,
        pendientes: [],

        setSlots: (updater) => applyAndSync(updater),

        addSlot: (slot) => applyAndSync((prev) => [...prev, { ...slot, id: provisionalId() }]),

        addMultipleSlots: (newSlots) =>
          applyAndSync((prev) => [...prev, ...newSlots.map((s) => ({ ...s, id: provisionalId() }))]),

        updateSlot: (id, updatedSlot) =>
          rechazarSiPendiente(id) ??
          applyAndSync((prev) => prev.map((s) => (s.id === id ? { ...s, ...updatedSlot } : s))),

        deleteSlot: (id) =>
          rechazarSiPendiente(id) ?? applyAndSync((prev) => prev.filter((s) => s.id !== id)),

        hydrate: async () => {
          if (!isApiEnabled) return;

          set({ status: 'loading', error: null });
          try {
            // Si hay cambios en vuelo, se espera a que terminen: si no, la
            // respuesta del GET podría llegar sin ellos y borrarlos de la rejilla.
            await cola;
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

        reset: () =>
          set({
            slots: isApiEnabled ? [] : INITIAL_SLOTS,
            status: 'idle',
            error: null,
            lastSyncedAt: null,
            pendientes: [],
          }),
      };
    },
    {
      name: 'huecko-schedule',
      // El estado de sincronización es efímero: no tiene sentido persistirlo.
      partialize: (state) => ({ slots: state.slots }),
    }
  )
);
