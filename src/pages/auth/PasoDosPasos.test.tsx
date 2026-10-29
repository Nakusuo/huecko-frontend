import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PasoDosPasos from './PasoDosPasos';
import { esDesafioDosPasos, type RespuestaLogin } from '../../types/auth.types';

describe('verificación en dos pasos en el login', () => {
  it('distingue el desafío de una sesión', () => {
    const desafio: RespuestaLogin = { requiereDosPasos: true, desafio: 'abc' };
    const sesion: RespuestaLogin = {
      token: 't',
      user: { id: '1', nombre: 'Ana', email: 'ana@h.com', creado_en: '2026-01-01T00:00:00Z' },
    };
    expect(esDesafioDosPasos(desafio)).toBe(true);
    expect(esDesafioDosPasos(sesion)).toBe(false);
  });

  it('pide el código de la app con un campo numérico de un solo uso', () => {
    const html = renderToStaticMarkup(<PasoDosPasos desafio="abc" onSesion={() => {}} onVolver={() => {}} />);
    expect(html).toContain('Verificación en dos pasos');
    expect(html).toContain('id="codigo-dos-pasos"');
    expect(html).toMatch(/autocomplete="one-time-code"/i);
    expect(html).toMatch(/inputmode="numeric"/i);
    expect(html).toContain('código de respaldo');
  });
});
