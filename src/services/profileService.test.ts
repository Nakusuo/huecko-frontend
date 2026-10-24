import { afterEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/** Perfil social, foto y tarjeta de otra persona contra el backend. */
vi.stubEnv('VITE_API_URL', '/api');
instalarAlmacenamientoEnMemoria();

const { apiClient } = await import('../lib/apiClient');
const { profileService } = await import('./profileService');
const { groupsService } = await import('./groupsService');

/* Como lo manda el servidor: sin intereses viene `null`. */
const respuesta = {
  id: 'u-1',
  nombre: 'Ana',
  email: 'ana@h.com',
  creado_en: '2026-09-01T00:00:00Z',
  carrera: null,
  ciclo: null,
  bio: null,
  intereses: null,
  fotoActualizadaEn: null,
};
const yo = { ...respuesta, intereses: [] };

afterEach(() => vi.restoreAllMocks());

describe('perfil social', () => {
  it('se guarda con PUT y lo que llega sin intereses queda como lista vacía', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { ...respuesta, carrera: 'Software' } });
    const perfil = { carrera: 'Software', ciclo: 6, bio: null, intereses: [] };

    const guardado = await profileService.guardarPerfilSocial(perfil, yo);

    expect(put).toHaveBeenCalledWith('/me/perfil', perfil);
    expect(guardado.intereses).toEqual([]);
  });
});

describe('foto', () => {
  it('se sube como multipart en el campo «foto»', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { ...respuesta, fotoActualizadaEn: '2026-10-24T02:31:58Z' } });

    const resultado = await profileService.subirFoto(new Blob(['x'], { type: 'image/jpeg' }));

    const [ruta, cuerpo, opciones] = put.mock.calls[0];
    expect(ruta).toBe('/me/foto');
    expect((cuerpo as FormData).get('foto')).toBeInstanceOf(Blob);
    // Sin esta cabecera axios mandaría el FormData como JSON.
    expect(opciones).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
    expect(resultado.fotoActualizadaEn).toBe('2026-10-24T02:31:58Z');
  });

  it('quitarla es DELETE sobre la misma ruta', async () => {
    const borrar = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: respuesta });

    await profileService.quitarFoto();

    expect(borrar).toHaveBeenCalledWith('/me/foto');
  });

  it('cada integrante del grupo trae la fecha de su foto', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: [{
        id: 'g-1', nombre: 'Proyecto', descripcion: null, creadoPor: 'u-1', umbralDisponibilidad: 80,
        creadoEn: '2026-10-01T10:00:00Z', codigoInvitacion: null,
        miembros: [
          { usuarioId: 'u-1', nombre: 'Ana', email: 'ana@h.com', rol: 'ORGANIZADOR', esImprescindible: true, fotoActualizadaEn: '2026-10-24T02:31:58Z' },
          { usuarioId: 'u-2', nombre: 'Beto', email: 'beto@h.com', rol: 'MIEMBRO', esImprescindible: false },
        ],
      }],
    });

    const [grupo] = await groupsService.getGroups();

    expect(grupo.miembros.map((m) => m.fotoActualizadaEn)).toEqual(['2026-10-24T02:31:58Z', null]);
  });
});

describe('tarjeta y logros', () => {
  it('descartan insignias que este frontend todavía no conoce', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (ruta: string) => ({
      data: ruta === '/me/logros'
        ? { planesVividos: 6, aTiempo: 6, propuestos: 3, insignias: ['PRIMER_PLAN', 'NUEVA'] }
        : { usuarioId: 'u-2', nombre: 'Beto', carrera: null, ciclo: null, bio: null, intereses: null,
            fotoActualizadaEn: null, enHueckoDesde: '2026-09-01T00:00:00Z', gruposEnComun: ['Proyecto'],
            planesJuntos: 2, insignias: ['ORGANIZA', 'OTRA'] },
    }));

    expect((await profileService.getLogros(yo)).insignias).toEqual(['PRIMER_PLAN']);
    const tarjeta = await profileService.getPerfilPublico('u-2');
    expect(tarjeta.insignias).toEqual(['ORGANIZA']);
    expect(tarjeta.intereses).toEqual([]);
  });
});
