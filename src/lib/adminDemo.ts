import type { ResumenAdmin } from '../types/admin.types';

/**
 * Resumen de ejemplo para el modo demo, donde no hay backend que medir.
 *
 * Son cifras inventadas y la página lo dice: sirven para ver el panel
 * funcionando, no describen el uso real de nadie. Las semanas se calculan
 * desde hoy para que el gráfico no se quede anclado en una fecha vieja.
 */
export function resumenDemo(ahora: Date = new Date()): ResumenAdmin {
  const lunes = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));

  const altas = [3, 5, 4, 8, 6, 9, 7, 4];
  const propuestos = [1, 2, 4, 3, 6, 5, 8, 3];
  const confirmados = [1, 1, 3, 2, 4, 4, 6, 1];

  const semanas = altas.map((_, i) => {
    const inicio = new Date(lunes);
    inicio.setDate(lunes.getDate() - (altas.length - 1 - i) * 7);
    const iso = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`;
    return { inicio: iso, altas: altas[i], planesPropuestos: propuestos[i], planesConfirmados: confirmados[i] };
  });

  return {
    generadoEn: ahora.toISOString(),
    usuarios: { total: 46, nuevos7d: 4, activos30d: 29, conHorario: 38, admins: 1 },
    grupos: { total: 12, activos30d: 8, miembrosMedio: 4.3, sinPlanes: 2 },
    planes: {
      total: 32,
      porEstado: { PROPUESTO: 5, CONFIRMADO: 22, CANCELADO: 3, EN_RECOORDINACION: 2 },
      tasaConcrecion: 0.88,
    },
    imprevistos: {
      ausencias: 9,
      ausenciasCriticas: 3,
      retrasos: 14,
      minutosRetrasoMedio: 12.5,
      votacionesAbiertas: 1,
      votacionesCerradasRecientes: 3,
      resultados: { MANTENER: 1, REAGENDAR: 2, CANCELAR: 0 },
      diasRetencion: 7,
    },
    semanas,
  };
}
