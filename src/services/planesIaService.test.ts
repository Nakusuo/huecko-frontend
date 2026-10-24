import { afterEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';
import type { TimeWindowProposal } from '../types/groups.types';

vi.stubEnv('VITE_API_URL', '/api');
instalarAlmacenamientoEnMemoria();

const { apiClient } = await import('../lib/apiClient');
const { completarOpciones, redactarBorrador, ventanaDesdeIa } = await import('./planesIaService');

const opcion = (fecha: string, horaInicio: string, horaFin: string): TimeWindowProposal => ({
  id: `${fecha}-${horaInicio}`,
  dia: 'Vie',
  fecha,
  horaInicio,
  horaFin,
  disponibilidadPorcentaje: 100,
  votosUsuarios: [],
});

afterEach(() => vi.restoreAllMocks());

describe('ventanaDesdeIa', () => {
  it('saca el día de la fecha y deja las horas en HH:mm', () => {
    expect(ventanaDesdeIa({ fecha: '2026-10-24', horaInicio: '08:00:00', horaFin: '10:00:00', disponibilidadPorcentaje: 67 }))
      .toMatchObject({ dia: 'Sáb', fecha: '2026-10-24', horaInicio: '08:00', horaFin: '10:00', disponibilidadPorcentaje: 67, votosUsuarios: [] });
  });
});

describe('completarOpciones', () => {
  const viernes = opcion('2026-10-23', '15:00', '17:00');

  it('completa hasta dos con las sugeridas que no se solapan', () => {
    const solapada = opcion('2026-10-23', '16:00', '18:00');
    const otroDia = opcion('2026-10-26', '15:00', '17:00');

    expect(completarOpciones([viernes], [solapada, otroDia])).toEqual([viernes, otroDia]);
  });

  it('si la IA ya dio dos o más, no añade nada', () => {
    const tarde = opcion('2026-10-23', '17:00', '19:00');

    expect(completarOpciones([viernes, tarde], [opcion('2026-10-26', '08:00', '10:00')])).toEqual([viernes, tarde]);
  });

  it('sin opciones de la IA, se queda con las sugeridas', () => {
    const sugeridas = [opcion('2026-10-24', '08:00', '10:00'), opcion('2026-10-25', '08:00', '10:00')];

    expect(completarOpciones([], sugeridas)).toEqual(sugeridas);
  });
});

describe('redactarBorrador', () => {
  it('manda la frase al grupo y traduce el borrador al formulario', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        titulo: 'Repaso de Cálculo',
        categoria: 'ESTUDIO',
        lugar: 'Biblioteca',
        ventanas: [{ fecha: '2026-10-23', horaInicio: '15:00:00', horaFin: '17:00:00', disponibilidadPorcentaje: 100 }],
        plazoVotacion: '2026-10-23T19:00:00Z',
      },
    });

    const borrador = await redactarBorrador('g-1', 'repaso el viernes');

    const [ruta, cuerpo, opciones] = post.mock.calls[0];
    expect(ruta).toBe('/grupos/g-1/ia/borrador-plan');
    expect(cuerpo).toEqual({ texto: 'repaso el viernes' });
    expect(opciones?.timeout).toBeGreaterThan(30_000);
    expect(borrador).toMatchObject({ titulo: 'Repaso de Cálculo', categoria: 'ESTUDIO', lugar: 'Biblioteca', plazoVotacion: '2026-10-23T19:00:00Z' });
    expect(borrador.ventanas[0]).toMatchObject({ dia: 'Vie', horaInicio: '15:00', horaFin: '17:00' });
  });

  it('una categoría que no conoce la interfaz pasa a «Otro»', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { titulo: 'Plan', categoria: 'FIESTA', lugar: null, ventanas: [], plazoVotacion: '2026-10-25T12:00:00Z' },
    });

    expect((await redactarBorrador('g-1', 'fiesta')).categoria).toBe('OTRO');
  });
});
