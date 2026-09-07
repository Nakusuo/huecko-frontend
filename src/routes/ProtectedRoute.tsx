import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useScheduleStore } from '../store/scheduleStore';
import { useTiempoReal } from '../hooks/useTiempoReal';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrateSchedule = useScheduleStore((s) => s.hydrate);

  /* Al entrar a la zona privada se traen los bloques del backend. En modo demo
     `hydrate` no hace nada, así que este efecto es inofensivo sin servidor. */
  useEffect(() => {
    if (isAuthenticated) void hydrateSchedule();
  }, [isAuthenticated, hydrateSchedule]);

  /* RNF-05. Aquí y no en cada página: una sola conexión para toda la zona
     privada, que se cierra al salir. */
  useTiempoReal();

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
