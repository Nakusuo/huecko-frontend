import { beforeEach, describe, expect, it } from 'vitest';
import type { PlanProposal } from '../types/groups.types';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

instalarAlmacenamientoEnMemoria();
const { useGroupsStore } = await import('./groupsStore');

/**
 * `groupsStore` en modo demo (sin `VITE_API_URL`).
 *
 * Las mismas reglas con servidor se prueban en `groupsStore.api.test.ts`.
 */

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
    expect(planEnStore()?.incidencias?.length).toBe(1);
  });

  it('una ausencia sí replantea el plan en modo demo', async () => {
    const resultado = await useGroupsStore.getState().reportIncident(PLAN_CONFIRMADO.id, {
      userEmail: 'sam.p@huecko.com',
      userName: 'Sam P.',
      tipo: 'falta',
      motivo: 'Examen',
    });

    expect(resultado.replantea).toBe(true);
    expect(planEnStore()?.estado).toBe('en_recoordinacion');
  });

  it('cerrar la votación devuelve el estado final', async () => {
    useGroupsStore.setState({ groupProposals: [{ ...PLAN_CONFIRMADO, estado: 'propuesto' }] });
    const estado = await useGroupsStore.getState().closeVotingManually(PLAN_CONFIRMADO.id);
    expect(estado).toBe('confirmado');
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

  it('reproponer vuelve a abrir la votación con las fechas nuevas y sin votos', async () => {
    useGroupsStore.setState({
      groupProposals: [
        {
          ...PLAN_CONFIRMADO,
          estado: 'en_recoordinacion',
          ventanasSugeridas: [
            { id: 'v-vieja', dia: 'Lun', horaInicio: '10:00', horaFin: '12:00', disponibilidadPorcentaje: 100, votosUsuarios: ['a@huecko.com'] },
          ],
          votosReplanificacion: { cancel: [], reschedule: ['a@huecko.com'], keep: [] },
        },
      ],
    });

    await useGroupsStore.getState().reproponerPlan(
      PLAN_CONFIRMADO.id,
      [
        { id: 'n1', dia: 'Mié', horaInicio: '16:00', horaFin: '18:00', disponibilidadPorcentaje: 90, votosUsuarios: ['x'] },
        { id: 'n2', dia: 'Jue', horaInicio: '16:00', horaFin: '18:00', disponibilidadPorcentaje: 80, votosUsuarios: [] },
      ],
      '24 horas',
    );

    const plan = planEnStore();
    expect(plan?.estado).toBe('propuesto');
    expect(plan?.ventanasSugeridas.map((v) => v.id)).toEqual(['n1', 'n2']);
    expect(plan?.ventanasSugeridas[0].votosUsuarios).toEqual([]);
    expect(plan?.votosReplanificacion?.reschedule).toEqual([]);
  });

  it('reset vuelve a los datos de ejemplo', () => {
    useGroupsStore.setState({ groups: [], syncError: 'algo' });
    useGroupsStore.getState().reset();
    const estado = useGroupsStore.getState();
    expect(estado.groups.length > 0).toBe(true);
    expect(estado.syncError).toBeNull();
  });
});
