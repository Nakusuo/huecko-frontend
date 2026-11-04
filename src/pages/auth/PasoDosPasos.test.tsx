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

describe('verificación en dos pasos por correo', () => {
  it('dice a qué correo llegó el código, acepta letras y deja reenviar', () => {
    const html = renderToStaticMarkup(
      <PasoDosPasos desafio="abc" metodo="CORREO" correo="al***@gmail.com" onSesion={() => {}} onVolver={() => {}} />
    );
    expect(html).toContain('al***@gmail.com');
    expect(html).toContain('Código del correo');
    expect(html).toMatch(/inputmode="text"/i);
    expect(html).toContain('Reenviar código');
    expect(html).toContain('código de respaldo');
  });

  it('con la app no ofrece reenviar nada', () => {
    const html = renderToStaticMarkup(<PasoDosPasos desafio="abc" metodo="APP" onSesion={() => {}} onVolver={() => {}} />);
    expect(html).not.toContain('Reenviar código');
  });
});
