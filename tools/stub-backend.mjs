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
  rolSistema: 'USUARIO',
};

/** Con este correo el login devuelve el rol ADMIN, como el seed del backend. */
const EMAIL_ADMIN = 'admin@huecko.com';

let seq = 100;
const bloques = [
  { id: 'srv-1', usuarioId: '1', tipo: 'RECURRENTE', diaSemana: 2, fecha: null, fechaFin: null,
    horaInicio: '09:00:00', horaFin: '12:30:00', etiqueta: 'Bloque desde el backend',
    categoria: 'Clase', color: '#7C3AED', fuente: 'MANUAL', estado: 'CONFIRMADO' },
  { id: 'srv-2', usuarioId: '1', tipo: 'PUNTUAL', diaSemana: null, fecha: '2026-09-10', fechaFin: null,
    horaInicio: '15:00:00', horaFin: '16:00:00', etiqueta: 'Borrador OCR pendiente',
    categoria: 'Clase', color: '#94A3B8', fuente: 'OCR', estado: 'BORRADOR' },
];

/* Cuentas creadas por registro en esta sesión del stub, por correo. */
const cuentas = new Map();
/** desafío → { cuenta, tipo: 'verificar' | 'dos-pasos', codigo, expira, enviado } */
const desafios = new Map();
/** Códigos pedidos desde el perfil (activar o gestionar los dos pasos por correo). */
const codigosPerfil = new Map();

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function nuevoCodigo(cuenta) {
  const codigo = Array.from({ length: 4 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('');
  console.log(`[stub] Código para ${cuenta.email}: ${codigo}`);
  const ahora = Date.now();
  return { codigo, expira: ahora + 10 * 60_000, enviado: ahora };
}

function nuevoDesafio(cuenta, tipo) {
  const desafio = `stub-desafio-${++seq}`;
  desafios.set(desafio, { cuenta, tipo, ...nuevoCodigo(cuenta) });
  return desafio;
}

const limpiar = (codigo) => String(codigo ?? '').replace(/[\s-]/g, '').toUpperCase();
const codigoValido = (pendiente, codigo) => pendiente.expira >= Date.now() && pendiente.codigo === limpiar(codigo);

const enmascarar = (email) => {
  const [nombre, dominio] = email.split('@');
  return `${nombre.slice(0, 2)}***@${dominio}`;
};

const sinPassword = ({ password: _password, ...usuario }) => usuario;
const sesion = (cuenta) => ({ token: `stub-jwt:${cuenta.email}`, user: sinPassword(cuenta) });

/** Las cuentas registradas aquí llevan su correo en el token del stub. */
function cuentaDeToken(req) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  return token.startsWith('stub-jwt:') ? cuentas.get(token.slice('stub-jwt:'.length)) : undefined;
}

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

    const body = raw ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};

    /* --- Registro con verificación del correo y dos pasos por correo ---
       Los códigos no se envían: se escriben en esta consola, como hace el
       backend real cuando no tiene clave de Brevo. */

    if (p === '/api/auth/register' && req.method === 'POST') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const existente = cuentas.get(email);
      if (existente?.emailVerificado || email === USUARIO_DEMO.email || email === EMAIL_ADMIN) {
        return error(res, 400, 'Solicitud inválida', 'El correo ya está en uso. Intenta con otro.');
      }
      const cuenta = {
        ...USUARIO_DEMO,
        id: existente?.id ?? `stub-${++seq}`,
        nombre: body.nombre || 'Sin nombre',
        email,
        password: body.password,
        emailVerificado: false,
        dosPasosActivo: false,
        dosPasosMetodo: null,
      };
      cuentas.set(email, cuenta);
      return json(res, 201, { requiereVerificacion: true, desafio: nuevoDesafio(cuenta, 'verificar'), email });
    }

    if (p === '/api/auth/login' && req.method === 'POST') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const cuenta = cuentas.get(email);
      if (cuenta) {
        if (cuenta.password !== body.password) {
          return error(res, 400, 'Solicitud inválida', 'Credenciales incorrectas. Intenta de nuevo.');
        }
        if (!cuenta.emailVerificado) {
          return json(res, 200, { requiereVerificacion: true, desafio: nuevoDesafio(cuenta, 'verificar'), email });
        }
        if (cuenta.dosPasosActivo) {
          return json(res, 200, {
            requiereDosPasos: true,
            desafio: nuevoDesafio(cuenta, 'dos-pasos'),
            metodo: 'CORREO',
            correo: enmascarar(email),
          });
        }
        return json(res, 200, sesion(cuenta));
      }
      // Cualquier otro correo entra sin más, como antes: es un stub.
      const admin = email === EMAIL_ADMIN;
      return json(res, 200, {
        token: 'stub-jwt',
        user: admin
          ? { id: 'admin', nombre: 'Administración Huecko', email: EMAIL_ADMIN, creado_en: USUARIO_DEMO.creado_en, rolSistema: 'ADMIN' }
          : { ...USUARIO_DEMO, email: email || USUARIO_DEMO.email, emailVerificado: true },
      });
    }

    if ((p === '/api/auth/verificar-correo' || p === '/api/auth/dos-pasos') && req.method === 'POST') {
      const pendiente = desafios.get(body.desafio);
      if (!pendiente || pendiente.expira < Date.now()) {
        return error(res, 400, 'Solicitud inválida', 'Pasó demasiado tiempo. Vuelve a escribir tu contraseña.');
      }
      if (!codigoValido(pendiente, body.codigo)) {
        return error(res, 400, 'Solicitud inválida', 'El código no es correcto o ya caducó. Pide otro si hace falta.');
      }
      desafios.delete(body.desafio);
      if (pendiente.tipo === 'verificar') pendiente.cuenta.emailVerificado = true;
      return json(res, 200, sesion(pendiente.cuenta));
    }

    if (p === '/api/auth/reenviar-codigo' && req.method === 'POST') {
      const pendiente = desafios.get(body.desafio);
      if (!pendiente) return error(res, 400, 'Solicitud inválida', 'Pasó demasiado tiempo. Vuelve a escribir tu contraseña.');
      if (Date.now() - pendiente.enviado < 60_000) {
        return error(res, 429, 'Demasiadas solicitudes', 'Espera un momento antes de pedir otro código.');
      }
      Object.assign(pendiente, nuevoCodigo(pendiente.cuenta));
      return json(res, 204);
    }

    const yo = cuentaDeToken(req);
    if (p.startsWith('/api/me/dos-pasos') && yo) {
      if (p === '/api/me/dos-pasos' && req.method === 'GET') {
        return json(res, 200, {
          activo: yo.dosPasosActivo,
          codigosRespaldoRestantes: yo.dosPasosActivo ? 10 : 0,
          activadoEn: yo.dosPasosActivo ? new Date().toISOString() : null,
          metodo: yo.dosPasosMetodo,
        });
      }
      if ((p === '/api/me/dos-pasos/correo/iniciar' || p === '/api/me/dos-pasos/enviar-codigo') && req.method === 'POST') {
        codigosPerfil.set(yo.email, { cuenta: yo, ...nuevoCodigo(yo) });
        return json(res, 204);
      }
      const accionConCodigo = {
        '/api/me/dos-pasos/correo/activar': () => { yo.dosPasosActivo = true; yo.dosPasosMetodo = 'CORREO'; },
        '/api/me/dos-pasos/codigos-respaldo': () => {},
        '/api/me/dos-pasos/desactivar': () => { yo.dosPasosActivo = false; yo.dosPasosMetodo = null; },
      }[p];
      if (accionConCodigo && req.method === 'POST') {
        const pendiente = codigosPerfil.get(yo.email);
        if (!pendiente || !codigoValido(pendiente, body.codigo)) {
          return error(res, 400, 'Solicitud inválida', 'El código no es correcto o ya caducó. Pide otro si hace falta.');
        }
        codigosPerfil.delete(yo.email);
        accionConCodigo();
        if (p.endsWith('desactivar')) return json(res, 204);
        return json(res, 200, { codigosRespaldo: Array.from({ length: 10 }, (_, i) => `STUB-000${i}`) });
      }
    }

    if (p === '/api/me') {
      if (req.method === 'GET') return json(res, 200, USUARIO_DEMO);
      if (req.method === 'PATCH') {
        const body = JSON.parse(raw || '{}');
        // Como el real: cambiar el correo pide la contraseña (aquí, la de demo).
        const cambiaCorreo = body.email && body.email.trim().toLowerCase() !== USUARIO_DEMO.email;
        if (cambiaCorreo && body.passwordActual !== 'demo1234') {
          return error(res, 400, 'Solicitud inválida', 'Para cambiar el correo escribe tu contraseña actual.');
        }
        if (body.nombre) USUARIO_DEMO.nombre = body.nombre;
        if (cambiaCorreo) USUARIO_DEMO.email = body.email.trim().toLowerCase();
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

const PUERTO = Number(process.env.PORT ?? 8080);
server.listen(PUERTO, () => console.log(`[stub] escuchando en http://localhost:${PUERTO}`));
