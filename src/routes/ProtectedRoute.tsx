import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useScheduleStore } from '../store/scheduleStore';
import { useGroupsStore } from '../store/groupsStore';
import { useTiempoReal } from '../hooks/useTiempoReal';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const hydrateSchedule = useScheduleStore((s) => s.hydrate);
  const fetchGroups = useGroupsStore((s) => s.fetchGroupsFromServer);

  /* Al entrar a la zona privada se traen los bloques y los grupos del backend.
     Los grupos no se pedían en ningún sitio: con servidor real solo se veían
     los creados desde este mismo navegador, y nunca aquellos a los que otra
     persona te había añadido. En modo demo ambas llamadas no hacen nada. */
  useEffect(() => {
    if (!isAuthenticated) return;
    void hydrateSchedule();
    void fetchGroups();
  }, [isAuthenticated, hydrateSchedule, fetchGroups]);

  /* RNF-05. Aquí y no en cada página: una sola conexión para toda la zona
     privada, que se cierra al salir. */
  useTiempoReal();

  /* Se recuerda de dónde venía para volver ahí tras entrar (sesión expirada,
     enlace directo a un grupo…). */
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}
