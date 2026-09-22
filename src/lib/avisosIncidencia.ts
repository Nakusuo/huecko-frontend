import type { ResultadoIncidencia } from '../store/groupsStore';

/**
 * Texto del aviso que ve quien reporta. Dice lo que de verdad pasó con el plan:
 * antes afirmaba siempre «El plan pasó a re-coordinación», también cuando el
 * servidor había decidido que la baja no era crítica.
 */
export function describirAviso(
  nombre: string,
  tituloPlan: string,
  minutosTarde: number | null,
  resultado: ResultadoIncidencia
): string {
  if (minutosTarde !== null) {
    return `${nombre} avisó que llegará ${minutosTarde} min tarde a "${tituloPlan}". El plan sigue en pie.`;
  }
  if (resultado.replantea) {
    return `${nombre} no podrá ir a "${tituloPlan}". Se abrió una votación para decidir qué hacer.`;
  }
  const razon = resultado.razon ? ` (${resultado.razon})` : '';
  return `${nombre} no podrá ir a "${tituloPlan}". El plan sigue en pie${razon}.`;
}
