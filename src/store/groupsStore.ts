import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiError, isApiEnabled } from '../lib/apiClient';
import { groupsService } from '../services/groupsService';
import { miIdentificador, useIncidentsStore } from './incidentsStore';
import { plansService, type CrearPlanPayload } from '../services/plansService';
import { elegirGanadora, inicioDeVentana, ventanaGanadora, votacionAbierta } from '../lib/planes';
import { configurarSimulador, olvidarPlan as olvidarPlanSimulado } from '../lib/simuladorIncidencias';
import type {
  Group,
  GroupAvailability,
  GroupMember,
  PlanProposal,
  PlanIncidence,
  TimeWindowProposal,
} from '../types/groups.types';
import type { DayOfWeek } from '../types/schedule.types';
import type { Criticidad } from '../types/incidents.types';
import { colorByIndex } from '../theme/palette';
import { useAuthStore } from './authStore';
import { cuantosOrganizadores, miembroActual, normalizarCorreo, rolDe } from '../lib/grupos';

/** Si una tardanza llega sin minutos, se asume lo mismo que propone el formulario. */
const MINUTOS_TARDANZA_POR_DEFECTO = 15;

export type { Group, GroupMember, PlanProposal, PlanIncidence, TimeWindowProposal, DayOfWeek };

/** Lo que la interfaz necesita saber después de reportar una incidencia. */
export interface ResultadoIncidencia {
  /** `true` si el plan pasó a re-coordinación. */
  replantea: boolean;
  /** Veredicto del servidor; `null` en modo demo o si fue una tardanza. */
  criticidad: Criticidad | null;
  razon?: string;
}

/** Resultado de dar de alta varios correos a la vez. */
export interface ResultadoAltas {
  /** No hay ninguna cuenta con ese correo (404). */
  sinCuenta: string[];
  /** Fallaron por otro motivo (red, permisos…). */
  fallidos: string[];
}

/**
 * Estado del cruce del servidor para un grupo. Con backend la pantalla no se
 * inventa nada mientras tanto: dice que está calculando o que falló.
 */
export interface EstadoCruce {
  estado: 'cargando' | 'ok' | 'error';
  mensaje?: string;
}

/** Lo que se puede cambiar de un grupo con `PATCH /grupos/{id}`. */
export interface CambiosDatosGrupo {
  nombre?: string;
  descripcion?: string;
  umbralDisponibilidad?: number;
}

export interface GroupOccupiedSlot {
  id: string;
  userEmail: string;
  userName: string;
  userColor: string;
  day: DayOfWeek;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "10:00"
  title: string;
}

interface GroupsState {
  groups: Group[];
  selectedGroupId: string | null;
  occupiedSlots: GroupOccupiedSlot[];
  groupProposals: PlanProposal[];
  /**
   * Cruce calculado por el backend, por grupo (RF-05). Vacío en modo demo, y
   * entonces la UI cae a su cálculo local sobre `occupiedSlots`.
   */
  availability: Record<string, GroupAvailability>;
  /** Si el cruce de cada grupo está llegando, llegó o falló. Solo con backend. */
  availabilityEstado: Record<string, EstadoCruce>;
  isLoading: boolean;
  /**
   * `true` cuando ya llegó al menos una respuesta del servidor (o en modo
   * demo). Permite distinguir «aún cargando» de «ese grupo no existe».
   */
  groupsLoaded: boolean;
  syncError: string | null;

  setSelectedGroupId: (id: string) => void;
  clearSyncError: () => void;
  /** Vuelve al estado inicial. Se llama al cerrar sesión (ver `lib/sesion.ts`). */
  reset: () => void;
  fetchGroupsFromServer: () => Promise<void>;
  fetchAvailability: (groupId: string, threshold?: number) => Promise<void>;
  fetchProposals: (groupId: string) => Promise<void>;
  createGroup: (nombre: string, descripcion: string, umbralDisponibilidad: number, userEmail: string, userName: string) => Promise<Group>;
  addMemberByEmail: (groupId: string, email: string) => Promise<boolean>;
  /**
   * Da de alta varios correos y nunca lanza: devuelve cuáles no tienen cuenta
   * y cuáles fallaron por otro motivo, para que la interfaz lo explique.
   */
  addMembersByEmail: (groupId: string, emails: string[]) => Promise<ResultadoAltas>;
  /**
   * Nombre, descripción y umbral. Las acciones de gestión de abajo LANZAN si
   * el servidor se niega (403 si no organizas, 400 si el grupo se quedaría
   * sin organizador): quien edita tiene que ver el motivo.
   */
  updateGroup: (groupId: string, cambios: CambiosDatosGrupo) => Promise<void>;
  /** Rol e imprescindible de un integrante (HU-14). */
  updateMember: (
    groupId: string,
    memberEmail: string,
    cambios: { rol?: 'ORGANIZADOR' | 'MIEMBRO'; isEssential?: boolean }
  ) => Promise<void>;
  /** Sacar a otra persona del grupo. Para salir uno mismo, `leaveGroup`. */
  removeMember: (groupId: string, memberEmail: string) => Promise<void>;
  /** Salir del grupo: si el servidor lo acepta, el grupo desaparece de la lista. */
  leaveGroup: (groupId: string) => Promise<void>;

