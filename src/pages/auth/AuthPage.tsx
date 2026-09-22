import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { BrandingPanel } from '../../components/BrandingPanel';
import { useAuthStore } from '../../store/authStore';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

/**
 * Pantalla de acceso: entrar y registrarse, en la misma escena.
 *
 * Antes eran dos páginas independientes, cada una con su copia del panel de
 * marca. Al pasar de una a otra la pantalla se reconstruía entera y el panel
 * parpadeaba en el sitio, lo que hacía parecer que se había recargado la web.
 * Aquí el panel es una sola pieza que **se desliza** al lado contrario y deja
 * ver el otro formulario, que ya estaba debajo.
 *
 * Por qué los dos formularios están montados a la vez: para que el que entra
 * esté ya pintado cuando el panel empieza a descubrirlo. Montándolo al vuelo se
 * vería un hueco vacío durante el recorrido. El que no está activo lleva
 * `inert`, así que no recibe foco ni lo leen los lectores de pantalla: estar en
 * el DOM no es lo mismo que estar disponible.
 *
 * Las direcciones siguen siendo `/login` y `/register`, cada una con su enlace
 * compartible y su sitio en el historial. Lo único que cambia es que la
 * transición entre ellas se ve.
 */

/** Ancho del panel de marca, en % del ancho de la pantalla. */
const ANCHO_MARCA = 44;

/** Lo que tarda el panel en cruzar. Largo a propósito: recorre la pantalla entera. */
const DURACION_PANEL_MS = 650;
/**
 * El cruce entre formularios es corto y arranca a la vez que el panel.
 *
 * Con un retardo, el hueco que el panel va dejando se veía EN BLANCO durante
 * ese rato: el formulario entrante aún no había empezado a aparecer. La curva
 * `ease-out-expo` recorre la mayor parte del camino en el primer tercio, así que
 * el relevo tiene que ocurrir ahí, mientras el panel todavía tapa las dos
 * tarjetas, y no repartido a lo largo del recorrido.
 */
const DURACION_FORM_MS = 180;

export default function AuthPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { pathname } = useLocation();
  const esRegistro = pathname.startsWith('/register');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface text-on-surface">
      {/* Los dos formularios ocupan el mismo sitio; se cruzan por opacidad.
          En pantalla ancha cada uno se queda en la mitad que le deja el panel:
          entrar a la derecha, registrarse a la izquierda. */}
      <ColumnaFormulario activa={!esRegistro} lado="derecha">
        <LoginPage />
      </ColumnaFormulario>

      <ColumnaFormulario activa={esRegistro} lado="izquierda">
        <RegisterPage />
      </ColumnaFormulario>

      {/* Carril del panel. Es lo que se mueve, y ocupa la escena entera para que
          el desplazamiento se pueda expresar en % del ancho de la ESCENA. Movido
          el panel directamente, `translateX` mide en % de su propio ancho y hacía
          falta un 127,27 % que dependía de que nadie tocara `ANCHO_MARCA`.

          `pointer-events-none` no es opcional: el carril cubre toda la escena y,
          sin eso, un rectángulo transparente se quedaría por encima del
          formulario tragándose los clics.

          Oculto en móvil: ahí no hay sitio para una columna de marca, así que
          solo se cruzan los formularios. */}
      <div
        className={[
          'pointer-events-none absolute inset-0 z-10 hidden lg:block',
          'transition-transform ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform',
        ].join(' ')}
        style={{
          transform: esRegistro ? `translateX(${100 - ANCHO_MARCA}%)` : 'translateX(0)',
          transitionDuration: `${DURACION_PANEL_MS}ms`,
        }}
      >
        <BrandingPanel
          className="pointer-events-auto h-full"
          style={{ width: `${ANCHO_MARCA}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Una de las dos columnas de formulario.
 *
 * `inert` es lo que separa «no se ve» de «no está»: sin él, tabular desde el
 * formulario visible seguiría entrando en los campos del otro, invisibles bajo
 * el panel, y el usuario perdería el cursor sin explicación.
 */
function ColumnaFormulario({
  activa,
  lado,
  children,
}: {
  activa: boolean;
  lado: 'izquierda' | 'derecha';
  children: ReactNode;
}) {
  return (
    <div
      inert={!activa}
      aria-hidden={!activa}
      className={[
        'absolute inset-y-0 w-full overflow-y-auto overscroll-contain',
        'transition-opacity',
        // En ancho, cada formulario se queda en la mitad que le deja el panel.
        lado === 'derecha' ? 'right-0 lg:w-[56%]' : 'left-0 lg:w-[56%]',
        activa ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
      style={{ transitionDuration: `${DURACION_FORM_MS}ms` }}
    >
      {/* El centrado va aquí dentro y NO en el elemento que desplaza.
          Centrando con flex sobre el propio contenedor de scroll, cuando el
          contenido es más alto que la pantalla —el formulario de registro lo es
          en cuanto la ventana no es muy alta— la parte de arriba se sale por
          encima y queda inalcanzable: no hay manera de desplazarse hasta ella.
          Con `min-h-full` el envoltorio crece con el contenido y entonces
          centrar es seguro. */}
      <div className="flex min-h-full items-center justify-center px-5 py-8 sm:p-10 lg:p-12">
        {children}
      </div>
    </div>
  );
}
