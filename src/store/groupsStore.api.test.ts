import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanProposal } from '../types/groups.types';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/**
 * `groupsStore` con backend conectado.
 *
 * `isApiEnabled` se calcula al importar `apiClient`, así que la variable se
 * fija antes y todo lo demás se importa después. Las llamadas de red se
 * sustituyen en los objetos de servicio, sin tocar la red.
 */
vi.stubEnv('VITE_API_URL', '/api');
instalarAlmacenamientoEnMemoria();

const { useGroupsStore } = await import('./groupsStore');
const { useIncidentsStore } = await import('./incidentsStore');
const { incidentsService } = await import('../services/incidentsService');
const { groupsService } = await import('../services/groupsService');
const { ApiError, isApiEnabled } = await import('../lib/apiClient');

const PLAN: PlanProposal = {
  id: 'plan-api',
  groupId: 'g-1',
  titulo: 'Cierre del proyecto',
  creadoPor: 'u-1',
  plazoVotacion: 'Finalizada',
  estado: 'confirmado',
  ventanasSugeridas: [],
};

const VOTACION = {
  id: 'v-1',
  planId: PLAN.id,
  nombreReporta: 'Sam',
  motivo: 'Examen',
  criticidad: 'CRITICA' as const,
  razonCriticidad: 'es imprescindible',
  origenCriticidad: 'REGLAS' as const,
  estado: 'ABIERTA' as const,
  opciones: ['MANTENER' as const, 'REAGENDAR' as const, 'CANCELAR' as const],
  recuento: { MANTENER: 0, REAGENDAR: 0, CANCELAR: 0 },
  miVoto: null,
  votosEmitidos: 0,
  miembrosDelGrupo: 3,
  expiraEn: '2099-01-01T00:00:00Z',
  resultado: null,
  resultadoPorDefecto: false,
};

const aviso = (tipo: 'falta' | 'tardanza', minutosTardanza?: number) => ({
  userEmail: 'sam@huecko.com',
  userName: 'Sam',
  tipo,
  motivo: 'motivo',
  minutosTardanza,
});

const plan = () => useGroupsStore.getState().groupProposals.find((p) => p.id === PLAN.id);

