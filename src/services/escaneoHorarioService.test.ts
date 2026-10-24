import { afterEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/** Con backend: primero la IA, y el lector del navegador si falla. */
vi.stubEnv('VITE_API_URL', '/api');
instalarAlmacenamientoEnMemoria();

const processScheduleOcr = vi.fn();
vi.mock('./ocrService', () => ({ processScheduleOcr, primeraPaginaComoImagen: vi.fn() }));

// En node no hay createImageBitmap: una foto pequeña, que se manda tal cual.
vi.stubGlobal('createImageBitmap', async () => ({ width: 800, height: 600, close: () => {} }));

const { apiClient, ApiError } = await import('../lib/apiClient');
const { AVISO_SIN_CUPO, AVISO_SIN_IA, avisoPorFallo, bloquesAFilas, leerHorario } = await import(
  './escaneoHorarioService'
);

const foto = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'horario.png', { type: 'image/png' });

const bloque = (diaSemana: number, titulo: string, dudoso = false) => ({
  diaSemana,
  horaInicio: '08:00',
  horaFin: '10:00',
  titulo,
  dudoso,
});

afterEach(() => {
  vi.restoreAllMocks();
  processScheduleOcr.mockReset();
});

describe('bloquesAFilas', () => {
  it('pasa el día de número a nombre y deja las filas listas para revisar', () => {
    const [fila] = bloquesAFilas([bloque(3, '  Física ')], 1);

    expect(fila).toMatchObject({ id: 'ia-1-0', title: 'Física', day: 'Mié', startTime: '08:00', endTime: '10:00', selected: true });
    expect(fila.revisar).toBeUndefined();
  });

  it('un bloque dudoso sale sin marcar y con su aviso', () => {
    const [fila] = bloquesAFilas([bloque(1, 'Cálculo', true)]);

    expect(fila.selected).toBe(false);
    expect(fila.revisar).toMatch(/no está segura/);
  });

  it('el mismo curso en varios días comparte color; otro curso no', () => {
    const [lunes, miercoles, quimica] = bloquesAFilas([bloque(1, 'Cálculo'), bloque(3, 'CÁLCULO'), bloque(2, 'Química')]);

    expect(miercoles.customColor).toBe(lunes.customColor);
    expect(quimica.customColor).not.toBe(lunes.customColor);
  });
});

describe('avisoPorFallo', () => {
  it('con la sesión caducada no se sigue sin IA', () => {
    expect(avisoPorFallo(new ApiError('Tu sesión expiró.', 401))).toBeNull();
  });

  it('distingue el cupo agotado de una IA caída', () => {
    expect(avisoPorFallo(new ApiError('Usaste mucho la IA', 429))).toBe(AVISO_SIN_CUPO);
    expect(avisoPorFallo(new ApiError('La IA no está disponible', 503))).toBe(AVISO_SIN_IA);
    expect(avisoPorFallo(new ApiError('Sin conexión', 0, true))).toBe(AVISO_SIN_IA);
  });
});

describe('leerHorario (con backend)', () => {
  it('manda la foto a la IA como multipart y devuelve sus bloques', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { bloques: [bloque(5, 'Inglés')] } });

    const lectura = await leerHorario(foto());

    expect(lectura.motor).toBe('ia');
    expect(lectura.aviso).toBeUndefined();
    expect(lectura.slots.map((s) => s.title)).toEqual(['Inglés']);
    const [ruta, cuerpo, opciones] = post.mock.calls[0];
    expect(ruta).toBe('/ia/horario/escaneo');
    expect((cuerpo as FormData).get('imagen')).toBeInstanceOf(Blob);
    expect(opciones?.headers).toMatchObject({ 'Content-Type': 'multipart/form-data' });
    expect(opciones?.timeout).toBeGreaterThan(30_000);
    expect(processScheduleOcr).not.toHaveBeenCalled();
  });

  it('si la IA no responde, lee con el navegador y dice por qué', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError('La IA no está disponible', 503));
    processScheduleOcr.mockResolvedValue({ slots: [{ id: 'local-1', title: 'Redes' }], rawText: '' });

    const lectura = await leerHorario(foto());

    expect(lectura).toMatchObject({ motor: 'local', aviso: AVISO_SIN_IA });
    expect(lectura.slots.map((s) => s.title)).toEqual(['Redes']);
  });

  it('con la sesión caducada no gasta tiempo en el lector local', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError('Tu sesión expiró.', 401));

    await expect(leerHorario(foto())).rejects.toThrow('Tu sesión expiró.');
    expect(processScheduleOcr).not.toHaveBeenCalled();
  });
});
