import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AuthPage from './AuthPage';
import AppRouter from '../../routes/AppRouter';
import { useAuthStore } from '../../store/authStore';

/**
 * La animación en sí no se puede comprobar aquí —hace falta un navegador—, pero
 * sí todo aquello de lo que depende: que las dos rutas pinten la misma escena,
 * que los dos formularios estén montados a la vez y que el panel acabe en el
 * lado correcto. Si algo de esto se rompe, la transición no queda fea: deja una
 * pantalla en blanco o un panel tapando el formulario.
 */

const pintar = (ruta: string) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthPage />
    </MemoryRouter>,
  );

describe('AuthPage', () => {
  it('en /login pinta el formulario de entrar', () => {
    expect(pintar('/login')).toContain('Bienvenido de vuelta');
  });

  it('en /register pinta el formulario de registro', () => {
    expect(pintar('/register')).toContain('Crea tu cuenta');
  });

  it('los dos formularios estan montados en las dos rutas', () => {
    /* Es lo que permite que el panel descubra un formulario ya pintado en vez de
       un hueco vacío mientras cruza. */
    for (const ruta of ['/login', '/register']) {
      const html = pintar(ruta);
      expect(html).toContain('Bienvenido de vuelta');
      expect(html).toContain('Crea tu cuenta');
    }
  });

  it('el formulario que no toca queda inerte, no solo invisible', () => {
    const html = pintar('/login');
    // Sin esto, tabular desde el formulario visible entraría en los campos del
    // otro, escondidos bajo el panel.
    expect(html).toContain('inert=""');
    expect(html).toContain('aria-hidden="true"');
  });

  it('hay UN solo panel de marca, y cambia de lado segun la ruta', () => {
    const login = pintar('/login');
    const registro = pintar('/register');

    expect(login.match(/Coordinar horarios sin discutirlo/g)).toHaveLength(1);

    expect(login).toContain('translateX(0)');
    // El carril mide lo que la escena, así que el 56 % es el 56 % de la pantalla:
    // el panel (44 %) queda pegado al borde derecho, sin hueco ni desbordamiento.
    expect(registro).toContain('translateX(56%)');
  });
});

describe('AppRouter: las rutas de acceso', () => {
  const pintarRouter = (ruta: string) =>
    renderToStaticMarkup(
      <MemoryRouter initialEntries={[ruta]}>
        <AppRouter />
      </MemoryRouter>,
    );

  it('/login y /register pintan la escena a traves de la ruta de envoltorio', () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });

    /* Las rutas hijas no llevan `element`: quien pinta es el padre. Si react-router
       dejara de resolverlas así, no habría error — habría una pantalla en blanco,
       que es exactamente el fallo que ningún tipo detecta. */
    expect(pintarRouter('/login')).toContain('Bienvenido de vuelta');
    expect(pintarRouter('/register')).toContain('Crea tu cuenta');
  });

  /* El desvío a /dashboard con la sesión ya abierta NO se cubre aquí, y no por
     descuido: `renderToStaticMarkup` es un render de servidor, y zustand alimenta
     `useSyncExternalStore` con `getInitialState()` como server snapshot
     (`zustand/react.js:11`). Es decir, en un render estático cualquier selector
     devuelve el estado inicial por mucho que se llame antes a `setState`, así que
     una prueba de esto pasaría o fallaría por el renderizador, no por el guard.
     Comprobarlo de verdad pide un navegador. */
});
