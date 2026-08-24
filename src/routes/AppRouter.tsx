import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardPlaceholder from '../pages/DashboardPlaceholder';
import SchedulePage from '../pages/SchedulePage';
import ProfilePage from '../pages/ProfilePage';
import GroupsPage from '../pages/GroupsPage';
import DiscoverPage from '../pages/DiscoverPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/discover" element={<DiscoverPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
      </Route>

      <Route path="*" element={<Navigate to="/groups" replace />} />
    </Routes>
  );
}
