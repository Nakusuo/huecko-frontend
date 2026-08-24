import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type DayOfWeek = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

interface TimeSlot {
  id: string;
  title: string;
  day: DayOfWeek;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "11:00"
  colorClass: string;
  textColorClass: string;
  customColor?: string;
}

const initialSlots: TimeSlot[] = [
  { id: '1', title: 'Universidad', day: 'Lun', startTime: '08:00', endTime: '11:00', colorClass: '', textColorClass: '', customColor: '#f59e0b' },
  { id: '2', title: 'Trabajo', day: 'Mar', startTime: '10:00', endTime: '14:00', colorClass: '', textColorClass: '', customColor: '#3b82f6' },
  { id: '3', title: 'Universidad', day: 'Mié', startTime: '08:00', endTime: '10:00', colorClass: '', textColorClass: '', customColor: '#f59e0b' },
  { id: '4', title: 'Gimnasio', day: 'Mié', startTime: '13:00', endTime: '15:30', colorClass: '', textColorClass: '', customColor: '#10b981' },
  { id: '5', title: 'Trabajo', day: 'Jue', startTime: '10:00', endTime: '14:00', colorClass: '', textColorClass: '', customColor: '#3b82f6' },
  { id: '6', title: 'Universidad', day: 'Vie', startTime: '08:00', endTime: '11:00', colorClass: '', textColorClass: '', customColor: '#f59e0b' },
];

const days: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function SchedulePage() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<TimeSlot[]>(initialSlots);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['Lun']);
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [selectedColor, setSelectedColor] = useState('#8b5cf6'); // Violet default

  const PRESET_COLORS = [
    { name: 'Violeta', hex: '#8b5cf6' },
    { name: 'Azul', hex: '#3b82f6' },
    { name: 'Ámbar', hex: '#f59e0b' },
    { name: 'Esmeralda', hex: '#10b981' },
    { name: 'Rosa', hex: '#ec4899' },
    { name: 'Rojo', hex: '#ef4444' },
  ];

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

  const openCreateModal = () => {
    setEditingSlotId(null);
    setNewTitle('');
    setSelectedDays(['Lun']);
    setNewStartTime('08:00');
    setNewEndTime('10:00');
    setSelectedColor('#8b5cf6');
    setIsModalOpen(true);
  };

  const openEditModal = (slot: TimeSlot) => {
    setEditingSlotId(slot.id);
    setNewTitle(slot.title);
    setSelectedDays([slot.day]);
    setNewStartTime(slot.startTime);
    setNewEndTime(slot.endTime);
    setSelectedColor(slot.customColor || '#8b5cf6');
    setIsModalOpen(true);
  };

  const toggleDaySelection = (day: DayOfWeek) => {
    // In edit mode, limit to single day selection
    if (editingSlotId) {
      setSelectedDays([day]);
      return;
    }

    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || selectedDays.length === 0) return;

    if (editingSlotId) {
      // Update single existing slot
      setSlots((prev) =>
        prev.map((slot) =>
          slot.id === editingSlotId
            ? {
                ...slot,
                title: newTitle,
                day: selectedDays[0],
                startTime: newStartTime,
                endTime: newEndTime,
                customColor: selectedColor,
              }
            : slot
        )
      );
    } else {
      // Create new slots for each selected day
      const newSlots: TimeSlot[] = selectedDays.map((day, idx) => ({
        id: `${Date.now()}-${idx}`,
        title: newTitle,
        day,
        startTime: newStartTime,
        endTime: newEndTime,
        colorClass: '',
        textColorClass: '',
        customColor: selectedColor,
      }));

      setSlots((prev) => [...prev, ...newSlots]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteSlot = () => {
    if (!editingSlotId) return;
    setSlots((prev) => prev.filter((slot) => slot.id !== editingSlotId));
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
        <button 
          onClick={() => navigate('/profile')}
          className="text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 rounded-full hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-600/20 cursor-pointer"
        >
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
              onClick={openCreateModal}
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
                        const isCustom = Boolean(slot.customColor);
                        const customBg = slot.customColor ? `${slot.customColor}26` : undefined;
                        const customBorder = slot.customColor ? `${slot.customColor}66` : undefined;

                        return (
                          <div
                            key={slot.id}
                            onClick={() => openEditModal(slot)}
                            style={{
                              ...style,
                              ...(isCustom ? { backgroundColor: customBg, borderColor: customBorder } : {}),
                            }}
                            className={`absolute w-full border backdrop-blur-md rounded-xl p-2.5 flex flex-col justify-between overflow-hidden cursor-pointer hover:scale-[1.03] transition-all shadow-md group ${
                              !isCustom ? slot.colorClass : ''
                            }`}
                          >
                            <span
                              style={isCustom ? { color: slot.customColor } : undefined}
                              className={`text-xs font-bold ${!isCustom ? slot.textColorClass : ''}`}
                            >
                              {slot.title}
                            </span>
                            <span
                              style={isCustom ? { color: slot.customColor } : undefined}
                              className={`text-[10px] opacity-80 ${!isCustom ? slot.textColorClass : ''}`}
                            >
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

      {/* Modal para Crear/Editar Bloque */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {editingSlotId ? 'Editar Bloque' : 'Agregar Nuevo Bloque'}
              </h2>
              {editingSlotId && (
                <button
                  type="button"
                  onClick={handleDeleteSlot}
                  className="text-xs text-red-400 hover:text-red-300 bg-red-950/30 border border-red-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Eliminar
                </button>
              )}
            </div>

            <form onSubmit={handleSaveBlock} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre del Bloque</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Clase de Cálculo, Gimnasio, Estudio..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {editingSlotId ? 'Día' : 'Días de repetición (Selecciona uno o varios)'}
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {days.map((d) => {
                    const isSelected = selectedDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDaySelection(d)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600 border-violet-500 text-white shadow-sm shadow-violet-500/30'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
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
                <label className="block text-xs font-medium text-slate-400 mb-2">Color del Bloque</label>
                <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setSelectedColor(color.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                        selectedColor.toLowerCase() === color.hex.toLowerCase()
                          ? 'border-white scale-110 shadow-md shadow-violet-500/30'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}

                  <label
                    title="Color personalizado"
                    className="w-7 h-7 rounded-full border-2 border-slate-700 hover:border-slate-500 flex items-center justify-center cursor-pointer relative overflow-hidden bg-slate-950"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">palette</span>
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
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
                  {editingSlotId ? 'Guardar Cambios' : 'Guardar Bloque'}
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
