import React, { useState } from 'react';

interface TimeSlot {
  id: string;
  title: string;
  day: 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "11:00"
  colorClass: string;
  textColorClass: string;
}

const initialSlots: TimeSlot[] = [
  { id: '1', title: 'Universidad', day: 'Lun', startTime: '08:00', endTime: '11:00', colorClass: 'bg-[#fde68a] bg-opacity-40 border-[#fde68a]', textColorClass: 'text-[#92400e]' },
  { id: '2', title: 'Trabajo', day: 'Mar', startTime: '10:00', endTime: '14:00', colorClass: 'bg-[#bfdbfe] bg-opacity-40 border-[#bfdbfe]', textColorClass: 'text-[#1e40af]' },
  { id: '3', title: 'Universidad', day: 'Mié', startTime: '08:00', endTime: '10:00', colorClass: 'bg-[#fde68a] bg-opacity-40 border-[#fde68a]', textColorClass: 'text-[#92400e]' },
  { id: '4', title: 'Gimnasio', day: 'Mié', startTime: '13:00', endTime: '15:30', colorClass: 'bg-secondary-fixed bg-opacity-40 border-secondary-fixed', textColorClass: 'text-on-secondary-fixed-variant' },
  { id: '5', title: 'Trabajo', day: 'Jue', startTime: '10:00', endTime: '14:00', colorClass: 'bg-[#bfdbfe] bg-opacity-40 border-[#bfdbfe]', textColorClass: 'text-[#1e40af]' },
  { id: '6', title: 'Universidad', day: 'Vie', startTime: '08:00', endTime: '11:00', colorClass: 'bg-[#fde68a] bg-opacity-40 border-[#fde68a]', textColorClass: 'text-[#92400e]' },
];

