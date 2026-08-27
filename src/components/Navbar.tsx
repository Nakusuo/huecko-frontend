import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface NavbarProps {
  currentTab: 'schedule' | 'groups' | 'discover' | 'profile';
}

export default function Navbar({ currentTab }: NavbarProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* TopNavBar (Web) */}
      <nav className="hidden md:flex bg-[#e9f0e4]/90 backdrop-blur-md fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl rounded-full border border-[#d5e3cf] shadow-lg shadow-[#7fae7a]/10 justify-between items-center px-8 py-3 z-50">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/schedule')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7fae7a] to-[#416840] flex items-center justify-center font-black text-white text-lg shadow-sm">
            H
          </div>
          <span className="text-xl font-bold text-[#161d15] tracking-tight">Huecko</span>
        </div>

        <div className="flex gap-8 items-center">
          <button
            onClick={() => navigate('/schedule')}
            className={`text-sm font-medium transition-colors cursor-pointer ${
              currentTab === 'schedule'
                ? 'text-[#416840] border-b-2 border-[#7fae7a] pb-1 font-bold'
                : 'text-[#40493e] hover:text-[#161d15]'
            }`}
          >
            Mi Horario
          </button>
          <button
            onClick={() => navigate('/groups')}
            className={`text-sm font-medium transition-colors cursor-pointer ${
              currentTab === 'groups'
                ? 'text-[#416840] border-b-2 border-[#7fae7a] pb-1 font-bold'
                : 'text-[#40493e] hover:text-[#161d15]'
            }`}
          >
            Mis Grupos
          </button>
          <button
            onClick={() => navigate('/discover')}
            className={`text-sm font-medium transition-colors cursor-pointer ${
              currentTab === 'discover'
                ? 'text-[#416840] border-b-2 border-[#7fae7a] pb-1 font-bold'
                : 'text-[#40493e] hover:text-[#161d15]'
            }`}
          >
            Descubrir
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className={`text-sm font-semibold transition-all cursor-pointer rounded-full px-5 py-2 ${
              currentTab === 'profile'
                ? 'bg-[#416840] text-white shadow-md shadow-[#7fae7a]/20'
                : 'bg-[#7fae7a] hover:bg-[#6f9e6a] text-white shadow-sm'
            }`}
          >
            Mi Perfil
          </button>

          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 px-3.5 py-2 rounded-full transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Salir</span>
          </button>
        </div>
      </nav>

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-6 pt-3 bg-[#e9f0e4] border-t border-[#d5e3cf]">
        <button
          onClick={() => navigate('/schedule')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 transition-colors cursor-pointer ${
            currentTab === 'schedule' ? 'text-[#416840] font-bold' : 'text-[#40493e] hover:text-[#161d15]'
          }`}
        >
          <span className="material-symbols-outlined">calendar_month</span>
          <span className="text-[11px]">Horario</span>
        </button>

        <button
          onClick={() => navigate('/groups')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 transition-colors cursor-pointer ${
            currentTab === 'groups' ? 'text-[#416840] font-bold' : 'text-[#40493e] hover:text-[#161d15]'
          }`}
        >
          <span className="material-symbols-outlined">group</span>
          <span className="text-[11px]">Grupos</span>
        </button>

        <button
          onClick={() => navigate('/discover')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 transition-colors cursor-pointer ${
            currentTab === 'discover' ? 'text-[#416840] font-bold' : 'text-[#40493e] hover:text-[#161d15]'
          }`}
        >
          <span className="material-symbols-outlined">explore</span>
          <span className="text-[11px]">Descubrir</span>
        </button>

        <button
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 transition-colors cursor-pointer ${
            currentTab === 'profile' ? 'text-[#416840] font-bold' : 'text-[#40493e] hover:text-[#161d15]'
          }`}
        >
          <span className="material-symbols-outlined">person</span>
          <span className="text-[11px]">Perfil</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center px-3 py-1.5 text-red-600 hover:text-red-700 transition-colors cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-[11px]">Salir</span>
        </button>
      </nav>
    </>
  );
}
