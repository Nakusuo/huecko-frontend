import { useAuthStore } from '../store/authStore';

export default function DashboardPlaceholder() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">
          Bienvenido, {user?.nombre}
        </h1>
        <p className="text-slate-400">El dashboard está en construcción (FUL-21).</p>
        <button
          onClick={logout}
          className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
