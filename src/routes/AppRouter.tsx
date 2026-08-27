import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardPlaceholder from '../pages/DashboardPlaceholder';
import SchedulePage from '../pages/SchedulePage';
import ProfilePage from '../pages/ProfilePage';
import GroupsPage from '../pages/GroupsPage';
import DiscoverPage from '../pages/DiscoverPage';
import { useAuthStore } from '../store/authStore';

export default function AppRouter() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Routes>
      {/* Rutas Públicas de Autenticación */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/schedule" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/schedule" replace /> : <RegisterPage />}
      />

      {/* Rutas Protegidas (Requieren autenticación) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
      </Route>

      {/* Ruta por defecto */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/schedule" : "/login"} replace />}
      />
    </Routes>
  );
}
