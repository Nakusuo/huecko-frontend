import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import { useShallow } from 'zustand/react/shallow';
import {
  useGroupsStore,
  type Group,
  type GroupMember,
  type TimeWindowProposal,
  type PlanProposal,
  type DayOfWeek,
} from '../store/groupsStore';
import { useNotificationStore } from '../store/notificationStore';
import { availabilityKey } from '../services/groupsService';
import { fechaParaDia } from '../services/plansService';
import { useAuthStore } from '../store/authStore';
import { colorByIndex } from '../theme/palette';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { isApiEnabled } from '../lib/apiClient';
import { AvisoError } from '../components/AvisoError';
import { avisarAltasPendientes } from '../lib/avisosAltas';
import { describirAviso } from '../lib/avisosIncidencia';
import { miIdentificador, useIncidentsStore } from '../store/incidentsStore';
import { VotacionExpresPanel } from '../components/VotacionExpresPanel';
import {
  estadoVisible,
  formatearPlazo,
  formatearVentana,
  problemasDePropuesta,
  ventanaGanadora,
} from '../lib/planes';

const days: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const timeSlotsHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/** Lo que propone el formulario de tardanza antes de que la persona lo ajuste. */
const MINUTOS_TARDANZA_POR_DEFECTO = 15;
/** Más de dos horas ya no es llegar tarde: es no ir. */
const MINUTOS_TARDANZA_MAXIMO = 120;

