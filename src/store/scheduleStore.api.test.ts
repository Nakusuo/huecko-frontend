import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimeSlot } from '../types/schedule.types';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/**
 * `scheduleStore` con backend conectado.
 *
 * Lo que se prueba es lo que antes fallaba en silencio: un rechazo del servidor
 * dejaba el bloque pintado con un aviso de éxito, y desaparecía al recargar.
 * Las llamadas HTTP se sustituyen en el propio `apiClient`.
 */
vi.stubEnv('VITE_API_URL', '/api');
instalarAlmacenamientoEnMemoria();

const { useScheduleStore } = await import('./scheduleStore');
const { useAuthStore } = await import('./authStore');
const { apiClient, ApiError } = await import('../lib/apiClient');

const BASE: Omit<TimeSlot, 'id' | 'title' | 'day'> = {
  startTime: '08:00',
  endTime: '10:00',
  type: 'recurrente',
  frequency: 'semanal',
};

const existente: TimeSlot = { id: 'srv-1', title: 'Álgebra', day: 'Lun', ...BASE };

type Llamada = { metodo: string; url: string; cuerpo?: unknown };
let llamadas: Llamada[] = [];

/** Responde a los POST con ids del servidor y falla en el que se indique (1 = el primero). */
function simularServidor({ fallarPostNumero }: { fallarPostNumero?: number } = {}) {
  let posts = 0;
  llamadas = [];
  apiClient.post = (async (url: string, cuerpo: unknown) => {
    posts += 1;
    llamadas.push({ metodo: 'POST', url, cuerpo });
    if (posts === fallarPostNumero) throw new ApiError('El bloque se cruza con otro ya registrado', 409);
    return { data: { id: `srv-nuevo-${posts}` } };
  }) as typeof apiClient.post;
  apiClient.put = (async (url: string, cuerpo: unknown) => {
    llamadas.push({ metodo: 'PUT', url, cuerpo });
    throw new ApiError('No tienes permiso para editar este bloque', 403);
  }) as typeof apiClient.put;
  apiClient.delete = (async (url: string) => {
    llamadas.push({ metodo: 'DELETE', url });
    return { data: null };
  }) as typeof apiClient.delete;
}

const ids = () => useScheduleStore.getState().slots.map((s) => s.id);

describe('scheduleStore (con backend)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'u-1', nombre: 'Alex', email: 'a@b.c', creado_en: 'x' }, token: 't' });
    useScheduleStore.getState().reset();
    useScheduleStore.setState({ slots: [existente] });
  });

  it('un alta se da por buena solo cuando responde el servidor, con su id', async () => {
    simularServidor();
    const guardado = useScheduleStore.getState().addSlot({ title: 'Física', day: 'Mar', ...BASE });

    // Mientras el POST está en curso el bloque se ve, pero marcado como pendiente.
    const provisional = ids()[1];
    expect(useScheduleStore.getState().pendientes).toContain(provisional);

    expect(await guardado).toBe(true);
    expect(ids()).toEqual(['srv-1', 'srv-nuevo-1']);
    expect(useScheduleStore.getState().pendientes).toEqual([]);
  });

  it('si el servidor rechaza el alta, se deshace y queda su mensaje', async () => {
    simularServidor({ fallarPostNumero: 1 });
    const guardado = await useScheduleStore.getState().addSlot({ title: 'Física', day: 'Lun', ...BASE });

    expect(guardado).toBe(false);
    expect(ids()).toEqual(['srv-1']);
    expect(useScheduleStore.getState().error).toBe('El bloque se cruza con otro ya registrado');
  });

  it('una edición rechazada vuelve a la versión anterior', async () => {
    simularServidor();
    const guardado = await useScheduleStore.getState().updateSlot('srv-1', { title: 'Álgebra II' });

    expect(guardado).toBe(false);
    expect(useScheduleStore.getState().slots[0].title).toBe('Álgebra');
    expect(useScheduleStore.getState().error).toMatch(/permiso/);
  });

  it('si un lote falla a mitad, conserva los bloques que sí se crearon', async () => {
    simularServidor({ fallarPostNumero: 3 });
    const guardado = await useScheduleStore.getState().addMultipleSlots([
      { title: 'A', day: 'Mar', ...BASE },
      { title: 'B', day: 'Mié', ...BASE },
      { title: 'C', day: 'Jue', ...BASE },
      { title: 'D', day: 'Vie', ...BASE },
    ]);

    expect(guardado).toBe(false);
    // A y B existen en el servidor: quitarlos haría que reaparecieran al recargar.
    expect(ids()).toEqual(['srv-1', 'srv-nuevo-1', 'srv-nuevo-2']);
  });

  it('no deja editar ni borrar un bloque cuyo POST sigue en curso', async () => {
    simularServidor();
    const alta = useScheduleStore.getState().addSlot({ title: 'Física', day: 'Mar', ...BASE });
    const provisional = ids()[1];

    expect(await useScheduleStore.getState().deleteSlot(provisional)).toBe(false);
    await alta;
    expect(llamadas.filter((l) => l.metodo === 'DELETE')).toEqual([]);
    expect(ids()).toEqual(['srv-1', 'srv-nuevo-1']);
  });

  it('un bloque confirmado desde el borrador OCR se envía con confirmado: true', async () => {
    simularServidor();
    await useScheduleStore
      .getState()
      .addSlot({ title: 'Redes', day: 'Mar', ...BASE, isOcrImported: true, confirmado: true });
    await useScheduleStore.getState().addSlot({ title: 'Manual', day: 'Mié', ...BASE });

    const [ocr, manual] = llamadas.map((l) => l.cuerpo as Record<string, unknown>);
    expect(ocr).toMatchObject({ fuente: 'OCR', confirmado: true });
    expect(manual.confirmado).toBeUndefined();
  });
});
