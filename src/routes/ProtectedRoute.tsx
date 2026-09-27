import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useScheduleStore } from '../store/scheduleStore';
import { useGroupsStore } from '../store/groupsStore';
import { useTiempoReal } from '../hooks/useTiempoReal';
import { esAdmin, INICIO_ADMIN } from '../lib/rol';

/** Zona de las cuentas normales: dashboard, horario, grupos y perfil. */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const admin = useAuthStore((s) => esAdmin(s.user));
  const location = useLocation();

  /* Se recuerda de dónde venía para volver ahí tras entrar (sesión expirada,
     enlace directo a un grupo…). */
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  // El admin no tiene horario ni grupos: su sitio es el panel.
  if (admin) return <Navigate to={INICIO_ADMIN} replace />;

  return <ZonaUsuario />;
}

/**
 * Separado del guard para que las cargas y el canal en tiempo real solo
 * arranquen con una cuenta normal ya dentro: montados en el guard, un admin
 * pedía los grupos y abría el socket en el instante antes de ser redirigido.
 */
function ZonaUsuario() {
  const hydrateSchedule = useScheduleStore((s) => s.hydrate);
  const fetchGroups = useGroupsStore((s) => s.fetchGroupsFromServer);

  /* Al entrar a la zona privada se traen los bloques y los grupos del backend.
     Los grupos no se pedían en ningún sitio: con servidor real solo se veían
     los creados desde este mismo navegador, y nunca aquellos a los que otra
     persona te había añadido. En modo demo ambas llamadas no hacen nada. */
  useEffect(() => {
    void hydrateSchedule();
    void fetchGroups();
  }, [hydrateSchedule, fetchGroups]);

  /* RNF-05. Aquí y no en cada página: una sola conexión para toda la zona
     privada, que se cierra al salir. */
  useTiempoReal();

  return <Outlet />;
}
