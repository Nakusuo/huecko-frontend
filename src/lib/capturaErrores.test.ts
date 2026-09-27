import { describe, expect, it, vi } from 'vitest';
import { describirError, instalarCapturaErrores } from './capturaErrores';

/** Una ventana mínima: guarda los manejadores para dispararlos a mano. */
function ventanaFalsa(pathname = '/groups/42') {
  const manejadores: Record<string, ((e: Event) => void)[]> = {};
  return {
    location: { pathname } as Location,
    addEventListener: (tipo: string, fn: (e: Event) => void) => {
      (manejadores[tipo] ??= []).push(fn);
    },
    removeEventListener: (tipo: string, fn: (e: Event) => void) => {
      manejadores[tipo] = (manejadores[tipo] ?? []).filter((f) => f !== fn);
    },
    disparar: (tipo: string, datos: object) => manejadores[tipo]?.forEach((fn) => fn(datos as Event)),
  };
}

describe('describirError', () => {
  it('toma nombre, mensaje y traza de un Error', () => {
    const e = new TypeError('x is undefined');
    expect(describirError(e)).toMatchObject({ tipo: 'TypeError', mensaje: 'x is undefined' });
  });

  it('ignora el ruido conocido y los scripts de extensiones', () => {
    expect(describirError(new Error('ResizeObserver loop completed with undelivered notifications'))).toBeNull();
    expect(describirError('Script error.')).toBeNull();
    expect(describirError(new Error('x'), 'chrome-extension://abc/content.js')).toBeNull();

    const deExtension = new Error('boom');
    deExtension.stack = 'Error: boom\n    at f (moz-extension://abc/x.js:1:1)';
    expect(describirError(deExtension)).toBeNull();
  });

  it('recorta mensajes enormes', () => {
    expect(describirError('a'.repeat(5000))?.mensaje).toHaveLength(2000);
  });
});

describe('instalarCapturaErrores', () => {
  it('envía el error con la página actual', () => {
    const ventana = ventanaFalsa();
    const enviar = vi.fn();
    instalarCapturaErrores(enviar, () => true, ventana);

    ventana.disparar('error', { error: new TypeError('falló') });

    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'TypeError', mensaje: 'falló', ruta: '/groups/42' }));
  });

  it('captura también las promesas rechazadas sin manejar', () => {
    const ventana = ventanaFalsa();
    const enviar = vi.fn();
    instalarCapturaErrores(enviar, () => true, ventana);

    ventana.disparar('unhandledrejection', { reason: new Error('red caída') });

    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ mensaje: 'red caída' }));
  });

  it('el mismo error repetido en una carga se envía una vez, y hay un tope por carga', () => {
    const ventana = ventanaFalsa();
    const enviar = vi.fn();
    instalarCapturaErrores(enviar, () => true, ventana);

    for (let i = 0; i < 5; i++) ventana.disparar('error', { error: new Error('igual') });
    expect(enviar).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 30; i++) ventana.disparar('error', { error: new Error(`distinto ${i}`) });
    expect(enviar).toHaveBeenCalledTimes(10);
  });

  it('sin sesión no envía nada, y se puede desinstalar', () => {
    const ventana = ventanaFalsa();
    const enviar = vi.fn();
    let conSesion = false;
    const quitar = instalarCapturaErrores(enviar, () => conSesion, ventana);

    ventana.disparar('error', { error: new Error('a') });
    expect(enviar).not.toHaveBeenCalled();

    conSesion = true;
    quitar();
    ventana.disparar('error', { error: new Error('b') });
    expect(enviar).not.toHaveBeenCalled();
  });
});
