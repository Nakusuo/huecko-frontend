import { useState } from 'react';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import {
  useGroupsStore,
  type Group,
  type GroupMember,
  type TimeWindowProposal,
  type PlanProposal,
  type DayOfWeek,
} from '../store/groupsStore';
import { useNotificationStore } from '../store/notificationStore';
import { colorByIndex, DEFAULT_CATEGORY_COLOR } from '../theme/palette';
import { useModalDismiss } from '../hooks/useModalDismiss';



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

const days: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const timeSlotsHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export default function GroupsPage() {
  const {
    groups,
    selectedGroupId,
    setSelectedGroupId,
    occupiedSlots,
    groupProposals,
    createGroup,
    joinGroupByCode,
    updateGroupThreshold,
    toggleMemberEssential,
    addProposal,
    voteProposalWindow,
    closeVotingManually,
    reportIncident,
    voteReplanification,
  } = useGroupsStore();

  const { addNotification } = useNotificationStore();

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || groups[0] || null;

  // Proposal Modal State
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalLugar, setProposalLugar] = useState('');
  const [proposalPlazo, setProposalPlazo] = useState('24 horas');
  const [suggestedWindows, setSuggestedWindows] = useState<TimeWindowProposal[]>([]);

  // Form window input temporary
  const [tempDay, setTempDay] = useState<DayOfWeek>('Mié');
  const [tempStart, setTempStart] = useState('14:00');
  const [tempEnd, setTempEnd] = useState('16:00');

  // Group Create / Edit Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);

  // Group Form Inputs
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [umbral, setUmbral] = useState(100);
  const [membersList, setMembersList] = useState<GroupMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [isEssentialNewMember, setIsEssentialNewMember] = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Join Group Modal State
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  useModalDismiss(isProposeModalOpen, () => setIsProposeModalOpen(false));
  useModalDismiss(isCreateModalOpen, () => setIsCreateModalOpen(false));
  useModalDismiss(isEditGroupModalOpen, () => setIsEditGroupModalOpen(false));
  useModalDismiss(isJoinModalOpen, () => setIsJoinModalOpen(false));
  const [joinError, setJoinError] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    const success = joinGroupByCode(joinCodeInput, 'alex.rodriguez@huecko.com', 'Alex R.');
    if (success) {
      setIsJoinModalOpen(false);
      setJoinCodeInput('');
      setJoinError('');
      addNotification({
        title: 'Te uniste a un nuevo grupo',
        description: `Te has unido exitosamente con el código ${joinCodeInput.toUpperCase()}`,
        type: 'system',
      });
    } else {
      setJoinError('Código de invitación no encontrado. Verifica el código e intenta nuevamente.');
    }
  };

  // --- Handlers para Modal de Crear / Editar Grupo ---
  const openCreateModal = () => {
    setNombre('');
    setDescripcion('');
    setUmbral(100);
    setMembersList([
      { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R.', isEssential: true, color: DEFAULT_CATEGORY_COLOR, status: 'confirmado' },
    ]);
    setNewMemberEmail('');
    setNewMemberName('');
    setIsEssentialNewMember(false);
    setIsCreateModalOpen(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

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

  const handleSaveNewGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) return;

    createGroup(nombre, descripcion, umbral, 'alex.rodriguez@huecko.com', 'Alex R.');
    setIsCreateModalOpen(false);
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !nombre) return;

    updateGroupThreshold(selectedGroup.id, umbral);
    setIsEditGroupModalOpen(false);
  };

  const handleDeleteGroup = (_groupId: string) => {
    // Delete handling if needed
    setIsEditGroupModalOpen(false);
  };

  // Calcula la disponibilidad real de una ventana de tiempo.
  const calculateWindowAvailability = (group: Group, day: DayOfWeek, startTimeStr: string, endTimeStr: string) => {
    const startH = parseInt(startTimeStr.split(':')[0], 10);
    const endH = parseInt(endTimeStr.split(':')[0], 10);
    if (isNaN(startH) || isNaN(endH) || endH <= startH) return 100;

    const groupMemberEmails = group.miembros.map((m) => m.email);
    const totalMembers = groupMemberEmails.length;
    if (totalMembers === 0) return 100;

    const occupiedEmailsInWindow = new Set<string>();
    occupiedSlots.forEach((slot) => {
      if (slot.day !== day) return;
      if (!groupMemberEmails.includes(slot.userEmail)) return;

      const slotStart = parseInt(slot.startTime.split(':')[0], 10);
      const slotEnd = parseInt(slot.endTime.split(':')[0], 10);

      if (startH < slotEnd && endH > slotStart) {
        occupiedEmailsInWindow.add(slot.userEmail);
      }
    });

    const freeCount = totalMembers - occupiedEmailsInWindow.size;
    return Math.round((freeCount / totalMembers) * 100);
  };

  // Acciones de propuestas y votaciones.
  const openProposePlanModal = (group: Group) => {
    setSelectedGroupId(group.id);
    setProposalTitle('');
    setProposalLugar('');
    setProposalPlazo('24 horas');

    const avail1 = calculateWindowAvailability(group, 'Mié', '11:00', '13:00');
    const avail2 = calculateWindowAvailability(group, 'Jue', '16:00', '18:00');

    setSuggestedWindows([
      { id: Date.now().toString() + '-1', dia: 'Mié', horaInicio: '11:00', horaFin: '13:00', disponibilidadPorcentaje: avail1, votosUsuarios: [] },
      { id: Date.now().toString() + '-2', dia: 'Jue', horaInicio: '16:00', horaFin: '18:00', disponibilidadPorcentaje: avail2, votosUsuarios: [] },
    ]);
    setIsProposeModalOpen(true);
  };

  const handleAddWindowToProposal = () => {
    if (!selectedGroup) return;
    if (suggestedWindows.length >= 5) return;

    const realAvail = calculateWindowAvailability(selectedGroup, tempDay, tempStart, tempEnd);

    const newW: TimeWindowProposal = {
      id: Date.now().toString(),
      dia: tempDay,
      horaInicio: tempStart,
      horaFin: tempEnd,
      disponibilidadPorcentaje: realAvail,
      votosUsuarios: [],
    };
    setSuggestedWindows([...suggestedWindows, newW]);
  };

  const handleRemoveWindowFromProposal = (id: string) => {
    if (suggestedWindows.length <= 2) return;
    setSuggestedWindows(suggestedWindows.filter((w) => w.id !== id));
  };

  const handleCreateProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !proposalTitle || suggestedWindows.length < 2 || suggestedWindows.length > 5) return;

    addProposal({
      groupId: selectedGroup.id,
      titulo: proposalTitle,
      lugar: proposalLugar,
      creadoPor: 'Alex R.',
      plazoVotacion: proposalPlazo,
      estado: 'propuesto',
      ventanasSugeridas: suggestedWindows,
    });

    addNotification({
      title: 'Nuevo plan propuesto',
      description: `Se creó el plan "${proposalTitle}" en ${selectedGroup.nombre}`,
      type: 'proposal',
      groupId: selectedGroup.id,
    });

    setIsProposeModalOpen(false);
  };

  const handleVote = (proposalId: string, windowId: string) => {
    voteProposalWindow(proposalId, windowId, 'alex.rodriguez@huecko.com');
  };

  const handleCloseVotingManually = (proposalId: string) => {
    closeVotingManually(proposalId);
    addNotification({
      title: 'Plan confirmado',
      description: 'El plan ha sido confirmado y cerrado manualmente.',
      type: 'confirmation',
    });
  };

  // Incident Modal State (Faltas / Tardanzas)
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [targetProposalForIncident, setTargetProposalForIncident] = useState<PlanProposal | null>(null);
  const [incidentType, setIncidentType] = useState<'falta' | 'tardanza' | 'imprevisto'>('falta');
  const [incidentMotivo, setIncidentMotivo] = useState('');

  const openReportIncidentModal = (proposal: PlanProposal) => {
    setTargetProposalForIncident(proposal);
    setIncidentType('falta');
    setIncidentMotivo('');
    setIsIncidentModalOpen(true);
  };

  const handleReportIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProposalForIncident || !incidentMotivo) return;

    reportIncident(targetProposalForIncident.id, {
      userEmail: 'alex.rodriguez@huecko.com',
      userName: 'Alex R.',
      tipo: incidentType,
      motivo: incidentMotivo,
    });

    addNotification({
      title: 'Imprevisto reportado',
      description: `Alex R. reportó ${incidentType} en "${targetProposalForIncident.titulo}". El plan pasó a re-coordinación.`,
      type: 'incident',
      groupId: targetProposalForIncident.groupId,
    });

    setIsIncidentModalOpen(false);
  };

  const handleReplanVote = (proposalId: string, action: 'cancel' | 'reschedule' | 'keep') => {
    voteReplanification(proposalId, action, 'alex.rodriguez@huecko.com');
  };

  // Cálculo de coincidencias y espacios libres.
  const getCellAvailability = (group: Group, day: DayOfWeek, hour: number) => {
    // Check occupied members in this specific 1-hour slot
    const occupiedInCell = occupiedSlots.filter((s) => {
      if (s.day !== day) return false;
      // Check if group contains user
      if (!group.miembros.some((m) => m.email === s.userEmail)) return false;

      const startH = parseInt(s.startTime.split(':')[0], 10);
      const endH = parseInt(s.endTime.split(':')[0], 10);
      return hour >= startH && hour < endH;
    });

    const totalMembers = group.miembros.length;
    const occupiedCount = occupiedInCell.length;
    const freeCount = totalMembers - occupiedCount;
    const freePercentage = Math.round((freeCount / totalMembers) * 100);

    const meetsThreshold = freePercentage >= group.umbralDisponibilidad;

    return {
      freeCount,
      totalMembers,
      freePercentage,
      meetsThreshold,
      occupiedMembers: occupiedInCell,
    };
  };

  /** Agrupa las horas consecutivas que cumplen el umbral en franjas legibles. */
  const getRecommendedWindows = (group: Group, day: DayOfWeek) => {
    const windows: Array<{ start: number; end: number; minimumAvailability: number; freeCount: number }> = [];

    timeSlotsHours.forEach((hour) => {
      const cell = getCellAvailability(group, day, hour);
      const current = windows[windows.length - 1];

      if (cell.meetsThreshold && current?.end === hour) {
        current.end = hour + 1;
        current.minimumAvailability = Math.min(current.minimumAvailability, cell.freePercentage);
        current.freeCount = Math.min(current.freeCount, cell.freeCount);
      } else if (cell.meetsThreshold) {
        windows.push({ start: hour, end: hour + 1, minimumAvailability: cell.freePercentage, freeCount: cell.freeCount });
      }
    });

    return windows;
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col pt-6 md:pt-[104px]">
      <Navbar currentTab="groups" />

      {/* Main Content Canvas */}
      <main id="contenido" tabIndex={-1} className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-10 pb-24 md:pb-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2 font-headline">Mis Grupos y Horario Común</h1>
            <p className="text-on-surface-variant text-sm md:text-base">
              Administra tus grupos, edita integrantes y visualiza los <strong className="text-primary font-semibold">espacios libres resaltados</strong> de todos los miembros.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setJoinCodeInput('');
                setJoinError('');
                setIsJoinModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-secondary text-primary hover:bg-surface-container transition-all text-sm font-semibold cursor-pointer w-full md:w-auto"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">key</span>
              Unirse con Código
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary transition-all text-sm font-semibold shadow-md shadow-secondary/20 cursor-pointer w-full md:w-auto"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">group_add</span>
              Crear Nuevo Grupo
            </button>
          </div>
        </header>

        {/* Group Cards Grid */}
        {groups.length === 0 ? (
          <div className="mb-12">
            <EmptyState
              icon="groups"
              title="Aún no tienes ningún grupo"
              description="Crea tu primer grupo para invitar a tus amigos o compañeros y ver su coincidencia horaria."
              actionLabel="Crear mi primer grupo"
              onAction={openCreateModal}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {groups.map((group) => {
            const isSelected = selectedGroup?.id === group.id;

            return (
              <div
                key={group.id}
                className={`bg-surface-container/80 border rounded-2xl p-6 shadow-sm backdrop-blur-md flex flex-col justify-between transition-all ${
                  isSelected ? 'border-secondary ring-2 ring-secondary/30' : 'border-outline-variant hover:border-outline-variant'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-on-surface">{group.nombre}</h3>
                    <span className="px-2.5 py-1 rounded-full bg-inverse-primary/30 border border-secondary/40 text-primary-hover text-xs font-semibold">
                      Umbral {group.umbralDisponibilidad}%
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">{group.descripcion || 'Sin descripción.'}</p>

                  {/* Código de Invitación Rápida */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/60 mb-4">
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span aria-hidden="true" className="material-symbols-outlined text-primary text-[18px]">key</span>
                      <span>Código de grupo:</span>
                      <span className="font-mono text-on-surface font-bold text-sm tracking-wider">{group.codigoInvitacion}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(group.codigoInvitacion)}
                      className="text-xs text-primary hover:text-primary-hover font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">content_copy</span>
                      {copiedCode === group.codigoInvitacion ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>

                  {/* Lista de Miembros */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                        Miembros ({group.miembros.length})
                      </h4>
                      <button
                        onClick={() => openEditModal(group)}
                        className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">edit</span>
                        Editar Miembros / Grupo
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {group.miembros.map((m, idx) => (
                        <button type="button"
                          key={idx}
                          onClick={() => toggleMemberEssential(group.id, m.email)}
                          aria-pressed={m.isEssential}
                          className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all ${
                            m.isEssential
                              ? 'bg-warning-container border-warning/40 text-on-warning-container shadow-xs'
                              : 'bg-surface-container-lowest border-outline-variant/60 text-on-surface'
                          }`}
                          title={m.isEssential ? 'Miembro imprescindible para los planes. Clic para alternar' : 'Miembro regular. Clic para marcar como imprescindible'}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: m.color }}
                          />
                          <span className="font-medium">{m.nombre}</span>
                          {m.isEssential && (
                            <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-warning" title="Imprescindible">
                              star
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-6 pt-4 border-t border-outline-variant/60 flex flex-wrap gap-2 justify-between items-center">
                  <button
                    onClick={() => openEditModal(group)}
                    className="text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  >
                    Ajustar Umbral / Grupo
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openProposePlanModal(group)}
                      className="px-3.5 py-2 rounded-xl bg-inverse-primary/30 hover:bg-inverse-primary/50 text-primary-hover border border-secondary/40 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">campaign</span>
                      Proponer Plan
                    </button>

                    <button
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                          : 'bg-secondary hover:bg-secondary-hover text-on-primary shadow-xs'
                      }`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">grid_view</span>
                      {isSelected ? 'Viendo Horario Común' : 'Ver Horario en Común'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* SECCIÓN DE PLANES PROPUESTOS Y VOTACIONES ACTIVAS */}
        {selectedGroup && (
          <section className="mb-12 bg-surface-container/80 border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm backdrop-blur-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-outline-variant/60 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2 font-headline">
                  <span aria-hidden="true" className="material-symbols-outlined text-primary">how_to_vote</span>
                  Planes Propuestos y Votación: {selectedGroup.nombre}
                </h2>
                <p className="text-on-surface-variant text-sm">
                  Propuestas de planes creadas para este grupo. Los miembros pueden emitir su voto antes de vencer el plazo.
                </p>
              </div>

              <button
                onClick={() => openProposePlanModal(selectedGroup)}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
                Proponer Nuevo Plan
              </button>
            </div>

            {/* Listado de Propuestas del Grupo */}
            {groupProposals.filter((p) => p.groupId === selectedGroup.id).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupProposals
                  .filter((p) => p.groupId === selectedGroup.id)
                  .map((proposal) => {
                    const isClosed = proposal.estado === 'confirmado';
                    const isInReplan = proposal.estado === 'en_recoordinacion';
                    const userEmail = 'alex.rodriguez@huecko.com';
                    const userReplanVote = proposal.votosReplanificacion?.cancel.includes(userEmail)
                      ? 'cancel'
                      : proposal.votosReplanificacion?.reschedule.includes(userEmail)
                      ? 'reschedule'
                      : proposal.votosReplanificacion?.keep.includes(userEmail)
                      ? 'keep'
                      : null;

                    return (
                      <div
                        key={proposal.id}
                        className={`p-5 rounded-2xl border flex flex-col justify-between backdrop-blur-md transition-all ${
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
                              className={`px-2.5 py-0.5 rounded-full text-2xs font-bold ${
                                isInReplan
                                  ? 'bg-warning-container text-on-warning-container border border-warning/50'
                                  : isClosed
                                  ? 'bg-inverse-primary/50 text-on-tertiary-container border border-secondary'
                                  : 'bg-secondary-container text-on-secondary-container border border-secondary/40'
                              }`}
                            >
                              {isInReplan
                                ? 'Imprevisto'
                                : isClosed
                                ? 'Confirmado'
                                : 'Votación Abierta'}
                            </span>
                          </div>

                          {/* ALERTA COMPACTA DE INCIDENCIAS */}
                          {proposal.incidencias && proposal.incidencias.length > 0 && (
                            <div className="mb-3 p-3 rounded-xl bg-warning-container border border-warning/30 space-y-2">
                              {proposal.incidencias.map((inc) => (
                                <div key={inc.id} className="text-xs flex justify-between items-center text-on-warning-container">
                                  <span>
                                    ⚠️ <strong>{inc.userName}</strong>: {inc.motivo}
                                  </span>
                                  <span className="text-2xs text-on-warning-container font-bold uppercase">
                                    {inc.tipo}
                                  </span>
                                </div>
                              ))}

                              {/* Votación Grupal Simplificada */}
                              <div className="pt-2 border-t border-warning/30 flex items-center justify-between gap-2 text-xs">
                                <span className="text-2xs text-on-warning-container font-semibold shrink-0">¿Qué hacemos?</span>
                                <div className="flex gap-1.5 w-full justify-end">
                                  <button
                                    onClick={() => handleReplanVote(proposal.id, 'reschedule')}
                                    className={`px-2.5 py-1 rounded-md text-2xs font-medium border transition-colors cursor-pointer ${
                                      userReplanVote === 'reschedule'
                                        ? 'bg-secondary text-on-secondary border-primary'
                                        : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container'
                                    }`}
                                  >
                                    Re-agendar ({proposal.votosReplanificacion?.reschedule.length || 0})
                                  </button>
                                  <button
                                    onClick={() => handleReplanVote(proposal.id, 'keep')}
                                    className={`px-2.5 py-1 rounded-md text-2xs font-medium border transition-colors cursor-pointer ${
                                      userReplanVote === 'keep'
                                        ? 'bg-primary text-on-primary border-primary-hover'
                                        : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container'
                                    }`}
                                  >
                                    Mantener ({proposal.votosReplanificacion?.keep.length || 0})
                                  </button>
                                  <button
                                    onClick={() => handleReplanVote(proposal.id, 'cancel')}
                                    className={`px-2.5 py-1 rounded-md text-2xs font-medium border transition-colors cursor-pointer ${
                                      userReplanVote === 'cancel'
                                        ? 'bg-error text-on-error border-error'
                                        : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container'
                                    }`}
                                  >
                                    Cancelar ({proposal.votosReplanificacion?.cancel.length || 0})
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Ventanas de tiempo sugeridas */}
                          <div className="space-y-1.5 mb-3">
                            {proposal.ventanasSugeridas.map((ventana) => {
                              const hasVoted = ventana.votosUsuarios.includes('alex.rodriguez@huecko.com');

                              return (
                                <button type="button"
                                  key={ventana.id}
                                  onClick={() => !isClosed && handleVote(proposal.id, ventana.id)}
                                  aria-pressed={hasVoted}
                                  disabled={isClosed}
                                  className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                                    hasVoted
                                      ? 'bg-inverse-primary/30 border-secondary'
                                      : 'bg-surface-container-lowest/70 border-outline-variant/60 hover:border-secondary'
                                  } ${isClosed ? 'cursor-default opacity-85' : ''}`}
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
                                      {ventana.dia} {ventana.horaInicio}-{ventana.horaFin}
                                    </span>
                                    <span className="text-2xs text-primary font-bold">
                                      ({ventana.disponibilidadPorcentaje}% libre)
                                    </span>
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
                          <span className="text-2xs font-mono">Plazo: {proposal.plazoVotacion}</span>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openReportIncidentModal(proposal)}
                              className="text-2xs text-on-warning-container hover:text-on-warning-container font-semibold cursor-pointer"
                            >
                              Reportar Imprevisto
                            </button>

                            {!isClosed && (
                              <button
                                onClick={() => handleCloseVotingManually(proposal.id)}
                                className="text-2xs text-primary hover:text-primary-hover font-bold cursor-pointer"
                              >
                                Confirmar Plan
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-surface-container-lowest/50 border border-dashed border-outline-variant text-center">
                <p className="text-on-surface-variant text-xs mb-3">No hay propuestas de planes activas en este grupo.</p>
                <button
                  onClick={() => openProposePlanModal(selectedGroup)}
                  className="px-4 py-2 rounded-xl bg-inverse-primary/30 text-primary-hover border border-secondary/40 text-xs font-semibold hover:bg-inverse-primary/50 cursor-pointer"
                >
                  + Proponer el primer Plan
                </button>
              </div>
            )}
          </section>
        )}

        {/* VISTA DEL HORARIO EN COMÚN DE TODOS */}
        {selectedGroup ? (
          <section className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-outline-variant/60 pb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-on-surface font-headline">Horario en Común: {selectedGroup.nombre}</h2>
                  <span className="px-3 py-1 rounded-full bg-primary-container border border-inverse-primary text-primary text-xs font-bold">
                    Actualizado
                  </span>
                </div>
                <p className="text-on-surface-variant text-sm">
                  Franjas continuas que cumplen el umbral de <strong>{selectedGroup.umbralDisponibilidad}%</strong>. La información ocupada se muestra sin exponer detalles personales.
                </p>
              </div>

              <div className="bg-surface-bright px-4 py-2 rounded-xl border border-outline-variant text-xs text-on-surface-variant">
                {selectedGroup.miembros.length} integrantes · {selectedGroup.umbralDisponibilidad}% mínimo
              </div>
            </div>

            {/* Agenda de coincidencias: una lectura rápida, sin 84 casillas. */}
            <div className="overflow-x-auto">
              <div className="min-w-[760px] grid grid-cols-7 gap-3">
                {days.map((day) => {
                  const windows = getRecommendedWindows(selectedGroup, day);
                  return (
                    <article key={day} className="rounded-xl border border-outline-variant bg-surface-bright overflow-hidden">
                      <header className="px-3 py-2.5 border-b border-surface-container-highest text-xs font-bold uppercase tracking-wider text-primary">
                        {day}
                      </header>
                      <div className="p-2 space-y-2 min-h-28">
                        {windows.length ? windows.map((window) => (
                          <div key={`${day}-${window.start}`} className="rounded-lg bg-primary-container border-l-4 border-secondary px-2.5 py-2">
                            <p className="text-xs font-bold text-on-primary-container">
                              {window.start.toString().padStart(2, '0')}:00 – {window.end.toString().padStart(2, '0')}:00
                            </p>
                            <p className="mt-0.5 text-2xs text-on-surface-variant">
                              {window.minimumAvailability}% libre · {window.freeCount}/{selectedGroup.miembros.length}
                            </p>
                          </div>
                        )) : (
                          <p className="px-1 py-3 text-2xs leading-relaxed text-outline">No hay una franja que cumpla el umbral.</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          <div className="p-8 rounded-2xl bg-surface-container/50 border border-dashed border-outline-variant text-center">
            <span aria-hidden="true" className="material-symbols-outlined text-[48px] text-on-surface-variant mb-2">grid_view</span>
            <h3 className="text-lg font-bold text-on-surface">Selecciona un grupo para ver el Horario en Común</h3>
            <p className="text-on-surface-variant text-sm max-w-md mx-auto mt-1">
              Haz clic en el botón <strong>"Ver Horario en Común"</strong> de cualquier tarjeta arriba para desplegar el heatmap de espacios libres.
            </p>
          </div>
        )}
      </main>

      {/* Modal: Crear Grupo */}
      {isCreateModalOpen && (
        <GroupFormModal
          title="Crear Nuevo Grupo"
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
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleSaveNewGroup}
          submitLabel="Guardar Grupo"
        />
      )}

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
          onDelete={() => handleDeleteGroup(selectedGroup.id)}
          submitLabel="Guardar Cambios"
        />
      )}

      {/* Modal para proponer un nuevo plan */}
      {isProposeModalOpen && selectedGroup && (
        <div role="dialog" aria-modal="true" aria-label="Proponer plan" className="fixed inset-0 z-50 bg-scrim/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant/60">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 font-headline">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">campaign</span>
                Proponer Plan: {selectedGroup.nombre}
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
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Plazo de Votación</label>
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
                          {w.dia} — {w.horaInicio} a {w.horaFin}
                        </span>
                        <span className="text-2xs text-primary font-bold">
                          ({w.disponibilidadPorcentaje}% libre)
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
                  Enviar Propuesta a Todos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para reportar un imprevisto */}
      {isIncidentModalOpen && targetProposalForIncident && (
        <div role="dialog" aria-modal="true" aria-label="Avisar imprevisto o falta" className="fixed inset-0 z-50 bg-scrim/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 w-full max-w-md shadow-2xl">
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

                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Tipo de Imprevisto</label>
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

              <div className="p-3 rounded-xl bg-warning-container border border-warning/30 text-on-warning-container text-xs flex items-start gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-warning shrink-0">lightbulb</span>
                <p>
                  El grupo recibirá una notificación inmediata y podrá votar si re-agendar, cancelar o mantener el evento.
                </p>
              </div>

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
                  className="px-5 py-2 rounded-xl bg-warning hover:bg-warning text-on-warning text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Notificar al Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Unirse a Grupo por Código */}
      {isJoinModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Unirse a un grupo" className="fixed inset-0 z-50 bg-scrim/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant/60">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 font-headline">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">key</span>
                Unirse a un Grupo
              </h2>
              <button aria-label="Cerrar"
                onClick={() => setIsJoinModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Código de Invitación</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. HUECKO-78A9"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface placeholder-outline text-sm focus:outline-none focus:border-secondary uppercase font-mono tracking-wider"
                />
                {joinError && (
                  <p className="text-xs text-error mt-1.5 font-medium">{joinError}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Unirse al Grupo
                </button>
              </div>
            </form>
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
  onDelete?: () => void;
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
  onDelete,
  submitLabel,
}: GroupFormModalProps) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Formulario de grupo" className="fixed inset-0 z-50 bg-scrim/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface border border-outline-variant rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
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
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Nombre del Grupo *</label>
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
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Agregar Integrante</label>
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

          <div className="flex justify-between items-center pt-4 border-t border-outline-variant/60">
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-2 rounded-xl bg-error-container border border-error/40 text-on-error-container hover:bg-error-container text-xs font-semibold cursor-pointer"
              >
                Eliminar Grupo
              </button>
            ) : <div />}

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
