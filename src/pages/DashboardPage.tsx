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

  const dayNames: DayOfWeek[] = [
    'Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'
  ];
  const today = dayNames[new Date().getDay()];

  const todayBlocks: TodayScheduleBlock[] = useMemo(
    () =>
      scheduleSlots
        .filter((slot) => slot.day === today)
        .map((slot) => ({
          id: slot.id,
          title: slot.title,
          timeRange: `${slot.startTime} - ${slot.endTime}`,
          type:
            slot.type === 'puntual'
              ? 'puntual'
              : slot.tag === 'Trabajo'
              ? 'trabajo'
              : 'clase',
          customColor: slot.customColor || '#54735a',
        })),
    [scheduleSlots, today]
  );

  const pendingVotes: DashboardPendingVote[] = useMemo(
    () =>
      proposals
        .filter((p) => p.estado === 'propuesto')
        .map((proposal) => {
          const group = groups.find(
            (g) => g.id === proposal.groupId
          );
          return {
            id: proposal.id,
            groupId: proposal.groupId,
            groupName: group?.nombre || 'Grupo',
            title: proposal.titulo,
            location: proposal.lugar,
            deadline: proposal.plazoVotacion,
            suggestedWindows: proposal.ventanasSugeridas.map(
              (w) => ({
                id: w.id,
                day: w.dia,
                timeRange: `${w.horaInicio} - ${w.horaFin}`,
                freePercentage: w.disponibilidadPorcentaje,
                votesCount: w.votosUsuarios.length,
                hasVoted: w.votosUsuarios.includes(userEmail),
              })
            ),
          };
        }),
    [groups, proposals, userEmail]
  );

  const metrics = useMemo(() => {
    const freeHours = proposals
      .flatMap((p) => p.ventanasSugeridas)
      .filter((w) => w.disponibilidadPorcentaje >= 80)
      .reduce((total, w) => {
        const start = Number(w.horaInicio.slice(0, 2));
        const end = Number(w.horaFin.slice(0, 2));
        return total + (end - start);
      }, 0);

    const allMembers = groups.flatMap((g) =>
      g.miembros.map((m) => m.email)
    );

    return {
      activeGroupsCount: groups.length,
      pendingVotesCount: pendingVotes.length,
      freeMatchHoursThisWeek: freeHours,
      connectedMembersCount: new Set(allMembers).size,
    };
  }, [groups, pendingVotes.length, proposals]);

  const groupSummaries = useMemo(
    () =>
      groups.map((group) => {
        const nextWindow = proposals
          .filter(
            (p) =>
              p.groupId === group.id &&
              p.estado !== 'cancelado'
          )
          .flatMap((p) => p.ventanasSugeridas)[0];

        const slotLabel = nextWindow
          ? `${nextWindow.dia} ${nextWindow.horaInicio} - ${nextWindow.horaFin}`
          : 'Sin propuesta aún';

        return {
          id: group.id,
          name: group.nombre,
          membersCount: group.miembros.length,
          matchPercentage:
            nextWindow?.disponibilidadPorcentaje ??
            group.umbralDisponibilidad,
          nextSlot: slotLabel,
          color: group.miembros[0]?.color || '#54735a',
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
    <div className="min-h-screen bg-[#f4fbf1] text-[#161d15] pb-24 md:pb-12 pt-20 md:pt-24 px-4 sm:px-6 lg:px-8">
      <Navbar currentTab="dashboard" />

      {/* Notificación Flotante (Toast) */}
      {notificationToast && (
        <div className="fixed bottom-20 md:bottom-8 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-md bg-white border border-[#416840] text-sm font-semibold animate-bounce transition-all">
          <span className="material-symbols-outlined text-[#416840]">
            {notificationToast.type === 'warning' ? 'schedule' : notificationToast.type === 'info' ? 'info' : 'check_circle'}
          </span>
          <span className="text-[#161d15]">{notificationToast.message}</span>
        </div>
      )}

      <main className="max-w-6xl mx-auto space-y-8">
        {/* Cabecera Principal con Tipografía Editorial EB Garamond */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-[#c0c9bb]/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider uppercase text-[#416840] bg-[#e9f0e4] px-3 py-1 rounded-full border border-[#d5e3cf]">
                Huecko Inteligencia Social
              </span>
              <span className="text-xs text-[#70796d] hidden sm:inline">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#161d15] mt-2 tracking-tight">
              {getGreeting()}, <span className="text-[#416840]">{displayName}.</span>
            </h1>
            <p className="text-sm md:text-base text-[#70796d] mt-1">
              Esto es lo que está pasando en tus grupos, horarios y planes el día de hoy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/schedule')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#e9f0e4] hover:bg-[#dbe5d6] text-[#2a4f2b] text-xs font-bold border border-[#c0c9bb] transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">document_scanner</span>
              <span>Importar OCR</span>
            </button>

            <button
              onClick={() => navigate('/groups')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold shadow-md shadow-[#416840]/20 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Proponer Plan</span>
            </button>
          </div>
        </section>

        {/* Alerta de votación exprés ante una baja crítica */}
        {hasExpressVoteAlert && (
          <section className="p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 text-[#161d15] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[24px]">crisis_alert</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold uppercase">
                    Votación exprés en curso
                  </span>
                  <span className="text-xs font-bold text-amber-900">Tiempo restante: 14:20 min</span>
                </div>
                <h3 className="text-base font-bold text-[#161d15] mt-1">
                  María C. (Rol crítico) reportó imprevisto para la reunión del grupo
                </h3>
                <p className="text-xs text-[#70796d]">
                  Motivo: "Cruce con examen sorpresa". ¿Qué prefieres que haga el grupo?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleExpressVoteSubmit('reprogramar')}
                className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  expressVoteChoice === 'reprogramar'
                    ? 'bg-[#416840] text-white shadow-xs'
                    : 'bg-white border border-[#c0c9bb] text-[#161d15] hover:bg-[#e9f0e4]'
                }`}
              >
                Reprogramar
              </button>
              <button
                type="button"
                onClick={() => handleExpressVoteSubmit('cancelar')}
                className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  expressVoteChoice === 'cancelar'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-white border border-[#c0c9bb] text-red-700 hover:bg-red-50'
                }`}
              >
                ✕ Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleExpressVoteSubmit('mantener')}
                className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  expressVoteChoice === 'mantener'
                    ? 'bg-[#416840] text-white shadow-xs'
                    : 'bg-white border border-[#c0c9bb] text-[#161d15] hover:bg-[#e9f0e4]'
                }`}
              >
                ✓ Mantener
              </button>
            </div>
          </section>
        )}

        {/* Tarjetas de Métricas Resumen */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/groups')}
            className="p-5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60 hover:border-[#416840] transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#70796d]">Grupos Activos</span>
              <span className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center text-[#416840] group-hover:bg-[#416840] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[20px]">groups</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#161d15]">{metrics.activeGroupsCount}</span>
              <span className="text-xs text-[#416840] font-semibold">Grupos</span>
            </div>
            <p className="text-[11px] text-[#70796d] mt-1">Con disponibilidad sincronizada</p>
          </div>

          <div
            onClick={() => navigate('/groups')}
            className="p-5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60 hover:border-[#416840] transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#70796d]">Votaciones Activas</span>
              <span className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                <span className="material-symbols-outlined text-[20px]">how_to_vote</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#161d15]">{pendingVotes.length}</span>
              <span className="text-xs text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full">
                Por votar
              </span>
            </div>
            <p className="text-[11px] text-[#70796d] mt-1">Planes abiertos para definir hora</p>
          </div>

          <div
            onClick={() => navigate('/schedule')}
            className="p-5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60 hover:border-[#416840] transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#70796d]">Huecos Coincidentes</span>
              <span className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center text-[#416840] group-hover:bg-[#416840] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[20px]">calendar_clock</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#161d15]">{metrics.freeMatchHoursThisWeek}h</span>
              <span className="text-xs text-[#416840] font-semibold">Esta semana</span>
            </div>
            <p className="text-[11px] text-[#70796d] mt-1">Donde coincide ≥ 80% del grupo</p>
          </div>

          <div
            onClick={() => navigate('/schedule')}
            className="p-5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60 hover:border-[#416840] transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#70796d]">Mi Horario</span>
              <span className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center text-[#416840]">
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#161d15]">{scheduleSlots.length}</span>
              <span className="text-xs text-[#416840] font-semibold">Bloques</span>
            </div>
            <p className="text-[11px] text-[#70796d] mt-1">Sincronizado con grupos</p>
          </div>
        </section>

        {/* Sección Destacada: Próximo Evento / Up Next */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#416840] animate-pulse"></span>
              <h2 className="text-lg font-bold text-[#161d15]">Próximo Plan Confirmado (Up Next)</h2>
            </div>
            {upcomingEvent && <span className="text-xs text-[#70796d]">{upcomingEvent.groupName}</span>}
          </div>

          {upcomingEvent ? (
            <div className="bg-[#e9f0e4] border border-[#c0c9bb] rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#416840] text-white text-[11px] font-bold uppercase tracking-wider">
                      Confirmado
                    </span>
                    <span className="text-xs text-[#70796d] font-semibold">
                      {upcomingEvent.dayLabel} • {upcomingEvent.timeRange}
                    </span>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-[#161d15]">
                    {upcomingEvent.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#40493e]">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[#416840]">location_on</span>
                      <span>{upcomingEvent.locationName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[#416840]">group</span>
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
                          className="w-8 h-8 rounded-full border-2 border-white bg-[#7fae7a] text-white flex items-center justify-center text-xs font-bold shadow-xs"
                        >
                          {att.name.charAt(0)}
                        </div>
                      ))}
                      {upcomingEvent.attendees.length > 5 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-[#40493e] text-white flex items-center justify-center text-xs font-bold">
                          +{upcomingEvent.attendees.length - 5}
                        </div>
                      )}
                    </div>

                    {/* Resumen de alertas si hay alguien con retraso */}
                    {upcomingEvent.attendees.some((a) => a.status === 'retrasado') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold">
                        <span className="material-symbols-outlined text-[14px]">timer</span>
                        Retrasos reportados
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5">
                  <button
                    onClick={() => setIsDetailModalOpen(true)}
                    className="px-6 py-3 rounded-2xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold transition-all shadow-md shadow-[#416840]/20 cursor-pointer text-center active:scale-95"
                  >
                    Ver Detalles del Evento
                  </button>

                  <button
                    onClick={() => setIsDelayModalOpen(true)}
                    className="px-6 py-3 rounded-2xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold transition-all cursor-pointer text-center active:scale-95"
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
          <div className="p-6 rounded-3xl bg-white border border-[#c0c9bb]/70 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-[#416840] uppercase tracking-wider">
                  Mi Agenda Personal
                </span>
                <h3 className="text-xl font-bold text-[#161d15]">Mi Horario de Hoy</h3>
              </div>
              <button
                onClick={() => navigate('/schedule')}
                className="px-3.5 py-1.5 rounded-xl bg-[#e9f0e4] hover:bg-[#dbe5d6] text-[#2a4f2b] text-xs font-bold border border-[#c0c9bb] transition-all cursor-pointer"
              >
                Ver Todo / OCR →
              </button>
            </div>

            <div className="space-y-2.5">
              {todayBlocks.length > 0 ? (
                todayBlocks.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl border border-[#c0c9bb]/50 bg-[#f4fbf1]/60 flex items-center justify-between hover:bg-white transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: b.customColor }}
                      />
                      <div>
                        <h4 className="text-xs font-bold text-[#161d15]">{b.title}</h4>
                        <span className="text-[11px] text-[#70796d] font-mono">{b.timeRange}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.type === 'libre'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.type === 'puntual'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {b.type === 'libre' ? 'Hueco Libre' : b.type === 'puntual' ? 'Puntual' : 'Ocupado'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center rounded-2xl bg-[#f4fbf1]/60 border border-dashed border-[#c0c9bb] space-y-2">
                  <span className="material-symbols-outlined text-3xl text-[#416840]">event_available</span>
                  <p className="text-xs font-bold text-[#161d15]">No tienes clases ni actividades para hoy ({today})</p>
                  <p className="text-[11px] text-[#70796d]">
                    Tienes {scheduleSlots.length} bloque(s) cargado(s) en tu horario semanal.
                  </p>
                  <button
                    onClick={() => navigate('/schedule')}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-[#416840] text-white text-xs font-bold shadow-xs hover:bg-[#2a4f2b] transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Gestionar Mi Horario</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mis Grupos Activos */}
          <div className="p-6 rounded-3xl bg-white border border-[#c0c9bb]/70 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-[#416840] uppercase tracking-wider">
                  Comunidades & Amigos
                </span>
                <h3 className="text-xl font-bold text-[#161d15]">Mis Grupos Activos</h3>
              </div>
              <button
                onClick={() => navigate('/groups')}
                className="px-3.5 py-1.5 rounded-xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                + Nuevo Grupo
              </button>
            </div>

            <div className="space-y-3">
              {groupSummaries.length > 0 ? (
                groupSummaries.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => navigate('/groups')}
                    className="p-4 rounded-2xl border border-[#c0c9bb]/60 bg-[#e9f0e4]/50 hover:bg-[#e9f0e4] hover:border-[#416840] transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
                        style={{ backgroundColor: g.color }}
                      >
                        {g.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#161d15] group-hover:text-[#416840] transition-colors">
                          {g.name}
                        </h4>
                        <p className="text-[11px] text-[#70796d]">
                          {g.membersCount} miembros • Próx. coincidencia: {g.nextSlot}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[#416840] bg-white px-2.5 py-1 rounded-full border border-[#c0c9bb]/60">
                        {g.matchPercentage}% libre
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center rounded-2xl bg-[#f4fbf1]/60 border border-dashed border-[#c0c9bb] space-y-2">
                  <span className="material-symbols-outlined text-3xl text-[#416840]">group_add</span>
                  <p className="text-xs font-bold text-[#161d15]">Aún no tienes grupos registrados</p>
                  <button
                    onClick={() => navigate('/groups')}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-[#416840] text-white text-xs font-bold shadow-xs hover:bg-[#2a4f2b] transition-all cursor-pointer inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
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
                <span className="px-2 py-0.5 rounded-full bg-[#416840]/10 text-[#416840] text-[10px] font-bold uppercase">
                  Tu voto importa
                </span>
                <h2 className="text-xl font-bold text-[#161d15]">Votación de Planes en Curso</h2>
              </div>
              <p className="text-xs text-[#70796d]">
                Opciones generadas automáticamente a partir de la disponibilidad de tu grupo.
              </p>
            </div>
            <button
              onClick={() => navigate('/groups')}
              className="text-xs font-bold text-[#416840] hover:underline cursor-pointer"
            >
              Ver todos los grupos →
            </button>
          </div>

          {pendingVotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingVotes.map((vote) => (
                <div
                  key={vote.id}
                  className="p-6 rounded-3xl bg-white border border-[#c0c9bb]/70 shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-bold text-[#416840] uppercase tracking-wider">
                        {vote.groupName}
                      </span>
                      <h3 className="text-lg font-bold text-[#161d15]">{vote.title}</h3>
                      {vote.location && (
                        <p className="text-xs text-[#70796d] flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[15px]">location_on</span>
                          {vote.location}
                        </p>
                      )}
                    </div>

                    <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {vote.deadline}
                    </span>
                  </div>

                  {/* Opciones de Horarios para Votar */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#40493e]">Selecciona tu horario preferido:</p>
                    {vote.suggestedWindows.map((win) => (
                      <div
                        key={win.id}
                        onClick={() => handleVote(vote.id, win.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          win.hasVoted
                            ? 'bg-[#a8c9a0]/30 border-[#416840] shadow-xs'
                            : 'bg-[#f4fbf1]/60 border-[#c0c9bb]/60 hover:border-[#416840]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                              win.hasVoted
                                ? 'bg-[#416840] border-[#416840] text-white font-bold'
                                : 'border-[#c0c9bb] text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <div>
                            <p className="text-xs font-bold text-[#161d15]">
                              {win.day} • {win.timeRange}
                            </p>
                            <span className="text-[10px] text-[#416840] font-semibold">
                              {win.freePercentage}% disponibilidad grupal
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-[#70796d] bg-white px-2.5 py-1 rounded-full border border-[#c0c9bb]/40">
                          {win.votesCount} {win.votesCount === 1 ? 'voto' : 'votos'}
                        </span>
                      </div>
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
        <section className="p-6 rounded-3xl bg-[#e9f0e4]/60 border border-[#c0c9bb]/50">
          <h3 className="text-sm font-bold text-[#161d15] mb-3">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/groups')}
              className="p-3.5 rounded-2xl bg-white border border-[#c0c9bb]/60 hover:border-[#416840] hover:bg-[#e9f0e4] flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[#416840] mb-1 group-hover:scale-110 transition-transform">
                group_add
              </span>
              <span className="text-xs font-bold text-[#161d15]">Crear Grupo</span>
            </button>

            <button
              onClick={() => navigate('/schedule')}
              className="p-3.5 rounded-2xl bg-white border border-[#c0c9bb]/60 hover:border-[#416840] hover:bg-[#e9f0e4] flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[#416840] mb-1 group-hover:scale-110 transition-transform">
                edit_calendar
              </span>
              <span className="text-xs font-bold text-[#161d15]">Ajustar Horario</span>
            </button>


            <button
              onClick={() => navigate('/onboarding')}
              className="p-3.5 rounded-2xl bg-white border border-[#c0c9bb]/60 hover:border-[#416840] hover:bg-[#e9f0e4] flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[#416840] mb-1 group-hover:scale-110 transition-transform">
                school
              </span>
              <span className="text-xs font-bold text-[#161d15]">Tutorial Huecko</span>
            </button>
          </div>
        </section>
      </main>

      {/* Modal de detalle del evento */}
      {isDetailModalOpen && upcomingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#f4fbf1] border border-[#c0c9bb] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Banner de Imagen Superior */}
            <div className="relative h-48 sm:h-60 w-full overflow-hidden">
              <img
                src={upcomingEvent.coverImage}
                alt={upcomingEvent.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#161d15]/90 via-[#161d15]/30 to-transparent flex flex-col justify-end p-6">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#416840] text-white text-[10px] font-bold uppercase w-max mb-1">
                  ✓ Confirmado
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                  {upcomingEvent.title}
                </h2>
                <p className="text-xs text-white/80 mt-1">{upcomingEvent.description}</p>
              </div>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              {/* Tarjetas Cuándo y Dónde */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#e9f0e4] border border-[#c0c9bb]/60 flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#416840] shrink-0">
                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                  </span>
                  <div>
                    <span className="text-[11px] font-bold text-[#70796d] uppercase">Cuándo</span>
                    <p className="text-xs font-bold text-[#161d15] mt-0.5">{upcomingEvent.dayLabel}</p>
                    <p className="text-[11px] text-[#40493e]">{upcomingEvent.timeRange}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#e9f0e4] border border-[#c0c9bb]/60 flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#416840] shrink-0">
                    <span className="material-symbols-outlined text-[20px]">location_on</span>
                  </span>
                  <div>
                    <span className="text-[11px] font-bold text-[#70796d] uppercase">Dónde</span>
                    <p className="text-xs font-bold text-[#161d15] mt-0.5">{upcomingEvent.locationName}</p>
                    <p className="text-[11px] text-[#40493e]">{upcomingEvent.locationAddress}</p>
                  </div>
                </div>
              </div>

              {/* Lista de asistentes y puntualidad */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#161d15]">
                    Asistentes ({upcomingEvent.attendees.length})
                  </span>
                  <span className="text-[11px] text-[#70796d]">Monitoreo de puntualidad</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {upcomingEvent.attendees.map((att, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white border border-[#c0c9bb]/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#7fae7a] text-white flex items-center justify-center text-xs font-bold">
                          {att.name.charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#161d15] block">{att.name}</span>
                          {att.isEssential && (
                            <span className="text-[9px] text-amber-800 font-bold bg-amber-100 px-1 rounded">
                              Imprescindible
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        {att.status === 'puntual' && (
                          <span className="text-[11px] text-[#416840] font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">check</span>
                            Puntual
                          </span>
                        )}
                        {att.status === 'retrasado' && (
                          <span className="text-[11px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">timer</span>
                            +{att.delayMinutes || 15} min
                          </span>
                        )}
                        {att.status === 'no_asiste' && (
                          <span className="text-[11px] text-red-700 font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">close</span>
                            No asiste
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#c0c9bb]/50">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsDelayModalOpen(true);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">timer</span>
                  <span>Avisar retraso</span>
                </button>

                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsIncidentModalOpen(true);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  <span>Reportar imprevisto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para avisar retraso */}
      {isDelayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#c0c9bb] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#161d15] flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-800">timer</span>
                Avisar retraso
              </h3>
              <button
                onClick={() => setIsDelayModalOpen(false)}
                className="text-[#70796d] hover:text-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#70796d]">
              Se enviará una alerta en tiempo real a tus amigos en el grupo para que no te esperen desinformados.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#40493e] block">
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
                        ? 'bg-[#416840] text-white shadow-xs'
                        : 'bg-[#e9f0e4] text-[#161d15] hover:bg-[#dbe5d6]'
                    }`}
                  >
                    +{mins}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-[#c0c9bb]/40">
              <button
                type="button"
                onClick={() => setIsDelayModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#c0c9bb] text-xs font-semibold text-[#40493e] hover:bg-gray-50 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleSendDelay}
                className="flex-1 py-2.5 rounded-xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                Confirmar Aviso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para reportar imprevisto */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#c0c9bb] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-700">report</span>
                Reportar imprevisto
              </h3>
              <button
                onClick={() => setIsIncidentModalOpen(false)}
                className="text-[#70796d] hover:text-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#70796d]">
              El sistema evaluará si tu rol en el evento es crítico (ej. organizador o imprescindible) para determinar si se abre una votación exprés de reagendamiento.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#40493e] block">
                Motivo del imprevisto (opcional):
              </label>
              <textarea
                value={incidentReason}
                onChange={(e) => setIncidentReason(e.target.value)}
                placeholder="Ej. Se me cruzó un examen de laboratorio / emergencia familiar..."
                rows={3}
                className="w-full p-3 rounded-xl border border-[#c0c9bb] text-xs focus:outline-none focus:border-[#416840] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-[#c0c9bb]/40">
              <button
                type="button"
                onClick={() => setIsIncidentModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#c0c9bb] text-xs font-semibold text-[#40493e] hover:bg-gray-50 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleSendIncident}
                className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
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