  /**
   * `backendPayload` lleva la propuesta ya en el formato del Módulo 3 (fechas
   * concretas e instante de cierre). Va aparte del objeto de demo porque son
   * dos formas distintas del mismo plan: la de la UI razona en días de la
   * semana, y la del backend necesita fechas.
   */
  addProposal: (proposal: Omit<PlanProposal, 'id'>, backendPayload?: CrearPlanPayload) => Promise<void>;
  /** Devuelve `false` si el servidor no guardó el voto (el motivo queda en `syncError`). */
  voteProposalWindow: (proposalId: string, windowId: string, userEmail: string) => Promise<boolean>;
  /** Devuelve el estado en que quedó el plan, o `null` si no se pudo cerrar. */
  closeVotingManually: (proposalId: string) => Promise<PlanProposal['estado'] | null>;
  /** Vuelve a votar con opciones nuevas un plan que la votación exprés mandó reprogramar. */
  rescheduleProposal: (
    proposalId: string,
    ventanas: TimeWindowProposal[],
    backendPayload: Pick<CrearPlanPayload, 'plazoVotacion' | 'ventanas'>,
    plazoTexto: string
  ) => Promise<void>;
  /**
   * Con backend, si el servidor rechaza el aviso el error sube: la página
   * tiene que decírselo a quien reporta, no fingir que se envió.
   */
  reportIncident: (
    proposalId: string,
    incidence: Omit<PlanIncidence, 'id' | 'fechaReporte'>
  ) => Promise<ResultadoIncidencia>;
  /** Devuelve `false` si el servidor no lo retiró (el motivo queda en `syncError`). */
  withdrawIncident: (proposalId: string, userEmail: string) => Promise<boolean>;
}

