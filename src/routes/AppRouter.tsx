import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RutaAdmin } from './RutaAdmin';
import AuthPage from '../pages/auth/AuthPage';
import DashboardPage from '../pages/DashboardPage';
import OnboardingPage from '../pages/OnboardingPage';
import SchedulePage from '../pages/SchedulePage';
import ProfilePage from '../pages/ProfilePage';
import GroupsListPage from '../pages/GroupsListPage';
import GroupDetailPage from '../pages/GroupDetailPage';
import AdminResumenPage from '../pages/admin/AdminResumenPage';
import AdminSaludPage from '../pages/admin/AdminSaludPage';
import AdminFallosPage from '../pages/admin/AdminFallosPage';
import AdminConsolaPage from '../pages/admin/AdminConsolaPage';
import { useAuthStore } from '../store/authStore';
import { inicioDe } from '../lib/rol';

export default function AppRouter() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const inicio = useAuthStore((s) => inicioDe(s.user));

  return (
    <Routes>
      {/* Rutas Públicas de Autenticación.

          Van como ruta de envoltorio y no como dos rutas sueltas para que
          `AuthPage` sea el PADRE de las dos: así no se desmonta al pasar de
          `/login` a `/register`, y el panel de marca puede recorrer la pantalla
          en lugar de reaparecer del otro lado. Las dos rutas hijas no pintan
          nada por su cuenta —el padre decide qué formulario está delante mirando
          la URL—, pero siguen existiendo como direcciones propias, con su enlace
          compartible y su entrada en el historial. */}
      <Route element={<AuthPage />}>
        <Route path="/login" />
        <Route path="/register" />
      </Route>

      {/* Rutas Protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/groups" element={<GroupsListPage />} />
        {/* Un grupo por dirección: para ver otro hay que volver a la lista. */}
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
      </Route>

      {/* Panel de administración: observa la plataforma, no participa en ella. */}
      <Route path="/admin" element={<RutaAdmin />}>
        <Route index element={<AdminResumenPage />} />
        <Route path="salud" element={<AdminSaludPage />} />
        <Route path="fallos" element={<AdminFallosPage />} />
        <Route path="consola" element={<AdminConsolaPage />} />
      </Route>

      {/* Ruta por defecto */}
      <Route
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? inicio : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}
