import { fechaDelPlan } from './album';
import type { EntradaMuro } from '../types/muro.types';

/** «Ana», «Ana y Beto», «Ana, Beto y 2 más». */
export function listaDeNombres(nombres: string[], maximo = 2): string {
  const cortos = nombres.map((n) => n.split(' ')[0]);
  if (cortos.length <= 1) return cortos[0] ?? 'Alguien';
  if (cortos.length <= maximo) return `${cortos.slice(0, -1).join(', ')} y ${cortos[cortos.length - 1]}`;
  return `${cortos.slice(0, maximo).join(', ')} y ${cortos.length - maximo} más`;
}

/** Icono y frase de cada entrada del muro. */
export function textoDeEntrada(e: EntradaMuro): { icono: string; texto: string } {
  const quien = e.actor?.nombre.split(' ')[0] ?? 'Alguien';
  const plan = `«${e.titulo ?? 'un plan'}»`;
  switch (e.tipo) {
    case 'MIEMBRO_UNIDO':
      return { icono: 'person_add', texto: `${quien} se unió al grupo` };
    case 'PLAN_PROPUESTO':
      return { icono: 'campaign', texto: `${quien} propuso ${plan}` };
    case 'PLAN_CONFIRMADO':
      return {
        icono: 'event_available',
        texto: e.fecha ? `Se confirmó ${plan} para el ${fechaDelPlan(e.fecha, e.horaInicio)}` : `Se confirmó ${plan}`,
      };
    case 'PLAN_CANCELADO':
      return { icono: 'event_busy', texto: `Se canceló ${plan}` };
    case 'FOTOS_SUBIDAS': {
      const n = e.cantidad ?? 1;
      return { icono: 'photo_library', texto: `${quien} subió ${n} ${n === 1 ? 'foto' : 'fotos'} de ${plan}` };
    }
    case 'LLEGARON': {
      const nombres = (e.personas ?? []).map((p) => p.nombre);
      return { icono: 'where_to_vote', texto: `${listaDeNombres(nombres)} ${nombres.length === 1 ? 'llegó' : 'llegaron'} a ${plan}` };
    }
  }
}
