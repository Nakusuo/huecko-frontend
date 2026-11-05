import { afterEach, describe, expect, it, vi } from 'vitest';
import { montarBotonGoogle, type GoogleId } from './googleIdentity';
import { esCuentaRecienCreada } from './cuentaNueva';

/** Un `google.accounts.id` de mentira que guarda lo que se le pide. */
function googleFalso() {
  const llamadas: { init?: Parameters<GoogleId['initialize']>[0]; boton?: Parameters<GoogleId['renderButton']>[1] } = {};
  const id: GoogleId = {
    initialize: (o) => {
      llamadas.init = o;
    },
    renderButton: (_destino, o) => {
      llamadas.boton = o;
    },
  };
  return { id, llamadas };
}

const destino = {} as HTMLElement;

describe('botón de Google', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sin Client ID no carga el script ni dibuja nada', async () => {
    const cargar = vi.fn();
    const montado = await montarBotonGoogle(destino, { clientId: null, texto: 'signin_with', onCredential: () => {}, ancho: 360 }, cargar);
    expect(montado).toBe(false);
    expect(cargar).not.toHaveBeenCalled();
  });

  it('si el script de Google no carga, no hay botón y no se rompe nada', async () => {
    const montado = await montarBotonGoogle(
      destino,
      { clientId: 'abc.apps.googleusercontent.com', texto: 'signin_with', onCredential: () => {}, ancho: 360 },
      () => Promise.reject(new Error('bloqueado'))
    );
    expect(montado).toBe(false);
  });

  it('dibuja el botón oficial en español con el Client ID y devuelve el credential', async () => {
    const { id, llamadas } = googleFalso();
    const recibido = vi.fn();
    const montado = await montarBotonGoogle(
      destino,
      { clientId: 'abc.apps.googleusercontent.com', texto: 'signup_with', onCredential: recibido, ancho: 999 },
      () => Promise.resolve(id)
    );

    expect(montado).toBe(true);
    expect(llamadas.init?.client_id).toBe('abc.apps.googleusercontent.com');
    expect(llamadas.init?.ux_mode).toBe('popup');
    expect(llamadas.init?.context).toBe('signup');
    expect(llamadas.boton).toMatchObject({ text: 'signup_with', locale: 'es', theme: 'outline' });
    // Google no acepta más de 400 px.
    expect(llamadas.boton?.width).toBe(400);

    llamadas.init?.callback({ credential: 'id-token-de-google' });
    llamadas.init?.callback({});
    expect(recibido).toHaveBeenCalledTimes(1);
    expect(recibido).toHaveBeenCalledWith('id-token-de-google');
  });

  it('distingue una cuenta recién creada de una que ya existía', () => {
    const ahora = Date.parse('2026-11-04T12:00:00Z');
    expect(esCuentaRecienCreada('2026-11-04T11:59:30Z', ahora)).toBe(true);
    expect(esCuentaRecienCreada('2026-10-01T00:00:00Z', ahora)).toBe(false);
    expect(esCuentaRecienCreada(undefined, ahora)).toBe(false);
    expect(esCuentaRecienCreada('no es fecha', ahora)).toBe(false);
  });
});
