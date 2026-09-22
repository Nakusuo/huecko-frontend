import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanProposal } from '../types/groups.types';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/**
 * `groupsStore` en modo demo (sin `VITE_API_URL`).
 *
 * Las mismas reglas con servidor se prueban en `groupsStore.api.test.ts`.
 *
 * La variable se fija vacía en vez de confiar en que no esté: `isApiEnabled` se
 * calcula al importar `apiClient`, y Vite carga `.env.local` también en los
 * tests. Con un `.env.local` apuntando al backend —lo normal en cuanto alguien
 * levanta la app conectada— estas pruebas salían del modo demo e intentaban
 * pedir por red, así que el resultado dependía de un archivo que ni siquiera
 * está en el repositorio.
 */
vi.stubEnv('VITE_API_URL', '');
instalarAlmacenamientoEnMemoria();
const { useGroupsStore } = await import('./groupsStore');
const { useIncidentsStore } = await import('./incidentsStore');
const { reiniciarSimulador } = await import('../lib/simuladorIncidencias');

const PLAN_CONFIRMADO: PlanProposal = {
  id: 'plan-test',
  groupId: '1',
  titulo: 'Repaso final',
  creadoPor: 'alex.rodriguez@huecko.com',
  plazoVotacion: 'Finalizada',
  estado: 'confirmado',
  ventanasSugeridas: [],
};

function planEnStore(): PlanProposal | undefined {
  return useGroupsStore.getState().groupProposals.find((p) => p.id === PLAN_CONFIRMADO.id);
}

describe('groupsStore (demo)', () => {
  beforeEach(() => {
    useGroupsStore.getState().reset();
    useGroupsStore.setState({ groupProposals: [PLAN_CONFIRMADO] });
    useIncidentsStore.getState().reset();
    reiniciarSimulador();
  });

  it('una tardanza no manda el plan a re-coordinación', async () => {
    const resultado = await useGroupsStore.getState().reportIncident(PLAN_CONFIRMADO.id, {
      userEmail: 'sam.p@huecko.com',
      userName: 'Sam P.',
      tipo: 'tardanza',
      motivo: 'Tráfico',
      minutosTardanza: 20,
    });

    expect(resultado.replantea).toBe(false);
    expect(planEnStore()?.estado).toBe('confirmado');
    expect(useIncidentsStore.getState().retrasos[PLAN_CONFIRMADO.id]).toHaveLength(1);
  });

  it('la ausencia de quien propuso el plan abre votación, como en el backend', async () => {
    const resultado = await useGroupsStore.getState().reportIncident(PLAN_CONFIRMADO.id, {
      userEmail: 'sam.p@huecko.com',
      userName: 'Sam P.',
      tipo: 'falta',
      motivo: 'Examen',
    });

    expect(resultado.replantea).toBe(true);
    // Igual que con servidor: el plan sigue confirmado mientras se vota.
    expect(planEnStore()?.estado).toBe('confirmado');
    const votacion = useIncidentsStore.getState().votaciones[PLAN_CONFIRMADO.id];
    expect(votacion?.estado).toBe('ABIERTA');
    // Quien se cae no decide.
    expect(votacion?.puedoVotar).toBe(false);
  });

  it('cerrar la votación confirma la ventana más votada', async () => {
    useGroupsStore.setState({
      groupProposals: [
        {
          ...PLAN_CONFIRMADO,
          estado: 'propuesto',
          ventanasSugeridas: [
            { id: 'a', dia: 'Sáb', horaInicio: '10:00', horaFin: '12:00', disponibilidadPorcentaje: 100, votosUsuarios: ['x'] },
            { id: 'b', dia: 'Dom', horaInicio: '10:00', horaFin: '12:00', disponibilidadPorcentaje: 100, votosUsuarios: ['x', 'y'] },
          ],
        },
      ],
    });
    const estado = await useGroupsStore.getState().closeVotingManually(PLAN_CONFIRMADO.id);
    expect(estado).toBe('confirmado');
    expect(planEnStore()?.ventanaConfirmadaId).toBe('b');
  });

  it('cerrar la votación sin votos cancela el plan, como en el backend', async () => {
    useGroupsStore.setState({ groupProposals: [{ ...PLAN_CONFIRMADO, estado: 'propuesto' }] });
    const estado = await useGroupsStore.getState().closeVotingManually(PLAN_CONFIRMADO.id);
    expect(estado).toBe('cancelado');
  });

  it('un plan cancelado no admite votos', async () => {
    useGroupsStore.setState({
      groupProposals: [
        {
          ...PLAN_CONFIRMADO,
          estado: 'cancelado',
          ventanasSugeridas: [
            { id: 'a', dia: 'Sáb', horaInicio: '10:00', horaFin: '12:00', disponibilidadPorcentaje: 100, votosUsuarios: [] },
          ],
        },
      ],
    });
    await useGroupsStore.getState().voteProposalWindow(PLAN_CONFIRMADO.id, 'a', 'yo@huecko.com');
    expect(planEnStore()?.ventanasSugeridas[0].votosUsuarios).toEqual([]);
  });

  it('addMembersByEmail separa los correos que no se pudieron añadir', async () => {
    const { sinCuenta, fallidos } = await useGroupsStore
      .getState()
      .addMembersByEmail('grupo-inexistente', ['a@huecko.com']);
    expect(sinCuenta).toEqual(['a@huecko.com']);
    expect(fallidos).toEqual([]);

    const ok = await useGroupsStore.getState().addMembersByEmail('1', ['nuevo@huecko.com']);
    expect(ok.sinCuenta).toEqual([]);
    const grupo = useGroupsStore.getState().groups.find((g) => g.id === '1');
    expect(grupo?.miembros.some((m) => m.email === 'nuevo@huecko.com')).toBe(true);
  });

  it('reset vuelve a los datos de ejemplo', () => {
    useGroupsStore.setState({ groups: [], syncError: 'algo' });
    useGroupsStore.getState().reset();
    const estado = useGroupsStore.getState();
    expect(estado.groups.length > 0).toBe(true);
    expect(estado.syncError).toBeNull();
  });
});
