import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import OnboardingPage from '../pages/OnboardingPage';
import SchedulePage from '../pages/SchedulePage';
import ProfilePage from '../pages/ProfilePage';
import GroupsListPage from '../pages/GroupsListPage';
import GroupDetailPage from '../pages/GroupDetailPage';
import { useAuthStore } from '../store/authStore';

export default function AppRouter() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Routes>
      {/* Rutas Públicas de Autenticación */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterPage />
          )
        }
      />

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

      {/* Ruta por defecto */}
      <Route
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? '/dashboard' : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}
