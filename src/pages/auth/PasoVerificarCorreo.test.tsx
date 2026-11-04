import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PasoVerificarCorreo from './PasoVerificarCorreo';
import { limpiarEntradaCodigo } from '../../services/authService';
import { esDesafioDosPasos, esVerificacionPendiente, type RespuestaLogin } from '../../types/auth.types';

const pendiente = { requiereVerificacion: true as const, desafio: 'abc', email: 'lucia@correo.com' };

describe('verificación del correo', () => {
  it('distingue la verificación pendiente del desafío de dos pasos y de la sesión', () => {
    const dosPasos: RespuestaLogin = { requiereDosPasos: true, desafio: 'abc', metodo: 'CORREO', correo: 'lu***@correo.com' };
    expect(esVerificacionPendiente(pendiente)).toBe(true);
    expect(esDesafioDosPasos(pendiente)).toBe(false);
    expect(esVerificacionPendiente(dosPasos)).toBe(false);
  });

  it('pide el código de 4 caracteres del correo y dice a dónde se envió', () => {
    const html = renderToStaticMarkup(<PasoVerificarCorreo pendiente={pendiente} onSesion={() => {}} onVolver={() => {}} />);
    expect(html).toContain('Verifica tu correo');
    expect(html).toContain('lucia@correo.com');
    expect(html).toContain('id="codigo-verificacion"');
    expect(html).toMatch(/autocomplete="one-time-code"/i);
    // Recién enviado: el reenvío espera su minuto.
    expect(html).toContain('Reenviar código en 60 s');
    expect(html).not.toContain('Modo demo');
  });

  it('en el modo demo enseña el código, porque no hay correo', () => {
    const html = renderToStaticMarkup(
      <PasoVerificarCorreo pendiente={{ ...pendiente, codigoDemo: '8JR6' }} onSesion={() => {}} onVolver={() => {}} />
    );
    expect(html).toContain('Modo demo');
    expect(html).toContain('8JR6');
  });

  it('el campo deja solo letras y números en mayúsculas, también al pegar', () => {
    expect(limpiarEntradaCodigo(' 8jr-6 ', 4)).toBe('8JR6');
    expect(limpiarEntradaCodigo('8JR6XYZ', 4)).toBe('8JR6');
    expect(limpiarEntradaCodigo('8.j!r6', 4)).toBe('8JR6');
  });
});
