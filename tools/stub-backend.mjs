/**
 * Backend de mentira para desarrollo (`npm run dev:stub`).
 *
 * Imita los contratos que hoy expone `huecko-backend` (BloqueHorarioController)
 * más el `/auth/login` que todavía no existe, para poder probar la app en modo
 * conectado sin levantar Spring Boot, Mongo y Postgres. Los datos viven en
 * memoria y se pierden al reiniciar. No usar para nada que no sea desarrollo.
 */
import http from 'node:http';

let seq = 100;
const bloques = [
  { id: 'srv-1', usuarioId: '1', tipo: 'RECURRENTE', diaSemana: 2, fecha: null,
    horaInicio: '09:00:00', horaFin: '12:30:00', etiqueta: 'Bloque desde el backend',
    fuente: 'MANUAL', estado: 'CONFIRMADO' },
  { id: 'srv-2', usuarioId: '1', tipo: 'PUNTUAL', diaSemana: null, fecha: '2026-09-10',
    horaInicio: '15:00:00', horaFin: '16:00:00', etiqueta: 'Borrador OCR pendiente',
    fuente: 'OCR', estado: 'BORRADOR' },
];

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    console.log(`[stub] ${req.method} ${p} ${raw ? raw : ''}`);

    if ((p === '/api/auth/login' || p === '/api/auth/register') && req.method === 'POST') {
      const body = JSON.parse(raw || '{}');
      return json(res, 200, {
        token: 'stub-jwt',
        user: { id: '1', nombre: body.nombre || 'Alex Rodríguez', email: body.email, creado_en: new Date().toISOString() },
      });
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
        const nuevo = { id: `srv-${++seq}`, usuarioId, ...body, fuente: 'MANUAL', estado: 'CONFIRMADO' };
        bloques.push(nuevo);
        return json(res, 201, nuevo);
      }
      if (req.method === 'PUT') {
        const i = bloques.findIndex((b) => b.id === tail);
        if (i < 0) return json(res, 400, { error: 'Solicitud inválida', mensaje: `Bloque no encontrado: ${tail}` });
        bloques[i] = { ...bloques[i], ...JSON.parse(raw), estado: 'CONFIRMADO' };
        return json(res, 200, bloques[i]);
      }
      if (req.method === 'DELETE') {
        const i = bloques.findIndex((b) => b.id === tail);
        if (i < 0) return json(res, 400, { error: 'Solicitud inválida', mensaje: `Bloque no encontrado: ${tail}` });
        bloques.splice(i, 1);
        return json(res, 204);
      }
    }

    json(res, 404, { error: 'Solicitud inválida', mensaje: `Sin ruta para ${p}` });
  });
});

server.listen(8080, () => console.log('[stub] escuchando en http://localhost:8080'));