describe('groupsStore (con backend)', () => {
  beforeEach(() => {
    useGroupsStore.getState().reset();
    useIncidentsStore.getState().reset();
    useGroupsStore.setState({ groupProposals: [PLAN] });
  });

  it('arranca sin datos de ejemplo', () => {
    expect(isApiEnabled).toBe(true);
    const estado = useGroupsStore.getState();
    expect(estado.groups).toEqual([]);
    expect(estado.groupsLoaded).toBe(false);
  });

  it('una tardanza envía los minutos y el plan sigue confirmado', async () => {
    let minutosEnviados = 0;
    incidentsService.reportarRetraso = async (_planId, minutos) => {
      minutosEnviados = minutos;
      return { usuarioId: 'u-2', nombreUsuario: 'Sam', minutosEstimados: minutos, reportadoEn: 'x', corregido: false };
    };

    const resultado = await useGroupsStore.getState().reportIncident(PLAN.id, aviso('tardanza', 25));

    expect(minutosEnviados).toBe(25);
    expect(resultado.replantea).toBe(false);
    expect(plan()?.estado).toBe('confirmado');
    expect(useIncidentsStore.getState().retrasos[PLAN.id]?.length).toBe(1);
  });

  it('una ausencia no crítica no replantea el plan', async () => {
    incidentsService.reportarImprevisto = async () => ({
      criticidad: 'NO_CRITICA',
      razon: 'no es imprescindible',
      votacion: null,
    });

    const resultado = await useGroupsStore.getState().reportIncident(PLAN.id, aviso('falta'));

    expect(resultado.replantea).toBe(false);
    expect(resultado.razon).toBe('no es imprescindible');
    expect(plan()?.estado).toBe('confirmado');
  });

  it('una ausencia crítica abre la votación sin tocar el estado del plan', async () => {
    incidentsService.reportarImprevisto = async () => ({
      criticidad: 'CRITICA',
      razon: 'es imprescindible',
      votacion: VOTACION,
    });

    const resultado = await useGroupsStore.getState().reportIncident(PLAN.id, aviso('falta'));

    expect(resultado.replantea).toBe(true);
    // El servidor mantiene el plan CONFIRMADO hasta cerrar la votación.
    expect(plan()?.estado).toBe('confirmado');
    expect(useIncidentsStore.getState().votaciones[PLAN.id]?.id).toBe('v-1');
  });

  it('si el servidor rechaza el aviso, el error sube y no se pinta nada', async () => {
    incidentsService.reportarImprevisto = async () => {
      throw new ApiError('Sin permiso', 403);
    };

    await expect(useGroupsStore.getState().reportIncident(PLAN.id, aviso('falta'))).rejects.toThrow();
    expect(useIncidentsStore.getState().ausencias[PLAN.id]).toBe(undefined);
    expect(plan()?.estado).toBe('confirmado');
  });

  it('un voto exprés que el servidor rechaza sube el error y no se pinta', async () => {
    useIncidentsStore.setState({ votaciones: { [PLAN.id]: VOTACION } });
    incidentsService.votarExpres = async () => {
      throw new ApiError('Votación cerrada', 409);
    };

    await expect(useIncidentsStore.getState().votarExpres(PLAN.id, 'MANTENER')).rejects.toThrow('Votación cerrada');
    expect(useIncidentsStore.getState().votaciones[PLAN.id]?.miVoto ?? null).toBe(VOTACION.miVoto ?? null);
  });

  it('retirar un retraso que el servidor no retira lo deja a la vista', async () => {
    const retraso = { usuarioId: 'u-1', nombreUsuario: 'Sam', minutosEstimados: 10, reportadoEn: '2026-09-21T10:00:00Z', corregido: false };
    useIncidentsStore.setState({ retrasos: { [PLAN.id]: [retraso] } });
    incidentsService.retirarRetraso = async () => {
      throw new ApiError('Error', 500);
    };

    const retirado = await useGroupsStore.getState().withdrawIncident(PLAN.id, 'sam@huecko.com');

    expect(retirado).toBe(false);
    expect(useIncidentsStore.getState().retrasos[PLAN.id]).toHaveLength(1);
    expect(useGroupsStore.getState().syncError).toBe('Error');
  });

  it('una respuesta de grupos que llega tarde no pisa un grupo recién creado', async () => {
    let responder: (grupos: never[]) => void = () => {};
    groupsService.getGroups = () => new Promise((resolve) => (responder = resolve));
    groupsService.createGroup = async () => ({
      id: 'nuevo',
      nombre: 'Nuevo',
      descripcion: '',
      creadoPor: 'u-1',
      umbralDisponibilidad: 80,
      miembros: [],
    });

    const carga = useGroupsStore.getState().fetchGroupsFromServer();
    await useGroupsStore.getState().createGroup('Nuevo', '', 80, 'a@huecko.com', 'A');
    responder([]);
    await carga;

    expect(useGroupsStore.getState().groups.map((g) => g.id)).toEqual(['nuevo']);
  });

  it('las altas distinguen correos sin cuenta de fallos', async () => {
    groupsService.addMember = async (_groupId, email) => {
      if (email === 'nadie@huecko.com') throw new ApiError('No existe', 404);
      throw new ApiError('Caído', 500);
    };

    const { sinCuenta, fallidos } = await useGroupsStore
      .getState()
      .addMembersByEmail('g-1', ['nadie@huecko.com', 'otro@huecko.com']);

    expect(sinCuenta).toEqual(['nadie@huecko.com']);
    expect(fallidos).toEqual(['otro@huecko.com']);
  });
});
