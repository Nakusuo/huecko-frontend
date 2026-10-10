import { Component, type ErrorInfo, type ReactNode } from 'react';
import { describirError } from '../lib/capturaErrores';
import { reportesService } from '../services/reportesService';
import { useAuthStore } from '../store/authStore';

interface Props {
  children: ReactNode;
}

interface State {
  fallo: boolean;
}

/**
 * Red de seguridad de toda la app. Sin ella, un error al pintar cualquier
 * pantalla la dejaba en blanco, sin forma de salir más que recargar a ciegas.
 *
 * React no pasa estos errores a `window.onerror` en producción, así que la
 * captura global (lib/capturaErrores) no los veía: se envían desde aquí a la
 * bandeja de fallos del admin.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { fallo: false };

  static getDerivedStateFromError(): State {
    return { fallo: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (!useAuthStore.getState().isAuthenticated) return;
    const descrito = describirError(error);
    if (!descrito) return;
    void reportesService.enviarErrorCliente({
      ...descrito,
      traza: descrito.traza ?? info.componentStack ?? null,
      ruta: window.location.pathname,
    });
  }

  render() {
    if (!this.state.fallo) return this.props.children;

    return (
      <main role="alert" className="min-h-dvh flex items-center justify-center bg-surface text-on-surface px-4">
        <div className="max-w-sm w-full bg-surface-container-lowest rounded-3xl p-7 elev-2 text-center">
          <span aria-hidden="true" className="material-symbols-outlined text-[40px] text-error">error</span>
          <h1 className="text-xl font-bold font-headline mt-2 mb-1.5">Algo se rompió en esta pantalla</h1>
          <p className="text-sm text-on-surface-variant mb-5">
            Ya nos ha llegado el aviso. Prueba otra vez o vuelve al inicio; tus datos están a salvo.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => this.setState({ fallo: false })}
              className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-medium cursor-pointer"
            >
              Volver a intentar
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-xs font-semibold"
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </main>
    );
  }
}
