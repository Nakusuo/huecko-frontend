import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import type { DayOfWeek } from '../store/scheduleStore';
import { SUBJECT_COLORS, colorByIndex } from '../theme/palette';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '5.4.530'}/build/pdf.worker.min.mjs`;
}

export interface OcrExtractedSlot {
  id: string;
  title: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  customColor: string;
  selected: boolean;
  tag?: string;
}





const DAY_KEYWORDS: { key: DayOfWeek; patterns: RegExp[] }[] = [
  { key: 'Lun', patterns: [/\blunes\b/i, /\blun\b/i, /\bmon\b/i, /\bmonday\b/i, /^l$/i] },
  { key: 'Mar', patterns: [/\bmartes\b/i, /\bmar\b/i, /\btue\b/i, /\btuesday\b/i, /^m$/i, /^ma$/i] },
  { key: 'Mié', patterns: [/\bmi[eé]rcoles\b/i, /\bmi[eé]\b/i, /\bwed\b/i, /\bwednesday\b/i, /^x$/i, /^mi$/i] },
  { key: 'Jue', patterns: [/\bjueves\b/i, /\bjue\b/i, /\bthu\b/i, /\bthursday\b/i, /^j$/i, /^ju$/i] },
  { key: 'Vie', patterns: [/\bviernes\b/i, /\bvie\b/i, /\bfri\b/i, /\bfriday\b/i, /^v$/i, /^vi$/i] },
  { key: 'Sáb', patterns: [/\bs[aá]bado\b/i, /\bs[aá]b\b/i, /\bsat\b/i, /\bsaturday\b/i, /^s$/i, /^sa$/i] },
  { key: 'Dom', patterns: [/\bdomingo\b/i, /\bdom\b/i, /\bsun\b/i, /\bsunday\b/i, /^d$/i, /^do$/i] },
];

const TIME_LABEL_REGEX = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i;

const IGNORE_WORDS = [
  'recreo',
  'hora',
  'horas',
  'día inhábil',
  'dia inhabil',
  'inhábil',
  'inhabil',
  'escuela',
  'primaria',
  'secundaria',
  'profesor',
  'profesora',
  'docente',
  'practicante',
  'grado',
  'sección',
  'seccion',
  'semestre',
  'ciclo',
  'carrera',
  'universidad',
  'facultad',
  'matricula',
  'matrícula',
  'horario',
  'turnos',
  'aula',
  'laboratorio',
  'grupo',
  'créditos',
  'creditos',
];

// Convierte una hora al formato 24 h.
export const formatHour = (h: string, m?: string, isPm?: boolean): string => {
  let hourNum = parseInt(h, 10);
  if (isNaN(hourNum)) hourNum = 8;

  // If PM indicator or typical afternoon class hour without AM (e.g. 1, 2, 3, 4, 5, 6)
  if (isPm && hourNum < 12) {
    hourNum += 12;
  } else if (!isPm && hourNum >= 1 && hourNum <= 6) {
    // Usually 1..6 in college timetable without explicit AM means 13..18
    hourNum += 12;
  }

  if (hourNum > 23) hourNum = 23;
  const minStr = m ? m.padStart(2, '0') : '00';
  return `${hourNum.toString().padStart(2, '0')}:${minStr}`;
};

// Detecta rangos de hora frecuentes.
export const TIME_RANGE_REGEX = /(?:(?:de\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*(?:-|–|—|a|hasta|to|\/)\s*(?:a\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?|(\d{2})(\d{2})\s*(?:-|–|—|a|to)\s*(\d{2})(\d{2}))/i;

// Prepara una imagen o PDF para OCR.
async function prepareImageSource(
  fileOrUrl: File | string,
  onProgress?: (percent: number, status: string) => void
): Promise<{ dataUrl: string; nativePdfWords?: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }> }> {
  // Check if file is a PDF
  const isPdf =
    (typeof fileOrUrl !== 'string' && fileOrUrl.type === 'application/pdf') ||
    (typeof fileOrUrl === 'string' && fileOrUrl.toLowerCase().endsWith('.pdf')) ||
    (typeof fileOrUrl !== 'string' && fileOrUrl.name.toLowerCase().endsWith('.pdf'));

  if (isPdf && typeof fileOrUrl !== 'string') {
    onProgress?.(15, 'Procesando archivo PDF y renderizando páginas...');
    try {
      const arrayBuffer = await fileOrUrl.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({ canvasContext: ctx, canvas, viewport } as any).promise;

        // Try extracting native text items from PDF
        const textContent = await page.getTextContent();
        const nativePdfWords: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }> = [];

        for (const item of textContent.items as any[]) {
          if (item.str && item.str.trim().length > 0) {
            const tx = item.transform[4];
            const ty = viewport.height - item.transform[5]; // Flip Y
            const width = item.width || item.str.length * 8;
            const height = item.height || 14;

            nativePdfWords.push({
              text: item.str.trim(),
              bbox: {
                x0: tx,
                y0: ty - height,
                x1: tx + width,
                y1: ty,
              },
            });
          }
        }

        return {
          dataUrl: canvas.toDataURL('image/png'),
          nativePdfWords: nativePdfWords.length > 5 ? nativePdfWords : undefined,
        };
      }
    } catch (pdfErr) {
      console.warn('No se pudo renderizar PDF nativo, intentando como imagen:', pdfErr);
    }
  }

  // Otherwise standard image preprocessing
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          dataUrl: typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl),
        });
        return;
      }

      // Upscale if small for maximum OCR accuracy
      const scale = Math.max(1, 1400 / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Grayscale + Dynamic Contrast Curve
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // High contrast filter
        gray = gray < 135 ? gray * 0.65 : Math.min(255, gray * 1.25);

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/png') });
    };

    img.onerror = () => {
      resolve({
        dataUrl: typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl),
      });
    };

    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      img.src = URL.createObjectURL(fileOrUrl);
    }
  });
}

// Ejecuta el OCR del horario.
export async function processScheduleOcr(
  imageSource: File | string,
  onProgress?: (percent: number, status: string) => void
): Promise<{ slots: OcrExtractedSlot[]; rawText: string }> {
  onProgress?.(10, 'Optimizando contraste y resolución de la imagen/PDF...');
  const { dataUrl, nativePdfWords } = await prepareImageSource(imageSource, onProgress);

  onProgress?.(25, 'Iniciando motor neuronal OCR en español e inglés...');
  const worker = await createWorker('spa+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const pct = Math.round(30 + m.progress * 60);
        onProgress?.(pct, `Reconociendo celdas y texto... (${Math.round(m.progress * 100)}%)`);
      } else if (m.status === 'loading tesseract core') {
        onProgress?.(15, 'Cargando núcleos de IA...');
      } else if (m.status === 'loading language traineddata') {
        onProgress?.(20, 'Cargando diccionarios de español e inglés...');
      }
    },
  });

  onProgress?.(45, 'Escaneando cuadrícula tabular y palabras clave...');
  const ret = await worker.recognize(dataUrl);
  await worker.terminate();

  const rawText = ret.data.text || '';
  const rawData = ret.data as any;
  const ocrWords =
    rawData.words ||
    rawData.blocks?.flatMap((b: any) => b.paragraphs?.flatMap((p: any) => p.lines?.flatMap((l: any) => l.words))) ||
    [];

  // Merge native PDF words if available
  const wordsToUse = nativePdfWords && nativePdfWords.length > ocrWords.length ? nativePdfWords : ocrWords;

  onProgress?.(92, 'Reconstruyendo tabla 2D y mapeando horarios...');

  // 1. Try 2D spatial table reconstruction first
  let extracted = parseSpatialTable(wordsToUse);

  // 2. If spatial parser found few items, fallback to enhanced regex sequence parser
  if (extracted.length < 3) {
    extracted = parseScheduleText(rawText);
  }

  onProgress?.(100, extracted.length ? 'Horario extraído. Revisa los bloques antes de confirmarlos.' : 'No se detectaron bloques editables.');
  return { slots: extracted, rawText };
}

interface ColumnDef {
  day: DayOfWeek;
  minX: number;
  maxX: number;
  centerX: number;
}

interface RowDef {
  startTime: string;
  endTime: string;
  minY: number;
  maxY: number;
  centerY: number;
}

type OcrWord = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } };

// Une palabras de una misma línea.
function getVisualLines(words: OcrWord[]): Array<{ text: string; bbox: OcrWord['bbox']; centerX: number; centerY: number }> {
  const lines: OcrWord[][] = [];

  [...words]
    .sort((a, b) => ((a.bbox.y0 + a.bbox.y1) / 2) - ((b.bbox.y0 + b.bbox.y1) / 2))
    .forEach((word) => {
      const centerY = (word.bbox.y0 + word.bbox.y1) / 2;
      const matchingLine = lines.find((line) => {
        const lineY = line.reduce((total, current) => total + (current.bbox.y0 + current.bbox.y1) / 2, 0) / line.length;
        return Math.abs(lineY - centerY) <= 18;
      });
      (matchingLine || lines[lines.push([]) - 1]).push(word);
    });

  return lines.map((line) => {
    const sorted = line.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const x0 = Math.min(...sorted.map((word) => word.bbox.x0));
    const x1 = Math.max(...sorted.map((word) => word.bbox.x1));
    const y0 = Math.min(...sorted.map((word) => word.bbox.y0));
    const y1 = Math.max(...sorted.map((word) => word.bbox.y1));
    return {
      text: sorted.map((word) => word.text).join(' ').replace(/\s+/g, ' ').trim(),
      bbox: { x0, y0, x1, y1 },
      centerX: (x0 + x1) / 2,
      centerY: (y0 + y1) / 2,
    };
  });
}

// Reconstruye la tabla usando posiciones de texto.
function parseSpatialTable(words: OcrWord[]): OcrExtractedSlot[] {
  if (!words || words.length === 0) return [];

  // Step 1: Detect Day Columns in header
  const detectedColumns: ColumnDef[] = [];
  for (const word of words) {
    const textClean = word.text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const d of DAY_KEYWORDS) {
      if (d.patterns.some((p) => p.test(textClean))) {
        const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
        const existing = detectedColumns.find((col) => Math.abs(col.centerX - centerX) < 45);
        if (!existing) {
          detectedColumns.push({
            day: d.key,
            minX: word.bbox.x0,
            maxX: word.bbox.x1,
            centerX,
          });
        }
      }
    }
  }

  // Sort columns left-to-right (Lun -> Mar -> Mié -> Jue -> Vie -> Sáb -> Dom)
  detectedColumns.sort((a, b) => a.centerX - b.centerX);

  // If at least 2 columns detected, calculate column X boundary ranges
  if (detectedColumns.length >= 2) {
    for (let i = 0; i < detectedColumns.length; i++) {
      const prevX = i > 0 ? (detectedColumns[i - 1].centerX + detectedColumns[i].centerX) / 2 : detectedColumns[i].minX - 40;
      const nextX = i < detectedColumns.length - 1 ? (detectedColumns[i].centerX + detectedColumns[i + 1].centerX) / 2 : detectedColumns[i].maxX + 120;
      detectedColumns[i].minX = prevX;
      detectedColumns[i].maxX = nextX;
    }
  }

  // Detecta filas de hora.
  const detectedRows: RowDef[] = [];

  const addDetectedRow = (startTime: string, endTime: string, bbox: OcrWord['bbox']) => {
    const centerY = (bbox.y0 + bbox.y1) / 2;
    if (!detectedRows.some((row) => Math.abs(row.centerY - centerY) < 20)) {
      detectedRows.push({
        startTime,
        endTime,
        minY: bbox.y0 - 15,
        maxY: bbox.y1 + 15,
        centerY,
      });
    }
  };

  getVisualLines(words).forEach((line) => {
    const match = line.text.match(TIME_RANGE_REGEX);
    if (!match) return;

    if (match[7] && match[8] && match[9] && match[10]) {
      addDetectedRow(`${match[7]}:${match[8]}`, `${match[9]}:${match[10]}`, line.bbox);
    } else if (match[1] && match[4]) {
      const isPm1 = match[3]?.toLowerCase() === 'pm';
      const isPm2 = match[6]?.toLowerCase() === 'pm';
      addDetectedRow(
        formatHour(match[1], match[2], isPm1),
        formatHour(match[4], match[5], isPm2 || isPm1),
        line.bbox
      );
    }
  });

  for (const word of words) {
    const match = word.text.match(TIME_RANGE_REGEX);
    if (match) {
      let startTime = '08:00';
      let endTime = '10:00';

      if (match[7] && match[8] && match[9] && match[10]) {
        // Military time 0800 - 1000
        startTime = `${match[7]}:${match[8]}`;
        endTime = `${match[9]}:${match[10]}`;
      } else if (match[1] && match[4]) {
        const isPm1 = Boolean(match[3] && match[3].toLowerCase() === 'pm');
        const isPm2 = Boolean(match[6] && match[6].toLowerCase() === 'pm');
        startTime = formatHour(match[1], match[2], isPm1);
        endTime = formatHour(match[4], match[5], isPm2 || isPm1);
      }

      addDetectedRow(startTime, endTime, word.bbox);
    }
  }

  // Sort rows top-to-bottom
  detectedRows.sort((a, b) => a.centerY - b.centerY);

  // Usa horas individuales si no hay rangos.
  if (detectedRows.length < 2) {
    const labelCandidates = words
      .map((word) => {
        const match = word.text.trim().match(TIME_LABEL_REGEX);
        if (!match) return null;
        const isPm = match[3]?.toLowerCase() === 'pm';
        return {
          word,
          startTime: formatHour(match[1], match[2], isPm),
          centerX: (word.bbox.x0 + word.bbox.x1) / 2,
          centerY: (word.bbox.y0 + word.bbox.y1) / 2,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const leftMostX = Math.min(...labelCandidates.map((item) => item.centerX));
    const rowLabels = labelCandidates
      .filter((item) => item.centerX <= leftMostX + 90)
      .sort((a, b) => a.centerY - b.centerY);

    rowLabels.forEach((label, index) => {
      const next = rowLabels[index + 1];
      const startMinutes = timeToMinutes(label.startTime);
      const endTime = next?.startTime || minutesToTime(startMinutes + 60);
      if (!detectedRows.some((row) => Math.abs(row.centerY - label.centerY) < 20)) {
        detectedRows.push({
          startTime: label.startTime,
          endTime,
          minY: label.word.bbox.y0 - 12,
          maxY: label.word.bbox.y1 + 12,
          centerY: label.centerY,
        });
      }
    });
    detectedRows.sort((a, b) => a.centerY - b.centerY);
  }

  // If both columns and rows were detected spatially
  if (detectedColumns.length >= 2 && detectedRows.length >= 2) {
    // Expand row bounds to cover the grid
    for (let i = 0; i < detectedRows.length; i++) {
      const prevY = i > 0 ? (detectedRows[i - 1].centerY + detectedRows[i].centerY) / 2 : detectedRows[i].minY - 20;
      const nextY = i < detectedRows.length - 1 ? (detectedRows[i].centerY + detectedRows[i + 1].centerY) / 2 : detectedRows[i].maxY + 50;
      detectedRows[i].minY = prevY;
      detectedRows[i].maxY = nextY;
    }

    // Grid matrix cell storage: cellMap[rowIdx][colIdx] = string
    const cellMap: string[][] = detectedRows.map(() => detectedColumns.map(() => ''));

    for (const word of words) {
      const text = word.text.trim();
      if (text.length < 2 || text.match(TIME_RANGE_REGEX) || isIgnoredWord(text)) continue;

      const wx = (word.bbox.x0 + word.bbox.x1) / 2;
      const wy = (word.bbox.y0 + word.bbox.y1) / 2;

      const colIdx = detectedColumns.findIndex((col) => wx >= col.minX && wx <= col.maxX);
      const rowIdx = detectedRows.findIndex((row) => wy >= row.minY && wy <= row.maxY);

      if (colIdx !== -1 && rowIdx !== -1) {
        cellMap[rowIdx][colIdx] = (cellMap[rowIdx][colIdx] + ' ' + text).trim();
      }
    }

    // Convert non-empty cells into schedule slots
    const slots: OcrExtractedSlot[] = [];
    let colorCount = 0;

    for (let r = 0; r < detectedRows.length; r++) {
      const row = detectedRows[r];
      for (let c = 0; c < detectedColumns.length; c++) {
        const col = detectedColumns[c];
        const cellText = cleanCourseTitle(cellMap[r][c]);

        if (cellText && cellText.length >= 3 && !isIgnoredWord(cellText)) {
          const customColor = getColorForSubject(cellText, colorCount++);
          slots.push({
            id: `spatial-${Date.now()}-${r}-${c}`,
            title: capitalize(cellText),
            day: col.day,
            startTime: row.startTime,
            endTime: row.endTime,
            customColor,
            selected: true,
            tag: 'Clase',
          });
        }
      }
    }

    if (slots.length >= 3) {
      return slots;
    }
  }

  return [];
}

// Alternativa para texto sin tabla.
export function parseScheduleText(rawText: string): OcrExtractedSlot[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  const results: OcrExtractedSlot[] = [];
  const dayRegex = /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\b/gi;
  const standardDays: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  let colorCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isIgnoredWord(line)) continue;

    const timeMatch = line.match(TIME_RANGE_REGEX);
    const dayMatches = line.match(dayRegex);

    if (timeMatch) {
      let startTime = '08:00';
      let endTime = '10:00';

      if (timeMatch[7] && timeMatch[8] && timeMatch[9] && timeMatch[10]) {
        startTime = `${timeMatch[7]}:${timeMatch[8]}`;
        endTime = `${timeMatch[9]}:${timeMatch[10]}`;
      } else if (timeMatch[1] && timeMatch[4]) {
        const isPm1 = Boolean(timeMatch[3] && timeMatch[3].toLowerCase() === 'pm');
        const isPm2 = Boolean(timeMatch[6] && timeMatch[6].toLowerCase() === 'pm');
        startTime = formatHour(timeMatch[1], timeMatch[2], isPm1);
        endTime = formatHour(timeMatch[4], timeMatch[5], isPm2 || isPm1);
      }

      // Remove time and days from line to extract subject words
      const remaining = line
        .replace(TIME_RANGE_REGEX, '')
        .replace(dayRegex, '')
        .replace(/[|•\-_/:;()[\]{}#]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const candidateTokens = extractSubjectTokens(remaining);

      if (candidateTokens.length > 1) {
        candidateTokens.forEach((subject, idx) => {
          if (!isIgnoredWord(subject) && subject.length >= 3) {
            results.push({
              id: `ocr-row-${Date.now()}-${results.length}`,
              title: capitalize(subject),
              day: standardDays[idx % standardDays.length],
              startTime,
              endTime,
              customColor: getColorForSubject(subject, colorCount++),
              selected: true,
              tag: 'Clase',
            });
          }
        });
      } else if (candidateTokens.length === 1 && !isIgnoredWord(candidateTokens[0])) {
        const assignedDay = dayMatches ? normalizeDayString(dayMatches[0]) : standardDays[results.length % standardDays.length];
        results.push({
          id: `ocr-row-${Date.now()}-${results.length}`,
          title: capitalize(candidateTokens[0]),
          day: assignedDay,
          startTime,
          endTime,
          customColor: getColorForSubject(candidateTokens[0], colorCount++),
          selected: true,
          tag: 'Clase',
        });
      }
    } else {
      // Line without time: look for known subjects
      const subjectTokens = extractSubjectTokens(line);
      subjectTokens.forEach((subject, idx) => {
        if (!isIgnoredWord(subject) && subject.length >= 3 && !subject.match(/^\d+$/)) {
          const startH = 8 + ((results.length + idx) % 5) * 2;
          results.push({
            id: `ocr-subj-${Date.now()}-${results.length}`,
            title: capitalize(subject),
            day: standardDays[(results.length + idx) % standardDays.length],
            startTime: formatHour(startH.toString()),
            endTime: formatHour((startH + 2).toString()),
            customColor: getColorForSubject(subject, colorCount++),
            selected: true,
            tag: 'Clase',
          });
        }
      });
    }
  }

  // Deduplicate exact duplicates (same title, day, time)
  const uniqueSlots: OcrExtractedSlot[] = [];
  for (const slot of results) {
    const isDup = uniqueSlots.some((s) => s.title === slot.title && s.day === slot.day && s.startTime === slot.startTime);
    if (!isDup) {
      uniqueSlots.push(slot);
    }
  }

  if (uniqueSlots.length > 0) {
    return uniqueSlots.slice(0, 16);
  }

  return [];
}

const KNOWN_SUBJECTS = [
  'formación cívica y ética',
  'formacion civica y etica',
  'formación cívica',
  'formacion civica',
  'ciencias naturales',
  'educación física',
  'educacion fisica',
  'matemáticas',
  'matematicas',
  'español',
  'espanol',
  'historia',
  'geografía',
  'geografia',
  'biblioteca',
  'artística',
  'artistica',
  'inglés',
  'ingles',
  'algoritmos',
  'cálculo',
  'calculo',
  'programación',
  'programacion',
  'base de datos',
  'bases de datos',
  'redes y telecomunicaciones',
  'redes',
  'ingeniería de software',
  'sistemas operativos',
  'inteligencia artificial',
  'física',
  'química',
  'estadística',
];

function extractSubjectTokens(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  // Match multi-word subjects first
  for (const subj of KNOWN_SUBJECTS) {
    if (lower.includes(subj)) {
      found.push(subj);
    }
  }

  if (found.length > 0) {
    return Array.from(new Set(found));
  }

  // Otherwise split by punctuation
  const words = text
    .split(/[|,;/\n]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !isIgnoredWord(w));

  return words;
}

function cleanCourseTitle(title: string): string {
  return title
    .replace(/[|•\-_/:;()[\]{}#]/g, ' ')
    .replace(/\b(am|pm|hrs|horas|de|del|al|aula|lab|teoria|practica)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isIgnoredWord(text: string): boolean {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return IGNORE_WORDS.some((ig) => lower.includes(ig.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
}

function normalizeDayString(dayStr: string): DayOfWeek {
  const clean = dayStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const d of DAY_KEYWORDS) {
    if (d.patterns.some((p) => p.test(clean))) {
      return d.key;
    }
  }
  return 'Lun';
}

function getColorForSubject(subject: string, index: number): string {
  const lower = subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (lower.includes(key.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
      return color;
    }
  }
  return colorByIndex(index);
}

function capitalize(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const normalized = ((value % 1440) + 1440) % 1440;
  return `${Math.floor(normalized / 60).toString().padStart(2, '0')}:${(normalized % 60).toString().padStart(2, '0')}`;
}
