import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/** Con backend: el Client ID de Google sale de `GET /auth/google`. */
vi.stubEnv('VITE_API_URL', '/api');
instalarAlmacenamientoEnMemoria();

const { apiClient } = await import('../lib/apiClient');
const { configGoogle, loginConGoogle, reiniciarConfigGoogle } = await import('./authService');
const { default: LoginPage } = await import('../pages/auth/LoginPage');
const { default: RegisterPage } = await import('../pages/auth/RegisterPage');

afterEach(() => {
  vi.restoreAllMocks();
  reiniciarConfigGoogle();
});

const respuesta = <T,>(data: T) => ({ data }) as never;

describe('Google (con backend)', () => {
  it('lee el Client ID una sola vez', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta({ clientId: 'abc.apps.googleusercontent.com' }));
    expect(await configGoogle()).toBe('abc.apps.googleusercontent.com');
    expect(await configGoogle()).toBe('abc.apps.googleusercontent.com');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/auth/google');
  });

  it('sin Google configurado (clientId null) no hay botón', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta({ clientId: null }));
    expect(await configGoogle()).toBeNull();
  });

  it('si la API falla no guarda el fallo: la próxima vez lo vuelve a pedir', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockRejectedValueOnce(new Error('dormida'))
      .mockResolvedValueOnce(respuesta({ clientId: 'abc' }));
    expect(await configGoogle()).toBeNull();
    expect(await configGoogle()).toBe('abc');
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('manda el credential y devuelve lo mismo que el login (sesión o dos pasos)', async () => {
    const dosPasos = { requiereDosPasos: true, desafio: 'd', metodo: 'CORREO', correo: 'an***@gmail.com' };
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta(dosPasos));
    expect(await loginConGoogle('id-token')).toEqual(dosPasos);
    expect(post).toHaveBeenCalledWith('/auth/google', { credential: 'id-token' });
  });

  it('el login y el registro dejan el sitio del botón de Google, vacío hasta que Google lo dibuja', () => {
    for (const Pagina of [LoginPage, RegisterPage]) {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <Pagina />
        </MemoryRouter>
      );
      expect(html).toContain('data-testid="acceso-google"');
      // Nada de botón imitado: lo pinta el script oficial de Google.
      expect(html).not.toContain('Continuar con Google');
    }
  });
});
