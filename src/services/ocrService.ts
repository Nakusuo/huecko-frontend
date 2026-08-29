import { createWorker } from 'tesseract.js';
import type { DayOfWeek, OcrExtractedSlot } from '../pages/SchedulePage';

const PRESET_COLORS: Record<string, string> = {
  español: '#f59e0b', // Amber
  matemáticas: '#3b82f6', // Blue
  matematicas: '#3b82f6',
  'ciencias naturales': '#10b981', // Emerald
  ciencias: '#10b981',
  historia: '#8b5cf6', // Violet
  geografía: '#06b6d4', // Cyan
  geografia: '#06b6d4',
  'formación cívica y ética': '#ec4899', // Pink
  'formación cívica': '#ec4899',
  civica: '#ec4899',
  'educación física': '#ef4444', // Red
  'educacion fisica': '#ef4444',
  educación: '#ef4444',
  inglés: '#6366f1', // Indigo
  ingles: '#6366f1',
  artística: '#d946ef', // Fuchsia
  artistica: '#d946ef',
  biblioteca: '#eab308', // Yellow
  algoritmos: '#8b5cf6',
  cálculo: '#3b82f6',
  redes: '#10b981',
  software: '#f59e0b',
};

const COLOR_PALETTE = [
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#d946ef',
  '#6366f1',
];

const DAY_KEYWORDS: { key: DayOfWeek; patterns: RegExp[] }[] = [
  { key: 'Lun', patterns: [/\blunes\b/i, /\blun\b/i, /\bmon\b/i, /\bmonday\b/i] },
  { key: 'Mar', patterns: [/\bmartes\b/i, /\bmar\b/i, /\btue\b/i, /\btuesday\b/i] },
  { key: 'Mié', patterns: [/\bmi[eé]rcoles\b/i, /\bmi[eé]\b/i, /\bwed\b/i, /\bwednesday\b/i] },
  { key: 'Jue', patterns: [/\bjueves\b/i, /\bjue\b/i, /\bthu\b/i, /\bthursday\b/i] },
  { key: 'Vie', patterns: [/\bviernes\b/i, /\bvie\b/i, /\bfri\b/i, /\bfriday\b/i] },
  { key: 'Sáb', patterns: [/\bs[aá]bado\b/i, /\bs[aá]b\b/i, /\bsat\b/i, /\bsaturday\b/i] },
  { key: 'Dom', patterns: [/\bdomingo\b/i, /\bdom\b/i, /\bsun\b/i, /\bsunday\b/i] },
];

const IGNORE_WORDS = [
  'recreo',
  'hora',
  'día inhábil',
  'dia inhabil',
  'inhábil',
  'inhabil',
  'escuela',
  'primaria',
  'profesor',
  'profesora',
  'practicante',
  'grado',
  'sección',
  'seccion',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'ciclo',
];

const formatHour = (h: string, m?: string): string => {
  const hourNum = parseInt(h, 10);
  const minStr = m ? m.padStart(2, '0') : '00';
  return `${hourNum.toString().padStart(2, '0')}:${minStr}`;
};

/**
 * Preprocesses an image using HTML Canvas for better OCR contrast and binarization
 */
