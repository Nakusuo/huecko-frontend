import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import type { OcrExtractedSlot } from '../services/ocrService';
import { provisionalId, useScheduleStore } from '../store/scheduleStore';
import type { DayOfWeek, TimeSlot } from '../store/scheduleStore';
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '../theme/palette';
import { useAvisoEfimero } from '../hooks/useAvisoEfimero';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { HueckoMark } from '../components/Pixel';
import { AvisoError } from '../components/AvisoError';
import {
  buscarSolape,
  diaDeFecha,
  esPuntual,
  etiquetaSemana,
  fechaLocalIso,
  fechasDeSemana,
  inicioDeSemana,
  mensajeSolape,
  ocupaFecha,
  rangoRejilla,
  separarRepetidos,
  sumarDias,
  validarBloque,
} from '../lib/horario';

const days: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Las filas del borrador OCR se importan como bloques semanales. */
type BloqueRecurrente = Pick<TimeSlot, 'type' | 'frequency'>;

const RECURRENT_TAGS = ['Clase', 'Turno', 'Estudio', 'Gimnasio', 'Personal'];
const PUNTUAL_TAGS = ['Cita Médica', 'Viaje', 'Examen', 'Trámite', 'Evento Especial'];

export default function SchedulePage() {
  const { slots, setSlots, deleteSlot, pendientes, error: syncError, clearError } = useScheduleStore();
  /* La rejilla representa una semana concreta y no "una semana cualquiera":
     sin fechas, un evento puntual se pintaba todas las semanas para siempre. */
  const hoy = fechaLocalIso();
  const [semana, setSemana] = useState(() => inicioDeSemana(fechaLocalIso()));
  const fechasSemana = useMemo(() => fechasDeSemana(semana), [semana]);
  const esSemanaActual = semana === inicioDeSemana(hoy);
  const bloquesDe = (fecha: string) =>
    slots.filter((s) => ocupaFecha(s, fecha)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const bloquesSemana = useMemo(
    () => slots.filter((s) => fechasSemana.some(({ fecha }) => ocupaFecha(s, fecha))),
    [slots, fechasSemana]
  );
  const rejilla = rangoRejilla(bloquesSemana);
  /* En el móvil la rejilla semanal obligaba a arrastrar 800 px a lo ancho para
     leer un solo día. La vista pequeña es una lista de un día a la vez. */
  const [mobileDay, setMobileDay] = useState<DayOfWeek>(() => diaDeFecha(fechaLocalIso()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Form states for manual creation/edit
  const [blockType, setBlockType] = useState<'recurrente' | 'puntual'>('recurrente');
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState('Clase');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['Lun']);
  const [specificDate, setSpecificDate] = useState(() => fechaLocalIso());
  const [specificEndDate, setSpecificEndDate] = useState('');
  const [isDateRange, setIsDateRange] = useState(false);
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [isSaving, setIsSaving] = useState(false);

  /* El error se retira en cuanto se toca el formulario: si sigue ahí después de
     corregir la hora, parece que la corrección no ha servido. Se guarda junto a
     una huella de los campos y solo se muestra mientras la huella coincide. */
  const huellaFormulario = JSON.stringify([
    blockType, newTitle, selectedDays, specificDate, specificEndDate, isDateRange, newStartTime, newEndTime,
  ]);
  const [errorGuardado, setErrorGuardado] = useState<{ mensaje: string; huella: string } | null>(null);
  const formError = errorGuardado?.huella === huellaFormulario ? errorGuardado.mensaje : null;
  const setFormError = (mensaje: string | null) =>
    setErrorGuardado(mensaje ? { mensaje, huella: huellaFormulario } : null);

  // OCR Modal states
  /* «Importar horario» desde el inicio llega como `?importar=1` y abre
     directamente la subida del OCR. El parámetro se quita al montar para que
     recargar o volver atrás no reabra el diálogo. */
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOcrUploadModalOpen, setIsOcrUploadModalOpen] = useState(() => searchParams.get('importar') === '1');
  useEffect(() => {
    if (!searchParams.has('importar')) return;
    const resto = new URLSearchParams(searchParams);
    resto.delete('importar');
    setSearchParams(resto, { replace: true });
  }, [searchParams, setSearchParams]);
  const [selectedOcrFile, setSelectedOcrFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [isOcrDraftModalOpen, setIsOcrDraftModalOpen] = useState(false);

  const [ocrDraftSlots, setOcrDraftSlots] = useState<OcrExtractedSlot[]>([]);
  /** Filas que el OCR leyó pero ya estaban en el horario (o repetidas en la foto). */
  const [ocrDescartadas, setOcrDescartadas] = useState(0);
  const [ocrDraftError, setOcrDraftError] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, showToast] = useAvisoEfimero<string>();

  /* El preview también se revoca al salir de la pantalla: sin esto, el último
     quedaba retenido aunque nadie fuera a mirarlo. La ref evita que el efecto se
     rearme con cada archivo elegido. */
  const previewVigente = useRef<string | null>(null);
  useEffect(() => {
    previewVigente.current = filePreviewUrl;
  }, [filePreviewUrl]);
  useEffect(
    () => () => {
      if (previewVigente.current) URL.revokeObjectURL(previewVigente.current);
    },
    [],
  );

  // Escape cierra el diálogo y el fondo deja de desplazarse mientras está abierto.
  useModalDismiss(isModalOpen, () => setIsModalOpen(false));
  useModalDismiss(isOcrUploadModalOpen, () => setIsOcrUploadModalOpen(false));
  useModalDismiss(isOcrDraftModalOpen, () => setIsOcrDraftModalOpen(false));


  /* Marcas cada dos horas dentro del rango que piden los bloques de la semana.
     Con el rango fijo 08–20, un bloque a las 06:00 se pegaba arriba del todo y
     uno a las 21:00 se salía de la rejilla. */
  const totalHoras = rejilla.fin - rejilla.inicio;
  const timeLabels = Array.from({ length: totalHoras / 2 + 1 }, (_, i) => {
    const hora = rejilla.inicio + i * 2;
    return `${hora.toString().padStart(2, '0')}:00`;
  });

  const getPositionStyles = (startTime: string, endTime: string) => {
    const startHour = parseInt(startTime.split(':')[0], 10) + parseInt(startTime.split(':')[1], 10) / 60;
    const endHour = parseInt(endTime.split(':')[0], 10) + parseInt(endTime.split(':')[1], 10) / 60;

    const topPercent = Math.max(0, ((startHour - rejilla.inicio) / totalHoras) * 100);
    const heightPercent = Math.min(100 - topPercent, Math.max(4, ((endHour - startHour) / totalHoras) * 100));

    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`,
    };
  };

  /** Un bloque con el POST en curso aún no tiene id del servidor: no se puede tocar. */
  const estaGuardando = (slot: TimeSlot) => pendientes.includes(slot.id);

  const openCreateModal = () => {
    setEditingSlotId(null);
    setBlockType('recurrente');
    setNewTitle('');
    setNewTag('Clase');
    setSelectedDays(['Lun']);
    setSpecificDate(fechaLocalIso());
    setSpecificEndDate('');
    setIsDateRange(false);
    setNewStartTime('08:00');
    setNewEndTime('10:00');
    setSelectedColor(DEFAULT_CATEGORY_COLOR);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (slot: TimeSlot) => {
    if (estaGuardando(slot)) {
      showToast('Este bloque aún se está guardando. Espera un momento para editarlo.');
      return;
    }
    setEditingSlotId(slot.id);
    const type = slot.type || 'recurrente';
    setBlockType(type);
    setNewTitle(slot.title);
    setNewTag(slot.tag || (type === 'recurrente' ? 'Clase' : 'Cita Médica'));
    setSelectedDays([slot.day]);
    setSpecificDate(slot.specificDate || fechaLocalIso());
    setSpecificEndDate(slot.specificEndDate || '');
    setIsDateRange(Boolean(slot.specificEndDate));
    setNewStartTime(slot.startTime);
    setNewEndTime(slot.endTime);
    setSelectedColor(slot.customColor || DEFAULT_CATEGORY_COLOR);
    setFormError(null);
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
    if (isSaving) return;

    const title = newTitle.trim();
    const comun = { title, tag: newTag, startTime: newStartTime, endTime: newEndTime, customColor: selectedColor };

    // Uno por día elegido; al editar, o si es puntual, siempre es uno.
    const candidatos: Omit<TimeSlot, 'id'>[] =
      blockType === 'puntual'
        ? [
            {
              ...comun,
              day: diaDeFecha(specificDate),
              type: 'puntual',
              frequency: 'unica',
              specificDate,
              specificEndDate: isDateRange ? specificEndDate : undefined,
            },
          ]
        : (editingSlotId ? selectedDays.slice(0, 1) : selectedDays).map((day) => ({
            ...comun,
            day,
            type: 'recurrente',
            frequency: 'semanal',
            specificDate: undefined,
            specificEndDate: undefined,
          }));

    if (candidatos.length === 0) {
      setFormError('Elige al menos un día de la semana.');
      return;
    }

    for (const candidato of candidatos) {
      const invalido = validarBloque(candidato, { rangoActivo: blockType === 'puntual' && isDateRange });
      if (invalido) {
        setFormError(invalido);
        return;
      }
      // El bloque que se edita no puede chocar consigo mismo.
      const conflicto = buscarSolape(candidato, slots, editingSlotId);
      if (conflicto) {
        setFormError(mensajeSolape(conflicto));
        return;
      }
    }

    setIsSaving(true);
    const guardado = editingSlotId
      ? await setSlots((prev) =>
          prev.map((slot) => (slot.id === editingSlotId ? { ...slot, ...candidatos[0] } : slot))
        )
      : await setSlots((prev) => [
          ...prev,
          ...candidatos.map((candidato) => ({ ...candidato, id: provisionalId('slot-manual') })),
        ]);
    setIsSaving(false);

    // Con backend, el éxito solo se anuncia cuando el servidor lo confirma.
    if (!guardado) {
      setFormError(useScheduleStore.getState().error ?? 'No se pudo guardar el bloque. Inténtalo de nuevo.');
      return;
    }

    setIsModalOpen(false);
    if (blockType === 'puntual') {
      showToast(editingSlotId ? 'Bloque puntual actualizado correctamente.' : 'Evento puntual registrado en tu horario.');
    } else {
      showToast(
        editingSlotId
          ? 'Bloque recurrente semanal actualizado.'
          : `${candidatos.length} bloque(s) recurrente(s) semanal(es) registrado(s).`
      );
    }
  };

  const handleDeleteSlot = async () => {
    if (!editingSlotId || isSaving) return;
    setIsSaving(true);
    const borrado = await deleteSlot(editingSlotId);
    setIsSaving(false);
    if (!borrado) {
      setFormError(useScheduleStore.getState().error ?? 'No se pudo eliminar el bloque. Inténtalo de nuevo.');
      return;
    }
    setIsModalOpen(false);
    showToast('Bloque eliminado de tu horario.');
  };

  // File Handlers for Real Upload
  const handleFileSelect = (file: File) => {
    setSelectedOcrFile(file);
    /* Se revoca el anterior antes de pisarlo. Elegir una segunda imagen sin
       pasar por «quitar» dejaba el primer blob retenido por el navegador hasta
       recargar la página, y un horario escaneado no es un archivo pequeño. */
    setFilePreviewUrl((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    });
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

  // OCR Processing Execution (PDF.js + Tesseract Engine)
  const handleStartOcr = async () => {
    setIsOcrProcessing(true);
    setOcrProgress(10);

    if (!selectedOcrFile) {
      setIsOcrProcessing(false);
      showToast('Selecciona una imagen o PDF antes de iniciar la lectura.');
      return;
    }

    try {
      setOcrStatusText(`Preparando el lector de horarios...`);
      const { processScheduleOcr } = await import('../services/ocrService');

      setOcrStatusText(`Iniciando escaneo de "${selectedOcrFile.name}"...`);
      const { slots: extractedSlots } = await processScheduleOcr(
        selectedOcrFile,
        (progressPercent, statusMsg) => {
          setOcrProgress(progressPercent);
          setOcrStatusText(statusMsg);
        }
      );

      if (extractedSlots.length === 0) {
        setIsOcrProcessing(false);
        setOcrProgress(0);
        showToast('No pudimos reconocer bloques. Prueba con una imagen nítida, recta y donde se vean días y horas.');
        return;
      }

      /* Importar dos veces la misma foto duplicaba todo el horario. Las filas
         que ya están (o que se repiten dentro de la propia foto) se descartan
         aquí. Las que hay que revisar se dejan: su día u hora son de relleno
         y el choque no significaría nada hasta que el usuario las corrija. */
      const { aceptados, descartados } = separarRepetidos(
        extractedSlots.filter((fila) => !fila.revisar),
        slots
      );
      const descartadosIds = new Set(descartados.map((fila) => fila.id));
      const filas = extractedSlots.filter((fila) => !descartadosIds.has(fila.id));

      setIsOcrProcessing(false);
      setOcrProgress(0);

      if (aceptados.length === 0 && filas.length === 0) {
        showToast(
          `Las ${descartados.length} filas leídas ya estaban en tu horario (o se solapan con él). No hay nada nuevo que importar.`
        );
        return;
      }

      setIsOcrUploadModalOpen(false);
      setOcrDraftSlots(filas);
      setOcrDescartadas(descartados.length);
      setOcrDraftError(null);
      setIsOcrDraftModalOpen(true);
      setOcrProgress(0);
      handleClearSelectedFile();
    } catch (err) {
      console.error('Error procesando OCR:', err);
      setIsOcrProcessing(false);
      setOcrProgress(0);
      showToast('No se pudo leer el archivo. Verifica que sea una imagen o PDF válido e inténtalo de nuevo.');
    }
  };

  // Ayudantes para editar borradores.
  const handleAddDraftRow = () => {
    const newDraft: OcrExtractedSlot = {
      id: `draft-manual-${Date.now()}`,
      title: 'Nueva Asignatura / Bloque',
      day: 'Lun',
      startTime: '08:00',
      endTime: '10:00',
      customColor: DEFAULT_CATEGORY_COLOR,
      selected: true,
      tag: 'Clase',
    };
    setOcrDraftSlots((prev) => [...prev, newDraft]);
  };

  const handleDeleteDraftRow = (id: string) => {
    setOcrDraftSlots((prev) => prev.filter((d) => d.id !== id));
  };

  /* Qué impide importar cada fila marcada: datos inválidos o un choque con el
     horario o con otra fila marcada anterior. Se calcula en cada render para
     que el aviso desaparezca en cuanto el usuario corrige la fila. */
  const draftErrors = useMemo(() => {
    const errores: Record<string, string> = {};
    const anteriores: (OcrExtractedSlot & BloqueRecurrente)[] = [];
    for (const fila of ocrDraftSlots) {
      if (!fila.selected) continue;
      const bloque = { ...fila, type: 'recurrente', frequency: 'semanal' } as OcrExtractedSlot & BloqueRecurrente;
      const invalido = validarBloque(bloque);
      const conflicto = invalido ? null : buscarSolape(bloque, [...slots, ...anteriores]);
      if (invalido) errores[fila.id] = invalido;
      else if (conflicto) errores[fila.id] = mensajeSolape(conflicto);
      else anteriores.push(bloque);
    }
    return errores;
  }, [ocrDraftSlots, slots]);
  const draftErrorCount = Object.keys(draftErrors).length;

  const updateDraftRow = (id: string, cambios: Partial<OcrExtractedSlot>) => {
    setOcrDraftError(null);
    setOcrDraftSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)));
  };

  /* Tocar el día o la hora de una fila "a revisar" es justo revisarla: el aviso
     se retira y la fila pasa a contar como dato del usuario. */
  const reviewDraftRow = (id: string, cambios: Partial<OcrExtractedSlot>) =>
    updateDraftRow(id, { ...cambios, revisar: undefined });

  // Confirmar importación de borrador OCR.
  const handleConfirmOcrDraft = async () => {
    if (isSaving) return;
    const selectedDrafts = ocrDraftSlots.filter((d) => d.selected);
    if (selectedDrafts.length === 0) return;
    if (draftErrorCount > 0) {
      setOcrDraftError(
        draftErrorCount === 1
          ? 'Hay una fila marcada con problemas. Corrígela o desmárcala para continuar.'
          : `Hay ${draftErrorCount} filas marcadas con problemas. Corrígelas o desmárcalas para continuar.`
      );
      return;
    }

    /* `confirmado`: el usuario acaba de revisar el borrador. Sin esta marca el
       backend guarda los bloques de OCR como BORRADOR y los grupos no los ven. */
    const importedSlots: TimeSlot[] = selectedDrafts.map((d) => ({
      id: provisionalId('ocr-imported'),
      title: d.title.trim(),
      tag: d.tag || 'Clase',
      day: d.day,
      startTime: d.startTime,
      endTime: d.endTime,
      customColor: d.customColor,
      type: 'recurrente',
      frequency: 'semanal',
      isOcrImported: true,
      confirmado: true,
    }));

    setIsSaving(true);
    const guardado = await setSlots((prev) => [...prev, ...importedSlots]);
    setIsSaving(false);

    if (!guardado) {
      setOcrDraftError(useScheduleStore.getState().error ?? 'No se pudo importar el horario. Inténtalo de nuevo.');
      return;
    }
    setIsOcrDraftModalOpen(false);
    showToast(`¡Se confirmaron e importaron ${importedSlots.length} asignaturas desde el OCR!`);
  };

  return (
    <div className="bg-surface text-on-surface min-h-dvh flex flex-col">
      <Navbar currentTab="schedule" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl bg-surface-container-lowest border border-primary text-on-surface text-sm font-semibold animate-toast-in">
          <span aria-hidden="true" className="material-symbols-outlined text-primary">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content */}
      <main id="contenido" tabIndex={-1} className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-10 pt-8 pb-24 md:pb-12">
        {/* Lo que el servidor rechazó. Antes el bloque se quedaba pintado con un
            aviso de éxito y desaparecía al recargar, sin explicación. */}
        {syncError && <AvisoError mensaje={syncError} onCerrar={clearError} />}

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-on-surface font-headline">
              Mi horario
            </h1>
            <p className="mt-1 text-on-surface-variant text-sm md:text-base">
              Define tus bloques recurrentes o eventos puntuales, o importa tu horario vía OCR.
            </p>
            <p className="mt-2 text-xs text-on-surface-variant">
              {slots.length} {slots.length === 1 ? 'bloque registrado' : 'bloques registrados'}
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {/* Importar OCR */}
            <button
              onClick={() => setIsOcrUploadModalOpen(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-all text-xs sm:text-sm font-semibold cursor-pointer elev-0 active:scale-95"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-primary">document_scanner</span>
              <span>Importar OCR</span>
            </button>
            {/* Agregar bloque manual */}
            <button
              onClick={openCreateModal}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary transition-all text-xs sm:text-sm font-bold shadow-md shadow-primary/20 cursor-pointer active:scale-95"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">add</span>
              <span>Nuevo bloque</span>
            </button>
          </div>
        </header>

        {/* Legend / Filter Indicators */}
        <div className="flex items-center gap-4 mb-4 text-xs text-on-surface-variant flex-wrap bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/60">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cat-puntual/30 border border-cat-puntual"></span>
            <span>Bloque recurrente semanal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cat-social/30 border border-dashed border-cat-social"></span>
            <span>Evento puntual (fecha única o rango)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.2 rounded bg-primary/15 text-primary font-bold text-2xs">OCR</span>
            <span>Extraído por OCR</span>
          </div>
          <span className="ml-auto text-on-surface-variant hidden sm:inline text-2xs">
            Haz clic sobre cualquier bloque para <strong>editarlo o eliminarlo</strong>
          </span>
        </div>

        {/* Semana que se muestra. Los recurrentes salen en todas; los puntuales,
            solo en los días de su fecha o rango. */}
        {slots.length > 0 && (
          <nav aria-label="Semana" className="flex items-center justify-between gap-3 mb-4">
            <button
              type="button"
              onClick={() => setSemana((actual) => sumarDias(actual, -7))}
              aria-label="Semana anterior"
              className="w-9 h-9 shrink-0 rounded-xl border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-on-surface" aria-live="polite">
                Semana del {etiquetaSemana(semana)}
              </p>
              {esSemanaActual ? (
                <p className="text-2xs text-on-surface-variant">Semana actual</p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSemana(inicioDeSemana(hoy));
                    setMobileDay(diaDeFecha(hoy));
                  }}
                  className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Volver a esta semana
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSemana((actual) => sumarDias(actual, 7))}
              aria-label="Semana siguiente"
              className="w-9 h-9 shrink-0 rounded-xl border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </nav>
        )}

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
          <>
          {/* --- Vista móvil: un día a la vez, en lista --- */}
          <div className="md:hidden space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {fechasSemana.map(({ day, fecha }) => {
                const total = bloquesDe(fecha).length;
                const activo = day === mobileDay;

                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => setMobileDay(day)}
                    aria-pressed={activo}
                    className={`shrink-0 min-w-14 px-3 py-2 rounded-xl border text-center transition-colors ${
                      activo
                        ? 'bg-primary border-primary text-on-primary'
                        : 'bg-surface-container border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    <span className="block text-xs font-bold">
                      {day} {Number(fecha.slice(8))}
                    </span>
                    <span className={`block text-2xs ${activo ? 'opacity-80' : 'text-on-surface-variant'}`}>
                      {total === 0 ? 'libre' : `${total} ${total === 1 ? 'bloque' : 'bloques'}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {(() => {
              const fechaMovil = fechasSemana.find(({ day }) => day === mobileDay)?.fecha ?? semana;
              const bloquesDelDia = bloquesDe(fechaMovil);

              if (bloquesDelDia.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container p-8 text-center">
                    <span aria-hidden="true" className="material-symbols-outlined text-[40px] text-on-surface-variant">
                      event_available
                    </span>
                    <p className="mt-1 text-sm font-semibold text-on-surface">Sin bloques el {mobileDay}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Todo el día cuenta como libre para tus grupos.
                    </p>
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-4 px-4 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-semibold cursor-pointer"
                    >
                      Agregar un bloque
                    </button>
                  </div>
                );
              }

              return (
                <ul className="space-y-2.5">
                  {bloquesDelDia.map((slot) => {
                    const isPuntual = esPuntual(slot);
                    const guardando = estaGuardando(slot);

                    return (
                      <li key={slot.id}>
                        <button
                          type="button"
                          onClick={() => openEditModal(slot)}
                          aria-disabled={guardando}
                          aria-label={`${slot.title}, de ${slot.startTime} a ${slot.endTime}. ${guardando ? 'Guardando…' : 'Editar o eliminar.'}`}
                          className={`w-full text-left flex items-stretch gap-3 rounded-2xl border bg-surface-container-lowest p-3.5 active:scale-[0.99] transition-transform ${
                            isPuntual ? 'border-dashed border-2 border-outline-variant' : 'border-outline-variant'
                          } ${guardando ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                        >
                          <span
                            aria-hidden="true"
                            className="w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: slot.customColor || 'var(--color-secondary)' }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span
                                className="text-sm font-bold truncate"
                                style={slot.customColor ? { color: slot.customColor } : undefined}
                              >
                                {slot.title}
                              </span>
                              <span className="text-xs font-mono font-medium text-on-surface-variant shrink-0">
                                {slot.startTime}-{slot.endTime}
                              </span>
                            </span>
                            <span className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {slot.tag && (
                                <span className="text-2xs font-semibold text-on-surface-variant">{slot.tag}</span>
                              )}
                              {isPuntual && (
                                <span className="text-2xs px-1.5 rounded bg-surface-container-highest font-bold text-on-surface">
                                  {slot.specificEndDate
                                    ? `${slot.specificDate} al ${slot.specificEndDate}`
                                    : slot.specificDate || 'Puntual'}
                                </span>
                              )}
                              {guardando && (
                                <span className="text-2xs font-semibold text-on-surface-variant">Guardando…</span>
                              )}
                              {slot.isOcrImported && (
                                <span className="text-2xs uppercase tracking-wider font-bold text-primary bg-surface-container px-1.5 rounded">
                                  OCR
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </div>

          {/* --- Vista de escritorio: rejilla semanal --- */}
          <div className="hidden md:block bg-surface-container-lowest rounded-2xl p-6 md:p-8 overflow-x-auto elev-1">
            <div className="min-w-[800px]">
              {/* Days Header */}
              <div className="grid grid-cols-8 gap-4 mb-4">
                <div className="w-16 text-center text-xs font-bold text-on-surface-variant uppercase">Hora</div>
                {fechasSemana.map(({ day, fecha }) => (
                  <div
                    key={day}
                    className={`text-center text-sm font-bold pb-3 border-b ${
                      fecha === hoy ? 'text-primary border-primary' : 'text-on-surface-variant border-outline-variant'
                    } ${day === 'Sáb' || day === 'Dom' ? 'opacity-70' : ''}`}
                  >
                    {day}
                    <span className="block text-2xs font-medium">{Number(fecha.slice(8))}</span>
                  </div>
                ))}
              </div>

              {/* Grid Body: la altura crece con las horas que cubre (unos 52 px por hora). */}
              <div className="relative" style={{ height: `${totalHoras * 52}px` }}>
                {/* Background Lines */}
                <div className="absolute inset-0 pointer-events-none opacity-50">
                  {timeLabels.slice(1, -1).map((time, i) => (
                    <div
                      key={time}
                      className="absolute inset-x-0 border-b border-outline-variant/60"
                      style={{ top: `${((i + 1) / (timeLabels.length - 1)) * 100}%` }}
                    ></div>
                  ))}
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-8 gap-4 h-full relative">
                  {/* Time Column */}
                  <div className="relative text-xs text-on-surface-variant font-mono font-medium h-full">
                    {timeLabels.map((time, i) => (
                      <span
                        key={time}
                        className="absolute left-0"
                        style={{
                          top: `${(i / (timeLabels.length - 1)) * 100}%`,
                          // La primera y la última no se salen de la rejilla.
                          transform: `translateY(${i === 0 ? '0' : i === timeLabels.length - 1 ? '-100%' : '-50%'})`,
                        }}
                      >
                        {time}
                      </span>
                    ))}
                  </div>

                  {/* Days Columns */}
                  {fechasSemana.map(({ day, fecha }) => {
                    const daySlots = bloquesDe(fecha);

                    return (
                      <div key={day} className="relative h-full">
                        {daySlots.map((slot) => {
                          const style = getPositionStyles(slot.startTime, slot.endTime);
                          const isCustom = Boolean(slot.customColor);
                          const isPuntual = esPuntual(slot);
                          const guardando = estaGuardando(slot);
                          /* El relleno estaba al 15 %: con la paleta apagada los
                             bloques se leían todos grises. Un tinte algo más
                             firme y una barra lateral sólida hacen visible la
                             categoría sin recargar la rejilla. */
                          const customStyle = slot.customColor
                            ? {
                                backgroundColor: `${slot.customColor}2e`,
                                borderColor: slot.customColor,
                                borderLeftWidth: isPuntual ? undefined : '4px',
                              }
                            : {};

                          return (
                            <button type="button"
                              key={slot.id}
                              onClick={() => openEditModal(slot)}
                              aria-disabled={guardando}
                              aria-label={`${slot.title}, ${day} ${Number(fecha.slice(8))} de ${slot.startTime} a ${slot.endTime}. ${guardando ? 'Guardando…' : 'Editar o eliminar.'}`}
                              style={{ ...style, ...customStyle }}
                              className={`absolute w-full text-left border rounded-xl p-2.5 flex flex-col justify-between overflow-hidden transition-all shadow-xs group ${
                                isPuntual ? 'border-dashed border-2' : ''
                              } ${guardando ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:scale-[1.02]'}`}
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
                                      className="text-2xs px-1 rounded bg-surface-container-lowest font-bold text-on-surface shrink-0"
                                      title={slot.specificEndDate ? `Rango: ${slot.specificDate} al ${slot.specificEndDate}` : `Fecha: ${slot.specificDate}`}
                                    >
                                      Puntual
                                    </span>
                                  )}
                                </div>
                                {slot.tag && (
                                  <span className="text-2xs text-on-surface-variant font-semibold block truncate">
                                    {slot.tag}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-2xs opacity-90 font-medium">
                                <span style={isCustom ? { color: slot.customColor } : undefined}>
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                {guardando ? (
                                  <span className="text-2xs font-semibold text-on-surface-variant">Guardando…</span>
                                ) : (
                                  slot.isOcrImported && (
                                    <span className="text-2xs uppercase tracking-wider font-bold text-primary bg-surface-container px-1 rounded">
                                      OCR
                                    </span>
                                  )
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          </>
        )}
      </main>

      {/* Modal para agregar o editar un bloque */}
      {isModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Bloque de horario" className="fixed inset-0 z-50 bg-scrim/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 w-full max-w-lg elev-3 animate-modal-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-primary">
                  {editingSlotId ? 'Editar o eliminar bloque' : 'Registrar bloque'}
                </span>
                <h2 className="text-xl font-bold text-on-surface">
                  {editingSlotId ? 'Editar bloque' : 'Registrar bloque'}
                </h2>
              </div>
              {editingSlotId && (
                <button
                  type="button"
                  onClick={handleDeleteSlot}
                  disabled={isSaving}
                  className="text-xs text-error hover:text-on-error-container bg-error-container border border-error/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all font-semibold"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Eliminar</span>
                </button>
              )}
            </div>

            {/* Tipo de bloque */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => setBlockType('recurrente')}
                className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  blockType === 'recurrente'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">repeat</span>
                <span>Recurrente semanal</span>
              </button>
              <button
                type="button"
                onClick={() => setBlockType('puntual')}
                className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  blockType === 'puntual'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">event</span>
                <span>Evento puntual</span>
              </button>
            </div>

            <form onSubmit={handleSaveBlock} noValidate className="flex flex-col gap-4">
              {/* Etiqueta / Nombre */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Etiqueta / Nombre del Bloque
                </label>
                <input
                  type="text"
                  required
                  placeholder={blockType === 'recurrente' ? 'Ej. Clase de Cálculo, Turno de Trabajo...' : 'Ej. Cita Médica, Viaje a Trujillo, Examen...'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface placeholder-outline text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Categoría / Tag rápido */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
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
                          ? 'bg-primary border-primary-hover text-on-primary shadow-xs'
                          : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-primary'
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
                    <label className="text-xs font-semibold text-on-surface-variant">
                      {editingSlotId ? 'Día de la semana' : 'Día(s) de repetición semanal'}
                    </label>
                    <span className="text-2xs font-bold text-primary bg-surface-container px-2 py-0.5 rounded-lg">
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
                              ? 'bg-primary border-primary-hover text-on-primary shadow-xs'
                              : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-primary'
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
                    <label className="text-xs font-semibold text-on-surface-variant">
                      Fecha del Evento Puntual
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDateRange}
                        onChange={(e) => setIsDateRange(e.target.checked)}
                        className="rounded text-primary focus:ring-0 cursor-pointer"
                      />
                      <span>¿Es un rango de fechas? (ej. viaje)</span>
                    </label>
                  </div>

                  <div className={`grid ${isDateRange ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    <div>
                      <span className="text-2xs font-bold text-on-surface-variant block mb-1">
                        {isDateRange ? 'Fecha Inicio' : 'Fecha'}
                      </span>
                      <input
                        type="date"
                        required
                        aria-label={isDateRange ? 'Fecha de inicio' : 'Fecha'}
                        value={specificDate}
                        onChange={(e) => setSpecificDate(e.target.value)}
                        className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    {isDateRange && (
                      <div>
                        <span className="text-2xs font-bold text-on-surface-variant block mb-1">
                          Fecha Fin
                        </span>
                        <input
                          type="date"
                          required
                          aria-label="Fecha de fin"
                          min={specificDate || undefined}
                          value={specificEndDate}
                          onChange={(e) => setSpecificEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-2xs text-on-surface-variant">
                    {specificDate ? (
                      <>
                        Aparece solo{' '}
                        {isDateRange && specificEndDate && specificEndDate > specificDate ? (
                          <>
                            del <strong className="text-primary">{diaDeFecha(specificDate)} {specificDate}</strong> al{' '}
                            <strong className="text-primary">{diaDeFecha(specificEndDate)} {specificEndDate}</strong>, en cada día del rango
                          </>
                        ) : (
                          <>
                            el <strong className="text-primary">{diaDeFecha(specificDate)} {specificDate}</strong> (ocurrencia única)
                          </>
                        )}
                        .
                      </>
                    ) : (
                      'Elige la fecha del evento.'
                    )}
                  </p>
                </div>
              )}

              {/* Horas de Inicio y Fin */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Hora de inicio</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Hora de fin</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">Color de identificación</label>
                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setSelectedColor(color.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                        selectedColor.toLowerCase() === color.hex.toLowerCase()
                          ? 'border-on-surface scale-110 shadow-sm'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                  <label
                    title="Color personalizado"
                    className="w-7 h-7 rounded-full border-2 border-outline-variant hover:border-primary flex items-center justify-center cursor-pointer relative overflow-hidden bg-surface-container-lowest"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-on-surface-variant">palette</span>
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-error/30 bg-error-container px-3 py-2.5 text-xs font-semibold text-on-error-container"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{formError}</span>
                </p>
              )}

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary transition-all text-xs font-bold cursor-pointer shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-wait"
                >
                  {isSaving ? 'Guardando…' : editingSlotId ? 'Guardar cambios' : 'Guardar bloque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de carga por OCR */}
      {isOcrUploadModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Autocompletar horario por OCR" className="fixed inset-0 z-50 bg-scrim/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 w-full max-w-md elev-3 animate-modal-in text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-xs">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl">document_scanner</span>
            </div>
            <span className="text-2xs font-bold uppercase tracking-wider text-primary">
              OCR inteligente de horarios
            </span>
            <h2 className="text-xl font-bold text-on-surface mt-1 mb-2">
              Autocompletar Horario por OCR
            </h2>
            <p className="text-xs text-on-surface-variant mb-6">
              Sube una foto o PDF de tu horario universitario/laboral. El sistema identificará asignaturas, días y rangos horarios.
            </p>

            {isOcrProcessing ? (
              <div className="space-y-4 p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/60">
                <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto"></div>
                <div className="text-xs font-bold text-on-surface">{ocrStatusText}</div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${ocrProgress}%` }}
                  ></div>
                </div>
                <span className="text-2xs text-on-surface-variant">{ocrProgress}% completado</span>
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
                  <div className="p-4 rounded-2xl bg-surface-container-lowest border-2 border-primary shadow-xs space-y-3 text-left animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold uppercase tracking-wider text-primary bg-surface-container px-2.5 py-0.5 rounded-lg">
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">check</span>
                        Archivo listo
                      </span>
                      <button
                        type="button"
                        onClick={handleClearSelectedFile}
                        className="text-xs text-error hover:text-on-error-container font-semibold cursor-pointer"
                      >
                        Cambiar archivo
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {filePreviewUrl ? (
                        <img
                          src={filePreviewUrl}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded-xl border border-outline-variant shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center font-bold shrink-0">
                          <span aria-hidden="true" className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-on-surface truncate">{selectedOcrFile.name}</p>
                        <p className="text-2xs text-on-surface-variant">
                          {(selectedOcrFile.size / (1024 * 1024)).toFixed(2)} MB • Listo para procesar
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartOcr}
                      className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                      <span>✨ Extraer Horarios con IA OCR</span>
                    </button>
                  </div>
                ) : (
                  /* Zona de Arrastrar y Soltar con Selector de Archivos */
                  /* La zona de arrastre es un <div>: soltar un archivo no es una
                     acción de teclado. Quien navega con teclado usa el botón de
                     dentro, que sí es real; antes era decorativo
                     (`pointer-events-none`) y estaba anidado en otro botón. */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed p-6 rounded-2xl cursor-pointer transition-all bg-surface-container-lowest flex flex-col items-center justify-center gap-2 group ${
                      isDragging
                        ? 'border-primary bg-surface-container'
                        : 'border-secondary hover:border-primary hover:bg-surface-container'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <span aria-hidden="true" className="material-symbols-outlined text-2xl">cloud_upload</span>
                    </div>
                    <p className="text-xs font-bold text-on-surface">
                      Arrastra una foto o PDF de tu horario aquí
                    </p>
                    <p className="text-2xs text-on-surface-variant">Admite PDF, JPG, PNG y WEBP, hasta 10 MB</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-1 px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold shadow-xs transition-colors"
                    >
                      Seleccionar archivo
                    </button>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOcrUploadModalOpen(false);
                      handleClearSelectedFile();
                    }}
                    className="w-full py-2.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer"
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
        <div role="dialog" aria-modal="true" aria-label="Revisar bloques extraídos" className="fixed inset-0 z-50 bg-scrim/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 w-full max-w-2xl elev-3 animate-modal-in flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-primary">
                  Revisión de borrador
                </span>
                <h2 className="text-xl font-bold text-on-surface">
                  Revisar y Editar Bloques Extraídos por OCR
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Toda la información permanece en <strong>estado borrador</strong> hasta que la confirmes. Corrige títulos, días u horarios según sea necesario.
                </p>
              </div>
              <button aria-label="Cerrar"
                type="button"
                onClick={() => setIsOcrDraftModalOpen(false)}
                className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {ocrDescartadas > 0 && (
              <p className="text-xs rounded-xl bg-surface-container border border-outline-variant px-3 py-2 text-on-surface-variant">
                {ocrDescartadas === 1
                  ? 'Se descartó 1 fila que ya estaba en tu horario, se solapaba con él o se repetía en la imagen.'
                  : `Se descartaron ${ocrDescartadas} filas que ya estaban en tu horario, se solapaban con él o se repetían en la imagen.`}
              </p>
            )}

            {/* List of draft items */}
            <div className="space-y-3 overflow-y-auto pr-1 my-4 flex-1">
              {ocrDraftSlots.map((item) => {
                const rowError = draftErrors[item.id];
                return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    rowError
                      ? 'bg-surface-container-lowest border-error border-2'
                      : item.selected
                        ? 'bg-surface-container-lowest border-primary/60 shadow-xs'
                        : 'bg-surface-container border-outline-variant/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => updateDraftRow(item.id, { selected: e.target.checked })}
                      aria-label={`Importar ${item.title}`}
                      className="w-4 h-4 text-primary rounded focus:ring-0 cursor-pointer"
                    />

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-2xs font-bold text-on-surface-variant block mb-0.5">Asignatura / Actividad</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateDraftRow(item.id, { title: e.target.value })}
                          className="w-full text-xs font-bold px-2.5 py-1.5 border border-outline-variant rounded-lg bg-surface-container-lowest"
                        />
                      </div>

                      <div>
                        <label className="text-2xs font-bold text-on-surface-variant block mb-0.5">Día</label>
                        <select
                          value={item.day}
                          onChange={(e) => reviewDraftRow(item.id, { day: e.target.value as DayOfWeek })}
                          className="w-full text-xs font-semibold px-2 py-1.5 border border-outline-variant rounded-lg bg-surface-container-lowest"
                        >
                          {days.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-2xs font-bold text-on-surface-variant block mb-0.5">Horario</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={item.startTime}
                            onChange={(e) => reviewDraftRow(item.id, { startTime: e.target.value })}
                            className="w-16 text-2xs px-1 py-1 border border-outline-variant rounded-lg bg-surface-container-lowest"
                          />
                          <span className="text-xs text-on-surface-variant">-</span>
                          <input
                            type="time"
                            value={item.endTime}
                            onChange={(e) => reviewDraftRow(item.id, { endTime: e.target.value })}
                            className="w-16 text-2xs px-1 py-1 border border-outline-variant rounded-lg bg-surface-container-lowest"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteDraftRow(item.id)}
                      className="text-error hover:text-error p-1 rounded-lg hover:bg-error-container transition-colors"
                      title="Eliminar de borrador"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                  {(item.revisar || rowError) && (
                    <div className="mt-2 pl-7 flex flex-wrap items-center gap-2 text-2xs font-semibold">
                      {item.revisar && (
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface">
                          Revisar: {item.revisar}
                        </span>
                      )}
                      {rowError && <span className="text-error">{rowError}</span>}
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            {/* Agregar fila al borrador */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleAddDraftRow}
                className="w-full py-2 border-2 border-dashed border-secondary hover:border-primary hover:bg-surface-container text-primary text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>+ Agregar Fila Manual al Borrador</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-outline-variant/60">
              <span className="text-xs text-on-surface-variant">
                {ocrDraftSlots.filter((d) => d.selected).length} de {ocrDraftSlots.length} bloques seleccionados
                {draftErrorCount > 0 && (
                  <strong className="block text-error">
                    {draftErrorCount === 1 ? '1 fila marcada tiene problemas' : `${draftErrorCount} filas marcadas tienen problemas`}
                  </strong>
                )}
                {ocrDraftError && (
                  <strong role="alert" className="block text-error">
                    {ocrDraftError}
                  </strong>
                )}
              </span>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsOcrDraftModalOpen(false)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  Descartar Borrador
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOcrDraft}
                  disabled={isSaving || draftErrorCount > 0 || !ocrDraftSlots.some((d) => d.selected)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check</span>
                  <span>{isSaving ? 'Importando…' : 'Confirmar e Importar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-8 mt-auto bg-surface-container border-t border-outline-variant flex flex-col md:flex-row justify-between items-center px-10 gap-4">
        <div className="flex items-center gap-3">
          <HueckoMark size={28} />
          <span className="font-headline text-lg text-on-surface">Huecko</span>
        </div>
        {/* Solo enlaces que llevan a algún sitio. Antes había tres `href="#"`
            («Sincronización activa», «Ajustes de privacidad», «Soporte») que
            no abrían nada y el primero, además, afirmaba un estado inventado. */}
        <nav aria-label="Enlaces del pie" className="flex gap-6">
          <Link className="text-xs text-on-surface-variant hover:text-primary transition-colors" to="/groups">Mis grupos</Link>
          <Link className="text-xs text-on-surface-variant hover:text-primary transition-colors" to="/profile">Mi perfil y cuenta</Link>
        </nav>
        <span className="text-xs text-on-surface-variant">© 2026 Huecko • Coordinación Social</span>
      </footer>
    </div>
  );
}