const INITIAL_GROUPS: Group[] = [
  {
    id: '1',
    nombre: 'Grupo Universitario - Ing. Software',
    descripcion: 'Coordinación para proyecto final, entregables y sesiones de estudio de fin de ciclo.',
    creadoPor: 'alex.rodriguez@huecko.com',
    umbralDisponibilidad: 80,
    miembros: [
      { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R. (Tú)', isEssential: true, color: colorByIndex(0), rol: 'ORGANIZADOR' },
      { email: 'maria.c@huecko.com', nombre: 'María C.', isEssential: true, color: colorByIndex(1), rol: 'MIEMBRO' },
      { email: 'sam.p@huecko.com', nombre: 'Sam P.', isEssential: false, color: colorByIndex(2), rol: 'MIEMBRO' },
      { email: 'lucia.t@huecko.com', nombre: 'Lucía T.', isEssential: false, color: colorByIndex(3), rol: 'MIEMBRO' },
      { email: 'diego.r@huecko.com', nombre: 'Diego R.', isEssential: false, color: colorByIndex(4), rol: 'MIEMBRO' },
    ],
  },
  {
    id: '2',
    nombre: 'Amigos de Fin de Semana',
    descripcion: 'Pichangas de fútbol, asados de domingo, salidas y cumpleaños del grupo.',
    creadoPor: 'carlos.m@huecko.com',
    umbralDisponibilidad: 70,
    miembros: [
      { email: 'carlos.m@huecko.com', nombre: 'Carlos M.', isEssential: true, color: colorByIndex(5), rol: 'ORGANIZADOR' },
      { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R. (Tú)', isEssential: false, color: colorByIndex(0), rol: 'MIEMBRO' },
      { email: 'jorge.l@huecko.com', nombre: 'Jorge L.', isEssential: false, color: colorByIndex(6), rol: 'MIEMBRO' },
      { email: 'valeria.v@huecko.com', nombre: 'Valeria V.', isEssential: false, color: colorByIndex(7), rol: 'MIEMBRO' },
    ],
  },
];

const INITIAL_OCCUPIED_SLOTS: GroupOccupiedSlot[] = [
  { id: '101', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: colorByIndex(1), day: 'Lun', startTime: '08:00', endTime: '12:00', title: 'Clase Redes' },
  { id: '102', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: colorByIndex(2), day: 'Lun', startTime: '09:00', endTime: '13:00', title: 'Prácticas Pro' },
  { id: '103', userEmail: 'lucia.t@huecko.com', userName: 'Lucía T.', userColor: colorByIndex(3), day: 'Mar', startTime: '08:00', endTime: '11:00', title: 'Laboratorio' },
  { id: '104', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: colorByIndex(1), day: 'Mar', startTime: '14:00', endTime: '18:00', title: 'Turno Tarde' },
  { id: '105', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: colorByIndex(2), day: 'Mié', startTime: '08:00', endTime: '10:30', title: 'Cálculo' },
  { id: '106', userEmail: 'lucia.t@huecko.com', userName: 'Lucía T.', userColor: colorByIndex(3), day: 'Jue', startTime: '10:00', endTime: '14:00', title: 'Inglés VI' },
  { id: '107', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: colorByIndex(1), day: 'Vie', startTime: '08:00', endTime: '11:00', title: 'Arquitectura' },
  { id: '108', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: colorByIndex(2), day: 'Vie', startTime: '11:00', endTime: '15:00', title: 'Trabajo' },
  { id: '109', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: colorByIndex(0), day: 'Lun', startTime: '08:00', endTime: '11:00', title: 'Universidad' },
  { id: '110', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: colorByIndex(0), day: 'Mié', startTime: '08:00', endTime: '10:00', title: 'Universidad' },
  { id: '111', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: colorByIndex(0), day: 'Vie', startTime: '08:00', endTime: '11:00', title: 'Universidad' },
];

const INITIAL_PROPOSALS: PlanProposal[] = [
  {
    id: 'prop-1',
    groupId: '1',
    titulo: 'Reunión de Trabajo de Grado & Cierre',
    lugar: 'Biblioteca Central / Google Meet',
    creadoPor: 'Alex R.',
    plazoVotacion: 'Finalizada',
    estado: 'confirmado',
    ventanaConfirmadaId: 'w1',
    ventanasSugeridas: [
      { id: 'w1', dia: 'Mié', horaInicio: '11:00', horaFin: '13:00', disponibilidadPorcentaje: 100, votosUsuarios: ['alex.rodriguez@huecko.com', 'maria.c@huecko.com', 'sam.p@huecko.com'] },
    ],
  },
  {
    id: 'prop-2',
    groupId: '2',
    titulo: 'Pichanga & Parrilla de Domingo',
    lugar: 'Canchas El Golazo',
    creadoPor: 'Carlos M.',
    plazoVotacion: 'Cierra hoy a las 20:00',
    estado: 'propuesto',
    ventanasSugeridas: [
      { id: 'w-101', dia: 'Sáb', horaInicio: '16:00', horaFin: '18:00', disponibilidadPorcentaje: 85, votosUsuarios: ['alex.rodriguez@huecko.com', 'carlos.m@huecko.com'] },
      { id: 'w-102', dia: 'Dom', horaInicio: '11:00', horaFin: '13:00', disponibilidadPorcentaje: 100, votosUsuarios: ['carlos.m@huecko.com'] },
      { id: 'w-103', dia: 'Dom', horaInicio: '15:00', horaFin: '17:00', disponibilidadPorcentaje: 70, votosUsuarios: [] },
    ],
  },
  {
    id: 'prop-3',
    groupId: '1',
    titulo: 'Reunión de Avance de Tesis',
    lugar: 'Google Meet / Biblioteca',
    creadoPor: 'Alex R.',
    plazoVotacion: 'Cierra mañana a las 12:00',
    estado: 'propuesto',
    ventanasSugeridas: [
      { id: 'w-201', dia: 'Mié', horaInicio: '14:00', horaFin: '16:00', disponibilidadPorcentaje: 100, votosUsuarios: ['sam.p@huecko.com'] },
      { id: 'w-202', dia: 'Jue', horaInicio: '10:00', horaFin: '12:00', disponibilidadPorcentaje: 75, votosUsuarios: ['alex.rodriguez@huecko.com'] },
    ],
  },
];

/**
 * Cada cambio local de la lista de grupos (crear, añadir integrante, cerrar
 * sesión) sube este número. Una respuesta de `fetchGroupsFromServer` que salió
 * antes se descarta al llegar: si no, podía borrar el grupo recién creado o,
 * tras cambiar de cuenta, meter los grupos de la cuenta anterior.
 */
let generacionGrupos = 0;
/** La petición de grupos en curso, para no lanzar dos a la vez. */
let cargaDeGruposEnCurso: Promise<void> | null = null;
/** Identifica esa petición; `reset` lo borra para que su respuesta se ignore. */
let turnoDeCarga: symbol | null = null;
/**
 * Última petición de cruce por grupo. Tras dar de alta o de baja a alguien se
 * vuelve a pedir, y una respuesta anterior que llegara después pintaría el
 * heatmap con los integrantes de antes.
 */
const turnoDeCruce = new Map<string, symbol>();

/** Mismo texto que el backend, para que la demo explique lo mismo. */
const SIN_ORGANIZADOR_ROL = 'El grupo se quedaría sin organizador. Nombra a otro antes de quitarte el rol.';
const SIN_ORGANIZADOR_SALIDA = 'Eres el único organizador. Nombra a otro antes de salir del grupo.';

function yoMismo() {
  const user = useAuthStore.getState().user;
  return { id: user?.id, email: user?.email };
}

/**
 * Estado de partida. Los datos de ejemplo solo existen en modo demo: con
 * backend conectado, alguien recién llegado no debe ver grupos ajenos ni
 * siquiera durante el instante que tarda la primera carga.
 */
function estadoInicial() {
  return {
    groups: isApiEnabled ? [] : INITIAL_GROUPS,
    selectedGroupId: isApiEnabled ? null : '1',
    occupiedSlots: isApiEnabled ? [] : INITIAL_OCCUPIED_SLOTS,
    groupProposals: isApiEnabled ? [] : INITIAL_PROPOSALS,
    availability: {},
    availabilityEstado: {},
    isLoading: false,
    groupsLoaded: !isApiEnabled,
    syncError: null,
  };
}

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set, get) => ({
      ...estadoInicial(),

      setSelectedGroupId: (id) => set({ selectedGroupId: id }),

      clearSyncError: () => set({ syncError: null }),

      reset: () => {
        generacionGrupos++;
        cargaDeGruposEnCurso = null;
        turnoDeCarga = null;
        set(estadoInicial());
      },

      /**
       * En modo conectado la lista del servidor SUSTITUYE a la local, incluso
       * si viene vacía: antes se conservaban los grupos de demo cuando el
       * servidor no devolvía ninguno, así que alguien recién registrado veía
       * grupos a los que no pertenece.
       */
      fetchGroupsFromServer: () => {
        if (!isApiEnabled) return Promise.resolve();
        if (cargaDeGruposEnCurso) return cargaDeGruposEnCurso;

        const generacion = generacionGrupos;
        const turno = Symbol('carga-de-grupos');
        turnoDeCarga = turno;
        set({ isLoading: true, syncError: null });

        const carga = (async () => {
          try {
            const serverGroups = await groupsService.getGroups();
            // Se cerró sesión mientras tanto: la respuesta es de otra cuenta.
            if (turnoDeCarga !== turno) return;

            set((state) => {
              /* Si mientras llegaba la respuesta se creó un grupo o se añadió
                 a alguien, la versión local es más nueva que la del servidor
                 y se conserva. */
              const cambiosLocales = generacion !== generacionGrupos;
              const locales = new Map(state.groups.map((g) => [g.id, g]));
              const groups = cambiosLocales
                ? [
                    ...serverGroups.map((g) => locales.get(g.id) ?? g),
                    ...state.groups.filter((g) => !serverGroups.some((sg) => sg.id === g.id)),
                  ]
                : serverGroups;

              /* Los planes persistidos de un grupo del que ya no formo parte
                 aparecían en el inicio como «Grupo» y votarlos daba 404. */
              const vigentes = new Set(groups.map((g) => g.id));
              return {
                groups,
                groupProposals: state.groupProposals.filter((p) => vigentes.has(p.groupId)),
                selectedGroupId: groups.some((g) => g.id === state.selectedGroupId)
                  ? state.selectedGroupId
                  : groups[0]?.id ?? null,
                isLoading: false,
                groupsLoaded: true,
              };
            });

            /* Los planes de cada grupo alimentan el panel de inicio (próximo
               evento, votaciones pendientes). Sin esto solo aparecían tras
               abrir cada grupo por separado. */
            await Promise.all(get().groups.map((g) => get().fetchProposals(g.id)));
          } catch (error) {
            if (turnoDeCarga !== turno) return;
            const msg = error instanceof Error ? error.message : 'Error al conectar grupos con el servidor';
            set({ syncError: msg, isLoading: false, groupsLoaded: true });
          } finally {
            if (turnoDeCarga === turno) {
              turnoDeCarga = null;
              cargaDeGruposEnCurso = null;
            }
          }
        })();

        cargaDeGruposEnCurso = carga;
        return carga;
      },

      /**
       * RF-05 / RF-07. Se vuelve a pedir en cada apertura del panel y tras
       * cambiar el umbral: el backend lo recalcula sobre los bloques vigentes,
       * así que nunca se sirve un cruce viejo.
       */
      fetchAvailability: async (groupId, threshold) => {
        if (!isApiEnabled) return;

        const turno = Symbol('cruce');
        turnoDeCruce.set(groupId, turno);
        set((state) => ({
          availabilityEstado: { ...state.availabilityEstado, [groupId]: { estado: 'cargando' } },
        }));

        try {
          const cruce = await groupsService.getAvailability(groupId, threshold);
          if (turnoDeCruce.get(groupId) !== turno) return;
          set((state) => ({
            availability: { ...state.availability, [groupId]: cruce },
            availabilityEstado: { ...state.availabilityEstado, [groupId]: { estado: 'ok' } },
          }));
        } catch (error) {
          if (turnoDeCruce.get(groupId) !== turno) return;
          /* El fallo se enseña en el propio heatmap, con un botón para
             reintentar; no en el aviso general, que no dice de qué era. */
          const mensaje = error instanceof Error ? error.message : 'Error al calcular la disponibilidad';
          set((state) => ({
            availabilityEstado: { ...state.availabilityEstado, [groupId]: { estado: 'error', mensaje } },
          }));
        }
      },

      createGroup: async (nombre, descripcion, umbralDisponibilidad, userEmail, userName) => {
        if (isApiEnabled) {
          const created = await groupsService.createGroup({
            nombre,
            descripcion,
            umbral_disponibilidad: umbralDisponibilidad,
          });
          generacionGrupos++;
          set((state) => ({
            groups: [...state.groups, created],
            selectedGroupId: created.id,
          }));
          return created;
        }

        {
          const newGroup: Group = {
            id: `group-${Date.now()}`,
            nombre,
            descripcion,
            creadoPor: userEmail,
            umbralDisponibilidad,
            miembros: [
              { email: userEmail, nombre: userName, isEssential: true, color: colorByIndex(0), rol: 'ORGANIZADOR' },
            ],
          };
          set((state) => ({
            groups: [...state.groups, newGroup],
            selectedGroupId: newGroup.id,
          }));
          return newGroup;
        }
      },

      /**
       * Da de alta a alguien en el grupo, por correo.
       *
       * Sustituye a `joinGroupByCode`. El cambio no es solo de dato: antes
       * quien entraba era quien tenía el código, ahora es el organizador quien
       * decide. Por eso recibe el grupo: ya no hay que buscarlo por una cadena.
       *
       * Devuelve `false` si no hay ninguna cuenta con ese correo (404), que es
       * un caso normal que la interfaz sabe explicar. Cualquier otro fallo sube.
       */
      addMemberByEmail: async (groupId, email) => {
        if (isApiEnabled) {
          try {
            const actualizado = await groupsService.addMember(groupId, email);
            generacionGrupos++;
            set((state) => ({
              groups: state.groups.map((g) => (g.id === groupId ? actualizado : g)),
            }));
            return true;
          } catch (error) {
            if (error instanceof ApiError && error.status === 404) return false;
            throw error;
          }
        }

        // Modo demo: se añade con los datos que hay, sin comprobar cuentas.
        const grupo = get().groups.find((g) => g.id === groupId);
        if (!grupo) return false;
        const correo = normalizarCorreo(email);
        if (grupo.miembros.some((m) => normalizarCorreo(m.email) === correo)) return true;

        // Como en el backend: quien entra lo hace como integrante normal.
        const nuevos: GroupMember[] = [
          ...grupo.miembros,
          {
            email: correo,
            nombre: correo.split('@')[0],
            isEssential: false,
            color: colorByIndex(grupo.miembros.length),
            rol: 'MIEMBRO',
          },
        ];
        set((s) => ({
          groups: s.groups.map((g) => (g.id === groupId ? { ...g, miembros: nuevos } : g)),
        }));
        return true;
      },

      addMembersByEmail: async (groupId, emails) => {
        const resultado: ResultadoAltas = { sinCuenta: [], fallidos: [] };

        /* En serie y no con Promise.all: cada alta devuelve el grupo entero y
           en paralelo la última respuesta en llegar pisaría a las demás. */
        let alguna = false;
        for (const email of emails) {
          try {
            const ok = await get().addMemberByEmail(groupId, email);
            if (ok) alguna = true;
            else resultado.sinCuenta.push(email);
          } catch {
            resultado.fallidos.push(email);
          }
        }

        // Con gente nueva el cruce de antes ya no vale: cambia el denominador.
        if (alguna) void get().fetchAvailability(groupId);

        return resultado;
      },

      /**
       * RF-06 y datos del grupo. No se aplica nada en local antes de que
       * responda el servidor: pintar un cambio que luego rechaza (403 si no
       * organizas) solo confunde.
       */
      updateGroup: async (groupId, cambios) => {
        if (isApiEnabled) {
          const actualizado = await groupsService.updateGroup(groupId, {
            nombre: cambios.nombre,
            descripcion: cambios.descripcion,
            umbral_disponibilidad: cambios.umbralDisponibilidad,
          });
          generacionGrupos++;
          set((state) => ({
            groups: state.groups.map((g) => (g.id === groupId ? actualizado : g)),
          }));
          // El umbral cambia qué casillas cumplen (RF-07).
          if (cambios.umbralDisponibilidad != null) void get().fetchAvailability(groupId);
          return;
        }

        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? { ...g, ...cambios } : g)),
        }));
      },

      updateMember: async (groupId, memberEmail, cambios) => {
        const grupo = get().groups.find((g) => g.id === groupId);
        const miembro = grupo?.miembros.find(
          (m) => normalizarCorreo(m.email) === normalizarCorreo(memberEmail)
        );
        if (!grupo || !miembro) throw new Error('Esa persona ya no pertenece al grupo.');

        if (isApiEnabled) {
          const userId = miembro.userId ?? miembro.id;
          if (!userId) throw new Error('Esa persona ya no pertenece al grupo.');
          const actualizado = await groupsService.updateMember(groupId, userId, {
            rol: cambios.rol,
            esImprescindible: cambios.isEssential,
          });
          generacionGrupos++;
          set((state) => ({
            groups: state.groups.map((g) => (g.id === groupId ? actualizado : g)),
          }));
          return;
        }

        // Misma regla que el backend: el grupo nunca se queda sin organizador.
        if (
          cambios.rol === 'MIEMBRO' &&
          rolDe(grupo, miembro) === 'ORGANIZADOR' &&
          cuantosOrganizadores(grupo) <= 1
        ) {
          throw new Error(SIN_ORGANIZADOR_ROL);
        }

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id !== groupId
              ? g
              : {
                  ...g,
                  miembros: g.miembros.map((m) =>
                    m === miembro
                      ? {
                          ...m,
                          rol: cambios.rol ?? rolDe(g, m),
                          isEssential: cambios.isEssential ?? m.isEssential,
                        }
                      : m
                  ),
                }
          ),
        }));
      },

      removeMember: async (groupId, memberEmail) => {
        const grupo = get().groups.find((g) => g.id === groupId);
        const miembro = grupo?.miembros.find(
          (m) => normalizarCorreo(m.email) === normalizarCorreo(memberEmail)
        );
        // Ya no estaba: lo que se pedía ya se cumple.
        if (!grupo || !miembro) return;

        if (isApiEnabled) {
          const userId = miembro.userId ?? miembro.id;
          if (!userId) throw new Error('Esa persona ya no pertenece al grupo.');
          await groupsService.removeMember(groupId, userId);
        } else if (
          rolDe(grupo, miembro) === 'ORGANIZADOR' &&
          cuantosOrganizadores(grupo) <= 1 &&
          grupo.miembros.length > 1
        ) {
          throw new Error(SIN_ORGANIZADOR_SALIDA);
        }

        generacionGrupos++;
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, miembros: g.miembros.filter((m) => m !== miembro) } : g
          ),
        }));
        // Sus bloques ya no cuentan en el cruce, y el total baja.
        void get().fetchAvailability(groupId);
      },

      leaveGroup: async (groupId) => {
        const grupo = get().groups.find((g) => g.id === groupId);
        if (!grupo) return;
        const yo = miembroActual(grupo, yoMismo());

        if (isApiEnabled) {
          const userId = yo?.userId ?? yo?.id ?? useAuthStore.getState().user?.id;
          if (!userId) throw new Error('No se pudo identificar tu cuenta en el grupo.');
          await groupsService.removeMember(groupId, userId);
        } else if (
          yo &&
          rolDe(grupo, yo) === 'ORGANIZADOR' &&
          cuantosOrganizadores(grupo) <= 1 &&
          grupo.miembros.length > 1
        ) {
          throw new Error(SIN_ORGANIZADOR_SALIDA);
        }

        /* Fuera del grupo no queda nada que mirar: ni el grupo, ni sus planes
           (votarlos daría 404), ni su cruce. */
        generacionGrupos++;
        turnoDeCruce.delete(groupId);
        set((state) => {
          const groups = state.groups.filter((g) => g.id !== groupId);
          const availability = { ...state.availability };
          const availabilityEstado = { ...state.availabilityEstado };
          delete availability[groupId];
          delete availabilityEstado[groupId];
          return {
            groups,
            groupProposals: state.groupProposals.filter((p) => p.groupId !== groupId),
            availability,
            availabilityEstado,
            selectedGroupId:
              state.selectedGroupId === groupId ? groups[0]?.id ?? null : state.selectedGroupId,
          };
        });
      },

      /**
       * RF-08 a RF-10. Los planes de un grupo sustituyen a los que hubiera de
       * ese mismo grupo; los de los demas se dejan intactos, porque cada grupo
       * se consulta por separado.
       */
      fetchProposals: async (groupId) => {
        if (!isApiEnabled) return;

        const miembros = get().groups.find((g) => g.id === groupId)?.miembros ?? [];
        try {
          const planes = await plansService.getPlans(groupId, miembros);
          set((state) => {
            return {
              groupProposals: [
                ...planes,
                ...state.groupProposals.filter((p) => p.groupId !== groupId),
              ],
            };
          });
        } catch (error) {
          set({
            syncError: error instanceof Error ? error.message : 'No se pudieron cargar los planes',
          });
        }
      },

      addProposal: async (proposalData, backendPayload) => {
        if (isApiEnabled && backendPayload) {
          const miembros = get().groups.find((g) => g.id === proposalData.groupId)?.miembros ?? [];
          // Sin capturar el error: el backend rechaza las ventanas que no
          // cumplen el umbral (RF-08) y ese mensaje tiene que llegar a quien
          // propone, no perderse en un fallback silencioso.
          const creado = await plansService.createPlan(proposalData.groupId, backendPayload, miembros);
          set((state) => ({ groupProposals: [creado, ...state.groupProposals] }));
          return;
        }

        set((state) => ({
          groupProposals: [
            { ...proposalData, id: `prop-${Date.now()}` },
            ...state.groupProposals,
          ],
        }));
      },

      /**
       * RF-09. Pulsar una ventana alterna el voto: si ya estaba marcada, se
       * retira. El backend responde con el plan entero ya recontado, asi que
       * no hace falta recalcular el recuento en el cliente.
       */
      voteProposalWindow: async (proposalId, windowId, userEmail) => {
        const plan = get().groupProposals.find((p) => p.id === proposalId);
        const yaVotada = plan?.ventanasSugeridas
          .find((w) => w.id === windowId)
          ?.votosUsuarios.includes(userEmail) ?? false;

        if (isApiEnabled) {
          const miembros = get().groups.find((g) => g.id === plan?.groupId)?.miembros ?? [];
          try {
            const actualizado = yaVotada
              ? await plansService.removeVote(proposalId, windowId, miembros)
              : await plansService.vote(proposalId, windowId, miembros);
            set((state) => ({
              groupProposals: state.groupProposals.map((p) =>
                p.id === proposalId ? { ...p, ...actualizado } : p
              ),
            }));
            return true;
          } catch (error) {
            set({
              syncError: error instanceof Error ? error.message : 'No se pudo registrar tu voto',
            });
            return false;
          }
        }

        set((state) => ({
          groupProposals: state.groupProposals.map((p) => {
            // Cancelados, en re-coordinación o confirmados ya no admiten votos.
            if (p.id !== proposalId || !votacionAbierta(p)) return p;
            const updatedWindows = p.ventanasSugeridas.map((w) => {
              if (w.id === windowId) {
                const newVotes = yaVotada
                  ? w.votosUsuarios.filter((e) => e !== userEmail)
                  : [...w.votosUsuarios, userEmail];
                return { ...w, votosUsuarios: newVotes };
              }
              return w;
            });
            return { ...p, ventanasSugeridas: updatedWindows };
          }),
        }));
        return true;
      },

      closeVotingManually: async (proposalId) => {
        if (isApiEnabled) {
          const plan = get().groupProposals.find((p) => p.id === proposalId);
          const miembros = get().groups.find((g) => g.id === plan?.groupId)?.miembros ?? [];
          try {
            const cerrado = await plansService.closeVoting(proposalId, miembros);
            // El estado lo decide el servidor: si nadie voto, el plan queda
            // CANCELADO y no confirmado (RF-10).
            set((state) => ({
              groupProposals: state.groupProposals.map((p) =>
                p.id === proposalId ? { ...p, ...cerrado } : p
              ),
            }));
            return cerrado.estado;
          } catch (error) {
            set({
              syncError: error instanceof Error ? error.message : 'No se pudo cerrar la votación',
            });
            return null;
          }
        }

        /* La misma regla que el backend: gana la más votada (en empate, la
           más temprana) y, si nadie votó, el plan se cancela. Antes el demo
           confirmaba siempre, incluso sin un solo voto. */
        const plan = get().groupProposals.find((p) => p.id === proposalId);
        if (!plan || !votacionAbierta(plan)) return null;
        const ganadora = elegirGanadora(plan.ventanasSugeridas);
        const estado: PlanProposal['estado'] = ganadora ? 'confirmado' : 'cancelado';
        set((state) => ({
          groupProposals: state.groupProposals.map((p) =>
            p.id === proposalId
              ? { ...p, estado, ventanaConfirmadaId: ganadora?.id ?? null, plazoVotacion: 'Finalizada' }
              : p
          ),
        }));
        return estado;
      },

      rescheduleProposal: async (proposalId, ventanas, backendPayload, plazoTexto) => {
        if (isApiEnabled) {
          const plan = get().groupProposals.find((p) => p.id === proposalId);
          const miembros = get().groups.find((g) => g.id === plan?.groupId)?.miembros ?? [];
          // Sin capturar: el motivo del rechazo tiene que verse en el formulario.
          const actualizado = await plansService.reschedule(proposalId, backendPayload, miembros);
          set((state) => ({
            groupProposals: state.groupProposals.map((p) =>
              p.id === proposalId ? { ...p, ...actualizado } : p
            ),
          }));
          useIncidentsStore.getState().olvidarPlan(proposalId);
          return;
        }

        olvidarPlanSimulado(proposalId);
        useIncidentsStore.getState().olvidarPlan(proposalId);

        set((state) => ({
          groupProposals: state.groupProposals.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  estado: 'propuesto',
                  plazoVotacion: plazoTexto,
                  ventanasSugeridas: ventanas.map((v) => ({ ...v, votosUsuarios: [] })),
                  ventanaConfirmadaId: null,
                }
              : p
          ),
        }));
      },

      /*
       * Un solo camino para los dos modos: `incidentsStore` habla con el
       * servidor o, en demo, con `simuladorIncidencias`, que aplica las mismas
       * reglas. Antes el demo simulaba por su cuenta que toda ausencia
       * replanteaba el plan y que la votación cerraba al llegar a mayoría.
       *
       * Sin try/catch a propósito: si se rechaza el aviso, la página tiene
       * que enterarse y decírselo a quien reporta.
       */
      reportIncident: async (proposalId, incidenceData) => {
        const incidencias = useIncidentsStore.getState();
        if (incidenceData.tipo === 'tardanza') {
          await incidencias.reportarRetraso(
            proposalId,
            incidenceData.minutosTardanza ?? MINUTOS_TARDANZA_POR_DEFECTO
          );
          return { replantea: false, criticidad: null };
        }

        const res = await incidencias.reportarImprevisto(proposalId, incidenceData.motivo);
        return {
          replantea: res?.votacion != null,
          criticidad: res?.criticidad ?? null,
          razon: res?.razon,
        };
      },

      /* Solo un retraso se puede retirar. Una ausencia no: la votación que
         abrió sigue para todo el grupo, y quitarla solo de esta pantalla sería
         mentir. Si al final puedes ir, se vota «Mantener». */
      withdrawIncident: async (proposalId) => {
        try {
          const usuarioId = miIdentificador();
          await useIncidentsStore.getState().retirarRetraso(proposalId, usuarioId);
          return true;
        } catch (error) {
          set({
            syncError: error instanceof Error ? error.message : 'No se pudo retirar el aviso',
          });
          return false;
        }
      },
    }),
    {
      name: 'huecko-groups',
      /* v1: los integrantes de demo guardados antes no tenían rol y podían
         estar «pendientes», un estado que el backend no tiene. */
      version: 1,
      migrate: (persistido) => {
        const estado = persistido as { groups?: Group[] } | undefined;
        if (!estado?.groups) return persistido as GroupsState;
        return {
          ...estado,
          groups: estado.groups.map((g) => ({
            ...g,
            miembros: g.miembros.map((m) => {
              const limpio: GroupMember & { status?: string } = { ...m, rol: rolDe(g, m) };
              delete limpio.status;
              return limpio;
            }),
          })),
        } as unknown as GroupsState;
      },
      /* Solo los datos. Carga, errores y el cruce son de esta sesión: un
         `isLoading: true` guardado dejaría la pantalla cargando para siempre
         al volver a abrir la app. */
      partialize: (state) => ({
        groups: state.groups,
        selectedGroupId: state.selectedGroupId,
        occupiedSlots: state.occupiedSlots,
        groupProposals: state.groupProposals,
      }),
    }
  )
);

