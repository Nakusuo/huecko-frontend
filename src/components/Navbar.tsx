import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

export type NavTab = 'dashboard' | 'schedule' | 'groups' | 'profile';

interface NavbarProps {
  currentTab: NavTab;
}

interface NavItem {
  tab: NavTab;
  to: string;
  /** Etiqueta completa, para la barra de escritorio. */
  label: string;
  /** Etiqueta corta, para la barra inferior en móvil. */
  shortLabel: string;
  icon: string;
}

/**
 * Un único origen para los destinos de navegación.
 * Antes este arreglo estaba desplegado a mano diez veces —cinco en la barra
 * superior y cinco en la inferior—, así que cada destino nuevo había que
 * añadirlo en dos sitios y era fácil que divergieran.
 */
const NAV_ITEMS: NavItem[] = [
  { tab: 'dashboard', to: '/dashboard', label: 'Dashboard', shortLabel: 'Inicio', icon: 'dashboard' },
  { tab: 'schedule', to: '/schedule', label: 'Mi Horario', shortLabel: 'Horario', icon: 'calendar_month' },
  { tab: 'groups', to: '/groups', label: 'Mis Grupos', shortLabel: 'Grupos', icon: 'group' },
];

export default function Navbar({ currentTab }: NavbarProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifTriggerRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  /* El desplegable de notificaciones se cerraba solo al volver a pulsar la
     campana: ni Escape ni un clic fuera lo cerraban, así que se quedaba abierto
     tapando la página mientras navegabas. */
  useEffect(() => {
    if (!isNotifOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifRef.current?.contains(target) || notifTriggerRef.current?.contains(target)) return;
      setIsNotifOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsNotifOpen(false);
      // Devuelve el foco a la campana, para no perder el sitio al cerrar.
      notifTriggerRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isNotifOpen]);

  const desktopLinkClass = (tab: NavTab) =>
    `text-sm font-medium transition-colors rounded-md px-1 ${
      currentTab === tab
        ? 'text-primary border-b-2 border-secondary pb-1 font-bold'
        : 'text-on-surface-variant hover:text-on-surface'
    }`;

  const mobileLinkClass = (tab: NavTab) =>
    `flex flex-col items-center justify-center gap-0.5 min-w-16 min-h-12 px-2 py-1.5 rounded-xl transition-colors ${
      currentTab === tab
        ? 'text-primary font-bold'
        : 'text-on-surface-variant hover:text-on-surface'
    }`;

  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      {/* --- Barra superior (escritorio) --- */}
      <nav
        aria-label="Navegación principal"
        className="hidden md:flex bg-surface fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-7xl rounded-full border border-outline-variant shadow-sm justify-between items-center px-8 py-3 z-50"
      >
        <Link to="/dashboard" className="flex items-center gap-3 rounded-full">
          <span
            aria-hidden="true"
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-on-primary text-lg"
          >
            H
          </span>
          <span className="text-xl font-bold text-on-surface tracking-tight">Huecko</span>
        </Link>

        <div className="flex gap-7 items-center">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.tab}
              to={item.to}
              aria-current={currentTab === item.tab ? 'page' : undefined}
              className={desktopLinkClass(item.tab)}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Centro de notificaciones */}
          <div className="relative">
            <button
              ref={notifTriggerRef}
              type="button"
              onClick={() => setIsNotifOpen((open) => !open)}
              aria-expanded={isNotifOpen}
              aria-haspopup="true"
              aria-label={
                unreadCount > 0
                  ? `Notificaciones, ${unreadCount} sin leer`
                  : 'Notificaciones'
              }
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors relative flex items-center justify-center"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-xl">
                notifications
              </span>
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-0.5 right-0.5 bg-error text-on-error text-2xs font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center"
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div
                ref={notifRef}
                role="dialog"
                aria-label="Notificaciones"
                className="absolute right-0 mt-3 w-80 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-4 z-50 animate-fade-in"
              >
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant mb-3">
                  <h2 className="font-bold text-sm text-on-surface">Notificaciones</h2>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:underline font-medium rounded-md"
                    >
                      Marcar leídas
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-on-surface-variant text-center py-4">
                      No tienes notificaciones.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      /* Antes era un <div onClick>: no recibía el foco al tabular
                         ni respondía a Intro o Espacio. */
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.groupId) navigate('/groups');
                          setIsNotifOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors ${
                          !n.read
                            ? 'bg-primary-container/50 border-secondary/40 font-medium hover:bg-primary-container'
                            : 'bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        <span className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-bold text-on-surface">{n.title}</span>
                          <span className="text-2xs text-on-surface-variant shrink-0">
                            {n.timestamp}
                          </span>
                        </span>
                        <span className="block text-2xs text-on-surface-variant">
                          {n.description}
                        </span>
                        {!n.read && <span className="sr-only">(sin leer)</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            to="/profile"
            aria-current={currentTab === 'profile' ? 'page' : undefined}
            className={`text-sm font-semibold transition-colors rounded-full px-5 py-2 ${
              currentTab === 'profile'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-primary-container text-on-primary-container hover:bg-secondary-container'
            }`}
          >
            Mi Perfil
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-error hover:bg-error-container border border-error/30 px-3.5 py-2 rounded-full transition-colors active:scale-95"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              logout
            </span>
            <span>Salir</span>
          </button>
        </div>
      </nav>

      {/* --- Barra inferior (móvil) ---
          «Salir» ya no vive aquí: era un sexto destino en una barra pensada para
          cinco, y colocaba una acción destructiva a un dedo de distancia de la
          navegación normal. Cerrar sesión sigue estando en Mi Perfil. */}
      <nav
        aria-label="Navegación principal"
        className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-surface-container border-t border-outline-variant"
      >
        {[...NAV_ITEMS, { tab: 'profile' as NavTab, to: '/profile', label: 'Mi Perfil', shortLabel: 'Perfil', icon: 'person' }].map(
          (item) => (
            <Link
              key={item.tab}
              to={item.to}
              aria-current={currentTab === item.tab ? 'page' : undefined}
              className={mobileLinkClass(item.tab)}
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                {item.icon}
              </span>
              <span className="text-2xs">{item.shortLabel}</span>
            </Link>
          )
        )}
      </nav>
    </>
  );
}
