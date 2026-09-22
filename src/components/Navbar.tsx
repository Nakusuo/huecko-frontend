import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { usePreferenciasLocales } from '../store/profileStore';
import { isApiEnabled } from '../lib/apiClient';
import { tiempoRelativo } from '../lib/tiempoRelativo';
import { HueckoMark } from './Pixel';

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
  { tab: 'schedule', to: '/schedule', label: 'Mi horario', shortLabel: 'Horario', icon: 'calendar_month' },
  { tab: 'groups', to: '/groups', label: 'Mis grupos', shortLabel: 'Grupos', icon: 'group' },
];

/** Distingue de un vistazo si la app habla con el backend o corre en modo demostración. */
function InsigniaModo() {
  return (
    <span
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-medium border ${
        isApiEnabled
          ? 'bg-success-container text-on-success-container border-success/30'
          : 'bg-warning-container text-on-warning-container border-warning/30'
      }`}
      title={isApiEnabled ? 'Conectado al backend de Huecko' : 'Operando con datos simulados en local'}
    >
      <span aria-hidden="true" className={`w-2 h-2 rounded-full ${isApiEnabled ? 'bg-success' : 'bg-warning'}`} />
      {isApiEnabled ? 'API conectada' : 'Modo demo'}
    </span>
  );
}

/**
 * Campana con su desplegable.
 *
 * Se monta dos veces —en la barra de escritorio y en la cabecera móvil—, cada
 * una con su propio estado. Antes solo existía en escritorio: en el móvil no
 * había manera de ver los avisos.
 */
function CampanaNotificaciones({ variante }: { variante: 'escritorio' | 'movil' }) {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, clearNotification } = useNotificationStore();

  const [abierto, setAbierto] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  // Se fija al abrir: los textos «Hace 5 min» se calculan contra este momento.
  const [ahora, setAhora] = useState(() => new Date());

  /* El desplegable se cerraba solo al volver a pulsar la campana: ni Escape ni
     un clic fuera lo cerraban, así que se quedaba abierto tapando la página. */
  useEffect(() => {
    if (!abierto) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || botonRef.current?.contains(target)) return;
      setAbierto(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setAbierto(false);
      // Devuelve el foco a la campana, para no perder el sitio al cerrar.
      botonRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [abierto]);

  const alternar = () => {
    setAhora(new Date());
    setAbierto((open) => !open);
  };

  return (
    <div className={variante === 'escritorio' ? 'relative' : ''}>
      <button
        ref={botonRef}
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        aria-haspopup="true"
        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
        className="p-2 min-w-11 min-h-11 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors relative flex items-center justify-center"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-xl">
          notifications
        </span>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 bg-error text-on-error text-2xs font-bold min-w-4 h-4 px-1 rounded-lg flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {abierto && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notificaciones"
          className={`bg-surface-container-lowest rounded-2xl elev-3 p-4 z-50 animate-fade-in ${
            variante === 'escritorio'
              ? 'absolute right-0 mt-3 w-80'
              : 'fixed left-4 right-4 top-16 max-w-md mx-auto'
          }`}
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

          <ul className="max-h-[min(24rem,60dvh)] overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <li className="text-xs text-on-surface-variant text-center py-4">No tienes notificaciones.</li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-1 rounded-xl border text-xs transition-colors ${
                    !n.read
                      ? 'bg-primary-container/50 border-secondary/40 font-medium hover:bg-primary-container'
                      : 'bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {/* Antes era un <div onClick>: no recibía el foco al tabular
                      ni respondía a Intro o Espacio. Lleva al grupo del aviso,
                      no a la lista de grupos. */}
                  <button
                    type="button"
                    onClick={() => {
                      markAsRead(n.id);
                      if (n.groupId) navigate(`/groups/${encodeURIComponent(n.groupId)}`);
                      setAbierto(false);
                    }}
                    className="flex-1 min-w-0 text-left p-2.5 rounded-xl"
                  >
                    <span className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-bold text-on-surface">{n.title}</span>
                      <time dateTime={n.timestamp} className="text-2xs text-on-surface-variant shrink-0">
                        {tiempoRelativo(n.timestamp, ahora)}
                      </time>
                    </span>
                    <span className="block text-2xs text-on-surface-variant">{n.description}</span>
                    {!n.read && <span className="sr-only">(sin leer)</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => clearNotification(n.id)}
                    aria-label={`Descartar «${n.title}»`}
                    title="Descartar"
                    className="shrink-0 m-1 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Foto de la cuenta si hay una guardada en este dispositivo; si no, la inicial. */
function AvatarCuenta({ nombre, avatarUrl, className }: { nombre: string; avatarUrl?: string; className: string }) {
  return avatarUrl ? (
    <img src={avatarUrl} alt="" className={`${className} rounded-full object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${className} rounded-full bg-olive text-ink font-headline flex items-center justify-center`}>
      {nombre.charAt(0).toUpperCase() || '?'}
    </span>
  );
}

export default function Navbar({ currentTab }: NavbarProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { avatarUrl } = usePreferenciasLocales();
  const nombre = user?.nombre ?? '';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

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
        className="hidden md:block sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/90 backdrop-blur-sm"
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-8 px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-3">
          <HueckoMark size={36} />
          <span className="font-headline text-xl text-on-surface">Huecko</span>
        </Link>

        {/* Sin esto, un fallo de conexión se confunde con datos reales que
            simplemente están vacíos. */}
        <InsigniaModo />

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
          <CampanaNotificaciones variante="escritorio" />

          <Link
            to="/profile"
            aria-current={currentTab === 'profile' ? 'page' : undefined}
            className={`flex items-center gap-2 text-sm font-semibold transition-colors rounded-lg py-1.5 ${
              avatarUrl ? 'pl-1.5 pr-4' : 'px-5 py-2'
            } ${
              currentTab === 'profile'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-primary-container text-on-primary-container hover:bg-secondary-container'
            }`}
          >
            {avatarUrl && <AvatarCuenta nombre={nombre} avatarUrl={avatarUrl} className="w-7 h-7" />}
            {nombre.split(' ')[0] || 'Mi Perfil'}
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-error hover:bg-error-container border border-error/30 px-3.5 py-2 rounded-lg transition-colors active:scale-95"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              logout
            </span>
            <span>Salir</span>
          </button>
        </div>
        </div>
      </nav>

      {/* --- Cabecera (móvil) ---
          Solo marca, modo y campana: la navegación va en la barra inferior. Sin
          ella los avisos eran inalcanzables en el móvil. */}
      <header className="md:hidden sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/90 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link to="/dashboard" className="flex items-center gap-2" aria-label="Huecko, ir al inicio">
            <HueckoMark size={28} />
            <span className="font-headline text-lg text-on-surface">Huecko</span>
          </Link>
          <div className="flex items-center gap-2">
            <InsigniaModo />
            <CampanaNotificaciones variante="movil" />
          </div>
        </div>
      </header>

      {/* --- Barra inferior (móvil) ---
          «Salir» ya no vive aquí: era un sexto destino en una barra pensada para
          cinco, y colocaba una acción destructiva a un dedo de distancia de la
          navegación normal. Cerrar sesión sigue estando en Mi Perfil. */}
      <nav
        aria-label="Navegación principal"
        className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-surface-container border-t border-outline-variant"
      >
        {NAV_ITEMS.map((item) => (
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
        ))}
        <Link
          to="/profile"
          aria-current={currentTab === 'profile' ? 'page' : undefined}
          className={mobileLinkClass('profile')}
        >
          {avatarUrl ? (
            <AvatarCuenta nombre={nombre} avatarUrl={avatarUrl} className="w-6 h-6" />
          ) : (
            <span aria-hidden="true" className="material-symbols-outlined">person</span>
          )}
          <span className="text-2xs">Perfil</span>
        </Link>
      </nav>
    </>
  );
}
