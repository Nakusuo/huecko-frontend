import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import { useAuthStore } from '../store/authStore';
import { dashboardService } from '../services/dashboardService';
import { useGroupsStore } from '../store/groupsStore';
import { useScheduleStore, type DayOfWeek } from '../store/scheduleStore';
import type {
  UpcomingEventDetail,
  DashboardPendingVote,
} from '../types/dashboard.types';
import { DEFAULT_CATEGORY_COLOR } from '../theme/palette';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface TodayScheduleBlock {
  id: string;
  title: string;
  timeRange: string;
  type: 'clase' | 'trabajo' | 'libre' | 'puntual';
  customColor: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const groups = useGroupsStore((s) => s.groups);
  const proposals = useGroupsStore((s) => s.groupProposals);
  const voteProposalWindow = useGroupsStore((s) => s.voteProposalWindow);
  const scheduleSlots = useScheduleStore((s) => s.slots);
  const userEmail = user?.email || 'alex.rodriguez@huecko.com';

  const today = (['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as DayOfWeek[])[new Date().getDay()];
  const todayBlocks: TodayScheduleBlock[] = useMemo(
    () => scheduleSlots
      .filter((slot) => slot.day === today)
      .map((slot) => ({
        id: slot.id,
        title: slot.title,
        timeRange: `${slot.startTime} - ${slot.endTime}`,
        type: slot.type === 'puntual' ? 'puntual' : slot.tag === 'Trabajo' ? 'trabajo' : 'clase',
        customColor: slot.customColor || DEFAULT_CATEGORY_COLOR,
      })),
    [scheduleSlots, today]
  );

  const pendingVotes: DashboardPendingVote[] = useMemo(
    () => proposals
      .filter((proposal) => proposal.estado === 'propuesto')
      .map((proposal) => {
        const group = groups.find((item) => item.id === proposal.groupId);
        return {
          id: proposal.id,
          groupId: proposal.groupId,
          groupName: group?.nombre || 'Grupo',
          title: proposal.titulo,
          location: proposal.lugar,
          deadline: proposal.plazoVotacion,
          suggestedWindows: proposal.ventanasSugeridas.map((window) => ({
            id: window.id,
            day: window.dia,
            timeRange: `${window.horaInicio} - ${window.horaFin}`,
            freePercentage: window.disponibilidadPorcentaje,
            votesCount: window.votosUsuarios.length,
            hasVoted: window.votosUsuarios.includes(userEmail),
          })),
        };
      }),
    [groups, proposals, userEmail]
  );

  const metrics = useMemo(() => ({
    activeGroupsCount: groups.length,
    pendingVotesCount: pendingVotes.length,
    freeMatchHoursThisWeek: proposals
      .flatMap((proposal) => proposal.ventanasSugeridas)
      .filter((window) => window.disponibilidadPorcentaje >= 80)
      .reduce((total, window) => total + Number(window.horaFin.slice(0, 2)) - Number(window.horaInicio.slice(0, 2)), 0),
    connectedMembersCount: new Set(groups.flatMap((group) => group.miembros.map((member) => member.email))).size,
  }), [groups, pendingVotes.length, proposals]);

  const groupSummaries = useMemo(
    () => groups.map((group) => {
      const nextWindow = proposals
        .filter((proposal) => proposal.groupId === group.id && proposal.estado !== 'cancelado')
        .flatMap((proposal) => proposal.ventanasSugeridas)[0];
      return {
        id: group.id,
        name: group.nombre,
        membersCount: group.miembros.length,
        matchPercentage: nextWindow?.disponibilidadPorcentaje ?? group.umbralDisponibilidad,
        nextSlot: nextWindow ? `${nextWindow.dia} ${nextWindow.horaInicio} - ${nextWindow.horaFin}` : 'Sin propuesta aún',
        color: group.miembros[0]?.color || DEFAULT_CATEGORY_COLOR,
      };
    }),
    [groups, proposals]
  );

  const reportIncident = useGroupsStore((s) => s.reportIncident);
  const voteReplanification = useGroupsStore((s) => s.voteReplanification);

  const upcomingEvent = useMemo<UpcomingEventDetail | null>(() => {
    const proposal = proposals.find((item) => item.estado === 'confirmado');
    const group = proposal ? groups.find((item) => item.id === proposal.groupId) : undefined;
    const window = proposal?.ventanasSugeridas[0];
    if (!proposal || !group || !window) {
      return null;
    }

    return {
      id: proposal.id,
      groupId: group.id,
      groupName: group.nombre,
      title: proposal.titulo,
      dayLabel: window.dia,
      timeRange: `${window.horaInicio} - ${window.horaFin}`,
      locationName: proposal.lugar || 'Lugar por definir',
      status: (proposal.estado === 'propuesto' ? 'confirmado' : proposal.estado) as 'confirmado' | 'en_recoordinacion' | 'cancelado',
      attendees: group.miembros.map((member) => ({
        email: member.email,
        name: member.email === userEmail ? 'Tú' : member.nombre,
        status: proposal.incidencias?.some((incident) => incident.userEmail === member.email) ? 'no_asiste' : 'puntual',
        isEssential: member.isEssential,
      })),
    };
  }, [groups, proposals, userEmail]);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [customDelayMinutes, setCustomDelayMinutes] = useState(15);

  useModalDismiss(isDetailModalOpen, () => setIsDetailModalOpen(false));
  useModalDismiss(isDelayModalOpen, () => setIsDelayModalOpen(false));
  useModalDismiss(isIncidentModalOpen, () => setIsIncidentModalOpen(false));
  const [incidentReason, setIncidentReason] = useState('');
  const [notificationToast, setNotificationToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Estado de la votación exprés ante una ausencia importante
  const [hasExpressVoteAlert, setHasExpressVoteAlert] = useState(true);
  const [expressVoteChoice, setExpressVoteChoice] = useState<'reprogramar' | 'cancelar' | 'mantener' | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setNotificationToast({ message, type });
    setTimeout(() => {
      setNotificationToast(null);
    }, 3500);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const displayName = user?.nombre || 'Alejandro';

  const handleVote = (voteId: string, windowId: string) => {
    voteProposalWindow(voteId, windowId, userEmail);
    showToast('Tu voto ha sido registrado correctamente.', 'success');
  };

  const handleSendDelay = async () => {
    if (!upcomingEvent) return;
    const res = await dashboardService.reportDelay(upcomingEvent.id, customDelayMinutes, userEmail);
    
    reportIncident(upcomingEvent.id, {
      userEmail,
      userName: user?.nombre || 'Tú',
      tipo: 'tardanza',
      motivo: `Llegará con ${customDelayMinutes} minutos de retraso.`,
      minutosTardanza: customDelayMinutes,
    });

    setIsDelayModalOpen(false);
    showToast(res.message, 'warning');
  };

  const handleSendIncident = async () => {
    if (!upcomingEvent) return;
    const res = await dashboardService.cancelAttendance(upcomingEvent.id, incidentReason, userEmail);
    
    reportIncident(upcomingEvent.id, {
      userEmail,
      userName: user?.nombre || 'Tú',
      tipo: 'imprevisto',
      motivo: incidentReason || 'Imprevisto de última hora',
    });

    setIsIncidentModalOpen(false);
    showToast(res.message, 'info');
  };

  const handleExpressVoteSubmit = (choice: 'reprogramar' | 'cancelar' | 'mantener') => {
    setExpressVoteChoice(choice);
    const action = choice === 'reprogramar' ? 'reschedule' : choice === 'cancelar' ? 'cancel' : 'keep';
    if (upcomingEvent) {
      voteReplanification(upcomingEvent.id, action, userEmail);
    }
    showToast(`Votación exprés registrada: "${choice.toUpperCase()}". Notificando al grupo...`, 'warning');
    setTimeout(() => setHasExpressVoteAlert(false), 3000);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface pb-28 md:pb-12 pt-6 md:pt-24 px-4 sm:px-6 lg:px-8">
      <Navbar currentTab="dashboard" />

      {/* Notificación Flotante (Toast) */}
      {notificationToast && (
        <div className="fixed bottom-20 md:bottom-8 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-md bg-surface-container-lowest border border-primary text-sm font-semibold animate-toast-in transition-all">
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            {notificationToast.type === 'warning' ? 'schedule' : notificationToast.type === 'info' ? 'info' : 'check_circle'}
          </span>
          <span className="text-on-surface">{notificationToast.message}</span>
        </div>
      )}

      <main id="contenido" tabIndex={-1} className="max-w-6xl mx-auto space-y-8">
        {/* Cabecera Principal con Tipografía Editorial EB Garamond */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-outline-variant/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider uppercase text-primary bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
                Huecko Inteligencia Social
              </span>
              <span className="text-xs text-on-surface-variant hidden sm:inline">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-on-surface mt-2 tracking-tight">
              {getGreeting()}, <span className="text-primary">{displayName}.</span>
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant mt-1">
              Esto es lo que está pasando en tus grupos, horarios y planes el día de hoy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/schedule')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-variant text-primary-hover text-xs font-bold border border-outline-variant transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">document_scanner</span>
              <span>Importar OCR</span>
            </button>

            <button
              onClick={() => navigate('/groups')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-95"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
              <span>Proponer Plan</span>
            </button>
          </div>
        </section>

        {/* Alerta de votación exprés ante una baja crítica */}
        {hasExpressVoteAlert && (
          <section className="p-5 rounded-3xl bg-warning/10 border-2 border-warning/60/40 text-on-surface shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-warning text-on-warning flex items-center justify-center shrink-0 shadow-xs">
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]">crisis_alert</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-warning-container text-on-warning-container text-2xs font-bold uppercase">
                    Votación exprés en curso
                  </span>
                  <span className="text-xs font-bold text-on-warning-container">Tiempo restante: 14:20 min</span>
                </div>
                <h3 className="text-base font-bold text-on-surface mt-1">
                  María C. (Rol crítico) reportó imprevisto para la reunión del grupo
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Motivo: "Cruce con examen sorpresa". ¿Qué prefieres que haga el grupo?
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleExpressVoteSubmit('reprogramar')}
                className={`flex-1 md:flex-initial min-w-24 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${
                  expressVoteChoice === 'reprogramar'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">event_repeat</span>
                Reprogramar
              </button>
              <button
                type="button"
                onClick={() => handleExpressVoteSubmit('cancelar')}
                className={`flex-1 md:flex-initial min-w-24 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${
                  expressVoteChoice === 'cancelar'
                    ? 'bg-error text-on-error shadow-xs'
                    : 'bg-surface-container-lowest border border-outline-variant text-error hover:bg-error-container'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">close</span>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleExpressVoteSubmit('mantener')}
                className={`flex-1 md:flex-initial min-w-24 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${
                  expressVoteChoice === 'mantener'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check</span>
                Mantener
              </button>
            </div>
          </section>
        )}

        {/* Tarjetas de Métricas Resumen */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button type="button"
            onClick={() => navigate('/groups')}
            className="w-full text-left p-5 rounded-2xl bg-surface-container/80 border border-outline-variant/60 hover:border-primary transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Grupos Activos</span>
              <span className="w-8 h-8 rounded-xl bg-surface-container-lowest/80 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">groups</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface">{metrics.activeGroupsCount}</span>
              <span className="text-xs text-primary font-semibold">Grupos</span>
            </div>
            <p className="text-2xs text-on-surface-variant mt-1">Con disponibilidad sincronizada</p>
          </button>

          <button type="button"
            onClick={() => navigate('/groups')}
            className="w-full text-left p-5 rounded-2xl bg-surface-container/80 border border-outline-variant/60 hover:border-primary transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Votaciones Activas</span>
              <span className="w-8 h-8 rounded-xl bg-warning-container flex items-center justify-center text-on-warning-container">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">how_to_vote</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface">{pendingVotes.length}</span>
              <span className="text-xs text-on-warning-container font-bold bg-warning-container/80 px-2 py-0.5 rounded-full">
                Por votar
              </span>
            </div>
            <p className="text-2xs text-on-surface-variant mt-1">Planes abiertos para definir hora</p>
          </button>

          <button type="button"
            onClick={() => navigate('/schedule')}
            className="w-full text-left p-5 rounded-2xl bg-surface-container/80 border border-outline-variant/60 hover:border-primary transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Huecos Coincidentes</span>
              <span className="w-8 h-8 rounded-xl bg-surface-container-lowest/80 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">calendar_clock</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface">{metrics.freeMatchHoursThisWeek}h</span>
              <span className="text-xs text-primary font-semibold">Esta semana</span>
            </div>
            <p className="text-2xs text-on-surface-variant mt-1">Donde coincide ≥ 80% del grupo</p>
          </button>

          <button type="button"
            onClick={() => navigate('/schedule')}
            className="w-full text-left p-5 rounded-2xl bg-surface-container/80 border border-outline-variant/60 hover:border-primary transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Mi Horario</span>
              <span className="w-8 h-8 rounded-xl bg-surface-container-lowest/80 flex items-center justify-center text-primary">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">calendar_month</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface">{scheduleSlots.length}</span>
              <span className="text-xs text-primary font-semibold">Bloques</span>
            </div>
            <p className="text-2xs text-on-surface-variant mt-1">Sincronizado con grupos</p>
          </button>
        </section>

        {/* Sección Destacada: Próximo Evento / Up Next */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <h2 className="text-lg font-bold text-on-surface">Próximo Plan Confirmado (Up Next)</h2>
            </div>
            {upcomingEvent && <span className="text-xs text-on-surface-variant">{upcomingEvent.groupName}</span>}
          </div>

          {upcomingEvent ? (
            <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary text-on-primary text-2xs font-bold uppercase tracking-wider">
                      Confirmado
                    </span>
                    <span className="text-xs text-on-surface-variant font-semibold">
                      {upcomingEvent.dayLabel} • {upcomingEvent.timeRange}
                    </span>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-headline font-bold text-on-surface">
                    {upcomingEvent.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                      <span>{upcomingEvent.locationName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-primary">group</span>
                      <span>{upcomingEvent.attendees.filter((a) => a.status !== 'no_asiste').length} Asistentes confirmados</span>
                    </div>
                  </div>

                  {/* Fila de Avatares y Estado de Puntualidad */}
                  <div className="pt-2 flex items-center gap-3">
                    <div className="flex -space-x-2 overflow-hidden">
                      {upcomingEvent.attendees.slice(0, 5).map((att, idx) => (
                        <div
                          key={idx}
                          title={`${att.name} (${att.status === 'retrasado' ? `+${att.delayMinutes}m` : att.status})`}
                          className="w-8 h-8 rounded-full border-2 border-white bg-secondary text-on-secondary flex items-center justify-center text-xs font-bold shadow-xs"
                        >
                          {att.name.charAt(0)}
                        </div>
                      ))}
                      {upcomingEvent.attendees.length > 5 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-on-surface-variant text-white flex items-center justify-center text-xs font-bold">
                          +{upcomingEvent.attendees.length - 5}
                        </div>
                      )}
                    </div>

                    {/* Resumen de alertas si hay alguien con retraso */}
                    {upcomingEvent.attendees.some((a) => a.status === 'retrasado') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning-container text-on-warning-container border border-warning/40 text-2xs font-semibold">
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">timer</span>
                        Retrasos reportados
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5">
                  <button
                    onClick={() => setIsDetailModalOpen(true)}
                    className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer text-center active:scale-95"
                  >
                    Ver Detalles del Evento
                  </button>

                  <button
                    onClick={() => setIsDelayModalOpen(true)}
                    className="px-6 py-3 rounded-2xl bg-surface-container-lowest hover:bg-warning-container text-on-warning-container border border-warning/40 text-xs font-semibold transition-all cursor-pointer text-center active:scale-95"
                  >
                    Avisar retraso
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon="event_busy"
              title="No tienes eventos confirmados próximos"
              description="Propón un plan en tus grupos para que Huecko sugiera los mejores horarios."
              actionLabel="Proponer Plan"
              onAction={() => navigate('/groups')}
            />
          )}
        </section>

        {/* SECCIÓN DOBLE: MI HORARIO DE HOY (IZQUIERDA) Y MIS GRUPOS ACTIVOS (DERECHA) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mi Horario de Hoy */}
          <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/70 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-2xs font-bold text-primary uppercase tracking-wider">
                  Mi Agenda Personal
                </span>
                <h3 className="text-xl font-bold text-on-surface">Mi Horario de Hoy</h3>
              </div>
              <button
                onClick={() => navigate('/schedule')}
                className="px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-variant text-primary-hover text-xs font-bold border border-outline-variant transition-all cursor-pointer"
              >
                Ver Todo / OCR →
              </button>
            </div>

            <div className="space-y-2.5">
              {todayBlocks.length > 0 ? (
                todayBlocks.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl border border-outline-variant/50 bg-surface/60 flex items-center justify-between hover:bg-surface-container-lowest transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: b.customColor }}
                      />
                      <div>
                        <h4 className="text-xs font-bold text-on-surface">{b.title}</h4>
                        <span className="text-2xs text-on-surface-variant font-mono">{b.timeRange}</span>
                      </div>
                    </div>

                    <span
                      className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                        b.type === 'libre'
                          ? 'bg-success-container text-on-success-container'
                          : b.type === 'puntual'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-tertiary-container text-on-tertiary-container'
                      }`}
                    >
                      {b.type === 'libre' ? 'Hueco Libre' : b.type === 'puntual' ? 'Puntual' : 'Ocupado'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center rounded-2xl bg-surface/60 border border-dashed border-outline-variant space-y-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">event_available</span>
                  <p className="text-xs font-bold text-on-surface">No tienes clases ni actividades para hoy ({today})</p>
                  <p className="text-2xs text-on-surface-variant">
                    Tienes {scheduleSlots.length} bloque(s) cargado(s) en tu horario semanal.
                  </p>
                  <button
                    onClick={() => navigate('/schedule')}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary-hover transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add</span>
                    <span>Gestionar Mi Horario</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mis Grupos Activos */}
          <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/70 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-2xs font-bold text-primary uppercase tracking-wider">
                  Comunidades & Amigos
                </span>
                <h3 className="text-xl font-bold text-on-surface">Mis Grupos Activos</h3>
              </div>
              <button
                onClick={() => navigate('/groups')}
                className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                + Nuevo Grupo
              </button>
            </div>

            <div className="space-y-3">
              {groupSummaries.length > 0 ? (
                groupSummaries.map((g) => (
                  <button type="button"
                    key={g.id}
                    onClick={() => navigate('/groups')}
                    className="w-full text-left p-4 rounded-2xl border border-outline-variant/60 bg-surface-container/50 hover:bg-surface-container hover:border-primary transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
                        style={{ backgroundColor: g.color }}
                      >
                        {g.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                          {g.name}
                        </h4>
                        <p className="text-2xs text-on-surface-variant">
                          {g.membersCount} miembros • Próx. coincidencia: {g.nextSlot}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-primary bg-surface-container-lowest px-2.5 py-1 rounded-full border border-outline-variant/60">
                        {g.matchPercentage}% libre
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center rounded-2xl bg-surface/60 border border-dashed border-outline-variant space-y-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">group_add</span>
                  <p className="text-xs font-bold text-on-surface">Aún no tienes grupos registrados</p>
                  <button
                    onClick={() => navigate('/groups')}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary-hover transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add</span>
                    <span>Crear o Unirme a Grupo</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Planes en votación activa */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-2xs font-bold uppercase">
                  Tu voto importa
                </span>
                <h2 className="text-xl font-bold text-on-surface">Votación de Planes en Curso</h2>
              </div>
              <p className="text-xs text-on-surface-variant">
                Opciones generadas automáticamente a partir de la disponibilidad de tu grupo.
              </p>
            </div>
            <button
              onClick={() => navigate('/groups')}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              Ver todos los grupos →
            </button>
          </div>

          {pendingVotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingVotes.map((vote) => (
                <div
                  key={vote.id}
                  className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/70 shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-2xs font-bold text-primary uppercase tracking-wider">
                        {vote.groupName}
                      </span>
                      <h3 className="text-lg font-bold text-on-surface">{vote.title}</h3>
                      {vote.location && (
                        <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <span aria-hidden="true" className="material-symbols-outlined text-[15px]">location_on</span>
                          {vote.location}
                        </p>
                      )}
                    </div>

                    <span className="text-2xs font-mono font-medium px-2.5 py-1 rounded-full bg-warning-container text-on-warning-container border border-warning/30">
                      {vote.deadline}
                    </span>
                  </div>

                  {/* Opciones de Horarios para Votar */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-on-surface-variant">Selecciona tu horario preferido:</p>
                    {vote.suggestedWindows.map((win) => (
                      <button type="button"
                        key={win.id}
                        onClick={() => handleVote(vote.id, win.id)}
                        aria-pressed={win.hasVoted}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          win.hasVoted
                            ? 'bg-inverse-primary/30 border-primary shadow-xs'
                            : 'bg-surface/60 border-outline-variant/60 hover:border-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                              win.hasVoted
                                ? 'bg-primary border-primary text-on-primary font-bold'
                                : 'border-outline-variant text-transparent'
                            }`}
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check</span>
                          </span>
                          <div>
                            <p className="text-xs font-bold text-on-surface">
                              {win.day} • {win.timeRange}
                            </p>
                            <span className="text-2xs text-primary font-semibold">
                              {win.freePercentage}% disponibilidad grupal
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-on-surface-variant bg-surface-container-lowest px-2.5 py-1 rounded-full border border-outline-variant/40">
                          {win.votesCount} {win.votesCount === 1 ? 'voto' : 'votos'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="how_to_vote"
              title="No hay votaciones activas en este momento"
              description="Cuando un miembro del grupo proponga un nuevo plan, podrás votar por tus ventanas horarias favoritas aquí."
              actionLabel="Ver grupos"
              onAction={() => navigate('/groups')}
            />
          )}
        </section>

        {/* Accesos Rápidos (Quick Hub) */}
        <section className="p-6 rounded-3xl bg-surface-container/60 border border-outline-variant/50">
          <h3 className="text-sm font-bold text-on-surface mb-3">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/groups')}
              className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 hover:border-primary hover:bg-surface-container flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-primary mb-1 group-hover:scale-110 transition-transform">
                group_add
              </span>
              <span className="text-xs font-bold text-on-surface">Crear Grupo</span>
            </button>

            <button
              onClick={() => navigate('/schedule')}
              className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 hover:border-primary hover:bg-surface-container flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-primary mb-1 group-hover:scale-110 transition-transform">
                edit_calendar
              </span>
              <span className="text-xs font-bold text-on-surface">Ajustar Horario</span>
            </button>


            <button
              onClick={() => navigate('/onboarding')}
              className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 hover:border-primary hover:bg-surface-container flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-primary mb-1 group-hover:scale-110 transition-transform">
                school
              </span>
              <span className="text-xs font-bold text-on-surface">Tutorial Huecko</span>
            </button>
          </div>
        </section>
      </main>

      {/* Modal de detalle del evento */}
      {isDetailModalOpen && upcomingEvent && (
        <div role="dialog" aria-modal="true" aria-label="Detalles del evento" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-xs">
          <div className="bg-surface border border-outline-variant rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-modal-in">
            {/* Banner de Imagen Superior */}
            <div className="relative h-48 sm:h-60 w-full overflow-hidden">
              <img
                src={upcomingEvent.coverImage}
                alt={upcomingEvent.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/30 to-transparent flex flex-col justify-end p-6">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-2xs font-bold uppercase w-max mb-1">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">check</span>
                  Confirmado
                </span>
                <h2 className="text-2xl sm:text-3xl font-headline font-bold text-white">
                  {upcomingEvent.title}
                </h2>
                <p className="text-xs text-white/80 mt-1">{upcomingEvent.description}</p>
              </div>

              <button aria-label="Cerrar"
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-scrim/50 hover:bg-scrim/70 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              {/* Tarjetas Cuándo y Dónde */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shrink-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">calendar_month</span>
                  </span>
                  <div>
                    <span className="text-2xs font-bold text-on-surface-variant uppercase">Cuándo</span>
                    <p className="text-xs font-bold text-on-surface mt-0.5">{upcomingEvent.dayLabel}</p>
                    <p className="text-2xs text-on-surface-variant">{upcomingEvent.timeRange}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shrink-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">location_on</span>
                  </span>
                  <div>
                    <span className="text-2xs font-bold text-on-surface-variant uppercase">Dónde</span>
                    <p className="text-xs font-bold text-on-surface mt-0.5">{upcomingEvent.locationName}</p>
                    <p className="text-2xs text-on-surface-variant">{upcomingEvent.locationAddress}</p>
                  </div>
                </div>
              </div>

              {/* Lista de asistentes y puntualidad */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface">
                    Asistentes ({upcomingEvent.attendees.length})
                  </span>
                  <span className="text-2xs text-on-surface-variant">Monitoreo de puntualidad</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {upcomingEvent.attendees.map((att, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-xs font-bold">
                          {att.name.charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-on-surface block">{att.name}</span>
                          {att.isEssential && (
                            <span className="text-2xs text-on-warning-container font-bold bg-warning-container px-1 rounded">
                              Imprescindible
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        {att.status === 'puntual' && (
                          <span className="text-2xs text-primary font-semibold flex items-center gap-1">
                            <span aria-hidden="true" className="material-symbols-outlined text-[0.8125rem]">check</span>
                            Puntual
                          </span>
                        )}
                        {att.status === 'retrasado' && (
                          <span className="text-2xs text-on-warning-container font-bold bg-warning-container px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span aria-hidden="true" className="material-symbols-outlined text-[0.8125rem]">timer</span>
                            +{att.delayMinutes || 15} min
                          </span>
                        )}
                        {att.status === 'no_asiste' && (
                          <span className="text-2xs text-error font-semibold flex items-center gap-1">
                            <span aria-hidden="true" className="material-symbols-outlined text-[0.8125rem]">close</span>
                            No asiste
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-outline-variant/50">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsDelayModalOpen(true);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">timer</span>
                  <span>Avisar retraso</span>
                </button>

                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsIncidentModalOpen(true);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-surface-container-lowest hover:bg-error-container text-error border border-error/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">cancel</span>
                  <span>Reportar imprevisto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para avisar retraso */}
      {isDelayModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Avisar retraso" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-modal-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-on-warning-container">timer</span>
                Avisar retraso
              </h3>
              <button aria-label="Cerrar"
                onClick={() => setIsDelayModalOpen(false)}
                className="text-on-surface-variant hover:text-black cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              Se enviará una alerta en tiempo real a tus amigos en el grupo para que no te esperen desinformados.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold text-on-surface-variant block">
                ¿Cuántos minutos estimas que tardarás?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setCustomDelayMinutes(mins)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      customDelayMinutes === mins
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    +{mins}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setIsDelayModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleSendDelay}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                Confirmar Aviso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para reportar imprevisto */}
      {isIncidentModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Reportar imprevisto" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-modal-in">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-on-error-container flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-error">report</span>
                Reportar imprevisto
              </h3>
              <button aria-label="Cerrar"
                onClick={() => setIsIncidentModalOpen(false)}
                className="text-on-surface-variant hover:text-black cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              El sistema evaluará si tu rol en el evento es crítico (ej. organizador o imprescindible) para determinar si se abre una votación exprés de reagendamiento.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant block">
                Motivo del imprevisto (opcional):
              </label>
              <textarea
                value={incidentReason}
                onChange={(e) => setIncidentReason(e.target.value)}
                placeholder="Ej. Se me cruzó un examen de laboratorio / emergencia familiar..."
                rows={3}
                className="w-full p-3 rounded-xl border border-outline-variant text-xs focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setIsIncidentModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleSendIncident}
                className="flex-1 py-2.5 rounded-xl bg-error hover:bg-error text-on-error text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                Enviar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
