import { useNavigate } from 'react-router-dom';

/**
 * Barra de acciones del panel.
 *
 * Antes había dos grupos de acciones: dos botones en la cabecera y una rejilla
 * de tres al **final** de la página, debajo de todo. Las de abajo solo se veían
 * después de recorrer métricas, evento, horario, grupos y votaciones — es
 * decir, casi nunca.
 *
 * Ahora es una sola barra justo bajo el saludo, en el sitio donde el ojo ya
 * está. En móvil se desplaza en horizontal con anclaje, que ocupa una línea en
 * vez de dos filas de rejilla.
 */

interface Accion {
  icon: string;
  label: string;
  ruta: string;
  /** La acción que se espera que alguien haga al entrar. Solo una. */
  principal?: boolean;
}

const ACCIONES: Accion[] = [
  { icon: 'add', label: 'Proponer plan', ruta: '/groups', principal: true },
  { icon: 'group_add', label: 'Crear grupo', ruta: '/groups' },
  { icon: 'edit_calendar', label: 'Ajustar horario', ruta: '/schedule' },
  { icon: 'document_scanner', label: 'Importar horario', ruta: '/schedule' },
  { icon: 'school', label: 'Cómo funciona', ruta: '/onboarding' },
];

export function AccionesRapidas() {
  const navigate = useNavigate();

  return (
    <nav aria-label="Acciones rápidas">
      {/* `-mx-*` + `px-*` deja que la fila sangre hasta el borde al desplazarse
          en móvil, en vez de cortarse contra el margen de la página. */}
      <ul className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {ACCIONES.map((accion) => (
          <li key={accion.label} className="snap-start">
            <button
              type="button"
              onClick={() => navigate(accion.ruta)}
              className={[
                'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5',
                'text-xs font-bold transition-colors cursor-pointer active:scale-95',
                accion.principal
                  ? 'bg-primary text-on-primary hover:bg-primary-hover'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
              ].join(' ')}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                {accion.icon}
              </span>
              {accion.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
