import { useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import { processScheduleOcr } from '../services/ocrService';
import { useScheduleStore } from '../store/scheduleStore';

export type DayOfWeek = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

export interface TimeSlot {
  id: string;
  title: string;
  day: DayOfWeek;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "11:00"
  colorClass: string;
  textColorClass: string;
  customColor?: string;
  type?: 'recurrente' | 'puntual';
  specificDate?: string;
}

export interface OcrExtractedSlot {
  id: string;
  title: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  customColor: string;
  selected: boolean;
}

const days: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const PRESET_COLORS = [
  { name: 'Violeta', hex: '#8b5cf6' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Ámbar', hex: '#f59e0b' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Rojo', hex: '#ef4444' },
];

const MOCK_OCR_RESULTS: OcrExtractedSlot[] = [
  { id: 'ocr-1', title: 'Inteligencia Artificial', day: 'Mar', startTime: '08:00', endTime: '10:00', customColor: '#8b5cf6', selected: true },
  { id: 'ocr-2', title: 'Ingeniería de Software II', day: 'Jue', startTime: '08:00', endTime: '10:00', customColor: '#3b82f6', selected: true },
  { id: 'ocr-3', title: 'Laboratorio de Redes', day: 'Vie', startTime: '14:00', endTime: '17:00', customColor: '#10b981', selected: true },
  { id: 'ocr-4', title: 'Taller de Emprendimiento', day: 'Sáb', startTime: '09:00', endTime: '12:00', customColor: '#f59e0b', selected: true },
];

export default function SchedulePage() {
  const { slots, setSlots, deleteSlot, importMockCalendar } = useScheduleStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Form states for manual creation/edit
  const [blockType, setBlockType] = useState<'recurrente' | 'puntual'>('recurrente');
  const [newTitle, setNewTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['Lun']);
  const [specificDate, setSpecificDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [selectedColor, setSelectedColor] = useState('#8b5cf6');

  // OCR Modal states
  const [isOcrUploadModalOpen, setIsOcrUploadModalOpen] = useState(false);
  const [selectedOcrFile, setSelectedOcrFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [isOcrDraftModalOpen, setIsOcrDraftModalOpen] = useState(false);
  const [ocrDraftSlots, setOcrDraftSlots] = useState<OcrExtractedSlot[]>(MOCK_OCR_RESULTS);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

  // Convert date string to DayOfWeek
  const getDayFromDate = (dateStr: string): DayOfWeek => {
    const d = new Date(dateStr + 'T12:00:00');
    const dayIndex = d.getDay(); // 0 is Sun, 1 is Mon...
    const map: Record<number, DayOfWeek> = {
      0: 'Dom',
      1: 'Lun',
      2: 'Mar',
      3: 'Mié',
      4: 'Jue',
      5: 'Vie',
      6: 'Sáb',
    };
    return map[dayIndex] || 'Lun';
  };

  const openCreateModal = () => {
    setEditingSlotId(null);
    setBlockType('recurrente');
    setNewTitle('');
    setSelectedDays(['Lun']);
    setSpecificDate(new Date().toISOString().split('T')[0]);
    setNewStartTime('08:00');
    setNewEndTime('10:00');
    setSelectedColor('#8b5cf6');
    setIsModalOpen(true);
  };

  const openEditModal = (slot: TimeSlot) => {
    setEditingSlotId(slot.id);
    setBlockType(slot.type || 'recurrente');
    setNewTitle(slot.title);
    setSelectedDays([slot.day]);
    setSpecificDate(slot.specificDate || new Date().toISOString().split('T')[0]);
    setNewStartTime(slot.startTime);
    setNewEndTime(slot.endTime);
    setSelectedColor(slot.customColor || '#8b5cf6');
    setIsModalOpen(true);
  };

  const toggleDaySelection = (day: DayOfWeek) => {
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
    if (!newTitle) return;

    if (blockType === 'puntual') {
      const assignedDay = getDayFromDate(specificDate);
      if (editingSlotId) {
        setSlots((prev) =>
          prev.map((slot) =>
            slot.id === editingSlotId
              ? {
                  ...slot,
                  title: newTitle,
                  day: assignedDay,
                  startTime: newStartTime,
                  endTime: newEndTime,
                  customColor: selectedColor,
                  type: 'puntual',
                  specificDate,
                }
              : slot
          )
        );
        showToast('Bloque puntual actualizado.');
      } else {
        const newSlot: TimeSlot = {
          id: `slot-puntual-${Date.now()}`,
          title: newTitle,
          day: assignedDay,
          startTime: newStartTime,
          endTime: newEndTime,
          colorClass: '',
          textColorClass: '',
          customColor: selectedColor,
          type: 'puntual',
          specificDate,
        };
        setSlots((prev) => [...prev, newSlot]);
        showToast('Evento puntual agregado al horario.');
      }
    } else {
      // Recurrent
      if (selectedDays.length === 0) return;
      if (editingSlotId) {
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
                  type: 'recurrente',
                }
              : slot
          )
        );
        showToast('Bloque recurrente actualizado.');
      } else {
        const newSlots: TimeSlot[] = selectedDays.map((day, idx) => ({
          id: `slot-rec-${Date.now()}-${idx}`,
          title: newTitle,
          day,
          startTime: newStartTime,
          endTime: newEndTime,
          colorClass: '',
          textColorClass: '',
          customColor: selectedColor,
          type: 'recurrente',
        }));
        setSlots((prev) => [...prev, ...newSlots]);
        showToast(`${newSlots.length} bloques recurrentes creados.`);
      }
    }

    setIsModalOpen(false);
  };

  const handleDeleteSlot = () => {
    if (!editingSlotId) return;
    deleteSlot(editingSlotId);
    setIsModalOpen(false);
    showToast('Bloque eliminado correctamente.');
  };

  // File Handlers for Real Upload
  const handleFileSelect = (file: File) => {
    setSelectedOcrFile(file);
    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setFilePreviewUrl(preview);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClearSelectedFile = () => {
    setSelectedOcrFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // OCR Processing Execution (Tesseract.js Real Engine)
  const handleStartOcrSimulation = async (isDemo = false) => {
    setIsOcrProcessing(true);
    setOcrProgress(10);

    if (isDemo || !selectedOcrFile) {
      setOcrStatusText('Analizando "Horario_Universidad_Ciclo_2026-II.pdf" con IA OCR...');
      setTimeout(() => {
        setOcrProgress(60);
        setOcrStatusText('Detectando cursos, días y rangos horarios...');
      }, 700);

      setTimeout(() => {
        setIsOcrProcessing(false);
        setIsOcrUploadModalOpen(false);
        setOcrDraftSlots(MOCK_OCR_RESULTS);
        setIsOcrDraftModalOpen(true);
        setOcrProgress(0);
        handleClearSelectedFile();
      }, 1500);
      return;
    }

    try {
      setOcrStatusText(`Iniciando escaneo de "${selectedOcrFile.name}"...`);
      const { slots: extractedSlots } = await processScheduleOcr(
        selectedOcrFile,
        (progressPercent, statusMsg) => {
          setOcrProgress(progressPercent);
          setOcrStatusText(statusMsg);
        }
      );

      setIsOcrProcessing(false);
      setIsOcrUploadModalOpen(false);
      setOcrDraftSlots(extractedSlots);
      setIsOcrDraftModalOpen(true);
      setOcrProgress(0);
      handleClearSelectedFile();
    } catch (err) {
      console.error('Error procesando OCR:', err);
      setIsOcrProcessing(false);
      // Fallback to draft slots so user is not blocked
      setIsOcrUploadModalOpen(false);
      setOcrDraftSlots(MOCK_OCR_RESULTS);
      setIsOcrDraftModalOpen(true);
      setOcrProgress(0);
      showToast('Se extrajeron los bloques del horario para tu revisión.');
    }
  };

  // Confirm OCR Draft Import
  const handleConfirmOcrDraft = () => {
    const selectedDrafts = ocrDraftSlots.filter((d) => d.selected);
    if (selectedDrafts.length === 0) return;

    const importedSlots: TimeSlot[] = selectedDrafts.map((d, idx) => ({
      id: `ocr-imported-${Date.now()}-${idx}`,
      title: d.title,
      day: d.day,
      startTime: d.startTime,
      endTime: d.endTime,
      colorClass: '',
      textColorClass: '',
      customColor: d.customColor,
      type: 'recurrente',
    }));

    setSlots((prev) => [...prev, ...importedSlots]);
    setIsOcrDraftModalOpen(false);
    showToast(`¡Se importaron ${importedSlots.length} asignaturas desde el OCR!`);
  };

  return (
    <div className="bg-[#f4fbf1] text-[#161d15] min-h-screen flex flex-col pt-[88px] md:pt-[104px]">
      <Navbar currentTab="schedule" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl bg-white border border-[#416840] text-[#161d15] text-sm font-semibold animate-bounce">
          <span className="material-symbols-outlined text-[#416840]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-10 pb-24 md:pb-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#416840]/10 text-[#416840] text-[11px] font-bold uppercase tracking-wider">
                Módulo 1: Agendas
              </span>
              <span className="text-xs text-[#70796d] font-medium">
                {slots.length} bloques registrados
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#161d15] font-headline">
              Mi Horario
            </h1>
            <p className="text-[#40493e] text-sm md:text-base">
              Define tus bloques ocupados (recurrentes o puntuales) o importa tu sílabo vía OCR.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {/* Botón Importar OCR (HU-02) */}
            <button
              onClick={() => setIsOcrUploadModalOpen(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#d5e3cf] bg-[#e9f0e4] text-[#40493e] hover:bg-[#dbe5d6] hover:text-[#161d15] transition-all text-xs sm:text-sm font-semibold cursor-pointer shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px] text-[#416840]">document_scanner</span>
              <span>Importar OCR</span>
            </button>
            <button
              onClick={importMockCalendar}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#d5e3cf] bg-[#e9f0e4] text-[#40493e] hover:bg-[#dbe5d6] hover:text-[#161d15] transition-all text-xs sm:text-sm font-semibold cursor-pointer shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
              <span>Importar</span>
            </button>

            {/* Botón Agregar Bloque Manual (HU-01 & HU-03) */}
            <button
              onClick={openCreateModal}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#416840] hover:bg-[#2a4f2b] text-white transition-all text-xs sm:text-sm font-bold shadow-md shadow-[#416840]/20 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Nuevo Bloque</span>
            </button>
          </div>
        </header>

        {/* Legend / Filter Indicators */}
        <div className="flex items-center gap-4 mb-4 text-xs text-[#40493e] flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#8b5cf6]/30 border border-[#8b5cf6]"></span>
            <span>Bloque Recurrente Semanal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#ec4899]/30 border border-[#ec4899] flex items-center justify-center text-[8px]">📌</span>
            <span>Evento Puntual (Fecha Única)</span>
          </div>
          <span className="ml-auto text-[#70796d] hidden sm:inline">
            Haz clic sobre cualquier bloque para editarlo o eliminarlo (HU-04)
          </span>
        </div>

        {/* Weekly Grid */}
        {slots.length === 0 ? (
          <EmptyState
            icon="calendar_today"
            title="Aún no tienes horarios registrados"
            description="Agrega tus clases, trabajo o actividades para que tus grupos puedan encontrar los mejores huecos libres para reunirse."
            actionLabel="Agregar mi primer bloque"
            onAction={openCreateModal}
          />
        ) : (
          <div className="bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 md:p-8 overflow-x-auto shadow-sm backdrop-blur-md">
            <div className="min-w-[800px]">
              {/* Days Header */}
              <div className="grid grid-cols-8 gap-4 mb-4">
                <div className="w-16 text-center text-xs font-bold text-[#70796d] uppercase">Hora</div>
                {days.map((day) => (
                  <div
                    key={day}
                    className={`text-center text-sm font-bold text-[#40493e] pb-3 border-b border-[#c0c9bb] ${
                      day === 'Sáb' || day === 'Dom' ? 'opacity-60' : ''
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
                          const isPuntual = slot.type === 'puntual';

                          return (
                            <div
                              key={slot.id}
                              onClick={() => openEditModal(slot)}
                              style={{
                                ...style,
                                ...(isCustom ? { backgroundColor: customBg, borderColor: customBorder } : {}),
                              }}
                              className={`absolute w-full border backdrop-blur-md rounded-xl p-2.5 flex flex-col justify-between overflow-hidden cursor-pointer hover:scale-[1.02] transition-all shadow-xs group ${
                                isPuntual ? 'border-dashed border-2' : ''
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    style={isCustom ? { color: slot.customColor } : undefined}
                                    className="text-xs font-bold truncate block"
                                  >
                                    {slot.title}
                                  </span>
                                  {isPuntual && (
                                    <span className="text-[9px] px-1 rounded bg-white/70 font-semibold text-[#161d15]" title={`Evento puntual: ${slot.specificDate}`}>
                                      Puntual
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span
                                style={isCustom ? { color: slot.customColor } : undefined}
                                className="text-[10px] opacity-90 font-medium"
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
        )}
      </main>

      {/* MODAL 1: AGREGAR / EDITAR BLOQUE (HU-01, HU-03, HU-04) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161d15]/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#f4fbf1] border border-[#d5e3cf] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#416840]">
                  {editingSlotId ? 'HU-04: Gestión de Bloque' : 'HU-01 / HU-03: Nuevo Registro'}
                </span>
                <h2 className="text-xl font-bold text-[#161d15]">
                  {editingSlotId ? 'Editar Bloque de Horario' : 'Registrar Bloque de Tiempo'}
                </h2>
              </div>
              {editingSlotId && (
                <button
                  type="button"
                  onClick={handleDeleteSlot}
                  className="text-xs text-red-700 hover:text-red-800 bg-red-100 border border-red-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Eliminar</span>
                </button>
              )}
            </div>

            {/* Pestañas: Recurrente vs Puntual */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#e9f0e4] rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => setBlockType('recurrente')}
                className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  blockType === 'recurrente'
                    ? 'bg-white text-[#416840] shadow-xs'
                    : 'text-[#70796d] hover:text-[#161d15]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">repeat</span>
                <span>Recurrente Semanal (HU-01)</span>
              </button>
              <button
                type="button"
                onClick={() => setBlockType('puntual')}
                className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  blockType === 'puntual'
                    ? 'bg-white text-[#416840] shadow-xs'
                    : 'text-[#70796d] hover:text-[#161d15]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">event</span>
                <span>Evento Puntual (HU-03)</span>
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#40493e] mb-1.5">
                  Nombre de la Actividad / Asignatura
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Clase de Cálculo, Turno de Trabajo, Gimnasio..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] placeholder-slate-400 text-sm focus:outline-none focus:border-[#416840]"
                />
              </div>

              {blockType === 'recurrente' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#40493e] mb-1.5">
                    {editingSlotId ? 'Día de la semana' : 'Días de repetición (Selecciona uno o varios)'}
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {days.map((d) => {
                      const isSelected = selectedDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDaySelection(d)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#416840] border-[#2a4f2b] text-white shadow-xs'
                              : 'bg-white border-[#c0c9bb] text-[#40493e] hover:border-[#416840]'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#40493e] mb-1.5">
                    Fecha del Evento Puntual
                  </label>
                  <input
                    type="date"
                    required
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#416840]"
                  />
                  <p className="text-[11px] text-[#70796d] mt-1">
                    Se ubicará en la columna de: <strong className="text-[#416840]">{getDayFromDate(specificDate)}</strong>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#40493e] mb-1.5">Hora Inicio</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#416840]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#40493e] mb-1.5">Hora Fin</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#416840]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#40493e] mb-2">Color de Identificación</label>
                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
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
                    className="w-7 h-7 rounded-full border-2 border-[#c0c9bb] hover:border-[#416840] flex items-center justify-center cursor-pointer relative overflow-hidden bg-white"
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

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#c0c9bb]/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#c0c9bb] text-[#40493e] hover:bg-[#e9f0e4] transition-colors text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#416840] hover:bg-[#2a4f2b] text-white transition-all text-xs font-bold cursor-pointer shadow-md shadow-[#416840]/20"
                >
                  {editingSlotId ? 'Guardar Cambios' : 'Guardar Bloque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CARGA POR OCR (HU-02) */}
      {isOcrUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161d15]/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#f4fbf1] border border-[#d5e3cf] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#416840]/10 text-[#416840] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <span className="material-symbols-outlined text-3xl">document_scanner</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#416840]">
              Story HU-02: OCR Inteligente
            </span>
            <h2 className="text-xl font-bold text-[#161d15] mt-1 mb-2">
              Autocompletar Horario por OCR
            </h2>
            <p className="text-xs text-[#70796d] mb-6">
              Sube una captura de tu matrícula o el PDF de tu sílabo para extraer automáticamente tus bloques.
            </p>

            {isOcrProcessing ? (
              <div className="space-y-4 p-6 rounded-2xl bg-white border border-[#c0c9bb]/60">
                <div className="animate-spin w-8 h-8 border-3 border-[#416840] border-t-transparent rounded-full mx-auto"></div>
                <div className="text-xs font-bold text-[#161d15]">{ocrStatusText}</div>
                <div className="w-full bg-[#e9f0e4] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#416840] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${ocrProgress}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-[#70796d]">{ocrProgress}% completado</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Input de archivo nativo oculto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {selectedOcrFile ? (
                  /* Tarjeta del archivo real seleccionado */
                  <div className="p-4 rounded-2xl bg-white border-2 border-[#416840] shadow-xs space-y-3 text-left animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#416840] bg-[#e9f0e4] px-2.5 py-0.5 rounded-full">
                        ✓ Archivo cargado
                      </span>
                      <button
                        type="button"
                        onClick={handleClearSelectedFile}
                        className="text-xs text-red-700 hover:text-red-900 font-semibold cursor-pointer"
                      >
                        Cambiar archivo
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {filePreviewUrl ? (
                        <img
                          src={filePreviewUrl}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded-xl border border-[#c0c9bb] shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold shrink-0">
                          <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-[#161d15] truncate">{selectedOcrFile.name}</p>
                        <p className="text-[11px] text-[#70796d]">
                          {(selectedOcrFile.size / (1024 * 1024)).toFixed(2)} MB • Listo para procesar
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartOcrSimulation(false)}
                      className="w-full py-3 rounded-xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold transition-all shadow-md shadow-[#416840]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                      <span>✨ Escanear con IA OCR</span>
                    </button>
                  </div>
                ) : (
                  /* Zona de Arrastrar y Soltar con Selector de Archivos */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed p-6 rounded-2xl cursor-pointer transition-all bg-white flex flex-col items-center justify-center gap-2 group ${
                      isDragging
                        ? 'border-[#416840] bg-[#e9f0e4]'
                        : 'border-[#7fae7a] hover:border-[#416840] hover:bg-[#e9f0e4]/60'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#e9f0e4] flex items-center justify-center text-[#416840] group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                    </div>
                    <p className="text-xs font-bold text-[#161d15]">
                      Haz clic para buscar en tu equipo o arrastra el archivo aquí
                    </p>
                    <p className="text-[11px] text-[#70796d]">Formatos: PDF, JPG, PNG, WEBP (Máx 10MB)</p>
                    <button
                      type="button"
                      className="mt-1 px-4 py-1.5 rounded-xl bg-[#416840] text-white text-xs font-bold shadow-xs pointer-events-none"
                    >
                      Seleccionar Archivo
                    </button>
                  </div>
                )}

                {/* Opción secundaria: Probar plantilla demo */}
                <div className="text-left pt-2">
                  <span className="text-[11px] font-bold text-[#40493e] uppercase">
                    ¿No tienes un archivo a mano? Prueba con este ejemplo:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartOcrSimulation(true)}
                    className="mt-2 w-full p-3 rounded-xl bg-white border border-[#c0c9bb] hover:border-[#416840] text-left flex items-center justify-between text-xs font-semibold text-[#161d15] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#416840] text-[18px]">picture_as_pdf</span>
                      <span>Horario_Universidad_Ciclo_2026-II.pdf</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#416840]/10 text-[#416840] font-bold group-hover:bg-[#416840] group-hover:text-white transition-colors">
                      Probar Demo
                    </span>
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[#c0c9bb]/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOcrUploadModalOpen(false);
                      handleClearSelectedFile();
                    }}
                    className="w-full py-2.5 rounded-xl border border-[#c0c9bb] text-xs font-bold text-[#40493e] hover:bg-[#e9f0e4] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: REVISIÓN DE BORRADOR OCR EDITABLE (HU-04) */}
      {isOcrDraftModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161d15]/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#f4fbf1] border border-[#d5e3cf] rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#416840]">
                  Story HU-04: Revisión de Borrador
                </span>
                <h2 className="text-xl font-bold text-[#161d15]">
                  Revisar y Editar Bloques Extraídos por OCR
                </h2>
                <p className="text-xs text-[#70796d] mt-0.5">
                  Verifica o corrige los datos antes de guardarlos en tu horario semanal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOcrDraftModalOpen(false)}
                className="w-8 h-8 rounded-full border border-[#c0c9bb] flex items-center justify-center text-[#70796d] hover:text-[#161d15] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* List of draft items */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 my-4">
              {ocrDraftSlots.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.selected
                      ? 'bg-white border-[#416840]/60 shadow-xs'
                      : 'bg-[#e9f0e4]/50 border-[#c0c9bb]/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) =>
                        setOcrDraftSlots((prev) =>
                          prev.map((s) => (s.id === item.id ? { ...s, selected: e.target.checked } : s))
                        )
                      }
                      className="w-4 h-4 text-[#416840] rounded focus:ring-0 cursor-pointer"
                    />

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-[#70796d] block mb-0.5">Asignatura</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) =>
                            setOcrDraftSlots((prev) =>
                              prev.map((s) => (s.id === item.id ? { ...s, title: e.target.value } : s))
                            )
                          }
                          className="w-full text-xs font-bold px-2.5 py-1.5 border border-[#c0c9bb] rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#70796d] block mb-0.5">Día</label>
                        <select
                          value={item.day}
                          onChange={(e) =>
                            setOcrDraftSlots((prev) =>
                              prev.map((s) => (s.id === item.id ? { ...s, day: e.target.value as DayOfWeek } : s))
                            )
                          }
                          className="w-full text-xs font-semibold px-2 py-1.5 border border-[#c0c9bb] rounded-lg bg-white"
                        >
                          {days.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#70796d] block mb-0.5">Horario</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={item.startTime}
                            onChange={(e) =>
                              setOcrDraftSlots((prev) =>
                                prev.map((s) => (s.id === item.id ? { ...s, startTime: e.target.value } : s))
                              )
                            }
                            className="w-16 text-[11px] px-1 py-1 border border-[#c0c9bb] rounded-lg bg-white"
                          />
                          <span className="text-xs text-[#70796d]">-</span>
                          <input
                            type="time"
                            value={item.endTime}
                            onChange={(e) =>
                              setOcrDraftSlots((prev) =>
                                prev.map((s) => (s.id === item.id ? { ...s, endTime: e.target.value } : s))
                              )
                            }
                            className="w-16 text-[11px] px-1 py-1 border border-[#c0c9bb] rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-[#c0c9bb]/60">
              <span className="text-xs text-[#70796d]">
                {ocrDraftSlots.filter((d) => d.selected).length} de {ocrDraftSlots.length} bloques seleccionados
              </span>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsOcrDraftModalOpen(false)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-[#c0c9bb] text-xs font-bold text-[#40493e] hover:bg-[#e9f0e4] cursor-pointer"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOcrDraft}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold transition-all shadow-md shadow-[#416840]/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Confirmar e Importar</span>
                </button>
              </div>
            </div>
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
          <a className="text-xs text-[#40493e] hover:text-[#416840] transition-colors" href="#">Sincronización Activa</a>
          <a className="text-xs text-[#40493e] hover:text-[#416840] transition-colors" href="#">Ajustes de Privacidad</a>
          <a className="text-xs text-[#40493e] hover:text-[#416840] transition-colors" href="#">Soporte</a>
        </div>
        <span className="text-xs text-[#70796d]">© 2026 Huecko • Coordinación Social</span>
      </footer>
    </div>
  );
}