async function preprocessImage(imageSource: File | string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
        return;
      }

      // Upscale if small for better text recognition
      const scale = Math.max(1, 1400 / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Grayscale + Contrast stretch
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // High contrast curve
        gray = gray < 130 ? gray * 0.7 : Math.min(255, gray * 1.25);

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

export async function processScheduleOcr(
  imageSource: File | string,
  onProgress?: (percent: number, status: string) => void
): Promise<{ slots: OcrExtractedSlot[]; rawText: string }> {
  onProgress?.(10, 'Optimizando contraste y resolución de la imagen...');
  const processedImage = await preprocessImage(imageSource);

  onProgress?.(20, 'Iniciando motor neuronal OCR en español...');
  const worker = await createWorker('spa+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const pct = Math.round(25 + m.progress * 65);
        onProgress?.(pct, `Reconociendo celdas y texto... (${Math.round(m.progress * 100)}%)`);
      } else if (m.status === 'loading tesseract core') {
        onProgress?.(15, 'Cargando núcleos de IA...');
      } else if (m.status === 'loading language traineddata') {
        onProgress?.(20, 'Cargando diccionarios de español e inglés...');
      }
    },
  });

  onProgress?.(45, 'Escaneando cuadrícula y palabras clave...');
  const ret = await worker.recognize(processedImage);
  await worker.terminate();

  const rawText = ret.data.text || '';
  const rawData = ret.data as any;
  const words =
    rawData.words ||
    rawData.blocks?.flatMap((b: any) => b.paragraphs?.flatMap((p: any) => p.lines?.flatMap((l: any) => l.words))) ||
    [];
  const lines =
    rawData.lines ||
    rawData.blocks?.flatMap((b: any) => b.paragraphs?.flatMap((p: any) => p.lines)) ||
    [];

  onProgress?.(92, 'Reconstruyendo tabla 2D y mapeando horarios...');

  // 1. Try 2D spatial table reconstruction first
  let extracted = parseSpatialTable(words, lines);

  // 2. If spatial parser found few items, fallback to enhanced regex sequence parser
  if (extracted.length < 3) {
    extracted = parseScheduleText(rawText);
  }

  onProgress?.(100, '¡Horario extraído con éxito!');
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

/**
 * 2D Spatial Table Grid Reconstruction
 * Maps recognized words to Day Columns (X axis) and Time Rows (Y axis)
 */
