import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  currentTab: 'schedule' | 'groups' | 'discover' | 'profile';
}

export default function Navbar({ currentTab }: NavbarProps) {
  const navigate = useNavigate();

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
      </nav>

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-[#e9f0e4] border-t border-[#d5e3cf]">
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
      </nav>
    </>
  );
}
