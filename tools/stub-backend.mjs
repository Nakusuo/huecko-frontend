/**
 * Backend de mentira para desarrollo (`npm run dev:stub`).
 *
 * Imita los contratos que expone `huecko-backend` para poder trabajar en la app
 * en modo conectado sin levantar Spring Boot, Postgres y Mongo. Los datos viven
 * en memoria y se pierden al reiniciar. No usar para nada que no sea desarrollo.
 *
 * Si cambia el contrato del backend, este archivo se actualiza con él: su
 * utilidad depende de seguir mintiendo igual que responde el de verdad.
 */
import http from 'node:http';

const USUARIO_DEMO = {
  id: '1',
  nombre: 'Alex Rodríguez',
  email: 'alex.rodriguez@huecko.com',
  creado_en: new Date().toISOString(),
};

let seq = 100;
const bloques = [
  { id: 'srv-1', usuarioId: '1', tipo: 'RECURRENTE', diaSemana: 2, fecha: null, fechaFin: null,
    horaInicio: '09:00:00', horaFin: '12:30:00', etiqueta: 'Bloque desde el backend',
    categoria: 'Clase', color: '#7C3AED', fuente: 'MANUAL', estado: 'CONFIRMADO' },
  { id: 'srv-2', usuarioId: '1', tipo: 'PUNTUAL', diaSemana: null, fecha: '2026-09-10', fechaFin: null,
    horaInicio: '15:00:00', horaFin: '16:00:00', etiqueta: 'Borrador OCR pendiente',
    categoria: 'Clase', color: '#94A3B8', fuente: 'OCR', estado: 'BORRADOR' },
];

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

/** Mismo formato que GlobalExceptionHandler en el backend real. */
const error = (res, code, etiqueta, mensaje) =>
  json(res, code, { timestamp: new Date().toISOString(), error: etiqueta, mensaje });

/** Un bloque nuevo hereda del cuerpo lo que mande y rellena el resto con nulos. */
const normalizar = (body) => ({
  tipo: body.tipo ?? 'RECURRENTE',
  diaSemana: body.diaSemana ?? null,
  fecha: body.fecha ?? null,
  fechaFin: body.fechaFin ?? null,
  horaInicio: body.horaInicio ?? null,
  horaFin: body.horaFin ?? null,
  etiqueta: body.etiqueta ?? null,
  categoria: body.categoria ?? null,
  color: body.color ?? null,
});

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    console.log(`[stub] ${req.method} ${p} ${raw ? raw : ''}`);

    if (p === '/api/actuator/health') {
      return json(res, 200, { status: 'UP' });
    }

    if ((p === '/api/auth/login' || p === '/api/auth/register') && req.method === 'POST') {
      const body = JSON.parse(raw || '{}');
      return json(res, p.endsWith('/register') ? 201 : 200, {
        token: 'stub-jwt',
        user: { ...USUARIO_DEMO, nombre: body.nombre || USUARIO_DEMO.nombre, email: body.email },
      });
    }

    if (p === '/api/me') {
      if (req.method === 'GET') return json(res, 200, USUARIO_DEMO);
      if (req.method === 'PATCH') {
        const body = JSON.parse(raw || '{}');
        if (body.nombre) USUARIO_DEMO.nombre = body.nombre;
        if (body.email) USUARIO_DEMO.email = body.email;
        return json(res, 200, USUARIO_DEMO);
      }
    }

    const m = p.match(/^\/api\/usuarios\/([^/]+)\/bloques-horario(?:\/(.+))?$/);
    if (m) {
      const [, usuarioId, tail] = m;
      if (req.method === 'GET' && tail === 'borradores')
        return json(res, 200, bloques.filter((b) => b.usuarioId === usuarioId && b.estado === 'BORRADOR'));
      if (req.method === 'GET' && !tail)
        return json(res, 200, bloques.filter((b) => b.usuarioId === usuarioId && b.estado === 'CONFIRMADO'));
      if (req.method === 'POST') {
        const body = JSON.parse(raw);
        // Igual que el backend: lo que llega por OCR nace como borrador (RF-03).
        const fuente = body.fuente ?? 'MANUAL';
        const nuevo = {
          id: `srv-${++seq}`,
          usuarioId,
          ...normalizar(body),
          fuente,
          estado: fuente === 'OCR' ? 'BORRADOR' : 'CONFIRMADO',
        };
        bloques.push(nuevo);
        return json(res, 201, nuevo);
      }
      if (req.method === 'PUT') {
        const i = bloques.findIndex((b) => b.id === tail);
        if (i < 0) return error(res, 404, 'No encontrado', `Bloque de horario no encontrado: ${tail}`);
        // `fuente` no se toca al editar: sigue constando de dónde salió el bloque.
        bloques[i] = { ...bloques[i], ...normalizar(JSON.parse(raw)), estado: 'CONFIRMADO' };
        return json(res, 200, bloques[i]);
      }
      if (req.method === 'DELETE') {
        const i = bloques.findIndex((b) => b.id === tail);
        if (i < 0) return error(res, 404, 'No encontrado', `Bloque de horario no encontrado: ${tail}`);
        bloques.splice(i, 1);
        return json(res, 204);
      }
    }

    error(res, 404, 'No encontrado', `Sin ruta para ${p}`);
  });
});

server.listen(8080, () => console.log('[stub] escuchando en http://localhost:8080'));
