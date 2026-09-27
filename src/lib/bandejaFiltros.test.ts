import { describe, expect, it } from 'vitest';
import { filtrarPorEstado, navegadorCorto } from './bandejaFiltros';

describe('filtros de la bandeja', () => {
  const items = [{ estado: 'NUEVO' as const }, { estado: 'REVISADO' as const }, { estado: 'RESUELTO' as const }];

  it('pendientes = nuevos y revisados', () => {
    expect(filtrarPorEstado(items, 'pendientes')).toHaveLength(2);
    expect(filtrarPorEstado(items, 'resueltos')).toEqual([{ estado: 'RESUELTO' }]);
    expect(filtrarPorEstado(items, 'todos')).toHaveLength(3);
  });

  it('resume el navegador', () => {
    expect(navegadorCorto('Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0')).toBe('Firefox · Linux');
    expect(
      navegadorCorto('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36')
    ).toBe('Chrome · Android');
    expect(navegadorCorto(null)).toBeNull();
  });
});