export default function SchedulePage() {
  const [slots, setSlots] = useState<TimeSlot[]>(initialSlots);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState<'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom'>('Lun');
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newType, setNewType] = useState<'university' | 'work' | 'gym'>('university');

  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
  const timeLabels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

  const getPositionStyles = (startTime: string, endTime: string) => {
    const startHour = parseInt(startTime.split(':')[0], 10) + parseInt(startTime.split(':')[1], 10) / 60;
    const endHour = parseInt(endTime.split(':')[0], 10) + parseInt(endTime.split(':')[1], 10) / 60;
    const minHour = 8;
    const totalHours = 12;

    const topPercent = Math.max(0, ((startHour - minHour) / totalHours) * 100);
    const heightPercent = Math.min(100 - topPercent, ((endHour - startHour) / totalHours) * 100);

    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`,
    };
  };

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    let colorClass = 'bg-amber-500/20 border-amber-500/40';
    let textColorClass = 'text-amber-300';

    if (newType === 'work') {
      colorClass = 'bg-blue-500/20 border-blue-500/40';
      textColorClass = 'text-blue-300';
    } else if (newType === 'gym') {
      colorClass = 'bg-emerald-500/20 border-emerald-500/40';
      textColorClass = 'text-emerald-300';
    }

    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      title: newTitle,
      day: newDay,
      startTime: newStartTime,
      endTime: newEndTime,
      colorClass,
      textColorClass,
    };

    setSlots([...slots, newSlot]);
    setNewTitle('');
    setIsModalOpen(false);
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col pt-[88px] md:pt-[104px]">
      {/* TopNavBar (Web) */}
      <nav className="hidden md:flex bg-slate-900/80 backdrop-blur-md fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl rounded-full border border-slate-800 shadow-xl shadow-violet-950/20 justify-between items-center px-8 py-3 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg">
            H
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Huecko</span>
        </div>
        <div className="flex gap-8 items-center">
          <a className="text-sm font-semibold text-violet-400 border-b-2 border-violet-500 pb-1" href="#">Mi Horario</a>
          <a className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="#">Mis Grupos</a>
          <a className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="#">Descubrir</a>
        </div>
        <button className="text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 rounded-full hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-600/20 cursor-pointer">
          Mi Perfil
        </button>
      </nav>

      {/* Main Content Canvas */}
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-10 pb-24 md:pb-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Mi Horario</h1>
            <p className="text-slate-400 text-sm md:text-base">Define tus bloques ocupados para encontrar huecos más fácilmente.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white transition-all text-sm font-medium cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
              Importar
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all text-sm font-semibold shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nuevo Bloque
            </button>
          </div>
        </header>

        {/* Weekly Grid Bento Box */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 overflow-x-auto shadow-2xl backdrop-blur-md">
          <div className="min-w-[800px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 gap-4 mb-4">
              <div className="w-16"></div>
              {days.map((day) => (
                <div
                  key={day}
                  className={`text-center text-sm font-semibold text-slate-400 pb-3 border-b border-slate-800 ${
                    day === 'Sáb' || day === 'Dom' ? 'opacity-40' : ''
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="relative h-[600px]">
              {/* Background Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border-b border-slate-800/80 h-[100px]"></div>
                ))}
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-8 gap-4 h-full relative">
                {/* Time Column */}
                <div className="flex flex-col justify-between text-xs text-slate-500 font-medium h-full py-2">
                  {timeLabels.map((time) => (
                    <span key={time}>{time}</span>
                  ))}
                </div>

                {/* Days Columns */}
                {days.map((day) => {
                  const daySlots = slots.filter((s) => s.day === day);

                  return (
                    <div key={day} className="relative h-full">
                      {daySlots.map((slot) => {
                        const style = getPositionStyles(slot.startTime, slot.endTime);
                        return (
                          <div
                            key={slot.id}
                            style={style}
                            className={`absolute w-full border backdrop-blur-md rounded-xl p-2.5 flex flex-col justify-between overflow-hidden cursor-pointer hover:scale-[1.02] transition-all shadow-md ${slot.colorClass}`}
                          >
                            <span className={`text-xs font-bold ${slot.textColorClass}`}>
                              {slot.title}
                            </span>
                            <span className={`text-[10px] opacity-80 ${slot.textColorClass}`}>
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal para Crear Bloque */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Agregar Nuevo Bloque</h2>
            <form onSubmit={handleAddBlock} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre del Bloque</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Clase de Cálculo, Gimnasio..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Día</label>
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white text-sm focus:outline-none focus:border-violet-500"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Hora Inicio</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Hora Fin</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoría / Color</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white text-sm focus:outline-none focus:border-violet-500"
                >
                  <option value="university">Universidad (Ámbar)</option>
                  <option value="work">Trabajo (Azul)</option>
                  <option value="gym">Gimnasio / Personal (Verde)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all text-sm font-semibold cursor-pointer shadow-md shadow-violet-500/20"
                >
                  Guardar Bloque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-slate-900 border-t border-slate-800">
        <a className="flex flex-col items-center justify-center text-slate-400 hover:text-white px-4 py-1.5 transition-colors" href="#">
          <span className="material-symbols-outlined">diversity_2</span>
          <span className="text-[11px] font-medium">Feed</span>
        </a>
        <a className="flex flex-col items-center justify-center text-violet-400 px-4 py-1.5" href="#">
          <span className="material-symbols-outlined">calendar_month</span>
          <span className="text-[11px] font-bold">Horarios</span>
        </a>
        <a className="flex flex-col items-center justify-center text-slate-400 hover:text-white px-4 py-1.5 transition-colors" href="#">
          <span className="material-symbols-outlined">group</span>
          <span className="text-[11px] font-medium">Miembros</span>
        </a>
        <a className="flex flex-col items-center justify-center text-slate-400 hover:text-white px-4 py-1.5 transition-colors" href="#">
          <span className="material-symbols-outlined">add_circle</span>
          <span className="text-[11px] font-medium">Plan</span>
        </a>
      </nav>

      {/* Footer */}
      <footer className="w-full py-8 mt-auto bg-slate-900/60 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center px-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm">
            H
          </div>
          <span className="text-lg font-bold text-white">Huecko</span>
        </div>
        <div className="flex gap-6">
          <a className="text-xs text-slate-400 hover:text-violet-400 transition-colors" href="#">Activos ahora: Alex, Maria, Sam</a>
          <a className="text-xs text-slate-400 hover:text-violet-400 transition-colors" href="#">Ajustes de Grupo</a>
          <a className="text-xs text-slate-400 hover:text-violet-400 transition-colors" href="#">Ayuda</a>
        </div>
        <span className="text-xs text-slate-500">© 2026 Huecko • Coordinación Social</span>
      </footer>
    </div>
  );
}