/** Usuario de ejemplo del modo demo. Con backend conectado nunca se usa. */
const USUARIO_DEMO = { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R.' };

/** Lunes de la semana en curso, en ISO. Respaldo si aun no llego el cruce. */
function lunesDeEstaSemana(): string {
  const hoy = new Date();
  hoy.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const dd = (n: number) => String(n).padStart(2, '0');
  return `${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())}`;
}

/**
 * Convierte el plazo que elige el organizador ("24 horas") en el instante ISO
 * que espera el backend.
 *
 * La lista de opciones es cerrada, asi que no hace falta interpretar texto
 * libre; lo unico que se cubre es que alguien anada una opcion nueva sin tocar
 * esta funcion, y por eso el caso por defecto son 24 horas en vez de un fallo.
 */
function plazoAInstante(plazo: string): string {
  const horas = /^(\d+)\s*horas?$/i.exec(plazo.trim());
  if (horas) {
    return new Date(Date.now() + Number(horas[1]) * 3_600_000).toISOString();
  }

  if (/viernes/i.test(plazo)) {
    const cierre = new Date();
    // 5 = viernes. Si hoy ya es viernes por la tarde, se va al siguiente.
    const diasHastaViernes = (5 - cierre.getDay() + 7) % 7;
    cierre.setDate(cierre.getDate() + diasHastaViernes);
    cierre.setHours(20, 0, 0, 0);
    if (cierre.getTime() <= Date.now()) cierre.setDate(cierre.getDate() + 7);
    return cierre.toISOString();
  }

  return new Date(Date.now() + 24 * 3_600_000).toISOString();
}

/** Porcentaje desconocido: todavía no llegó el cruce del servidor. */
const SIN_DATO = -1;

const aHora = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function GroupDetailPage() {
  const {
    groups,
    setSelectedGroupId,
    occupiedSlots,
    groupProposals,
    availability,
    fetchAvailability,
    fetchProposals,
    updateGroupThreshold,
    addMembersByEmail,
    toggleMemberEssential,
    addProposal,
    voteProposalWindow,
    closeVotingManually,
    rescheduleProposal,
    reportIncident,
    withdrawIncident,
    syncError,
    clearSyncError,
    groupsLoaded,
  } = useGroupsStore(
    /* Con selector y comparación superficial: sin él la página entera se
       redibujaba con cualquier cambio del store, incluido `isLoading`. */
    useShallow((s) => ({
      groups: s.groups,
      setSelectedGroupId: s.setSelectedGroupId,
      occupiedSlots: s.occupiedSlots,
      groupProposals: s.groupProposals,
      availability: s.availability,
      fetchAvailability: s.fetchAvailability,
      fetchProposals: s.fetchProposals,
      updateGroupThreshold: s.updateGroupThreshold,
      addMembersByEmail: s.addMembersByEmail,
      toggleMemberEssential: s.toggleMemberEssential,
      addProposal: s.addProposal,
      voteProposalWindow: s.voteProposalWindow,
      closeVotingManually: s.closeVotingManually,
      rescheduleProposal: s.rescheduleProposal,
      reportIncident: s.reportIncident,
      withdrawIncident: s.withdrawIncident,
      syncError: s.syncError,
      clearSyncError: s.clearSyncError,
      groupsLoaded: s.groupsLoaded,
    }))
  );

  const addNotification = useNotificationStore((s) => s.addNotification);

  /* Retrasos, ausencias y votación exprés de cada plan confirmado. Antes la
     votación exprés solo se podía votar desde el inicio, y solo la del primer
     plan confirmado: la de cualquier otro plan no tenía pantalla. */
  const retrasosPorPlan = useIncidentsStore((s) => s.retrasos);
  const ausenciasPorPlan = useIncidentsStore((s) => s.ausencias);
  const votacionesPorPlan = useIncidentsStore((s) => s.votaciones);
  const cargarPlanIncidencias = useIncidentsStore((s) => s.cargarPlan);
  const votarExpres = useIncidentsStore((s) => s.votarExpres);
  const miId = miIdentificador();

  /* Identidad real de quien usa la app. Antes estaba escrita a mano en cinco
     sitios como 'alex.rodriguez@huecko.com', asi que con backend real todo el
     mundo votaba y creaba grupos en nombre del usuario de demo. */
  const authUser = useAuthStore((state) => state.user);
  const userEmail = authUser?.email ?? (isApiEnabled ? '' : USUARIO_DEMO.email);
  const userName = authUser?.nombre ?? (isApiEnabled ? '' : USUARIO_DEMO.nombre);

  /** Si quien usa la app organiza este grupo. `ADMIN` es el nombre del demo. */
  const soyOrganizador = (group: Group) => {
    const yo = group.miembros.find(
      (m) => (authUser?.id && (m.userId ?? m.id) === authUser.id) || m.email === userEmail
    );
    return yo?.rol === 'ORGANIZADOR' || yo?.rol === 'ADMIN';
  };

  /* El grupo lo manda la URL, no el estado. Asi un enlace a /groups/:id abre
     siempre el mismo grupo, y volver atras en el navegador funciona. */
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;

  /* Varias acciones del store siguen leyendo `selectedGroupId`. Se sincroniza
     con la URL en vez de tocarlas todas. */
  useEffect(() => {
    if (groupId) setSelectedGroupId(groupId);
  }, [groupId, setSelectedGroupId]);

  /**
   * RF-05 / RF-07: el cruce lo calcula el backend y se vuelve a pedir al
   * cambiar de grupo. En modo demo `fetchAvailability` no hace nada y el
   * cálculo local de `getCellAvailability` sigue mandando.
   */
  const activeGroupId = selectedGroup?.id;
  useEffect(() => {
    if (!activeGroupId) return;
    fetchAvailability(activeGroupId);
    fetchProposals(activeGroupId);
  }, [activeGroupId, fetchAvailability, fetchProposals]);

  /* Por ids y no por el array: cada recarga de planes crea uno nuevo aunque
     sean los mismos, y relanzaría las peticiones en bucle. */
  const idsConfirmados = groupProposals
    .filter((p) => p.groupId === activeGroupId && p.estado === 'confirmado')
    .map((p) => p.id)
    .join(',');
  useEffect(() => {
    if (!idsConfirmados) return;
    idsConfirmados.split(',').forEach((id) => void cargarPlanIncidencias(id));
  }, [idsConfirmados, cargarPlanIncidencias]);

  // Proposal Modal State
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalLugar, setProposalLugar] = useState('');
  const [proposalPlazo, setProposalPlazo] = useState('24 horas');
  const [proposalError, setProposalError] = useState('');
  const [suggestedWindows, setSuggestedWindows] = useState<TimeWindowProposal[]>([]);
  /** Plan en re-coordinación que se está reprogramando, o `null` si es uno nuevo. */
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  // Form window input temporary
  const [tempDay, setTempDay] = useState<DayOfWeek>('Mié');
  const [tempStart, setTempStart] = useState('14:00');
  const [tempEnd, setTempEnd] = useState('16:00');

  // Group Create / Edit Modals State
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);

  // Group Form Inputs
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [umbral, setUmbral] = useState(100);
  const [membersList, setMembersList] = useState<GroupMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [isEssentialNewMember, setIsEssentialNewMember] = useState(false);


  // Join Group Modal State

  useModalDismiss(isProposeModalOpen, () => setIsProposeModalOpen(false));
  useModalDismiss(isEditGroupModalOpen, () => setIsEditGroupModalOpen(false));
  /* Se guarda la referencia (grupo + correo) y no el objeto: así la ficha
     refleja los cambios del store en vez de quedarse con una copia vieja. */
  const [memberRef, setMemberRef] = useState<{ groupId: string; email: string } | null>(null);
  const memberGroup = memberRef ? groups.find((g) => g.id === memberRef.groupId) ?? null : null;
  const memberDetail = memberGroup?.miembros.find((m) => m.email === memberRef?.email) ?? null;

  useModalDismiss(Boolean(memberDetail), () => setMemberRef(null));

  /* Mismo criterio que en «Mi horario»: en el móvil se elige un día y se ve ese
     día, en vez de arrastrar siete columnas a lo ancho. */
  const [sharedDay, setSharedDay] = useState<DayOfWeek>(() => days[(new Date().getDay() + 6) % 7]);

  const openEditModal = (group: Group) => {
    setSelectedGroupId(group.id);
    setNombre(group.nombre);
    setDescripcion(group.descripcion);
    setUmbral(group.umbralDisponibilidad);
    setMembersList(group.miembros);
    setNewMemberEmail('');
    setNewMemberName('');
    setIsEssentialNewMember(false);
    setIsEditGroupModalOpen(true);
  };

  const handleAddMemberToForm = () => {
    if (!newMemberEmail || !newMemberEmail.includes('@')) return;
    if (membersList.some((m) => m.email.toLowerCase() === newMemberEmail.toLowerCase())) return;

    const assignedColor = colorByIndex(membersList.length);

    const newM: GroupMember = {
      email: newMemberEmail,
      nombre: newMemberName || newMemberEmail.split('@')[0],
      isEssential: isEssentialNewMember,
      color: assignedColor,
      status: 'pendiente',
    };

    setMembersList([...membersList, newM]);
    setNewMemberEmail('');
    setNewMemberName('');
    setIsEssentialNewMember(false);
  };

  const handleRemoveMemberFromForm = (email: string) => {
    if (membersList.length <= 1) return; // Mínimo 1 integrante
    setMembersList(membersList.filter((m) => m.email !== email));
  };

  const handleToggleEssential = (email: string) => {
    setMembersList(
      membersList.map((m) => (m.email === email ? { ...m, isEssential: !m.isEssential } : m))
    );
  };

  /**
   * Guarda el umbral y da de alta a quien se haya añadido a la lista.
   *
   * Es la segunda mitad del modelo que sustituyó al código de invitación: la
   * gente entra al crear el grupo o desde aquí. Las altas van una a una porque
   * el servidor puede rechazar un correo sin cuenta, y hay que poder decir
   * cuál falló.
   */
  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !nombre) return;

    if (umbral !== selectedGroup.umbralDisponibilidad) {
      // Si falla, el store deshace el cambio y deja el motivo en `syncError`.
      await updateGroupThreshold(selectedGroup.id, umbral);
    }

    const yaEstaban = new Set(selectedGroup.miembros.map((m) => m.email.toLowerCase()));
    const nuevos = membersList
      .filter((m) => !yaEstaban.has(m.email.toLowerCase()))
      .map((m) => m.email);

    const { sinCuenta, fallidos } = await addMembersByEmail(selectedGroup.id, nuevos);
    avisarAltasPendientes(addNotification, sinCuenta, fallidos, selectedGroup.id);

    setIsEditGroupModalOpen(false);
  };

  /**
   * Disponibilidad de una ventana: la peor de las horas que cubre, que es como
   * la mide el backend. Sin cruce del servidor no se inventa nada: antes salía
   * «100% libre» para cualquier opción en modo conectado.
   */
  const porcentajeDeVentana = (group: Group, day: DayOfWeek, inicio: string, fin: string): number => {
    if (fin <= inicio) return SIN_DATO;
    if (isApiEnabled && !availability[group.id]) return SIN_DATO;
    const desde = Number(inicio.slice(0, 2));
    const hasta = Math.ceil(Number(fin.slice(0, 2)) + Number(fin.slice(3, 5)) / 60);
    let minimo = 100;
    for (let hora = desde; hora < hasta; hora++) {
      minimo = Math.min(minimo, getCellAvailability(group, day, hora).freePercentage);
    }
    return minimo;
  };

  /**
   * Las dos primeras franjas en las que cabe el grupo y que aún no han pasado.
   * Antes se precargaban siempre Mié 11–13 y Jue 16–18, cayeran donde cayeran.
   */
  const ventanasIniciales = (group: Group): TimeWindowProposal[] => {
    if (isApiEnabled && !availability[group.id]) return [];
    const lunes = availability[group.id]?.weekFrom ?? lunesDeEstaSemana();
    const candidatas: TimeWindowProposal[] = [];
    for (const dia of days) {
      for (const franja of getRecommendedWindows(group, dia)) {
        const horaInicio = aHora(franja.start);
        const horaFin = aHora(Math.min(franja.end, franja.start + 2));
        candidatas.push({
          id: `sugerida-${dia}-${horaInicio}`,
          dia,
          fecha: fechaParaDia(lunes, dia, horaInicio),
          horaInicio,
          horaFin,
          disponibilidadPorcentaje: franja.minimumAvailability,
          votosUsuarios: [],
        });
      }
    }
    return candidatas
      .sort((x, y) => `${x.fecha}${x.horaInicio}`.localeCompare(`${y.fecha}${y.horaInicio}`))
      .slice(0, 2);
  };

  // Acciones de propuestas y votaciones.
  const openProposePlanModal = (group: Group, reprogramar?: PlanProposal) => {
    setSelectedGroupId(group.id);
    setReschedulingId(reprogramar?.id ?? null);
    setProposalTitle(reprogramar?.titulo ?? '');
    setProposalLugar(reprogramar?.lugar ?? '');
    setProposalPlazo('24 horas');
    setProposalError('');
    setSuggestedWindows(ventanasIniciales(group));
    setIsProposeModalOpen(true);
  };

  const handleAddWindowToProposal = () => {
    if (!selectedGroup) return;
    if (suggestedWindows.length >= 5) return;

    const lunes = availability[selectedGroup.id]?.weekFrom ?? lunesDeEstaSemana();
    const newW: TimeWindowProposal = {
      id: `opcion-${tempDay}-${tempStart}-${tempEnd}`,
      dia: tempDay,
      fecha: fechaParaDia(lunes, tempDay, tempStart),
      horaInicio: tempStart,
      horaFin: tempEnd,
      disponibilidadPorcentaje: porcentajeDeVentana(selectedGroup, tempDay, tempStart, tempEnd),
      votosUsuarios: [],
    };
    setSuggestedWindows([...suggestedWindows, newW]);
  };

  const handleRemoveWindowFromProposal = (id: string) => {
    if (suggestedWindows.length <= 2) return;
    setSuggestedWindows(
      suggestedWindows.filter((w) => w.id !== id)
    );
  };

  const handleCreateProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProposalError('');
    // El número de opciones lo explica `problemasDePropuesta`; antes el
    // formulario simplemente no hacía nada con menos de dos.
    if (!selectedGroup || !proposalTitle.trim()) return;

    /* El backend necesita una fecha concreta por ventana y un instante de
       cierre; la UI razona en dias de la semana y en textos como "24 horas".
       La conversion se hace aqui, en el borde. */
    const lunesDeLaSemana = availability[selectedGroup.id]?.weekFrom ?? lunesDeEstaSemana();
    const ventanasConFecha = suggestedWindows.map((w) => ({
      ...w,
      fecha: w.fecha ?? fechaParaDia(lunesDeLaSemana, w.dia, w.horaInicio),
    }));
    const ventanasPayload = ventanasConFecha.map((w) => ({
      fecha: w.fecha,
      horaInicio: w.horaInicio,
      horaFin: w.horaFin,
    }));
    const plazoISO = plazoAInstante(proposalPlazo);

    /* Lo que el backend rechazaría (opciones pasadas, solapadas, un plazo que
       cierra después de la primera opción) se dice aquí, antes de enviar. */
    const problemas = problemasDePropuesta(
      ventanasConFecha.map((w) => ({ dia: w.dia, fecha: w.fecha, horaInicio: w.horaInicio, horaFin: w.horaFin })),
      plazoISO
    );
    if (problemas.length > 0) {
      setProposalError(problemas.join(' '));
      return;
    }

    try {
      if (reschedulingId) {
        await rescheduleProposal(
          reschedulingId,
          ventanasConFecha,
          { plazoVotacion: plazoISO, ventanas: ventanasPayload },
          proposalPlazo
        );
      } else {
        await addProposal(
          {
            groupId: selectedGroup.id,
            titulo: proposalTitle,
            lugar: proposalLugar,
            creadoPor: userName,
            plazoVotacion: proposalPlazo,
            estado: 'propuesto',
            ventanasSugeridas: ventanasConFecha,
          },
          {
            titulo: proposalTitle,
            lugar: proposalLugar || undefined,
            plazoVotacion: plazoISO,
            votosMultiples: true,
            ventanas: ventanasPayload,
          }
        );
      }
    } catch (error: unknown) {
      /* El backend rechaza las ventanas que no llegan al umbral del grupo
         (RF-08). Ese motivo tiene que verse en el formulario, y el modal
         quedarse abierto para poder corregir las opciones. */
      setProposalError(error instanceof Error ? error.message : 'No se pudo crear el plan');
      return;
    }

    addNotification(
      reschedulingId
        ? {
            title: 'Plan reprogramado',
            description: `"${proposalTitle}" vuelve a votarse con fechas nuevas`,
            type: 'proposal',
            groupId: selectedGroup.id,
          }
        : {
            title: 'Nuevo plan propuesto',
            description: `Se creó "${proposalTitle}" en ${selectedGroup.nombre}`,
            type: 'proposal',
            groupId: selectedGroup.id,
          }
    );

    setIsProposeModalOpen(false);
  };

  const handleVote = (
    proposalId: string,
    windowId: string
  ) => {
    void voteProposalWindow(proposalId, windowId, userEmail);
  };

  const handleCloseVotingManually = async (proposalId: string) => {
    const estado = await closeVotingManually(proposalId);
    // Si no se pudo cerrar, el error ya se muestra arriba; no se anuncia nada.
    if (estado === null) return;
    /* Con backend el cierre llega por el canal en tiempo real a todo el grupo,
       también a quien cerró: avisar aquí además lo duplicaba. */
    if (isApiEnabled) return;

    /* El servidor decide cómo queda: sin votos el plan se cancela (RF-10), así
       que anunciar siempre «confirmado» mentía en ese caso. */
    addNotification(
      estado === 'cancelado'
        ? {
            title: 'Plan cancelado',
            description: 'Se cerró la votación sin votos y el plan quedó cancelado.',
            type: 'system',
          }
        : {
            title: 'Plan confirmado',
            description: 'Se cerró la votación y el plan quedó confirmado.',
            type: 'confirmation',
          }
    );
  };

  // Incident Modal State (Faltas / Tardanzas)
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [targetProposalForIncident, setTargetProposalForIncident] = useState<PlanProposal | null>(null);
  const [incidentType, setIncidentType] = useState<'falta' | 'tardanza' | 'imprevisto'>('falta');
  const [incidentMotivo, setIncidentMotivo] = useState('');
  // Texto tal cual se escribe; se valida al enviar. Forzar un número en cada
  // pulsación convertía el campo vacío en «1» y «30» acababa en «130».
  const [incidentMinutos, setIncidentMinutos] = useState(String(MINUTOS_TARDANZA_POR_DEFECTO));
  const [incidentEnviando, setIncidentEnviando] = useState(false);
  const [incidentError, setIncidentError] = useState<string | null>(null);

  const openReportIncidentModal = (proposal: PlanProposal) => {
    setTargetProposalForIncident(proposal);
    setIncidentType('falta');
    setIncidentMotivo('');
    setIncidentMinutos(String(MINUTOS_TARDANZA_POR_DEFECTO));
    setIncidentError(null);
    setIsIncidentModalOpen(true);
  };

  const handleReportIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProposalForIncident || !incidentMotivo.trim() || incidentEnviando) return;

    const esTardanza = incidentType === 'tardanza';
    const minutos = Math.round(Number(incidentMinutos));
    if (esTardanza && !(minutos >= 1 && minutos <= MINUTOS_TARDANZA_MAXIMO)) {
      setIncidentError(`Indica entre 1 y ${MINUTOS_TARDANZA_MAXIMO} minutos.`);
      return;
    }

    setIncidentEnviando(true);
    setIncidentError(null);

    try {
      const resultado = await reportIncident(targetProposalForIncident.id, {
        userEmail,
        userName,
        tipo: incidentType,
        motivo: incidentMotivo.trim(),
        minutosTardanza: esTardanza ? minutos : undefined,
      });

      addNotification({
        title: esTardanza ? 'Retraso avisado' : 'Imprevisto reportado',
        description: describirAviso(
          userName,
          targetProposalForIncident.titulo,
          esTardanza ? minutos : null,
          resultado
        ),
        type: 'incident',
        groupId: targetProposalForIncident.groupId,
      });

      setIsIncidentModalOpen(false);
    } catch (error) {
      // El modal sigue abierto: quien reporta ve que no llegó y puede reintentar.
      setIncidentError(
        error instanceof Error ? error.message : 'No se pudo enviar el aviso. Vuelve a intentarlo.'
      );
    } finally {
      setIncidentEnviando(false);
    }
  };


  /**
   * Coincidencias y espacios libres de una franja de una hora.
   *
   * Con el backend conectado manda su cruce (RF-05): es la única versión que
   * ve los horarios reales de todo el grupo, y además mide el solape en
   * minutos, así que un bloque que acaba a las 10:30 deja ocupada la franja de
   * las 10. El cálculo local de abajo solo entra en modo demo, donde
   * `occupiedSlots` son datos de ejemplo del propio cliente.
   *
   * `occupiedMembers` se queda vacío en modo conectado a propósito: el backend
   * devuelve recuentos, nunca quién está ocupado ni con qué (RNF-02).
   */
  const getCellAvailability = (
    group: Group,
    day: DayOfWeek,
    hour: number
  ) => {
    const serverCell = availability[group.id]?.cells[availabilityKey(day, hour)];
    if (serverCell) {
      return {
        freeCount: serverCell.freeCount,
        totalMembers: availability[group.id].membersCount,
        freePercentage: serverCell.freePercentage,
        meetsThreshold: serverCell.meetsThreshold,
        occupiedMembers: [] as typeof occupiedSlots,
      };
    }

    // Miembros ocupados en esta franja de 1 hora
    const occupiedInCell = occupiedSlots.filter((s) => {
      if (s.day !== day) return false;
      if (!group.miembros.some((m) => m.email === s.userEmail)) {
        return false;
      }

      const startH = parseInt(s.startTime.split(':')[0], 10);
      const endH = parseInt(s.endTime.split(':')[0], 10);
      return hour >= startH && hour < endH;
    });

    const totalMembers = group.miembros.length;
    const occupiedCount = occupiedInCell.length;
    const freeCount = totalMembers - occupiedCount;
    const freePercentage = Math.round(
      (freeCount / totalMembers) * 100
    );

    const meetsThreshold =
      freePercentage >= group.umbralDisponibilidad;

    return {
      freeCount,
      totalMembers,
      freePercentage,
      meetsThreshold,
      occupiedMembers: occupiedInCell,
    };
  };

  /** Agrupa horas consecutivas con quórum en franjas legibles */
  const getRecommendedWindows = (
    group: Group,
    day: DayOfWeek
  ) => {
    type FreeWindow = {
      start: number;
      end: number;
      minimumAvailability: number;
      freeCount: number;
    };

    const windows: FreeWindow[] = [];

    timeSlotsHours.forEach((hour) => {
      const cell = getCellAvailability(group, day, hour);
      const current = windows[windows.length - 1];

      if (cell.meetsThreshold && current?.end === hour) {
        current.end = hour + 1;
        current.minimumAvailability = Math.min(
          current.minimumAvailability,
          cell.freePercentage
        );
        current.freeCount = Math.min(
          current.freeCount,
          cell.freeCount
        );
      } else if (cell.meetsThreshold) {
        windows.push({
          start: hour,
          end: hour + 1,
          minimumAvailability: cell.freePercentage,
          freeCount: cell.freeCount,
        });
      }
    });

    return windows;
  };

  /**
   * Planes y horario común de un grupo.
   *
   * Se renderiza pegado a la tarjeta del grupo seleccionado y no al final de
   * la página: en el móvil, pulsar «Ver horario en común» dejaba el panel a
   * dos pantallas de distancia del grupo que lo abría.
   */
  const renderGroupPanel = (grp: Group) => (
    <div className="space-y-6">
          <section className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 elev-1">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-outline-variant/60 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2 font-headline">
                  <span aria-hidden="true" className="material-symbols-outlined text-primary">how_to_vote</span>
                  Planes propuestos y votación: {grp.nombre}
                </h2>
              </div>

              <button
                onClick={() => openProposePlanModal(grp)}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
                Proponer plan
              </button>
            </div>

            {/* Listado de Propuestas del Grupo */}
            {groupProposals.filter((p) => p.groupId === grp.id).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupProposals
                  .filter((p) => p.groupId === grp.id)
                  .map((proposal) => {
                    const estado = estadoVisible(proposal);
                    const isClosed = proposal.estado === 'confirmado';
                    const isInReplan = proposal.estado === 'en_recoordinacion';
                    /* Solo se vota con la votación abierta: antes un plan
                       cancelado o con el plazo vencido seguía admitiendo votos
                       y ofreciendo «Confirmar plan». */
                    const abierta = estado === 'abierta';
                    const ganadora = ventanaGanadora(proposal);
                    /* El backend solo deja cerrar o reprogramar a quien propuso
                       el plan o a un organizador; ofrecerlo a todos acababa en
                       un 403. En demo no hay roles que comprobar. */
                    const puedeGestionar =
                      !isApiEnabled || soyOrganizador(grp) || proposal.creadoPorId === authUser?.id;
                    /* En demo la votación exprés corre mientras el plan está en
                       re-coordinación; con backend, ese estado significa que ya
                       se decidió reprogramar y faltan las fechas nuevas. */
                    /* Con la votación exprés decidida a favor de reprogramar,
                       el plan espera fechas nuevas. */
                    const porReprogramar = isInReplan;
                    const retrasos = retrasosPorPlan[proposal.id] ?? [];
                    const ausencias = ausenciasPorPlan[proposal.id] ?? [];
                    const votacion = votacionesPorPlan[proposal.id] ?? null;
                    const miRetraso = retrasos.find((r) => r.usuarioId === miId);
                    const miAusencia = ausencias.find((a) => a.usuarioId === miId);
                    return (
                      <div
                        key={proposal.id}
                        className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                          isInReplan
                            ? 'bg-warning-container/60 border-warning/40'
                            : isClosed
                            ? 'bg-inverse-primary/30 border-secondary/50'
                            : 'bg-surface-container-lowest border-outline-variant/60'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-on-surface">{proposal.titulo}</h3>
                              {proposal.lugar && (
                                <span className="text-2xs text-on-surface-variant font-normal">
                                  • {proposal.lugar}
                                </span>
                              )}
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-2xs font-bold ${
                                isInReplan
                                  ? 'bg-warning-container text-on-warning-container border border-warning/50'
                                  : isClosed
                                  ? 'bg-inverse-primary/50 text-on-tertiary-container border border-secondary'
                                  : estado === 'abierta'
                                  ? 'bg-secondary-container text-on-secondary-container border border-secondary/40'
                                  : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'
                              }`}
                            >
                              {
                                {
                                  abierta: 'Votación abierta',
                                  cerrando: 'Votación cerrada',
                                  confirmado: 'Confirmado',
                                  cancelado: 'Cancelado',
                                  recoordinacion: porReprogramar ? 'Por reprogramar' : 'Imprevisto',
                                }[estado]
                              }
                            </span>
                          </div>

                          {/* Quién llega tarde y quién no va: lo que ya sabe el
                              servidor, no solo lo que avisé yo desde aquí. */}
                          {isClosed && (retrasos.length > 0 || ausencias.length > 0) && (
                            <ul className="mb-3 p-3 rounded-xl bg-warning-container border border-warning/30 space-y-1.5 text-xs text-on-warning-container">
                              {ausencias.map((a) => (
                                <li key={`aus-${a.usuarioId}`} className="flex justify-between gap-2">
                                  <span>
                                    <strong>{a.usuarioId === miId ? 'Tú' : a.nombreUsuario}</strong> no irá
                                    {a.motivo ? `: ${a.motivo}` : ''}
                                  </span>
                                  {a.critica && <span className="rotulo text-2xs shrink-0">crítica</span>}
                                </li>
                              ))}
                              {retrasos.map((r) => (
                                <li key={`ret-${r.usuarioId}`}>
                                  <strong>{r.usuarioId === miId ? 'Tú' : r.nombreUsuario}</strong> llegará{' '}
                                  {r.minutosEstimados} min tarde{r.corregido ? ' (corregido)' : ''}
                                </li>
                              ))}
                            </ul>
                          )}

                          {votacion && (
                            <div className="mb-3">
                              <VotacionExpresPanel
                                votacion={votacion}
                                onVotar={(opcion) => votarExpres(proposal.id, opcion)}
                              />
                            </div>
                          )}

                          {/* Ventanas de tiempo sugeridas */}
                          <div className="space-y-1.5 mb-3">
                            {proposal.ventanasSugeridas.map((ventana) => {
                              const hasVoted = ventana.votosUsuarios.includes(userEmail);
                              const esLaElegida = isClosed && ganadora?.id === ventana.id;

                              return (
                                <button type="button"
                                  key={ventana.id}
                                  onClick={() => abierta && handleVote(proposal.id, ventana.id)}
                                  aria-pressed={hasVoted}
                                  disabled={!abierta}
                                  className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                                    esLaElegida
                                      ? 'bg-olive/25 border-ink'
                                      : hasVoted
                                      ? 'bg-inverse-primary/30 border-secondary'
                                      : 'bg-surface-container-lowest border-outline-variant/60 hover:border-secondary'
                                  } ${!abierta ? 'cursor-default' : ''} ${!abierta && !esLaElegida ? 'opacity-70' : ''}`}
                                >
                                  <div className="flex items-center gap-2 text-xs">
                                    <span
                                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-2xs ${
                                        hasVoted
                                          ? 'bg-secondary border-primary text-on-secondary font-bold'
                                          : 'border-outline-variant text-transparent'
                                      }`}
                                    >
                                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check</span>
                                    </span>
                                    <span className="font-semibold text-on-surface">
                                      {formatearVentana(ventana)}
                                    </span>
                                    {esLaElegida ? (
                                      <span className="rotulo text-2xs bg-ink text-cream px-1.5 py-0.5">Elegida</span>
                                    ) : (
                                      <span className="text-2xs text-primary font-bold">
                                        ({ventana.disponibilidadPorcentaje}% libre)
                                      </span>
                                    )}
                                  </div>

                                  <span className="text-xs font-bold text-on-surface-variant">
                                    {ventana.votosUsuarios.length} {ventana.votosUsuarios.length === 1 ? 'voto' : 'votos'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Pie de tarjeta ultra-limpio */}
                        <div className="pt-2.5 border-t border-outline-variant/60 flex justify-between items-center text-xs text-on-surface-variant">
                          <span className="text-2xs font-mono">Plazo: {formatearPlazo(proposal.plazoVotacion)}</span>

                          <div className="flex gap-2">
                            {/* Un plan cancelado no admite avisos, y quien ya
                                avisó retira el suyo en vez de mandar otro. */}
                            {porReprogramar && puedeGestionar && (
                              <button
                                onClick={() => openProposePlanModal(grp, proposal)}
                                className="text-2xs text-primary hover:text-primary-hover font-bold cursor-pointer"
                              >
                                Proponer nuevas fechas
                              </button>
                            )}

                            {/* Solo hay algo a lo que faltar o llegar tarde cuando el
                                plan está confirmado. Un retraso se puede retirar;
                                una ausencia no, porque ya avisó a todo el grupo. */}
                            {isClosed &&
                              (miRetraso ? (
                                <button
                                  onClick={() => void withdrawIncident(proposal.id, userEmail)}
                                  className="text-2xs text-on-surface-variant hover:text-on-surface font-semibold cursor-pointer underline"
                                >
                                  Retirar mi retraso
                                </button>
                              ) : miAusencia ? (
                                <span className="text-2xs text-on-surface-variant">Avisaste que no irás</span>
                              ) : (
                                <button
                                  onClick={() => openReportIncidentModal(proposal)}
                                  className="text-2xs text-on-warning-container hover:text-on-warning-container font-semibold cursor-pointer"
                                >
                                  Reportar imprevisto
                                </button>
                              ))}

                            {/* «Cerrar» y no «Confirmar»: si nadie votó, cerrar
                                cancela el plan. */}
                            {abierta && puedeGestionar && (
                              <button
                                onClick={() => void handleCloseVotingManually(proposal.id)}
                                className="text-2xs text-primary hover:text-primary-hover font-bold cursor-pointer"
                              >
                                Cerrar votación
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-surface-container-lowest border border-dashed border-outline-variant text-center">
                <p className="text-on-surface-variant text-xs mb-3">No hay propuestas de planes activas en este grupo.</p>
                <button
                  onClick={() => openProposePlanModal(grp)}
                  className="px-4 py-2 rounded-xl bg-inverse-primary/30 text-primary-hover border border-secondary/40 text-xs font-semibold hover:bg-inverse-primary/50 cursor-pointer"
                >
                  + Proponer el primer Plan
                </button>
              </div>
            )}
          </section>
          <section className="bg-surface-container-low rounded-2xl p-6 md:p-8 elev-1 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-outline-variant/60 pb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-on-surface font-headline">Horario en común: {grp.nombre}</h2>
                  <span className="px-3 py-1 rounded-lg bg-primary-container border border-inverse-primary text-primary text-xs font-bold">
                    Actualizado
                  </span>
                </div>
              </div>

              <div className="bg-surface-bright px-4 py-2 rounded-xl border border-outline-variant text-xs text-on-surface-variant">
                {grp.miembros.length} integrantes · {grp.umbralDisponibilidad}% mínimo
              </div>
            </div>

            {/* Agenda de coincidencias: una lectura rápida, sin 84 casillas. */}
            <div>
              <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-7 gap-3">
                {days.map((day) => {
                  const windows = getRecommendedWindows(grp, day);
                  return (
                    <article key={day} className="rounded-xl border border-outline-variant bg-surface-bright overflow-hidden">
                      <header className="px-3 py-2.5 border-b border-surface-container-highest text-xs font-bold uppercase tracking-wider text-primary">
                        {day}
                      </header>
                      <div className="p-2 space-y-2 min-h-28">
                        {windows.length ? windows.map((window) => (
                          /* Sin barra de acento a la izquierda: el relleno ya
                             identifica la franja, y una barra de color fija que
                             no codifica ningún dato solo añade ruido. */
                          <div key={`${day}-${window.start}`} className="rounded-lg bg-primary-container px-2.5 py-2">
                            <p className="text-xs font-bold text-on-primary-container">
                              {window.start.toString().padStart(2, '0')}:00 - {window.end.toString().padStart(2, '0')}:00
                            </p>
                            <p className="mt-0.5 text-2xs text-on-surface-variant">
                              {window.minimumAvailability}% libre · {window.freeCount}/{grp.miembros.length}
                            </p>
                          </div>
                        )) : (
                          <p className="px-1 py-3 text-2xs leading-relaxed text-on-surface-variant">No hay una franja que cumpla el umbral.</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Vista móvil: un día a la vez */}
              <div className="md:hidden space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {days.map((day) => {
                    const libres = getRecommendedWindows(grp, day).length;
                    const activo = day === sharedDay;

                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => setSharedDay(day)}
                        aria-pressed={activo}
                        className={`shrink-0 min-w-14 px-3 py-2 rounded-lg border text-center transition-colors ${
                          activo
                            ? 'bg-primary border-primary text-on-primary'
                            : 'bg-surface-container border-outline-variant text-on-surface-variant'
                        }`}
                      >
                        <span className="block text-xs font-bold">{day}</span>
                        <span className={`block text-2xs ${activo ? 'opacity-80' : 'text-on-surface-variant'}`}>
                          {libres === 0 ? 'sin hueco' : `${libres} ${libres === 1 ? 'franja' : 'franjas'}`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const windows = getRecommendedWindows(grp, sharedDay);

                  if (windows.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container/60 p-8 text-center">
                        <span aria-hidden="true" className="material-symbols-outlined text-[40px] text-on-surface-variant">
                          event_busy
                        </span>
                        <p className="mt-1 text-sm font-semibold text-on-surface">Sin huecos el {sharedDay}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Ninguna franja llega al {grp.umbralDisponibilidad}% del grupo.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <ul className="space-y-2.5">
                      {windows.map((window) => (
                        <li
                          key={`${sharedDay}-${window.start}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-bright px-4 py-3"
                        >
                          <span className="text-sm font-bold text-on-surface font-mono">
                            {window.start.toString().padStart(2, '0')}:00 - {window.end.toString().padStart(2, '0')}:00
                          </span>
                          <span className="text-2xs text-on-surface-variant text-right shrink-0">
                            {window.minimumAvailability}% libre
                            <span className="block">{window.freeCount}/{grp.miembros.length} personas</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </section>
    </div>
  );

  return (
    <div className="bg-surface text-on-surface min-h-dvh flex flex-col">
      <Navbar currentTab="groups" />

      {/* Main Content Canvas */}
      <main id="contenido" tabIndex={-1} className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-10 pt-8 pb-24 md:pb-12">
        {/* Los fallos del servidor se guardaban en `syncError` pero ninguna
            pantalla lo mostraba: la acción parecía hecha y no lo estaba. */}
        {syncError && <AvisoError mensaje={syncError} onCerrar={clearSyncError} />}

        {/* Cabecera del grupo. La vuelta a la lista va primero y siempre en el
            mismo sitio: es la única salida, porque desde aquí no se puede
            saltar a otro grupo. */}
        <header className="mb-8">
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="mb-4 -ml-1.5 flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_back</span>
            Mis grupos
          </button>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">
                {selectedGroup?.nombre ?? 'Grupo'}
              </h1>
              {selectedGroup?.descripcion && (
                <p className="mt-1.5 max-w-2xl text-sm text-on-surface-variant md:text-base">
                  {selectedGroup.descripcion}
                </p>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                <span className="tabular-nums">
                  {selectedGroup?.miembros.length ?? 0} integrantes
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  Umbral {selectedGroup?.umbralDisponibilidad ?? 0}%
                </span>
              </p>
            </div>

            {selectedGroup && (
              <button
                onClick={() => openEditModal(selectedGroup)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high active:scale-95 md:w-auto"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">group</span>
                Integrantes y ajustes
              </button>
            )}
          </div>
        </header>

        {selectedGroup && renderGroupPanel(selectedGroup)}

        {!selectedGroup && !groupsLoaded && (
          <p role="status" className="py-16 text-center text-sm text-on-surface-variant">
            Cargando el grupo…
          </p>
        )}

        {!selectedGroup && groupsLoaded && (
          <EmptyState
            icon="search_off"
            title="Ese grupo no existe o ya no perteneces a él"
            description="Puede que te hayan sacado del grupo, o que la dirección esté mal escrita."
            actionLabel="Volver a mis grupos"
            onAction={() => navigate('/groups')}
          />
        )}
      </main>

      {/* Modal: Editar Grupo / Integrantes */}
      {isEditGroupModalOpen && selectedGroup && (
        <GroupFormModal
          title={`Editar Grupo: ${selectedGroup.nombre}`}
          nombre={nombre}
          setNombre={setNombre}
          descripcion={descripcion}
          setDescripcion={setDescripcion}
          umbral={umbral}
          setUmbral={setUmbral}
          membersList={membersList}
          newMemberEmail={newMemberEmail}
          setNewMemberEmail={setNewMemberEmail}
          newMemberName={newMemberName}
          setNewMemberName={setNewMemberName}
          isEssentialNewMember={isEssentialNewMember}
          setIsEssentialNewMember={setIsEssentialNewMember}
          onAddMember={handleAddMemberToForm}
          onRemoveMember={handleRemoveMemberFromForm}
          onToggleEssential={handleToggleEssential}
          onClose={() => setIsEditGroupModalOpen(false)}
          onSubmit={handleUpdateGroup}
          submitLabel="Guardar cambios"
        />
      )}

      {/* Modal para proponer un nuevo plan */}
      {isProposeModalOpen && selectedGroup && (
        <div role="dialog" aria-modal="true" aria-label="Proponer plan" className="fixed inset-0 z-50 bg-scrim/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-lg elev-3 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant/60">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 font-headline">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">campaign</span>
                {reschedulingId ? 'Nuevas fechas' : 'Proponer plan'}: {selectedGroup.nombre}
              </h2>
              <button aria-label="Cerrar"
                onClick={() => setIsProposeModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateProposalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Título del Plan *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Almuerzo de integración, Estudio de Cálculo..."
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface placeholder-outline text-sm focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Lugar u Opciones de Encuentro (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Biblioteca Central / Discord / Parque..."
                  value={proposalLugar}
                  onChange={(e) => setProposalLugar(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface placeholder-outline text-sm focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Plazo de votación</label>
                <select
                  value={proposalPlazo}
                  onChange={(e) => setProposalPlazo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                >
                  <option value="12 horas">12 horas (Cierre rápido)</option>
                  <option value="24 horas">24 horas (Recomendado)</option>
                  <option value="48 horas">48 horas</option>
                  <option value="Hasta el viernes 20:00">Hasta el viernes 20:00</option>
                </select>
              </div>

              {/* Ventanas de tiempo sugeridas para el plan */}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-2">
                  Ventanas de Tiempo Sugeridas (De 2 a 5 opciones)
                </label>

                {/* Formulario para agregar una opción de horario */}
                <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/60 mb-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-2xs text-on-surface-variant block mb-1">Día</span>
                      <select
                        value={tempDay}
                        onChange={(e) => setTempDay(e.target.value as DayOfWeek)}
                        className="w-full px-2 py-1.5 border border-outline-variant rounded-lg bg-surface text-on-surface text-xs"
                      >
                        {days.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-2xs text-on-surface-variant block mb-1">Inicio</span>
                      <input
                        type="time"
                        value={tempStart}
                        onChange={(e) => setTempStart(e.target.value)}
                        className="w-full px-2 py-1.5 border border-outline-variant rounded-lg bg-surface text-on-surface text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-2xs text-on-surface-variant block mb-1">Fin</span>
                      <input
                        type="time"
                        value={tempEnd}
                        onChange={(e) => setTempEnd(e.target.value)}
                        className="w-full px-2 py-1.5 border border-outline-variant rounded-lg bg-surface text-on-surface text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddWindowToProposal}
                    disabled={suggestedWindows.length >= 5 || tempEnd <= tempStart}
                    className="w-full py-1.5 bg-surface-container hover:bg-surface-variant text-on-surface-variant text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-outline-variant/60 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestedWindows.length >= 5 ? 'Máximo de 5 opciones' : '+ Agregar Opción de Horario'}
                  </button>
                </div>

                {/* Lista de ventanas sugeridas actualmente */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {suggestedWindows.map((w, idx) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">Opción {idx + 1}:</span>
                        <span className="text-on-surface font-medium">
                          {formatearVentana(w)}
                        </span>
                        <span className="text-2xs text-primary font-bold">
                          {w.disponibilidadPorcentaje === SIN_DATO
                            ? '(sin datos del grupo)'
                            : `(${w.disponibilidadPorcentaje}% libre)`}
                        </span>
                      </div>

                      {suggestedWindows.length > 2 && (
                        <button aria-label="Cerrar"
                          type="button"
                          onClick={() => handleRemoveWindowFromProposal(w.id)}
                          className="text-error hover:text-error p-1 cursor-pointer"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* El backend rechaza las ventanas que no llegan al umbral del
                  grupo (RF-08); el motivo se lee aqui y el modal sigue abierto
                  para poder cambiar las opciones. */}
              {proposalError && (
                <p role="alert" className="text-xs text-error bg-error-container/40 border border-error/30 rounded-xl px-3.5 py-2.5">
                  {proposalError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsProposeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {reschedulingId ? 'Volver a votar' : 'Enviar Propuesta a Todos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para reportar un imprevisto */}
      {isIncidentModalOpen && targetProposalForIncident && (
        <div role="dialog" aria-modal="true" aria-label="Avisar imprevisto o falta" className="fixed inset-0 z-50 bg-scrim/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md elev-3">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant/60">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 font-headline">
                <span aria-hidden="true" className="material-symbols-outlined text-warning">warning</span>
                Avisar Imprevisto o Falta
              </h2>
              <button aria-label="Cerrar"
                onClick={() => setIsIncidentModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleReportIncidentSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-on-surface-variant mb-3">
                  Reporta un cambio de último minuto para el plan: <strong className="text-on-surface">{targetProposalForIncident.titulo}</strong>
                </p>

                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Tipo de imprevisto</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as 'falta' | 'tardanza' | 'imprevisto')}
                  className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-warning"
                >
                  <option value="falta">No podré asistir (Falta)</option>
                  <option value="tardanza">Llegaré tarde (Tardanza)</option>
                  <option value="imprevisto">Otro imprevisto / Cambio de horario</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Motivo o Detalle *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej. Me surgió un examen de laboratorio, llegaré 30 mins tarde por tráfico..."
                  value={incidentMotivo}
                  onChange={(e) => setIncidentMotivo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface placeholder-outline text-sm focus:outline-none focus:border-warning"
                />
              </div>

              {incidentType === 'tardanza' && (
                <div>
                  <label
                    htmlFor="incidente-minutos"
                    className="block text-xs font-medium text-on-surface-variant mb-1.5"
                  >
                    ¿Cuántos minutos tarde? *
                  </label>
                  <input
                    id="incidente-minutos"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MINUTOS_TARDANZA_MAXIMO}
                    step={5}
                    required
                    value={incidentMinutos}
                    onChange={(e) => setIncidentMinutos(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-warning"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-warning-container border border-warning/30 text-on-warning-container text-xs flex items-start gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-warning shrink-0">lightbulb</span>
                <p>
                  {incidentType === 'tardanza'
                    ? 'El grupo verá cuánto tardarás. Llegar tarde no cambia el plan.'
                    : 'El grupo recibirá una notificación inmediata. Si tu ausencia es crítica, se abrirá una votación para mantener, reagendar o cancelar.'}
                </p>
              </div>

              {incidentError && (
                <p role="alert" className="text-xs text-error">
                  {incidentError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsIncidentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={incidentEnviando}
                  className="px-5 py-2 rounded-xl bg-warning hover:bg-warning text-on-warning text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {incidentEnviando ? 'Enviando…' : 'Notificar al Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha de un integrante del grupo.
          No es un perfil social: solo lo justo para distinguir a dos personas
          que se llaman igual y saber qué papel tienen en los planes. */}
      {memberDetail && memberGroup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ficha de ${memberDetail.nombre}`}
          className="fixed inset-0 z-50 bg-scrim/50 flex items-center justify-center p-4"
        >
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm elev-3">
            <div className="flex justify-between items-start gap-3 mb-4 pb-4 border-b border-outline-variant/60">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-on-primary text-lg font-black"
                  style={{ backgroundColor: memberDetail.color }}
                >
                  {memberDetail.nombre.charAt(0)}
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-on-surface truncate">{memberDetail.nombre}</h2>
                  <p className="text-xs text-on-surface-variant break-all">{memberDetail.email}</p>
                </div>
              </div>
              <button
                aria-label="Cerrar"
                onClick={() => setMemberRef(null)}
                className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer shrink-0"
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>

            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">Grupo</dt>
                <dd className="font-medium text-on-surface text-right">{memberGroup.nombre}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">Estado</dt>
                <dd className="font-medium text-right capitalize">
                  {memberDetail.status === 'confirmado' ? (
                    <span className="text-success">Confirmado</span>
                  ) : (
                    <span className="text-warning">Invitación pendiente</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-on-surface-variant">Rol en los planes</dt>
                <dd className="font-medium text-on-surface text-right">
                  {memberDetail.isEssential ? 'Imprescindible' : 'Regular'}
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-2xs text-on-surface-variant leading-relaxed">
              Huecko nunca muestra el detalle de los bloques de otra persona: del resto del
              grupo solo se sabe si está ocupada o libre en cada franja.
            </p>

            <div className="mt-4 pt-4 border-t border-outline-variant/60 flex justify-end">
              <button
                type="button"
                onClick={() => toggleMemberEssential(memberGroup.id, memberDetail.email)}
                className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-warning">
                  {memberDetail.isEssential ? 'star_border' : 'star'}
                </span>
                {memberDetail.isEssential ? 'Quitar imprescindible' : 'Marcar imprescindible'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente Formulario Reutilizable para Crear / Editar Grupo
interface GroupFormModalProps {
  title: string;
  nombre: string;
  setNombre: (val: string) => void;
  descripcion: string;
  setDescripcion: (val: string) => void;
  umbral: number;
  setUmbral: (val: number) => void;
  membersList: GroupMember[];
  newMemberEmail: string;
  setNewMemberEmail: (val: string) => void;
  newMemberName: string;
  setNewMemberName: (val: string) => void;
  isEssentialNewMember: boolean;
  setIsEssentialNewMember: (val: boolean) => void;
  onAddMember: () => void;
  onRemoveMember: (email: string) => void;
  onToggleEssential: (email: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
}

function GroupFormModal({
  title,
  nombre,
  setNombre,
  descripcion,
  setDescripcion,
  umbral,
  setUmbral,
  membersList,
  newMemberEmail,
  setNewMemberEmail,
  newMemberName,
  setNewMemberName,
  isEssentialNewMember,
  setIsEssentialNewMember,
  onAddMember,
  onRemoveMember,
  onToggleEssential,
  onClose,
  onSubmit,
  submitLabel,
}: GroupFormModalProps) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Formulario de grupo" className="fixed inset-0 z-50 bg-scrim/50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-lg elev-3 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant/60">
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 font-headline">
            <span aria-hidden="true" className="material-symbols-outlined text-primary">group</span>
            {title}
          </h2>
          <button aria-label="Cerrar" onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Nombre del grupo *</label>
            <input
              type="text"
              required
              placeholder="Ej. Grupo Universidad, Viaje de Verano..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface placeholder-outline text-sm focus:outline-none focus:border-secondary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Descripción</label>
            <textarea
              rows={2}
              placeholder="Descripción del grupo..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface placeholder-outline text-sm focus:outline-none focus:border-secondary"
            />
          </div>

          {/* Umbral de coincidencia */}
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-primary text-[18px]">tune</span>
                Umbral mínimo de coincidencia
              </label>
              <span className="text-xs font-bold text-primary bg-inverse-primary/30 px-2 py-0.5 rounded-lg border border-secondary/40">
                {umbral}% del grupo libre
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={umbral}
              onChange={(e) => setUmbral(Number(e.target.value))}
              className="w-full accent-secondary cursor-pointer mt-1"
            />
          </div>

          {/* Gestión de Integrantes */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Agregar integrante</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                placeholder="Nombre (ej. María C.)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="px-3.5 py-2 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
              />
              <input
                type="email"
                placeholder="Correo (amigo@correo.com)"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="px-3.5 py-2 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
              />
            </div>

            <div className="flex justify-between items-center mb-3">
              <label className="text-xs text-on-warning-container font-semibold cursor-pointer flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={isEssentialNewMember}
                  onChange={(e) => setIsEssentialNewMember(e.target.checked)}
                  className="rounded border-outline-variant bg-surface-container-lowest text-secondary focus:ring-secondary cursor-pointer"
                />
                <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-warning">star</span>
                Marcar como imprescindible
              </label>

              <button
                type="button"
                onClick={onAddMember}
                className="px-4 py-1.5 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface-variant text-xs font-semibold cursor-pointer border border-outline-variant/60"
              >
                + Añadir Integrante
              </button>
            </div>

            {/* Lista actual de integrantes */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {membersList.map((m) => (
                <div
                  key={m.email}
                  className="flex justify-between items-center p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-on-surface font-medium">{m.nombre}</span>
                    <span className="text-on-surface-variant">({m.email})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleEssential(m.email)}
                      className={`px-2 py-0.5 rounded text-2xs font-semibold border flex items-center gap-1 cursor-pointer ${
                        m.isEssential
                          ? 'bg-warning-container border-warning/40 text-on-warning-container'
                          : 'bg-surface border-outline-variant text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-xs">star</span>
                      {m.isEssential ? 'Imprescindible' : 'Regular'}
                    </button>

                    {membersList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(m.email)}
                        className="text-error hover:text-error p-1 cursor-pointer"
                        title="Quitar integrante"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sin botón de eliminar: el backend no permite borrar grupos y el
              que había solo cerraba el modal. */}
          <div className="flex justify-end items-center pt-4 border-t border-outline-variant/60">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-xs font-semibold shadow-xs cursor-pointer"
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