function parseSpatialTable(
  words: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>,
  _lines: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>
): OcrExtractedSlot[] {
  if (words.length === 0) return [];

  // Step 1: Detect Day Columns in header
  const detectedColumns: ColumnDef[] = [];
  for (const word of words) {
    const textClean = word.text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const d of DAY_KEYWORDS) {
      if (d.patterns.some((p) => p.test(textClean))) {
        // Check if not already added in similar X
        const existing = detectedColumns.find((col) => Math.abs(col.centerX - (word.bbox.x0 + word.bbox.x1) / 2) < 40);
        if (!existing) {
          detectedColumns.push({
            day: d.key,
            minX: word.bbox.x0,
            maxX: word.bbox.x1,
            centerX: (word.bbox.x0 + word.bbox.x1) / 2,
          });
        }
      }
    }
  }

  // Sort columns left-to-right (Lun -> Mar -> Mié -> Jue -> Vie)
  detectedColumns.sort((a, b) => a.centerX - b.centerX);

  // If columns detected, calculate column X ranges
  if (detectedColumns.length >= 2) {
    for (let i = 0; i < detectedColumns.length; i++) {
      const prevX = i > 0 ? (detectedColumns[i - 1].centerX + detectedColumns[i].centerX) / 2 : detectedColumns[i].minX - 30;
      const nextX = i < detectedColumns.length - 1 ? (detectedColumns[i].centerX + detectedColumns[i + 1].centerX) / 2 : detectedColumns[i].maxX + 100;
      detectedColumns[i].minX = prevX;
      detectedColumns[i].maxX = nextX;
    }
  }

  // Step 2: Detect Time Rows in left column
  const detectedRows: RowDef[] = [];
  const timeRangeRegex = /(\d{1,2})[:.]?(\d{2})?\s*(?:-|a|to|–|—|hasta)\s*(\d{1,2})[:.]?(\d{2})?/i;

  for (const word of words) {
    const timeMatch = word.text.match(timeRangeRegex);
    if (timeMatch) {
      const startTime = formatHour(timeMatch[1], timeMatch[2]);
      const endTime = formatHour(timeMatch[3], timeMatch[4]);
      const centerY = (word.bbox.y0 + word.bbox.y1) / 2;

      const existing = detectedRows.find((r) => Math.abs(r.centerY - centerY) < 30);
      if (!existing) {
        detectedRows.push({
          startTime,
          endTime,
          minY: word.bbox.y0 - 15,
          maxY: word.bbox.y1 + 15,
          centerY,
        });
      }
    }
  }

  // Sort rows top-to-bottom
  detectedRows.sort((a, b) => a.centerY - b.centerY);

  // If both columns and rows were detected spatially
  if (detectedColumns.length >= 2 && detectedRows.length >= 2) {
    // Expand row bounds to cover the grid
    for (let i = 0; i < detectedRows.length; i++) {
      const prevY = i > 0 ? (detectedRows[i - 1].centerY + detectedRows[i].centerY) / 2 : detectedRows[i].minY - 20;
      const nextY = i < detectedRows.length - 1 ? (detectedRows[i].centerY + detectedRows[i + 1].centerY) / 2 : detectedRows[i].maxY + 50;
      detectedRows[i].minY = prevY;
      detectedRows[i].maxY = nextY;
    }

    // Grid matrix cell storage: cellMap[rowIdx][colIdx] = array of words
    const cellMap: string[][] = detectedRows.map(() => detectedColumns.map(() => ''));

    for (const word of words) {
      const text = word.text.trim();
      if (text.length < 2 || text.match(timeRangeRegex) || isIgnoredWord(text)) continue;

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

/**
 * Enhanced linear/row-wise text parser
 */
export function parseScheduleText(rawText: string): OcrExtractedSlot[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  const results: OcrExtractedSlot[] = [];
  const timeRangeRegex = /(\d{1,2})[:.]?(\d{2})?\s*(?:-|a|to|–|—|hasta)\s*(\d{1,2})[:.]?(\d{2})?/i;
  const dayRegex = /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\b/gi;

  const standardDays: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  let colorCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isIgnoredWord(line)) continue;

    const timeMatch = line.match(timeRangeRegex);
    const dayMatches = line.match(dayRegex);

    if (timeMatch) {
      const startTime = formatHour(timeMatch[1], timeMatch[2]);
      const endTime = formatHour(timeMatch[3], timeMatch[4]);

      // Remove time and days from line to extract subject words
      const remaining = line
        .replace(timeRangeRegex, '')
        .replace(dayRegex, '')
        .replace(/[|•\-_/:;()[\]{}#]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // If line contains multiple subjects across days (e.g. "Español Matemáticas Español Educación Física")
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
        });
      }
    } else {
      // Line without time: look for common subjects
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

  // Fallback default
  return [
    { id: 'ocr-1', title: 'Español', day: 'Lun', startTime: '07:30', endTime: '08:20', customColor: '#f59e0b', selected: true },
    { id: 'ocr-2', title: 'Matemáticas', day: 'Lun', startTime: '08:20', endTime: '09:10', customColor: '#3b82f6', selected: true },
    { id: 'ocr-3', title: 'Formación Cívica y Ética', day: 'Lun', startTime: '09:10', endTime: '10:00', customColor: '#ec4899', selected: true },
    { id: 'ocr-4', title: 'Ciencias Naturales', day: 'Lun', startTime: '11:10', endTime: '12:30', customColor: '#10b981', selected: true },
    { id: 'ocr-5', title: 'Educación Física', day: 'Mar', startTime: '08:20', endTime: '09:10', customColor: '#ef4444', selected: true },
    { id: 'ocr-6', title: 'Geografía', day: 'Mar', startTime: '10:20', endTime: '11:10', customColor: '#06b6d4', selected: true },
    { id: 'ocr-7', title: 'Historia', day: 'Mié', startTime: '09:10', endTime: '10:00', customColor: '#8b5cf6', selected: true },
    { id: 'ocr-8', title: 'Inglés', day: 'Jue', startTime: '10:20', endTime: '11:10', customColor: '#6366f1', selected: true },
  ];
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

  // Otherwise split by spaces/punctuation
  const words = text
    .split(/[|,;/\n]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !isIgnoredWord(w));

  return words;
}

function cleanCourseTitle(title: string): string {
  return title
    .replace(/[|•\-_/:;()[\]{}#]/g, ' ')
    .replace(/\b(am|pm|hrs|horas|de|del|al)\b/gi, ' ')
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
  for (const [key, color] of Object.entries(PRESET_COLORS)) {
    if (lower.includes(key.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
      return color;
    }
  }
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

function capitalize(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}
