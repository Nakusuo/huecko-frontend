import { isApiEnabled } from './apiClient';
import { useAuthStore } from '../store/authStore';
import { useGroupsStore } from '../store/groupsStore';
import { useIncidentsStore } from '../store/incidentsStore';
import { useNotificationStore } from '../store/notificationStore';
import { useProfileStore } from '../store/profileStore';
import { useScheduleStore } from '../store/scheduleStore';

/**
 * Los datos guardados en el navegador pertenecen a una cuenta.
 *
 * Grupos, planes, horario, avisos y perfil se persisten en localStorage, pero
 * `logout()` solo borraba la sesión. Quien entraba después en el mismo
 * navegador veía los grupos de la cuenta anterior hasta que llegaba la
 * respuesta del servidor, y para siempre si esa respuesta fallaba.
 *
 * Aquí se vacían al entrar con una cuenta distinta de la que los guardó y,
 * con backend, también al salir (incluido el 401 del `apiClient`). En modo demo
 * los datos solo viven en este navegador, así que salir no los borra: se
 * perderían los cambios hechos al probar la app.
 */

const CLAVE_DUENO = 'huecko-sesion-dueno';

function leerDueno(): string | null {
  try {
    return localStorage.getItem(CLAVE_DUENO);
  } catch {
    return null;
  }
}

function guardarDueno(id: string | null): void {
  try {
    if (id) localStorage.setItem(CLAVE_DUENO, id);
    else localStorage.removeItem(CLAVE_DUENO);
  } catch {
    // Sin almacenamiento (modo privado estricto) no hay nada que proteger.
  }
}

function vaciarDatosDeCuenta(): void {
  useGroupsStore.getState().reset();
  useIncidentsStore.getState().reset();
  useNotificationStore.getState().reset();
  useScheduleStore.getState().reset();
  // Nombre y correo salen de la sesión; las preferencias locales son por cuenta y se quedan.
  useProfileStore.getState().reset();
}

/** Si los datos guardados son de otra cuenta, se descartan. */
function comprobarDueno(): void {
  const { user, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !user) return;

  if (leerDueno() !== user.id) {
    vaciarDatosDeCuenta();
    guardarDueno(user.id);
  }
}

let iniciado = false;

/** Se llama una sola vez, al arrancar la aplicación (ver `main.tsx`). */
export function vigilarSesion(): void {
  if (iniciado) return;
  iniciado = true;

  // Datos que ya estaban en el navegador al abrir la app.
  comprobarDueno();

  useAuthStore.subscribe((estado, anterior) => {
    if (anterior.isAuthenticated && !estado.isAuthenticated) {
      if (isApiEnabled) {
        vaciarDatosDeCuenta();
        guardarDueno(null);
      }
      return;
    }

    if (estado.user?.id !== anterior.user?.id) comprobarDueno();
  });
}
