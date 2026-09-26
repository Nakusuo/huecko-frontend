import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { esAdmin, INICIO_USUARIO } from '../lib/rol';
import AdminLayout from '../components/admin/AdminLayout';

/**
 * Zona del administrador. Solo es la puerta de la interfaz: quien protege los
 * datos es el backend, que responde 403 en `/api/admin/**` a una cuenta normal.
 */
export function RutaAdmin() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const admin = useAuthStore((s) => esAdmin(s.user));
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!admin) return <Navigate to={INICIO_USUARIO} replace />;

  return <AdminLayout />;
}
