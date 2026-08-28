import React, { useState } from 'react';
import Navbar from '../components/Navbar';

type DayOfWeek = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

export interface GroupMember {
  email: string;
  nombre: string;
  isEssential: boolean;
  color: string;
  status: 'confirmado' | 'pendiente';
}

export interface Group {
  id: string;
  nombre: string;
  descripcion: string;
  codigoInvitacion: string;
  creadoPor: string;
  umbralDisponibilidad: number; // RF-06 %
  miembros: GroupMember[];
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

// Initial Mock Data
const INITIAL_GROUPS: Group[] = [
  {
    id: '1',
    nombre: 'Grupo Universitario - Ing. Software',
    descripcion: 'Coordinación de horarios de clases y trabajos en grupo del ciclo.',
    codigoInvitacion: 'HUECKO-78A9',
    creadoPor: 'alex.rodriguez@huecko.com',
    umbralDisponibilidad: 100,
    miembros: [
      { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R.', isEssential: true, color: '#8b5cf6', status: 'confirmado' },
      { email: 'maria.c@huecko.com', nombre: 'María C.', isEssential: false, color: '#ec4899', status: 'confirmado' },
      { email: 'sam.p@huecko.com', nombre: 'Sam P.', isEssential: false, color: '#3b82f6', status: 'confirmado' },
    ],
  },
  {
    id: '2',
    nombre: 'Amigos de Fin de Semana',
    descripcion: 'Salidas, viajes y actividades deportivas.',
    codigoInvitacion: 'HUECKO-34X2',
    creadoPor: 'alex.rodriguez@huecko.com',
    umbralDisponibilidad: 80,
    miembros: [
      { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R.', isEssential: true, color: '#8b5cf6', status: 'confirmado' },
      { email: 'carlos.m@huecko.com', nombre: 'Carlos M.', isEssential: false, color: '#10b981', status: 'confirmado' },
      { email: 'lucia.g@huecko.com', nombre: 'Lucía G.', isEssential: true, color: '#f59e0b', status: 'pendiente' },
    ],
  },
];

// Mock schedules for group members to compute availability heatmap
const MOCK_OCCUPIED_SLOTS: GroupOccupiedSlot[] = [
  { id: '101', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: '#8b5cf6', day: 'Lun', startTime: '08:00', endTime: '11:00', title: 'Clase Algoritmos' },
  { id: '102', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: '#ec4899', day: 'Lun', startTime: '10:00', endTime: '13:00', title: 'Trabajo Remoto' },
  { id: '103', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: '#3b82f6', day: 'Lun', startTime: '14:00', endTime: '18:00', title: 'Gimnasio & Estudio' },
  
  { id: '104', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: '#8b5cf6', day: 'Mar', startTime: '10:00', endTime: '14:00', title: 'Turno Trabajo' },
  { id: '105', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: '#3b82f6', day: 'Mar', startTime: '08:00', endTime: '12:00', title: 'Clase Física' },

  { id: '106', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: '#8b5cf6', day: 'Mié', startTime: '08:00', endTime: '10:00', title: 'Universidad' },
  { id: '107', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: '#ec4899', day: 'Mié', startTime: '08:00', endTime: '11:00', title: 'Reunión Equipo' },
  { id: '108', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: '#3b82f6', day: 'Mié', startTime: '15:00', endTime: '18:00', title: 'Clase Inglés' },

  { id: '109', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: '#8b5cf6', day: 'Jue', startTime: '10:00', endTime: '14:00', title: 'Turno Trabajo' },
  { id: '110', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: '#ec4899', day: 'Jue', startTime: '12:00', endTime: '16:00', title: 'Cita Médica' },

  { id: '111', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: '#8b5cf6', day: 'Vie', startTime: '08:00', endTime: '11:00', title: 'Universidad' },
];

const days: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const timeSlotsHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export interface TimeWindowProposal {
  id: string;
  dia: DayOfWeek;
  horaInicio: string;
  horaFin: string;
  disponibilidadPorcentaje: number;
  votosUsuarios: string[]; // List of user emails who voted for this window
}

export interface PlanIncidence {
  id: string;
  userEmail: string;
  userName: string;
  tipo: 'falta' | 'tardanza' | 'imprevisto';
  motivo: string;
  minutosTardanza?: number;
  fechaReporte: string;
}

export interface PlanProposal {
  id: string;
  groupId: string;
  titulo: string;
  lugar?: string;
  creadoPor: string;
  plazoVotacion: string;
  estado: 'propuesto' | 'confirmado' | 'cancelado' | 'en_recoordinacion';
  ventanasSugeridas: TimeWindowProposal[];
  incidencias?: PlanIncidence[];
  votosReplanificacion?: { cancel: string[]; reschedule: string[]; keep: string[] };
}

const INITIAL_PROPOSALS: PlanProposal[] = [
  {
    id: 'prop-1',
    groupId: '1',
    titulo: 'Reunión de Trabajo de Grado',
    lugar: 'Biblioteca Central / Google Meet',
    creadoPor: 'Alex R.',
    plazoVotacion: 'Hoy a las 20:00',
    estado: 'confirmado',
    ventanasSugeridas: [
      { id: 'w1', dia: 'Mié', horaInicio: '11:00', horaFin: '13:00', disponibilidadPorcentaje: 100, votosUsuarios: ['alex.rodriguez@huecko.com', 'maria.c@huecko.com', 'sam.p@huecko.com'] },
    ],
    incidencias: [
      {
        id: 'inc-1',
        userEmail: 'maria.c@huecko.com',
        userName: 'María C.',
        tipo: 'falta',
        motivo: 'Tengo un cruce de examen de laboratorio a última hora.',
        fechaReporte: 'Hace 10 min',
      },
    ],
    votosReplanificacion: { cancel: ['maria.c@huecko.com'], reschedule: ['alex.rodriguez@huecko.com'], keep: [] },
  },
  {
    id: 'prop-2',
    groupId: '2',
    titulo: 'Almuerzo de Fin de Semana',
    lugar: 'Miraflores Food Court',
    creadoPor: 'Carlos M.',
    plazoVotacion: 'Viernes 18:00',
    estado: 'propuesto',
    ventanasSugeridas: [
      { id: 'w3', dia: 'Sáb', horaInicio: '13:00', horaFin: '15:00', disponibilidadPorcentaje: 80, votosUsuarios: ['alex.rodriguez@huecko.com', 'carlos.m@huecko.com'] },
      { id: 'w4', dia: 'Dom', horaInicio: '13:00', horaFin: '15:00', disponibilidadPorcentaje: 100, votosUsuarios: ['lucia.g@huecko.com'] },
    ],
    incidencias: [],
    votosReplanificacion: { cancel: [], reschedule: [], keep: [] },
  },
];

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupProposals, setGroupProposals] = useState<PlanProposal[]>(INITIAL_PROPOSALS);

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

  // --- Handlers para Modal de Crear / Editar Grupo ---
  const openCreateModal = () => {
    setNombre('');
    setDescripcion('');
    setUmbral(100);
    setMembersList([
      { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R.', isEssential: true, color: '#8b5cf6', status: 'confirmado' },
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
    setSelectedGroup(group);
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

    const colors = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    const assignedColor = colors[membersList.length % colors.length];

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

    /* oxlint-disable react/purity */
    const codeSegment = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomCode = `HUECKO-${codeSegment}`;
    const groupId = Date.now().toString();
    /* oxlint-enable react/purity */

    const newGroup: Group = {
      id: groupId,
      nombre,
      descripcion,
      codigoInvitacion: randomCode,
      creadoPor: 'alex.rodriguez@huecko.com',
      umbralDisponibilidad: umbral,
      miembros: membersList,
    };

    setGroups([newGroup, ...groups]);
    setIsCreateModalOpen(false);
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !nombre) return;

    const updatedGroup: Group = {
      ...selectedGroup,
      nombre,
      descripcion,
      umbralDisponibilidad: umbral,
      miembros: membersList,
    };

    setGroups(groups.map((g) => (g.id === selectedGroup.id ? updatedGroup : g)));
    setSelectedGroup(updatedGroup);
    setIsEditGroupModalOpen(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter((g) => g.id !== groupId));
    if (selectedGroup?.id === groupId) {
      setSelectedGroup(null);
    }
    setIsEditGroupModalOpen(false);
  };

  // --- HELPER PARA CALCULAR LA DISPONIBILIDAD REAL DINÁMICA DE UNA VENTANA DE TIEMPO (RF-05, RF-06) ---
  const calculateWindowAvailability = (group: Group, day: DayOfWeek, startTimeStr: string, endTimeStr: string) => {
    const startH = parseInt(startTimeStr.split(':')[0], 10);
    const endH = parseInt(endTimeStr.split(':')[0], 10);
    if (isNaN(startH) || isNaN(endH) || endH <= startH) return 100;

    const groupMemberEmails = group.miembros.map((m) => m.email);
    const totalMembers = groupMemberEmails.length;
    if (totalMembers === 0) return 100;

    // Obtener miembros que están ocupados en AL MENOS una hora de este rango
    const occupiedEmailsInWindow = new Set<string>();
    MOCK_OCCUPIED_SLOTS.forEach((slot) => {
      if (slot.day !== day) return;
      if (!groupMemberEmails.includes(slot.userEmail)) return;

      const slotStart = parseInt(slot.startTime.split(':')[0], 10);
      const slotEnd = parseInt(slot.endTime.split(':')[0], 10);

      // Verificar solapamiento de rangos de horas
      if (startH < slotEnd && endH > slotStart) {
        occupiedEmailsInWindow.add(slot.userEmail);
      }
    });

    const freeCount = totalMembers - occupiedEmailsInWindow.size;
    return Math.round((freeCount / totalMembers) * 100);
  };

  // --- HANDLERS PARA VOTACIÓN Y PROPUESTA DE PLANES (Módulo 3: RF-08, RF-09, RF-10) ---
  const openProposePlanModal = (group: Group) => {
    setSelectedGroup(group);
    setProposalTitle('');
    setProposalLugar('');
    setProposalPlazo('24 horas');
    
    // Pre-cargar 2 ventanas de tiempo calculando disponibilidades reales dinámicas (RF-08)
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
    if (suggestedWindows.length <= 1) return;
    setSuggestedWindows(suggestedWindows.filter((w) => w.id !== id));
  };

  const handleCreateProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !proposalTitle || suggestedWindows.length === 0) return;

    /* oxlint-disable react/purity */
    const newProp: PlanProposal = {
      id: `prop-${Date.now()}`,
      groupId: selectedGroup.id,
      titulo: proposalTitle,
      lugar: proposalLugar,
      creadoPor: 'Alex R.',
      plazoVotacion: proposalPlazo,
      estado: 'propuesto',
      ventanasSugeridas: suggestedWindows,
    };
    /* oxlint-enable react/purity */

    setGroupProposals([newProp, ...groupProposals]);
    setIsProposeModalOpen(false);
  };

  const handleVote = (proposalId: string, windowId: string) => {
    const userEmail = 'alex.rodriguez@huecko.com'; // Current user

    setGroupProposals(
      groupProposals.map((p) => {
        if (p.id !== proposalId || p.estado === 'confirmado') return p;

        const updatedWindows = p.ventanasSugeridas.map((w) => {
          if (w.id === windowId) {
            const hasVoted = w.votosUsuarios.includes(userEmail);
            const newVotes = hasVoted
              ? w.votosUsuarios.filter((e) => e !== userEmail)
              : [...w.votosUsuarios, userEmail];
            return { ...w, votosUsuarios: newVotes };
          }
          return w;
        });

        return { ...p, ventanasSugeridas: updatedWindows };
      })
    );
  };

  const handleCloseVotingManually = (proposalId: string) => {
    setGroupProposals(
      groupProposals.map((p) => {
        if (p.id !== proposalId) return p;
        return { ...p, estado: 'confirmado' };
      })
    );
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

    /* oxlint-disable react/purity */
    const newIncidence: PlanIncidence = {
      id: `inc-${Date.now()}`,
      userEmail: 'alex.rodriguez@huecko.com',
      userName: 'Alex R.',
      tipo: incidentType,
      motivo: incidentMotivo,
      fechaReporte: 'Ahora',
    };
    /* oxlint-enable react/purity */

    setGroupProposals(
      groupProposals.map((p) => {
        if (p.id === targetProposalForIncident.id) {
          const currentIncidencias = p.incidencias || [];
          return {
            ...p,
            estado: p.estado === 'confirmado' ? 'en_recoordinacion' : p.estado,
            incidencias: [newIncidence, ...currentIncidencias],
          };
        }
        return p;
      })
    );

    setIsIncidentModalOpen(false);
  };

  const handleReplanVote = (proposalId: string, action: 'cancel' | 'reschedule' | 'keep') => {
    const userEmail = 'alex.rodriguez@huecko.com';

    setGroupProposals(
      groupProposals.map((p) => {
        if (p.id !== proposalId) return p;

        const currentVotes = p.votosReplanificacion || { cancel: [], reschedule: [], keep: [] };

        // Clean user from all pools
        const cleanCancel = currentVotes.cancel.filter((e) => e !== userEmail);
        const cleanReschedule = currentVotes.reschedule.filter((e) => e !== userEmail);
        const cleanKeep = currentVotes.keep.filter((e) => e !== userEmail);

        if (action === 'cancel') cleanCancel.push(userEmail);
        if (action === 'reschedule') cleanReschedule.push(userEmail);
        if (action === 'keep') cleanKeep.push(userEmail);

        return {
          ...p,
          votosReplanificacion: {
            cancel: cleanCancel,
            reschedule: cleanReschedule,
            keep: cleanKeep,
          },
        };
      })
    );
  };

  // --- CÁLCULO DE CRUCE Y ESPACIOS VACÍOS / LIBRES (RF-05, RF-06) ---
  const getCellAvailability = (group: Group, day: DayOfWeek, hour: number) => {
    // Check occupied members in this specific 1-hour slot
    const occupiedInCell = MOCK_OCCUPIED_SLOTS.filter((s) => {
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

  return (
    <div className="bg-[#f4fbf1] text-[#161d15] min-h-screen flex flex-col pt-[88px] md:pt-[104px]">
      <Navbar currentTab="groups" />

      {/* Main Content Canvas */}
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-10 pb-24 md:pb-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#161d15] mb-2 font-headline">Mis Grupos y Horario Común</h1>
            <p className="text-[#40493e] text-sm md:text-base">
              Administra tus grupos, edita integrantes y visualiza los <strong className="text-[#416840] font-semibold">espacios libres resaltados</strong> de todos los miembros.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7fae7a] hover:bg-[#6f9e6a] text-white transition-all text-sm font-semibold shadow-md shadow-[#7fae7a]/20 cursor-pointer w-full md:w-auto"
          >
            <span className="material-symbols-outlined text-[20px]">group_add</span>
            Crear Nuevo Grupo
          </button>
        </header>

        {/* Group Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {groups.map((group) => {
            const isSelected = selectedGroup?.id === group.id;

            return (
              <div
                key={group.id}
                className={`bg-[#e9f0e4]/80 border rounded-2xl p-6 shadow-sm backdrop-blur-md flex flex-col justify-between transition-all ${
                  isSelected ? 'border-[#7fae7a] ring-2 ring-[#7fae7a]/30' : 'border-[#d5e3cf] hover:border-[#c0c9bb]'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-[#161d15]">{group.nombre}</h3>
                    <span className="px-2.5 py-1 rounded-full bg-[#a8c9a0]/30 border border-[#7fae7a]/40 text-[#2a4f2b] text-xs font-semibold">
                      Umbral {group.umbralDisponibilidad}%
                    </span>
                  </div>
                  <p className="text-[#40493e] text-sm mb-4 leading-relaxed">{group.descripcion || 'Sin descripción.'}</p>

                  {/* Código de Invitación Rápida */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#c0c9bb]/60 mb-4">
                    <div className="flex items-center gap-2 text-xs text-[#70796d]">
                      <span className="material-symbols-outlined text-[#416840] text-[18px]">key</span>
                      <span>Código de grupo:</span>
                      <span className="font-mono text-[#161d15] font-bold text-sm tracking-wider">{group.codigoInvitacion}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(group.codigoInvitacion)}
                      className="text-xs text-[#416840] hover:text-[#2a4f2b] font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      {copiedCode === group.codigoInvitacion ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>

                  {/* Lista de Miembros */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-semibold text-[#70796d] uppercase tracking-wider">
                        Miembros ({group.miembros.length})
                      </h4>
                      <button
                        onClick={() => openEditModal(group)}
                        className="text-xs text-[#416840] hover:text-[#2a4f2b] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        Editar Miembros / Grupo
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {group.miembros.map((m, idx) => (
                        <div
                          key={idx}
                          className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 ${
                            m.isEssential
                              ? 'bg-amber-100 border-amber-300 text-amber-900'
                              : 'bg-white border-[#c0c9bb]/60 text-[#161d15]'
                          }`}
                          title={m.isEssential ? 'Miembro imprescindible para planes (RF-16)' : 'Miembro regular'}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: m.color }}
                          />
                          <span className="font-medium">{m.nombre}</span>
                          {m.isEssential && (
                            <span className="material-symbols-outlined text-[14px] text-amber-600" title="Imprescindible">
                              star
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-6 pt-4 border-t border-[#c0c9bb]/60 flex flex-wrap gap-2 justify-between items-center">
                  <button
                    onClick={() => openEditModal(group)}
                    className="text-xs text-[#70796d] hover:text-[#161d15] transition-colors cursor-pointer"
                  >
                    Ajustar Umbral / Grupo
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openProposePlanModal(group)}
                      className="px-3.5 py-2 rounded-xl bg-[#a8c9a0]/30 hover:bg-[#a8c9a0]/50 text-[#2a4f2b] border border-[#7fae7a]/40 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">campaign</span>
                      Proponer Plan
                    </button>

                    <button
                      onClick={() => setSelectedGroup(group)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#416840] text-white shadow-md shadow-[#416840]/20'
                          : 'bg-[#7fae7a] hover:bg-[#6f9e6a] text-white shadow-xs'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">grid_view</span>
                      {isSelected ? 'Viendo Horario Común' : 'Ver Horario en Común'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* SECCIÓN DE PLANES PROPUESTOS Y VOTACIONES ACTIVAS */}
        {selectedGroup && (
          <section className="mb-12 bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 md:p-8 shadow-sm backdrop-blur-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[#c0c9bb]/60 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-[#161d15] flex items-center gap-2 font-headline">
                  <span className="material-symbols-outlined text-[#416840]">how_to_vote</span>
                  Planes Propuestos y Votación: {selectedGroup.nombre}
                </h2>
                <p className="text-[#40493e] text-sm">
                  Propuestas de planes creadas para este grupo. Los miembros pueden emitir su voto antes de vencer el plazo.
                </p>
              </div>

              <button
                onClick={() => openProposePlanModal(selectedGroup)}
                className="px-4 py-2 rounded-xl bg-[#7fae7a] hover:bg-[#6f9e6a] text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
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
                            ? 'bg-amber-100/60 border-amber-300'
                            : isClosed
                            ? 'bg-[#a8c9a0]/30 border-[#7fae7a]/50'
                            : 'bg-white border-[#c0c9bb]/60'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-[#161d15]">{proposal.titulo}</h3>
                              {proposal.lugar && (
                                <span className="text-[11px] text-[#70796d] font-normal">
                                  • {proposal.lugar}
                                </span>
                              )}
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isInReplan
                                  ? 'bg-amber-200 text-amber-900 border border-amber-400'
                                  : isClosed
                                  ? 'bg-[#a8c9a0]/50 text-[#1e4d50] border border-[#7fae7a]'
                                  : 'bg-[#cfe7c8] text-[#111f0e] border border-[#7fae7a]/40'
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
                            <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                              {proposal.incidencias.map((inc) => (
                                <div key={inc.id} className="text-xs flex justify-between items-center text-amber-900">
                                  <span>
                                    ⚠️ <strong>{inc.userName}</strong>: {inc.motivo}
                                  </span>
                                  <span className="text-[10px] text-amber-800 font-bold uppercase">
                                    {inc.tipo}
                                  </span>
                                </div>
                              ))}

                              {/* Votación Grupal Simplificada */}
                              <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-2 text-xs">
                                <span className="text-[11px] text-amber-900 font-semibold shrink-0">¿Qué hacemos?</span>
                                <div className="flex gap-1.5 w-full justify-end">
                                  <button
                                    onClick={() => handleReplanVote(proposal.id, 'reschedule')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                                      userReplanVote === 'reschedule'
                                        ? 'bg-[#7fae7a] text-white border-[#416840]'
                                        : 'bg-white text-[#40493e] border-[#c0c9bb] hover:bg-[#e9f0e6]'
                                    }`}
                                  >
                                    Re-agendar ({proposal.votosReplanificacion?.reschedule.length || 0})
                                  </button>
                                  <button
                                    onClick={() => handleReplanVote(proposal.id, 'keep')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                                      userReplanVote === 'keep'
                                        ? 'bg-[#416840] text-white border-[#2a4f2b]'
                                        : 'bg-white text-[#40493e] border-[#c0c9bb] hover:bg-[#e9f0e6]'
                                    }`}
                                  >
                                    Mantener ({proposal.votosReplanificacion?.keep.length || 0})
                                  </button>
                                  <button
                                    onClick={() => handleReplanVote(proposal.id, 'cancel')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                                      userReplanVote === 'cancel'
                                        ? 'bg-red-700 text-white border-red-800'
                                        : 'bg-white text-[#40493e] border-[#c0c9bb] hover:bg-[#e9f0e6]'
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
                                <div
                                  key={ventana.id}
                                  onClick={() => !isClosed && handleVote(proposal.id, ventana.id)}
                                  className={`px-3 py-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                                    hasVoted
                                      ? 'bg-[#a8c9a0]/30 border-[#7fae7a]'
                                      : 'bg-white/70 border-[#c0c9bb]/60 hover:border-[#7fae7a]'
                                  } ${isClosed ? 'cursor-default opacity-85' : ''}`}
                                >
                                  <div className="flex items-center gap-2 text-xs">
                                    <span
                                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                        hasVoted
                                          ? 'bg-[#7fae7a] border-[#416840] text-white font-bold'
                                          : 'border-[#c0c9bb] text-transparent'
                                      }`}
                                    >
                                      ✓
                                    </span>
                                    <span className="font-semibold text-[#161d15]">
                                      {ventana.dia} {ventana.horaInicio}-{ventana.horaFin}
                                    </span>
                                    <span className="text-[10px] text-[#416840] font-bold">
                                      ({ventana.disponibilidadPorcentaje}% libre)
                                    </span>
                                  </div>

                                  <span className="text-xs font-bold text-[#70796d]">
                                    {ventana.votosUsuarios.length} {ventana.votosUsuarios.length === 1 ? 'voto' : 'votos'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Pie de tarjeta ultra-limpio */}
                        <div className="pt-2.5 border-t border-[#c0c9bb]/60 flex justify-between items-center text-xs text-[#70796d]">
                          <span className="text-[11px] font-mono">Plazo: {proposal.plazoVotacion}</span>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openReportIncidentModal(proposal)}
                              className="text-[11px] text-amber-800 hover:text-amber-900 font-semibold cursor-pointer"
                            >
                              Reportar Imprevisto
                            </button>

                            {!isClosed && (
                              <button
                                onClick={() => handleCloseVotingManually(proposal.id)}
                                className="text-[11px] text-[#416840] hover:text-[#2a4f2b] font-bold cursor-pointer"
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
              <div className="p-6 rounded-xl bg-white/50 border border-dashed border-[#c0c9bb] text-center">
                <p className="text-[#70796d] text-xs mb-3">No hay propuestas de planes activas en este grupo.</p>
                <button
                  onClick={() => openProposePlanModal(selectedGroup)}
                  className="px-4 py-2 rounded-xl bg-[#a8c9a0]/30 text-[#2a4f2b] border border-[#7fae7a]/40 text-xs font-semibold hover:bg-[#a8c9a0]/50 cursor-pointer"
                >
                  + Proponer el primer Plan
                </button>
              </div>
            )}
          </section>
        )}

        {/* VISTA DEL HORARIO EN COMÚN DE TODOS */}
        {selectedGroup ? (
          <section className="bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 md:p-8 shadow-sm backdrop-blur-md animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[#c0c9bb]/60 pb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-[#161d15] font-headline">Horario en Común: {selectedGroup.nombre}</h2>
                  <span className="px-3 py-1 rounded-full bg-[#a8c9a0]/40 border border-[#7fae7a] text-[#1e4d50] text-xs font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#7fae7a] animate-pulse" />
                    Cruce Activo
                  </span>
                </div>
                <p className="text-[#40493e] text-sm">
                  Los casilleros en <strong className="text-[#416840]">Verde</strong> representan <strong>huecos/espacios libres</strong> que superan el umbral del <strong>{selectedGroup.umbralDisponibilidad}% de coincidencia</strong>.
                </p>
              </div>

              {/* Leyenda de colores */}
              <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-[#c0c9bb]/60 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#a8c9a0] border border-[#7fae7a]" />
                  <span className="text-[#161d15] font-semibold">Espacio Libre (Cumple {selectedGroup.umbralDisponibilidad}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#e9f0e6] border border-[#c0c9bb]" />
                  <span className="text-[#70796d]">Parcial / Ocupado</span>
                </div>
              </div>
            </div>

            {/* Heatmap Grid Tabla Rediseñada */}
            <div className="overflow-x-auto">
              <div className="min-w-[850px]">
                {/* Días Header */}
                <div className="grid grid-cols-8 gap-3 mb-4">
                  <div className="w-16"></div>
                  {days.map((day) => (
                    <div key={day} className="text-center text-xs font-bold text-[#40493e] uppercase tracking-wider pb-2 border-b border-[#c0c9bb]/60">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Horas Filas */}
                <div className="space-y-2.5">
                  {timeSlotsHours.map((hour) => (
                    <div key={hour} className="grid grid-cols-8 gap-3 items-center">
                      {/* Label hora */}
                      <div className="text-xs text-[#70796d] font-mono font-medium text-right pr-2">
                        {hour.toString().padStart(2, '0')}:00
                      </div>

                      {/* Días celdas */}
                      {days.map((day) => {
                        const cell = getCellAvailability(selectedGroup, day, hour);

                        return (
                          <div
                            key={`${day}-${hour}`}
                            className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[64px] relative group ${
                              cell.meetsThreshold
                                ? 'bg-[#a8c9a0]/50 border-[#7fae7a] hover:bg-[#a8c9a0]/70'
                                : cell.freeCount > 0
                                ? 'bg-white/80 border-[#c0c9bb]/60 hover:border-[#7fae7a]'
                                : 'bg-[#e9f0e6]/40 border-[#d5e3cf] opacity-60'
                            }`}
                          >
                            {/* Indicador superior de % */}
                            <div className="flex justify-between items-center w-full">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  cell.meetsThreshold
                                    ? 'bg-[#7fae7a] text-white'
                                    : 'bg-[#e3eae0] text-[#40493e]'
                                }`}
                              >
                                {cell.freePercentage}% libre
                              </span>
                              <span className="text-[10px] text-[#70796d] font-medium">
                                {cell.freeCount}/{cell.totalMembers}
                              </span>
                            </div>

                            {/* Ocupados resumen o Badge de Disponible */}
                            <div className="mt-1 flex items-center justify-between">
                              {cell.occupiedMembers.length > 0 ? (
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {cell.occupiedMembers.map((oc, i) => (
                                    <span
                                      key={i}
                                      className="w-4 h-4 rounded-full border border-white text-[9px] font-bold text-white flex items-center justify-center shrink-0 shadow-xs"
                                      style={{ backgroundColor: oc.userColor }}
                                      title={`${oc.userName}: ${oc.title}`}
                                    >
                                      {oc.userName.charAt(0)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#416840] font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#416840] inline-block" />
                                  Libre
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="p-8 rounded-2xl bg-[#e9f0e4]/50 border border-dashed border-[#c0c9bb] text-center">
            <span className="material-symbols-outlined text-[48px] text-[#70796d] mb-2">grid_view</span>
            <h3 className="text-lg font-bold text-[#161d15]">Selecciona un grupo para ver el Horario en Común</h3>
            <p className="text-[#70796d] text-sm max-w-md mx-auto mt-1">
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

      {/* Modal: Proponer Nuevo Plan Grupal (RF-08) */}
      {isProposeModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 bg-[#161d15]/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#f4fbf1] border border-[#d5e3cf] rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#c0c9bb]/60">
              <h2 className="text-xl font-bold text-[#161d15] flex items-center gap-2 font-headline">
                <span className="material-symbols-outlined text-[#416840]">campaign</span>
                Proponer Plan: {selectedGroup.nombre}
              </h2>
              <button
                onClick={() => setIsProposeModalOpen(false)}
                className="text-[#70796d] hover:text-[#161d15] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateProposalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#40493e] mb-1.5">Título del Plan *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Almuerzo de integración, Estudio de Cálculo..."
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] placeholder-slate-400 text-sm focus:outline-none focus:border-[#7fae7a]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#40493e] mb-1.5">Lugar u Opciones de Encuentro (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Biblioteca Central / Discord / Parque..."
                  value={proposalLugar}
                  onChange={(e) => setProposalLugar(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] placeholder-slate-400 text-sm focus:outline-none focus:border-[#7fae7a]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#40493e] mb-1.5">Plazo de Votación</label>
                <select
                  value={proposalPlazo}
                  onChange={(e) => setProposalPlazo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#7fae7a]"
                >
                  <option value="12 horas">12 horas (Cierre rápido)</option>
                  <option value="24 horas">24 horas (Recomendado)</option>
                  <option value="48 horas">48 horas</option>
                  <option value="Hasta el viernes 20:00">Hasta el viernes 20:00</option>
                </select>
              </div>

              {/* Ventanas de tiempo sugeridas para el plan (RF-08) */}
              <div>
                <label className="block text-xs font-medium text-[#40493e] mb-2">
                  Ventanas de Tiempo Sugeridas (De 2 a 5 opciones)
                </label>

                {/* Formulario para agregar una opción de horario */}
                <div className="p-3 rounded-xl bg-white border border-[#c0c9bb]/60 mb-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-[#70796d] block mb-1">Día</span>
                      <select
                        value={tempDay}
                        onChange={(e) => setTempDay(e.target.value as DayOfWeek)}
                        className="w-full px-2 py-1.5 border border-[#c0c9bb] rounded-lg bg-[#f4fbf1] text-[#161d15] text-xs"
                      >
                        {days.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#70796d] block mb-1">Inicio</span>
                      <input
                        type="time"
                        value={tempStart}
                        onChange={(e) => setTempStart(e.target.value)}
                        className="w-full px-2 py-1.5 border border-[#c0c9bb] rounded-lg bg-[#f4fbf1] text-[#161d15] text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#70796d] block mb-1">Fin</span>
                      <input
                        type="time"
                        value={tempEnd}
                        onChange={(e) => setTempEnd(e.target.value)}
                        className="w-full px-2 py-1.5 border border-[#c0c9bb] rounded-lg bg-[#f4fbf1] text-[#161d15] text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddWindowToProposal}
                    className="w-full py-1.5 bg-[#e9f0e4] hover:bg-[#dbe5d6] text-[#40493e] text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-[#c0c9bb]/60"
                  >
                    + Agregar Opción de Horario
                  </button>
                </div>

                {/* Lista de ventanas sugeridas actualmente */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {suggestedWindows.map((w, idx) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#c0c9bb]/60 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#416840]">Opción {idx + 1}:</span>
                        <span className="text-[#161d15] font-medium">
                          {w.dia} — {w.horaInicio} a {w.horaFin}
                        </span>
                        <span className="text-[10px] text-[#416840] font-bold">
                          ({w.disponibilidadPorcentaje}% libre)
                        </span>
                      </div>

                      {suggestedWindows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveWindowFromProposal(w.id)}
                          className="text-red-600 hover:text-red-700 p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#c0c9bb]/60">
                <button
                  type="button"
                  onClick={() => setIsProposeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#c0c9bb] text-[#40493e] hover:bg-[#e9f0e4] text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7fae7a] hover:bg-[#6f9e6a] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Enviar Propuesta a Todos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reportar Imprevisto / Falta (RF-13, RF-14) */}
      {isIncidentModalOpen && targetProposalForIncident && (
        <div className="fixed inset-0 z-50 bg-[#161d15]/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#f4fbf1] border border-[#d5e3cf] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#c0c9bb]/60">
              <h2 className="text-xl font-bold text-[#161d15] flex items-center gap-2 font-headline">
                <span className="material-symbols-outlined text-amber-700">warning</span>
                Avisar Imprevisto o Falta
              </h2>
              <button
                onClick={() => setIsIncidentModalOpen(false)}
                className="text-[#70796d] hover:text-[#161d15] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleReportIncidentSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-[#40493e] mb-3">
                  Reporta un cambio de último minuto para el plan: <strong className="text-[#161d15]">{targetProposalForIncident.titulo}</strong>
                </p>

                <label className="block text-xs font-medium text-[#40493e] mb-1.5">Tipo de Imprevisto</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as 'falta' | 'tardanza' | 'imprevisto')}
                  className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-amber-600"
                >
                  <option value="falta">No podré asistir (Falta)</option>
                  <option value="tardanza">Llegaré tarde (Tardanza)</option>
                  <option value="imprevisto">Otro imprevisto / Cambio de horario</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#40493e] mb-1.5">Motivo o Detalle *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej. Me surgió un examen de laboratorio, llegaré 30 mins tarde por tráfico..."
                  value={incidentMotivo}
                  onChange={(e) => setIncidentMotivo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] placeholder-slate-400 text-sm focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0">lightbulb</span>
                <p>
                  El grupo recibirá una notificación inmediata y podrá votar si re-agendar, cancelar o mantener el evento.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#c0c9bb]/60">
                <button
                  type="button"
                  onClick={() => setIsIncidentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#c0c9bb] text-[#40493e] hover:bg-[#e9f0e4] text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Notificar al Grupo
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
    <div className="fixed inset-0 z-50 bg-[#161d15]/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#f4fbf1] border border-[#d5e3cf] rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#c0c9bb]/60">
          <h2 className="text-xl font-bold text-[#161d15] flex items-center gap-2 font-headline">
            <span className="material-symbols-outlined text-[#416840]">group</span>
            {title}
          </h2>
          <button onClick={onClose} className="text-[#70796d] hover:text-[#161d15] transition-colors cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#40493e] mb-1.5">Nombre del Grupo *</label>
            <input
              type="text"
              required
              placeholder="Ej. Grupo Universidad, Viaje de Verano..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] placeholder-slate-400 text-sm focus:outline-none focus:border-[#7fae7a]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#40493e] mb-1.5">Descripción</label>
            <textarea
              rows={2}
              placeholder="Descripción del grupo..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] placeholder-slate-400 text-sm focus:outline-none focus:border-[#7fae7a]"
            />
          </div>

          {/* Umbral de Coincidencia (RF-06) */}
          <div className="p-4 rounded-xl bg-white border border-[#c0c9bb]/60 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-[#161d15] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#416840] text-[18px]">tune</span>
                Umbral Mínimo de Coincidencia (RF-06)
              </label>
              <span className="text-xs font-bold text-[#416840] bg-[#a8c9a0]/30 px-2 py-0.5 rounded-lg border border-[#7fae7a]/40">
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
              className="w-full accent-[#7fae7a] cursor-pointer mt-1"
            />
          </div>

          {/* Gestión de Integrantes */}
          <div>
            <label className="block text-xs font-medium text-[#40493e] mb-1.5">Agregar Integrante</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                placeholder="Nombre (ej. María C.)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="px-3.5 py-2 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#7fae7a]"
              />
              <input
                type="email"
                placeholder="Correo (amigo@correo.com)"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="px-3.5 py-2 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#7fae7a]"
              />
            </div>

            <div className="flex justify-between items-center mb-3">
              <label className="text-xs text-amber-800 font-semibold cursor-pointer flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={isEssentialNewMember}
                  onChange={(e) => setIsEssentialNewMember(e.target.checked)}
                  className="rounded border-[#c0c9bb] bg-white text-[#7fae7a] focus:ring-[#7fae7a] cursor-pointer"
                />
                <span className="material-symbols-outlined text-[15px] text-amber-600">star</span>
                Marcar Imprescindible (RF-16)
              </label>

              <button
                type="button"
                onClick={onAddMember}
                className="px-4 py-1.5 rounded-xl bg-[#e9f0e4] hover:bg-[#dbe5d6] text-[#40493e] text-xs font-semibold cursor-pointer border border-[#c0c9bb]/60"
              >
                + Añadir Integrante
              </button>
            </div>

            {/* Lista actual de integrantes */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {membersList.map((m) => (
                <div
                  key={m.email}
                  className="flex justify-between items-center p-2.5 rounded-xl bg-white border border-[#c0c9bb]/60 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-[#161d15] font-medium">{m.nombre}</span>
                    <span className="text-[#70796d]">({m.email})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleEssential(m.email)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 cursor-pointer ${
                        m.isEssential
                          ? 'bg-amber-100 border-amber-300 text-amber-900'
                          : 'bg-[#f4fbf1] border-[#c0c9bb] text-[#70796d] hover:text-[#161d15]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[12px]">star</span>
                      {m.isEssential ? 'Imprescindible' : 'Regular'}
                    </button>

                    {membersList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(m.email)}
                        className="text-red-600 hover:text-red-700 p-1 cursor-pointer"
                        title="Quitar integrante"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[#c0c9bb]/60">
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-2 rounded-xl bg-red-100 border border-red-300 text-red-800 hover:bg-red-200 text-xs font-semibold cursor-pointer"
              >
                Eliminar Grupo
              </button>
            ) : <div />}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#c0c9bb] text-[#40493e] hover:bg-[#e9f0e4] text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#7fae7a] hover:bg-[#6f9e6a] text-white text-xs font-semibold shadow-xs cursor-pointer"
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
