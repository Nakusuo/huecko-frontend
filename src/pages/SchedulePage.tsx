import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import { processScheduleOcr } from '../services/ocrService';
import type { OcrExtractedSlot } from '../services/ocrService';
import { useScheduleStore } from '../store/scheduleStore';
import type { DayOfWeek, TimeSlot } from '../store/scheduleStore';

const days: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const PRESET_COLORS = [
  { name: 'Bosque', hex: '#54735a' },
  { name: 'Pizarra', hex: '#5e7383' },
  { name: 'Arcilla', hex: '#a9674c' },
  { name: 'Oliva', hex: '#8b8a5a' },
  { name: 'Ciruela', hex: '#765b73' },
  { name: 'Terracota', hex: '#ad5c51' },
];

const RECURRENT_TAGS = ['Clase', 'Turno', 'Estudio', 'Gimnasio', 'Personal'];
const PUNTUAL_TAGS = ['Cita Médica', 'Viaje', 'Examen', 'Trámite', 'Evento Especial'];

export default function SchedulePage() {
  const { slots, setSlots, deleteSlot, addSlot, updateSlot, addMultipleSlots, fetchSchedule, isLoading } = useScheduleStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchSchedule(user?.id);
  }, [user?.id, fetchSchedule]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Form states for manual creation/edit
  const [blockType, setBlockType] = useState<'recurrente' | 'puntual'>('recurrente');
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState('Clase');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['Lun']);
  const [specificDate, setSpecificDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [specificEndDate, setSpecificEndDate] = useState('');
  const [isDateRange, setIsDateRange] = useState(false);
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
  const [ocrDraftSlots, setOcrDraftSlots] = useState<OcrExtractedSlot[]>([]);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const timeLabels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

  const getPositionStyles = (
    startTime: string,
    endTime: string
  ) => {
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);

    const startHour = sH + sM / 60;
    const endHour = eH + eM / 60;
    const minHour = 8;
    const totalHours = 12;

    const topPercent = Math.max(
      0,
      ((startHour - minHour) / totalHours) * 100
    );
    const heightPercent = Math.min(
      100 - topPercent,
      Math.max(8, ((endHour - startHour) / totalHours) * 100)
    );

    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`,
    };
  };

  // Convert date string to DayOfWeek
  const getDayFromDate = (dateStr: string): DayOfWeek => {
    if (!dateStr) return 'Lun';
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
    setNewTag('Clase');
    setSelectedDays(['Lun']);
    setSpecificDate(new Date().toISOString().split('T')[0]);
    setSpecificEndDate('');
    setIsDateRange(false);
    setNewStartTime('08:00');
    setNewEndTime('10:00');
    setSelectedColor('#8b5cf6');
    setIsModalOpen(true);
  };

  const openEditModal = (slot: TimeSlot) => {
    setEditingSlotId(slot.id);
    const type = slot.type || 'recurrente';
    setBlockType(type);
    setNewTitle(slot.title);
    setNewTag(slot.tag || (type === 'recurrente' ? 'Clase' : 'Cita Médica'));
    setSelectedDays([slot.day]);
    setSpecificDate(slot.specificDate || new Date().toISOString().split('T')[0]);
    setSpecificEndDate(slot.specificEndDate || '');
    setIsDateRange(Boolean(slot.specificEndDate));
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

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    if (blockType === 'puntual') {
      const assignedDay = getDayFromDate(specificDate);
      if (editingSlotId) {
        await updateSlot(
          editingSlotId,
          {
            title: newTitle,
            tag: newTag,
            day: assignedDay,
            startTime: newStartTime,
            endTime: newEndTime,
            customColor: selectedColor,
            type: 'puntual',
            frequency: 'unica',
            specificDate,
            specificEndDate: isDateRange ? specificEndDate : undefined,
          },
          user?.id
        );
        showToast('Bloque puntual actualizado correctamente.');
      } else {
        await addSlot(
          {
            title: newTitle,
            tag: newTag,
            day: assignedDay,
            startTime: newStartTime,
            endTime: newEndTime,
            colorClass: '',
            textColorClass: '',
            customColor: selectedColor,
            type: 'puntual',
            frequency: 'unica',
            specificDate,
            specificEndDate: isDateRange ? specificEndDate : undefined,
          },
          user?.id
        );
        showToast('Evento puntual registrado en tu horario.');
      }
    } else {
      // Bloque recurrente.
      if (selectedDays.length === 0) return;
      if (editingSlotId) {
        await updateSlot(
          editingSlotId,
          {
            title: newTitle,
            tag: newTag,
            day: selectedDays[0],
            startTime: newStartTime,
            endTime: newEndTime,
            customColor: selectedColor,
            type: 'recurrente',
            frequency: 'semanal',
          },
          user?.id
        );
        showToast('Bloque recurrente semanal actualizado.');
      } else {
        const newSlotsData: Omit<TimeSlot, 'id'>[] = selectedDays.map((day) => ({
          title: newTitle,
          tag: newTag,
          day,
          startTime: newStartTime,
          endTime: newEndTime,
          colorClass: '',
          textColorClass: '',
          customColor: selectedColor,
          type: 'recurrente',
          frequency: 'semanal',
        }));
        await addMultipleSlots(newSlotsData, user?.id);
        showToast(`${newSlots.length} bloque(s) recurrente(s) semanal(es) registrado(s).`);
      }
    }

    setIsModalOpen(false);
  };

  const handleDeleteSlot = async () => {
    if (!editingSlotId) return;
    await deleteSlot(editingSlotId, user?.id);
    setIsModalOpen(false);
    showToast('Bloque eliminado de tu horario.');
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

  // OCR Processing Execution (PDF.js + Tesseract)
  const handleStartOcr = async () => {
    setIsOcrProcessing(true);
    setOcrProgress(10);

    if (!selectedOcrFile) {
      setIsOcrProcessing(false);
      showToast('Selecciona una imagen o PDF primero.');
      return;
    }

    try {
      setOcrStatusText(
        `Escaneando "${selectedOcrFile.name}"...`
      );
      const { slots: extractedSlots } =
        await processScheduleOcr(
          selectedOcrFile,
          (progress, msg) => {
            setOcrProgress(progress);
            setOcrStatusText(msg);
          }
        );

      if (extractedSlots.length === 0) {
        setIsOcrProcessing(false);
        setOcrProgress(0);
        showToast('No se detectaron bloques legibles.');
        return;
      }

      setIsOcrProcessing(false);
      setIsOcrUploadModalOpen(false);
      setOcrDraftSlots(extractedSlots);
      setIsOcrDraftModalOpen(true);
      setOcrProgress(0);
      handleClearSelectedFile();
    } catch (err) {
      console.error('Error procesando OCR:', err);
      setIsOcrProcessing(false);
      setOcrProgress(0);
      showToast('Error al leer el archivo. Intenta de nuevo.');
    }
  };

  // Ayudantes para editar borradores
  const handleAddDraftRow = () => {
    const newDraft: OcrExtractedSlot = {
      id: `draft-manual-${Date.now()}`,
      title: 'Nueva Asignatura / Bloque',
      day: 'Lun',
      startTime: '08:00',
      endTime: '10:00',
      customColor: '#8b5cf6',
      selected: true,
      tag: 'Clase',
    };
    setOcrDraftSlots((prev) => [...prev, newDraft]);
  };

  const handleDeleteDraftRow = (id: string) => {
    setOcrDraftSlots((prev) =>
      prev.filter((d) => d.id !== id)
    );
  };

  // Confirmar importación de borrador OCR
  const handleConfirmOcrDraft = async () => {
    const selectedDrafts = ocrDraftSlots.filter(
      (d) => d.selected
    );
    if (selectedDrafts.length === 0) return;

    const importedSlotsData: Omit<TimeSlot, 'id'>[] = selectedDrafts.map(
      (d) => ({
        title: d.title,
        tag: d.tag || 'Clase',
        day: d.day,
        startTime: d.startTime,
        endTime: d.endTime,
        colorClass: '',
        textColorClass: '',
        customColor: d.customColor,
        type: 'recurrente',
        frequency: 'semanal',
        isOcrImported: true,
      })
    );

    await addMultipleSlots(importedSlotsData, user?.id);
    setIsOcrDraftModalOpen(false);
    showToast(
      `¡Se importaron ${importedSlotsData.length} asignaturas!`
    );
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
                Módulo 1: Agendas & Disponibilidad
              </span>
              <span className="text-xs text-[#70796d] font-medium">
                {slots.length} bloques registrados
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#161d15] font-headline">
              Mi Horario
            </h1>
            <p className="text-[#40493e] text-sm md:text-base">
              Define tus bloques recurrentes o eventos puntuales, o importa tu horario/sílabo tabular vía OCR.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {/* Importar OCR */}
            <button
              onClick={() => setIsOcrUploadModalOpen(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#d5e3cf] bg-[#e9f0e4] text-[#40493e] hover:bg-[#dbe5d6] hover:text-[#161d15] transition-all text-xs sm:text-sm font-semibold cursor-pointer shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px] text-[#416840]">document_scanner</span>
              <span>Importar OCR</span>
            </button>
            {/* Agregar bloque manual */}
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
        <div className="flex items-center gap-4 mb-4 text-xs text-[#40493e] flex-wrap bg-white/60 p-3 rounded-2xl border border-[#d5e3cf]/60">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#8b5cf6]/30 border border-[#8b5cf6]"></span>
            <span>Bloque recurrente semanal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#ec4899]/30 border border-dashed border-[#ec4899]"></span>
            <span>Evento puntual (fecha única o rango)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.2 rounded bg-[#416840]/15 text-[#416840] font-bold text-[10px]">OCR</span>
            <span>Extraído por OCR</span>
          </div>
          <span className="ml-auto text-[#70796d] hidden sm:inline text-[11px]">
            Haz clic sobre cualquier bloque para <strong>editarlo o eliminarlo</strong>
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
                      day === 'Sáb' || day === 'Dom' ? 'opacity-70' : ''
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid Body */}
              <div className="relative h-[620px]">
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
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span
                                    style={isCustom ? { color: slot.customColor } : undefined}
                                    className="text-xs font-bold truncate block"
                                  >
                                    {slot.title}
                                  </span>
                                  {isPuntual && (
                                    <span
                                      className="text-[9px] px-1 rounded bg-white/80 font-bold text-[#161d15] shrink-0"
                                      title={slot.specificEndDate ? `Rango: ${slot.specificDate} al ${slot.specificEndDate}` : `Fecha: ${slot.specificDate}`}
                                    >
                                      Puntual
                                    </span>
                                  )}
                                </div>
                                {slot.tag && (
                                  <span className="text-[9px] text-[#70796d] font-semibold block truncate">
                                    {slot.tag}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[10px] opacity-90 font-medium">
                                <span style={isCustom ? { color: slot.customColor } : undefined}>
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                {slot.isOcrImported && (
                                  <span className="text-[8px] uppercase tracking-wider font-bold text-[#416840] bg-[#e9f0e4] px-1 rounded">
                                    OCR
                                  </span>
                                )}
                              </div>
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

      {/* Modal para agregar o editar un bloque */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161d15]/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#f4fbf1] border border-[#d5e3cf] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#416840]">
                  {editingSlotId ? 'Editar o eliminar bloque' : 'Registrar bloque'}
                </span>
                <h2 className="text-xl font-bold text-[#161d15]">
                  {editingSlotId ? 'Editar Bloque de Horario' : 'Registrar Bloque de Tiempo'}
                </h2>
              </div>
              {editingSlotId && (
                <button
                  type="button"
                  onClick={handleDeleteSlot}
                  className="text-xs text-red-700 hover:text-red-800 bg-red-100 border border-red-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Eliminar</span>
                </button>
              )}
            </div>

            {/* Tipo de bloque */}
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
                <span>Recurrente semanal</span>
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
                <span>Evento puntual</span>
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="flex flex-col gap-4">
              {/* Etiqueta / Nombre */}
              <div>
                <label className="block text-xs font-semibold text-[#40493e] mb-1.5">
                  Etiqueta / Nombre del Bloque
                </label>
                <input
                  type="text"
                  required
                  placeholder={blockType === 'recurrente' ? 'Ej. Clase de Cálculo, Turno de Trabajo...' : 'Ej. Cita Médica, Viaje a Trujillo, Examen...'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] placeholder-slate-400 text-sm focus:outline-none focus:border-[#416840]"
                />
              </div>

              {/* Categoría / Tag rápido */}
              <div>
                <label className="block text-xs font-semibold text-[#40493e] mb-1.5">
                  Tipo de Actividad / Categoría
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {(blockType === 'recurrente' ? RECURRENT_TAGS : PUNTUAL_TAGS).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewTag(tag)}
                      className={`px-3 py-1 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                        newTag === tag
                          ? 'bg-[#416840] border-[#2a4f2b] text-white shadow-xs'
                          : 'bg-white border-[#c0c9bb] text-[#40493e] hover:border-[#416840]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Días de repetición o fechas puntuales */}
              {blockType === 'recurrente' ? (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#40493e]">
                      {editingSlotId ? 'Día de la semana' : 'Día(s) de repetición semanal'}
                    </label>
                    <span className="text-[10px] font-bold text-[#416840] bg-[#e9f0e4] px-2 py-0.5 rounded-full">
                      Frecuencia: Semanal
                    </span>
                  </div>
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#40493e]">
                      Fecha del Evento Puntual
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-[#40493e] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDateRange}
                        onChange={(e) => setIsDateRange(e.target.checked)}
                        className="rounded text-[#416840] focus:ring-0 cursor-pointer"
                      />
                      <span>¿Es un rango de fechas? (ej. viaje)</span>
                    </label>
                  </div>

                  <div className={`grid ${isDateRange ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    <div>
                      <span className="text-[10px] font-bold text-[#70796d] block mb-1">
                        {isDateRange ? 'Fecha Inicio' : 'Fecha'}
                      </span>
                      <input
                        type="date"
                        required
                        value={specificDate}
                        onChange={(e) => setSpecificDate(e.target.value)}
                        className="w-full px-3 py-2 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-xs focus:outline-none focus:border-[#416840]"
                      />
                    </div>
                    {isDateRange && (
                      <div>
                        <span className="text-[10px] font-bold text-[#70796d] block mb-1">
                          Fecha Fin
                        </span>
                        <input
                          type="date"
                          value={specificEndDate}
                          onChange={(e) => setSpecificEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-xs focus:outline-none focus:border-[#416840]"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-[#70796d]">
                    Columna en cuadrícula semanal: <strong className="text-[#416840]">{getDayFromDate(specificDate)}</strong> (Ocurrencia única)
                  </p>
                </div>
              )}

              {/* Horas de Inicio y Fin */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#40493e] mb-1.5">Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#416840]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#40493e] mb-1.5">Hora Fin</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#416840]"
                  />
                </div>
              </div>

              {/* Color */}
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

      {/* Modal de carga por OCR */}
      {isOcrUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161d15]/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#f4fbf1] border border-[#d5e3cf] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#416840]/10 text-[#416840] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <span className="material-symbols-outlined text-3xl">document_scanner</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#416840]">
              OCR inteligente de horarios
            </span>
            <h2 className="text-xl font-bold text-[#161d15] mt-1 mb-2">
              Autocompletar Horario por OCR
            </h2>
            <p className="text-xs text-[#70796d] mb-6">
              Sube una foto o PDF de tu horario universitario/laboral. El sistema identificará asignaturas, días y rangos horarios.
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
                        ✓ Archivo listo
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
                      onClick={handleStartOcr}
                      className="w-full py-3 rounded-xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold transition-all shadow-md shadow-[#416840]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                      <span>✨ Extraer Horarios con IA OCR</span>
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
                      Haz clic para buscar o arrastra una foto o PDF aquí
                    </p>
                    <p className="text-[11px] text-[#70796d]">Soporta: PDF, JPG, PNG, WEBP (Hasta 10MB)</p>
                    <button
                      type="button"
                      className="mt-1 px-4 py-1.5 rounded-xl bg-[#416840] text-white text-xs font-bold shadow-xs pointer-events-none"
                    >
                      Seleccionar Archivo
                    </button>
                  </div>
                )}

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

      {/* Modal de revisión del borrador OCR */}
      {isOcrDraftModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161d15]/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#f4fbf1] border border-[#d5e3cf] rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#416840]">
                  Revisión de borrador
                </span>
                <h2 className="text-xl font-bold text-[#161d15]">
                  Revisar y Editar Bloques Extraídos por OCR
                </h2>
                <p className="text-xs text-[#70796d] mt-0.5">
                  Toda la información permanece en <strong>estado borrador</strong> hasta que la confirmes. Corrige títulos, días u horarios según sea necesario.
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
            <div className="space-y-3 overflow-y-auto pr-1 my-4 flex-1">
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
                        <label className="text-[10px] font-bold text-[#70796d] block mb-0.5">Asignatura / Actividad</label>
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

                    <button
                      type="button"
                      onClick={() => handleDeleteDraftRow(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar de borrador"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Agregar fila al borrador */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleAddDraftRow}
                className="w-full py-2 border-2 border-dashed border-[#7fae7a] hover:border-[#416840] hover:bg-[#e9f0e4] text-[#416840] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>+ Agregar Fila Manual al Borrador</span>
              </button>
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
                  Descartar Borrador
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
