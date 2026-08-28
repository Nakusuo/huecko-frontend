import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../store/authStore';
import { dashboardService } from '../services/dashboardService';
import type {
  DashboardMetrics,
  UpcomingEventDetail,
  DashboardPendingVote,
} from '../types/dashboard.types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeGroupsCount: 4,
    pendingVotesCount: 2,
    freeMatchHoursThisWeek: 14,
    connectedMembersCount: 18,
  });

  const [upcomingEvent, setUpcomingEvent] = useState<UpcomingEventDetail | null>(null);
  const [pendingVotes, setPendingVotes] = useState<DashboardPendingVote[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [customDelayMinutes, setCustomDelayMinutes] = useState(15);
  const [incidentReason, setIncidentReason] = useState('');
  const [notificationToast, setNotificationToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  useEffect(() => {
    dashboardService.getMetrics().then(setMetrics);
    dashboardService.getUpcomingEvent().then(setUpcomingEvent);
    dashboardService.getPendingVotes().then(setPendingVotes);
  }, []);

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
    setPendingVotes((prev) =>
      prev.map((vote) => {
        if (vote.id !== voteId) return vote;
        const updatedWindows = vote.suggestedWindows.map((w) => {
          if (w.id === windowId) {
            const nextHasVoted = !w.hasVoted;
            return {
              ...w,
              hasVoted: nextHasVoted,
              votesCount: nextHasVoted ? w.votesCount + 1 : Math.max(0, w.votesCount - 1),
            };
          }
          return w;
        });
        return { ...vote, suggestedWindows: updatedWindows };
      })
    );
    showToast('Tu voto ha sido registrado correctamente.', 'success');
  };

  const handleSendDelay = async () => {
    if (!upcomingEvent) return;
    const res = await dashboardService.reportDelay(upcomingEvent.id, customDelayMinutes, user?.email || '');
    
    // Actualizar estado local de puntualidad del usuario actual
    setUpcomingEvent((prev) => {
      if (!prev) return prev;
      const updatedAttendees = prev.attendees.map((att) =>
        att.name === 'Tú' || att.email === user?.email
          ? { ...att, status: 'retrasado' as const, delayMinutes: customDelayMinutes }
          : att
      );
      return { ...prev, attendees: updatedAttendees };
    });

    setIsDelayModalOpen(false);
    showToast(res.message, 'warning');
  };

  const handleSendIncident = async () => {
    if (!upcomingEvent) return;
    const res = await dashboardService.cancelAttendance(upcomingEvent.id, incidentReason, user?.email || '');
    
    setUpcomingEvent((prev) => {
      if (!prev) return prev;
      const updatedAttendees = prev.attendees.map((att) =>
        att.name === 'Tú' || att.email === user?.email
          ? { ...att, status: 'no_asiste' as const }
          : att
      );
      return { ...prev, attendees: updatedAttendees };
    });

    setIsIncidentModalOpen(false);
    showToast(res.message, 'info');
  };

  return (
    <div className="min-h-screen bg-[#f4fbf1] text-[#161d15] pb-24 md:pb-12 pt-20 md:pt-24 px-4 sm:px-6 lg:px-8">
      <Navbar currentTab="dashboard" />

      {/* Notificación Flotante (Toast) */}
      {notificationToast && (
        <div className="fixed bottom-20 md:bottom-8 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-md bg-white border border-[#c0c9bb]/60 text-sm font-medium animate-bounce transition-all">
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
            <span className="text-xs font-bold tracking-wider uppercase text-[#416840] bg-[#e9f0e4] px-3 py-1 rounded-full border border-[#d5e3cf]">
              Huecko Inteligencia de Horarios
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#161d15] mt-2 tracking-tight">
              {getGreeting()}, <span className="text-[#416840]">{displayName}.</span>
            </h1>
            <p className="text-sm md:text-base text-[#70796d] mt-1">
              Esto es lo que está pasando en tus grupos y planes el día de hoy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#e9f0e4] hover:bg-[#dbe5d6] text-[#2a4f2b] text-xs font-semibold border border-[#c0c9bb] transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">help_outline</span>
              <span>Guía de Inicio</span>
            </button>

            <button
              onClick={() => navigate('/groups')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-semibold shadow-md shadow-[#416840]/20 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Proponer Plan</span>
            </button>
          </div>
        </section>

        {/* Tarjetas de Métricas Resumen */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/groups')}
            className="p-5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60 hover:border-[#7fae7a] transition-all cursor-pointer group shadow-xs"
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
            className="p-5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60 hover:border-[#7fae7a] transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#70796d]">Votaciones Activas</span>
              <span className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                <span className="material-symbols-outlined text-[20px]">how_to_vote</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#161d15]">{metrics.pendingVotesCount}</span>
              <span className="text-xs text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full">
                Por votar
              </span>
            </div>
            <p className="text-[11px] text-[#70796d] mt-1">Planes abiertos para definir hora</p>
          </div>

          <div
            onClick={() => navigate('/schedule')}
            className="p-5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60 hover:border-[#7fae7a] transition-all cursor-pointer group shadow-xs"
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
            className="p-5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60 hover:border-[#7fae7a] transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#70796d]">Mi Horario</span>
              <span className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center text-[#416840]">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#416840]">Actualizado</span>
            </div>
            <p className="text-[11px] text-[#70796d] mt-1">6 bloques semanales cargados</p>
          </div>
        </section>

        {/* Sección Destacada: Próximo Evento / Up Next (Fiel al Mockup Stitch) */}
        {upcomingEvent && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#416840] animate-pulse"></span>
                <h2 className="text-lg font-bold text-[#161d15]">Próximo Plan Confirmado (Up Next)</h2>
              </div>
              <span className="text-xs text-[#70796d]">{upcomingEvent.groupName}</span>
            </div>

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
                    Avisar Retraso
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Sección: Planes en Votación Activa (Módulo 3) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#161d15]">Votación de Planes en Curso</h2>
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
                          ? 'bg-[#a8c9a0]/30 border-[#7fae7a] shadow-xs'
                          : 'bg-[#f4fbf1]/60 border-[#c0c9bb]/60 hover:border-[#7fae7a]'
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
        </section>

        {/* Accesos Rápidos (Quick Hub) */}
        <section className="p-6 rounded-3xl bg-[#e9f0e4]/60 border border-[#c0c9bb]/50">
          <h3 className="text-sm font-bold text-[#161d15] mb-3">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/groups')}
              className="p-3.5 rounded-2xl bg-white border border-[#c0c9bb]/60 hover:border-[#7fae7a] hover:bg-[#e9f0e4] flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[#416840] mb-1 group-hover:scale-110 transition-transform">
                group_add
              </span>
              <span className="text-xs font-bold text-[#161d15]">Crear Grupo</span>
            </button>

            <button
              onClick={() => navigate('/schedule')}
              className="p-3.5 rounded-2xl bg-white border border-[#c0c9bb]/60 hover:border-[#7fae7a] hover:bg-[#e9f0e4] flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[#416840] mb-1 group-hover:scale-110 transition-transform">
                edit_calendar
              </span>
              <span className="text-xs font-bold text-[#161d15]">Ajustar Horario</span>
            </button>

            <button
              onClick={() => navigate('/discover')}
              className="p-3.5 rounded-2xl bg-white border border-[#c0c9bb]/60 hover:border-[#7fae7a] hover:bg-[#e9f0e4] flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[#416840] mb-1 group-hover:scale-110 transition-transform">
                explore
              </span>
              <span className="text-xs font-bold text-[#161d15]">Descubrir</span>
            </button>

            <button
              onClick={() => navigate('/onboarding')}
              className="p-3.5 rounded-2xl bg-white border border-[#c0c9bb]/60 hover:border-[#7fae7a] hover:bg-[#e9f0e4] flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[#416840] mb-1 group-hover:scale-110 transition-transform">
                school
              </span>
              <span className="text-xs font-bold text-[#161d15]">Tutorial Huecko</span>
            </button>
          </div>
        </section>
      </main>

      {/* MODAL 1: DETALLE DEL EVENTO (Idéntico a la captura Stitch - Imagen 4) */}
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

              {/* Lista de Asistentes y Puntualidad (Módulo 4: RF-12, RF-14) */}
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
                  <span>Avisar Retraso</span>
                </button>

                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsIncidentModalOpen(true);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  <span>Reportar Imprevisto / Cancelar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AVISAR RETRASO (Módulo 4: Gestión de Retrasos) */}
      {isDelayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#c0c9bb] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#161d15] flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-800">timer</span>
                Avisar Retraso
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

      {/* MODAL 3: REPORTAR IMPREVISTO / CANCELAR ASISTENCIA (Módulo 5: IA / Criticidad) */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#c0c9bb] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-700">report</span>
                Reportar Imprevisto
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
