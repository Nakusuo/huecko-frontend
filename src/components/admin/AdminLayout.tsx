import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { HueckoMark } from '../Pixel';
import { InsigniaModo } from '../Navbar';

interface ItemAdmin {
  to: string;
  label: string;
  icon: string;
}

/* `end` en el resumen: sin él, `/admin` quedaría marcado también en
   `/admin/usuarios`. */
const ITEMS: ItemAdmin[] = [
  { to: '/admin', label: 'Resumen', icon: 'monitoring' },
  { to: '/admin/usuarios', label: 'Usuarios', icon: 'manage_accounts' },
  { to: '/admin/grupos', label: 'Grupos', icon: 'groups' },
];

/** Distintivo junto a la marca: que nunca haya duda de en qué panel se está. */
function SelloAdmin() {
  return (
    <span className="rotulo -rotate-2 bg-ink px-2 py-0.5 text-2xs text-olive shadow-sm">Admin</span>
  );
}

/**
 * Marco de la zona de administración.
 *
 * Tiene su propia barra y no reutiliza `Navbar`: ni la campana de avisos ni el
 * perfil tienen sentido para quien no participa en grupos. «Salir» está
 * también en el móvil porque aquí no hay página de perfil desde la que salir.
 */
export default function AdminLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const nombre = useAuthStore((s) => s.user?.nombre ?? '');

  const salir = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const botonSalir = (
    <button
      type="button"
      onClick={salir}
      className="flex items-center gap-1.5 rounded-lg border border-error/30 px-3.5 py-2 text-xs font-semibold text-error transition-colors hover:bg-error-container active:scale-95"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">logout</span>
      <span>Salir</span>
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-on-surface">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      {/* --- Barra superior (escritorio) --- */}
      <nav
        aria-label="Navegación de administración"
        className="sticky top-0 z-50 hidden w-full border-b border-outline-variant bg-surface/90 backdrop-blur-sm md:block"
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-8 px-6 lg:px-8">
          <Link to="/admin" className="flex items-center gap-3">
            <HueckoMark size={36} />
            <span className="font-headline text-xl text-on-surface">Huecko</span>
            <SelloAdmin />
          </Link>

          <InsigniaModo />

          <div className="flex items-center gap-7">
            {ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  `rounded-md px-1 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-b-2 border-secondary pb-1 font-bold text-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-on-surface-variant">{nombre.split(' ')[0]}</span>
            {botonSalir}
          </div>
        </div>
      </nav>

      {/* --- Cabecera (móvil) --- */}
      <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/90 backdrop-blur-sm md:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link to="/admin" className="flex items-center gap-2" aria-label="Huecko, ir al resumen">
            <HueckoMark size={28} />
            <SelloAdmin />
          </Link>
          <div className="flex items-center gap-2">
            <InsigniaModo />
            {botonSalir}
          </div>
        </div>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-grow px-6 pb-24 pt-8 md:px-10 md:pb-12"
      >
        <Outlet />
      </main>

      {/* --- Barra inferior (móvil) --- */}
      <nav
        aria-label="Navegación de administración"
        className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-outline-variant bg-surface-container px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              `flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors ${
                isActive ? 'font-bold text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            <span aria-hidden="true" className="material-symbols-outlined">{item.icon}</span>
            <span className="text-2xs">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
