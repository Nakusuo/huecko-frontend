import { afterEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';
import type { TimeWindowProposal } from '../types/groups.types';

vi.stubEnv('VITE_API_URL', '/api');
instalarAlmacenamientoEnMemoria();

const { apiClient, ApiError } = await import('../lib/apiClient');
const { completarOpciones, mensajeDeFalloIA, pedirIdeas, redactarBorrador, resumirVotacion, ventanaDesdeIa } = await import(
  './planesIaService'
);

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

describe('pedirIdeas', () => {
  it('pide las ideas del grupo y traduce su horario', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        ideas: [
          {
            titulo: 'Almuerzo',
            categoria: 'COMIDA',
            lugar: 'Cafetería',
            ventana: { fecha: '2026-10-23', horaInicio: '12:00:00', horaFin: '14:00:00', disponibilidadPorcentaje: 100 },
            razon: 'todos libres al mediodía',
          },
          { titulo: 'Cine', categoria: 'CINE', lugar: null, ventana: null, razon: 'es viernes por la noche' },
        ],
      },
    });

    const ideas = await pedirIdeas('g-1');

    expect(post.mock.calls[0][0]).toBe('/grupos/g-1/ia/ideas-plan');
    expect(ideas[0]).toMatchObject({ titulo: 'Almuerzo', categoria: 'COMIDA', ventana: { dia: 'Vie', horaInicio: '12:00' } });
    expect(ideas[1]).toMatchObject({ categoria: 'OTRO', ventana: null });
  });
});

describe('mensajeDeFalloIA', () => {
  it('usa el mensaje del backend, pero no el técnico de un corte de red', () => {
    expect(mensajeDeFalloIA(new ApiError('Usaste mucho la IA en poco tiempo.', 429))).toBe('Usaste mucho la IA en poco tiempo.');
    expect(mensajeDeFalloIA(new ApiError('No fue posible conectar con el backend en /api', 0, true))).toMatch(/no respondió/);
    expect(mensajeDeFalloIA(new Error('raro'))).toMatch(/no respondió/);
  });
});

describe('resumirVotacion', () => {
  it('pide el resumen del plan con su sugerencia', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { resumen: 'Votaron 2 de 3.', recomendacion: 'CERRAR', razon: 'el sábado tiene todos los votos' },
    });

    const resumen = await resumirVotacion('p-1');

    expect(post.mock.calls[0][0]).toBe('/planes/p-1/ia/resumen');
    expect(resumen).toEqual({ resumen: 'Votaron 2 de 3.', recomendacion: 'CERRAR', razon: 'el sábado tiene todos los votos' });
  });

  it('sin sugerencia (o una que no conoce la interfaz) enseña solo el resumen', async () => {
    vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({ data: { resumen: 'Votaron 2 de 3.', recomendacion: null, razon: null } })
      .mockResolvedValueOnce({ data: { resumen: 'Votaron 2 de 3.', recomendacion: 'CONFIRMAR', razon: 'porque sí' } });

    expect(await resumirVotacion('p-1')).toEqual({ resumen: 'Votaron 2 de 3.', recomendacion: null, razon: null });
    expect(await resumirVotacion('p-1')).toEqual({ resumen: 'Votaron 2 de 3.', recomendacion: null, razon: null });
  });
});
