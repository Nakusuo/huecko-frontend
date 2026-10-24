import { afterEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/** El código de invitación, como en la app móvil. */
vi.stubEnv('VITE_API_URL', '/api');
instalarAlmacenamientoEnMemoria();

const { apiClient } = await import('../lib/apiClient');
const { groupsService } = await import('./groupsService');

const grupo = (codigoInvitacion: string | null) => ({
  id: 'g-1',
  nombre: 'Proyecto Integrador',
  descripcion: null,
  creadoPor: 'u-1',
  umbralDisponibilidad: 80,
  creadoEn: '2026-10-01T10:00:00Z',
  miembros: [],
  codigoInvitacion,
});

afterEach(() => vi.restoreAllMocks());

describe('código de invitación', () => {
  it('unirse manda el código tal cual lo escribió la persona', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: grupo(null) });

    const unido = await groupsService.joinByCode('huec ko-26');

    expect(post).toHaveBeenCalledWith('/grupos/unirse', { codigo: 'huec ko-26' });
    expect(unido).toMatchObject({ id: 'g-1', nombre: 'Proyecto Integrador', codigoInvitacion: null });
  });

  it('generar otro es POST y desactivarlo es DELETE sobre el mismo recurso', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: grupo('WE7QRJAF') });
    const borrar = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: grupo(null) });

    expect((await groupsService.changeInviteCode('g-1', true)).codigoInvitacion).toBe('WE7QRJAF');
    expect((await groupsService.changeInviteCode('g-1', false)).codigoInvitacion).toBeNull();
    expect(post).toHaveBeenCalledWith('/grupos/g-1/codigo');
    expect(borrar).toHaveBeenCalledWith('/grupos/g-1/codigo');
  });

  it('un grupo sin el campo (quien no organiza) queda sin código', async () => {
    const { codigoInvitacion: _, ...sinCodigo } = grupo('X');
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [sinCodigo] });

    expect((await groupsService.getGroups())[0].codigoInvitacion).toBeNull();
  });
});
