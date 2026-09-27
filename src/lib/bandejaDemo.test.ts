import { beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

vi.stubEnv('VITE_API_URL', '');
instalarAlmacenamientoEnMemoria();
const {
  anotarFalloDemo,
  cambiarEstadoFalloDemo,
  cambiarEstadoReporteDemo,
  guardarReporteDemo,
  leerFallosDemo,
  leerReportesDemo,
  suspensionDesdeReporteDemo,
} = await import('./bandejaDemo');
const { leerSuspendidasDemo } = await import('../services/authService');

const alex = { id: '1', nombre: 'Alex', email: 'alex.rodriguez@huecko.com', creado_en: '' };
const otra = { id: 'x', nombre: 'Lucía', email: 'lucia@correo.com', creado_en: '' };

describe('reportes del modo demo', () => {
  beforeEach(() => localStorage.clear());

  it('un reporte de fallo queda NUEVO y con su autor', () => {
    guardarReporteDemo({ tipo: 'FALLO', descripcion: '  No carga el horario  ', ruta: '/schedule' }, alex);
    const [r] = leerReportesDemo();
    expect(r).toMatchObject({ tipo: 'FALLO', descripcion: 'No carga el horario', estado: 'NUEVO', autorNombre: 'Alex' });
  });

  it('conducta: cuenta existente, no la propia ni la del admin', () => {
    expect(() => guardarReporteDemo({ tipo: 'CONDUCTA', descripcion: 'Descripción larga', ruta: '/' }, otra)).toThrow(
      'correo'
    );
    expect(() =>
      guardarReporteDemo({ tipo: 'CONDUCTA', descripcion: 'Descripción larga', ruta: '/', emailReportado: 'nadie@x.com' }, otra)
    ).toThrow('No hay ninguna cuenta');
    expect(() =>
      guardarReporteDemo({ tipo: 'CONDUCTA', descripcion: 'Descripción larga', ruta: '/', emailReportado: alex.email }, alex)
    ).toThrow('propia');
    expect(() =>
      guardarReporteDemo({ tipo: 'CONDUCTA', descripcion: 'Descripción larga', ruta: '/', emailReportado: 'admin@huecko.com' }, otra)
    ).toThrow('administración');
  });

  it('desde un reporte de conducta se suspende la cuenta y el reporte pasa a revisado', () => {
    guardarReporteDemo({ tipo: 'CONDUCTA', descripcion: 'Cancela siempre', ruta: '/', emailReportado: alex.email }, otra);
    const [r] = leerReportesDemo();
    expect(r.cuentaReportadaSuspendida).toBe(false);

    const actualizado = suspensionDesdeReporteDemo(r.id, true);
    expect(actualizado.cuentaReportadaSuspendida).toBe(true);
    expect(actualizado.estado).toBe('REVISADO');
    expect(leerSuspendidasDemo().has('1')).toBe(true);

    expect(suspensionDesdeReporteDemo(r.id, false).cuentaReportadaSuspendida).toBe(false);
  });

  it('un reporte de fallo no permite suspender', () => {
    guardarReporteDemo({ tipo: 'FALLO', descripcion: 'Algo va mal aquí', ruta: '/' }, alex);
    expect(() => suspensionDesdeReporteDemo(leerReportesDemo()[0].id, true)).toThrow('no señala');
  });

  it('máximo 5 reportes por hora', () => {
    for (let i = 0; i < 5; i++) guardarReporteDemo({ tipo: 'FALLO', descripcion: 'Algo va mal aquí', ruta: '/' }, alex);
    expect(() => guardarReporteDemo({ tipo: 'FALLO', descripcion: 'Algo va mal aquí', ruta: '/' }, alex)).toThrow('última hora');
  });

  it('los nuevos van primero', () => {
    guardarReporteDemo({ tipo: 'FALLO', descripcion: 'Primero de todos', ruta: '/' }, alex);
    guardarReporteDemo({ tipo: 'FALLO', descripcion: 'Segundo reporte', ruta: '/' }, alex);
    const primero = leerReportesDemo().find((r) => r.descripcion === 'Segundo reporte')!;
    cambiarEstadoReporteDemo(primero.id, 'RESUELTO');
    expect(leerReportesDemo().map((r) => r.estado)).toEqual(['NUEVO', 'RESUELTO']);
  });
});

describe('fallos del modo demo', () => {
  beforeEach(() => localStorage.clear());

  it('el mismo error en la misma página suma ocurrencias; ids distintos agrupan', () => {
    const traza = 'TypeError: x\n    at Grupo (app.js:1:1)';
    anotarFalloDemo('TypeError', 'x', traza, '/groups/12');
    anotarFalloDemo('TypeError', 'x', traza, '/groups/99');
    const [f] = leerFallosDemo();
    expect(leerFallosDemo()).toHaveLength(1);
    expect(f.ocurrencias).toBe(2);
    expect(f.ubicacion).toBe('/groups/{id}');
  });

  it('uno resuelto que vuelve a ocurrir se reabre', () => {
    anotarFalloDemo('Error', 'x', null, '/');
    cambiarEstadoFalloDemo(leerFallosDemo()[0].id, 'RESUELTO');
    anotarFalloDemo('Error', 'x', null, '/');
    expect(leerFallosDemo()[0]).toMatchObject({ estado: 'NUEVO', reabierto: true });
  });
});
