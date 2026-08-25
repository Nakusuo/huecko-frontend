import React, { useState } from 'react';
import Navbar from '../components/Navbar';

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
    <div className="bg-[#f4fbf1] text-[#161d15] min-h-screen flex flex-col pt-[88px] md:pt-[104px]">
      <Navbar currentTab="schedule" />

      {/* Main Content Canvas */}
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-10 pb-24 md:pb-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#161d15] mb-2 font-headline">Mi Horario</h1>
            <p className="text-[#40493e] text-sm md:text-base">Define tus bloques ocupados para encontrar huecos más fácilmente.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#d5e3cf] bg-[#e9f0e4] text-[#40493e] hover:bg-[#dbe5d6] hover:text-[#161d15] transition-all text-sm font-medium cursor-pointer shadow-xs">
              <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
              Importar
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7fae7a] hover:bg-[#6f9e6a] text-white transition-all text-sm font-semibold shadow-md shadow-[#7fae7a]/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nuevo Bloque
            </button>
          </div>
        </header>

        {/* Weekly Grid Bento Box */}
        <div className="bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 md:p-8 overflow-x-auto shadow-sm backdrop-blur-md">
          <div className="min-w-[800px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 gap-4 mb-4">
              <div className="w-16"></div>
              {days.map((day) => (
                <div
                  key={day}
                  className={`text-center text-sm font-bold text-[#40493e] pb-3 border-b border-[#c0c9bb] ${
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
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-50">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border-b border-[#c0c9bb]/60 h-[100px]"></div>
                ))}
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-8 gap-4 h-full relative">
                {/* Time Column */}
                <div className="flex flex-col justify-between text-xs text-[#70796d] font-mono font-medium h-full py-2">
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
                        const customBorder = slot.customColor ? slot.customColor : undefined;

                        return (
                          <div
                            key={slot.id}
                            onClick={() => openEditModal(slot)}
                            style={{
                              ...style,
                              ...(isCustom ? { backgroundColor: customBg, borderColor: customBorder } : {}),
                            }}
                            className={`absolute w-full border backdrop-blur-md rounded-xl p-2.5 flex flex-col justify-between overflow-hidden cursor-pointer hover:scale-[1.02] transition-all shadow-xs group ${
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
                              className={`text-[10px] opacity-90 ${!isCustom ? slot.textColorClass : ''}`}
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
        <div className="fixed inset-0 z-50 bg-[#161d15]/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#f4fbf1] border border-[#d5e3cf] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#161d15]">
                {editingSlotId ? 'Editar Bloque' : 'Agregar Nuevo Bloque'}
              </h2>
              {editingSlotId && (
                <button
                  type="button"
                  onClick={handleDeleteSlot}
                  className="text-xs text-red-700 hover:text-red-800 bg-red-100 border border-red-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Eliminar
                </button>
              )}
            </div>

            <form onSubmit={handleSaveBlock} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-[#40493e] mb-1.5">Nombre del Bloque</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Clase de Cálculo, Gimnasio, Estudio..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] placeholder-slate-400 text-sm focus:outline-none focus:border-[#7fae7a]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#40493e] mb-1.5">
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
                            ? 'bg-[#7fae7a] border-[#6f9e6a] text-white shadow-xs'
                            : 'bg-white border-[#c0c9bb] text-[#40493e] hover:border-[#7fae7a]'
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
                  <label className="block text-xs font-medium text-[#40493e] mb-1.5">Hora Inicio</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#7fae7a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#40493e] mb-1.5">Hora Fin</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#7fae7a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#40493e] mb-2">Color del Bloque</label>
                <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setSelectedColor(color.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                        selectedColor.toLowerCase() === color.hex.toLowerCase()
                          ? 'border-[#161d15] scale-110 shadow-sm'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}

                  <label
                    title="Color personalizado"
                    className="w-7 h-7 rounded-full border-2 border-[#c0c9bb] hover:border-[#7fae7a] flex items-center justify-center cursor-pointer relative overflow-hidden bg-white"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#70796d]">palette</span>
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
                  className="px-4 py-2 rounded-xl border border-[#c0c9bb] text-[#40493e] hover:bg-[#e9f0e4] transition-colors text-sm font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#7fae7a] hover:bg-[#6f9e6a] text-white transition-all text-sm font-semibold cursor-pointer shadow-sm"
                >
                  {editingSlotId ? 'Guardar Cambios' : 'Guardar Bloque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-8 mt-auto bg-[#e9f0e4] border-t border-[#d5e3cf] flex flex-col md:flex-row justify-between items-center px-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7fae7a] to-[#416840] flex items-center justify-center font-black text-white text-sm shadow-sm">
            H
          </div>
          <span className="text-lg font-bold text-[#161d15]">Huecko</span>
        </div>
        <div className="flex gap-6">
          <a className="text-xs text-[#40493e] hover:text-[#416840] transition-colors" href="#">Activos ahora: Alex, Maria, Sam</a>
          <a className="text-xs text-[#40493e] hover:text-[#416840] transition-colors" href="#">Ajustes de Grupo</a>
          <a className="text-xs text-[#40493e] hover:text-[#416840] transition-colors" href="#">Ayuda</a>
        </div>
        <span className="text-xs text-[#70796d]">© 2026 Huecko • Coordinación Social</span>
      </footer>
    </div>
  );
}
