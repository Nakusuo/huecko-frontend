import React from 'react';
import Navbar from '../components/Navbar';

export default function DiscoverPage() {
  return (
    <div className="bg-[#f4fbf1] text-[#161d15] min-h-screen flex flex-col pt-[88px] md:pt-[104px]">
      <Navbar currentTab="discover" />

      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-10 pb-24 md:pb-12">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#161d15] mb-2 font-headline">Descubrir Planes y Grupos</h1>
          <p className="text-[#40493e] text-sm md:text-base">
            Encuentra comunidades, grupos abiertos de estudio o actividades cercanas recomendadas según tu disponibilidad.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 shadow-sm backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-[#7fae7a]/20 border border-[#7fae7a]/40 flex items-center justify-center text-[#416840] mb-4">
              <span className="material-symbols-outlined text-[24px]">school</span>
            </div>
            <h3 className="text-lg font-bold text-[#161d15] mb-1">Club de Programación y Hackathons</h3>
            <p className="text-xs text-[#70796d] mb-4">12 miembros activos • Universidades de Lima</p>
            <button className="w-full py-2.5 rounded-xl bg-[#7fae7a] hover:bg-[#6f9e6a] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs">
              Unirse al Grupo
            </button>
          </div>

          <div className="bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 shadow-sm backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-[#7fae7a]/20 border border-[#7fae7a]/40 flex items-center justify-center text-[#416840] mb-4">
              <span className="material-symbols-outlined text-[24px]">sports_soccer</span>
            </div>
            <h3 className="text-lg font-bold text-[#161d15] mb-1">Futbolito de los Viernes</h3>
            <p className="text-xs text-[#70796d] mb-4">8 miembros • San Isidro / Miraflores</p>
            <button className="w-full py-2.5 rounded-xl bg-[#7fae7a] hover:bg-[#6f9e6a] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs">
              Unirse al Grupo
            </button>
          </div>

          <div className="bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 shadow-sm backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-[#7fae7a]/20 border border-[#7fae7a]/40 flex items-center justify-center text-[#416840] mb-4">
              <span className="material-symbols-outlined text-[24px]">menu_book</span>
            </div>
            <h3 className="text-lg font-bold text-[#161d15] mb-1">Círculo de Lectura y Cafés</h3>
            <p className="text-xs text-[#70796d] mb-4">15 miembros • Reuniones híbridas</p>
            <button className="w-full py-2.5 rounded-xl bg-[#7fae7a] hover:bg-[#6f9e6a] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs">
              Unirse al Grupo
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
