import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useScheduleStore } from '../store/scheduleStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  /* Al entrar a la zona privada se traen los bloques del backend. En modo demo
     `hydrate` no hace nada, así que este efecto es inofensivo sin servidor. */
  useEffect(() => {
    if (isAuthenticated) void fetchSchedule(user?.id);
  }, [isAuthenticated, fetchSchedule, user?.id]);

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