/*
 * En demo, el simulador de incidencias necesita saber cómo es cada plan y
 * cómo aplicarle lo que decide una votación exprés. Se lo cuenta el store que
 * tiene esos datos, en vez de importarlo desde allí y crear un ciclo.
 */
if (!isApiEnabled) {
  configurarSimulador({
    contexto: (planId) => {
      const { groupProposals, groups } = useGroupsStore.getState();
      const plan = groupProposals.find((p) => p.id === planId);
      const grupo = plan ? groups.find((g) => g.id === plan.groupId) : undefined;
      if (!plan || !grupo) return null;
      const ganadora = ventanaGanadora(plan);
      const creador = grupo.miembros.find(
        (m) => m.nombre === plan.creadoPor || m.email === plan.creadoPor
      );
      return {
        tituloPlan: plan.titulo,
        estado: plan.estado,
        creadoPorEmail: creador?.email,
        inicio: ganadora ? inicioDeVentana(ganadora) : null,
        miembros: grupo.miembros.map((m) => ({
          email: m.email,
          nombre: m.nombre,
          isEssential: m.isEssential,
          rol: m.rol,
        })),
      };
    },
    yo: () => {
      const user = useAuthStore.getState().user;
      return {
        email: user?.email ?? 'alex.rodriguez@huecko.com',
        nombre: user?.nombre ?? 'Alex R.',
      };
    },
    alCerrar: (planId, resultado) => {
      if (resultado === 'MANTENER') return;
      useGroupsStore.setState((state) => ({
        groupProposals: state.groupProposals.map((p) =>
          p.id === planId
            ? {
                ...p,
                estado: resultado === 'CANCELAR' ? 'cancelado' : 'en_recoordinacion',
                ventanaConfirmadaId: resultado === 'CANCELAR' ? p.ventanaConfirmadaId : null,
              }
            : p
        ),
      }));
    },
  });
}
