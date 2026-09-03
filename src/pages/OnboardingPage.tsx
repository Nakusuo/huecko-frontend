import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../store/authStore';
import { useGroupsStore } from '../store/groupsStore';

type OnboardingStep = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const createGroup = useGroupsStore((s) => s.createGroup);
  const joinGroupByCode = useGroupsStore((s) => s.joinGroupByCode);

  const [step, setStep] = useState<OnboardingStep>(1);
  const [profileType, setProfileType] = useState<'universitario' | 'trabajador' | 'mixto'>('universitario');
  
  // Grupo
  const [groupAction, setGroupAction] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('Mis Amigos de Siempre');
  const [groupDescription, setGroupDescription] = useState('Grupo para coordinar salidas, pichangas y estudio');
  const [groupThreshold, setGroupThreshold] = useState<number>(100);
  const [invitationCodeInput, setInvitationCodeInput] = useState('');
  
  // Code state
  const [activeInviteCode, setActiveInviteCode] = useState(() => `HUECKO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeInviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleStep2Submit = () => {
    const userEmail = user?.email || 'alex.rodriguez@huecko.com';
    const userName = user?.nombre || 'Alex R.';

    if (groupAction === 'create') {
      const newG = createGroup(
        groupName || 'Mi Nuevo Grupo',
        groupDescription || 'Coordinación de horarios y planes',
        groupThreshold,
        userEmail,
        userName
      );
      setActiveInviteCode(newG.codigoInvitacion);
    } else {
      if (invitationCodeInput.trim()) {
        joinGroupByCode(invitationCodeInput, userEmail, userName);
        setActiveInviteCode(invitationCodeInput.toUpperCase());
      }
    }
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-[#f4fbf1] text-[#161d15] pb-24 md:pb-12 pt-20 md:pt-24 px-4 sm:px-6 lg:px-8">
      <Navbar currentTab="dashboard" />

      <main className="max-w-3xl mx-auto space-y-8">
        {/* Barra de Progreso del Asistente */}
        <div className="bg-white/80 border border-[#c0c9bb]/60 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#416840]">
              Paso {step} de 4
            </span>
            <span className="text-xs font-semibold text-[#70796d]">
              {step === 1 && '1. Tu Disponibilidad'}
              {step === 2 && '2. Tu Primer Grupo'}
              {step === 3 && '3. Invitar Amigos'}
              {step === 4 && '4. ¡Comencemos!'}
            </span>
          </div>

          <div className="w-full bg-[#e9f0e4] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#416840] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* PASO 1: CONFIGURAR DISPONIBILIDAD INICIAL */}
        {step === 1 && (
          <div className="bg-white border border-[#c0c9bb]/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div>
              <span className="text-xs font-bold text-[#416840] uppercase">Módulo 1: Ingreso de Agendas</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#161d15] mt-1">
                ¿Cuál es tu tipo de rutina habitual?
              </h2>
              <p className="text-xs sm:text-sm text-[#70796d] mt-1">
                Huecko utilizará este perfil para sugerirte horarios y organizar tus huecos libres de cada semana.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setProfileType('universitario')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                  profileType === 'universitario'
                    ? 'border-[#416840] bg-[#e9f0e4]/80 shadow-xs'
                    : 'border-[#c0c9bb]/50 hover:border-[#7fae7a] bg-white'
                }`}
              >
                <span className="material-symbols-outlined text-3xl text-[#416840] mb-2">school</span>
                <h3 className="text-sm font-bold text-[#161d15]">Universitario / Estudiante</h3>
                <p className="text-[11px] text-[#70796d] mt-1">
                  Clases por bloques entre semana, laboratorios y fines de semana libres.
                </p>
              </div>

              <div
                onClick={() => setProfileType('trabajador')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                  profileType === 'trabajador'
                    ? 'border-[#416840] bg-[#e9f0e4]/80 shadow-xs'
                    : 'border-[#c0c9bb]/50 hover:border-[#7fae7a] bg-white'
                }`}
              >
                <span className="material-symbols-outlined text-3xl text-[#416840] mb-2">work</span>
                <h3 className="text-sm font-bold text-[#161d15]">Trabajador / Oficina</h3>
                <p className="text-[11px] text-[#70796d] mt-1">
                  Lunes a Viernes ocupado en horario laboral. Tardes y fin de semana disponibles.
                </p>
              </div>

              <div
                onClick={() => setProfileType('mixto')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                  profileType === 'mixto'
                    ? 'border-[#416840] bg-[#e9f0e4]/80 shadow-xs'
                    : 'border-[#c0c9bb]/50 hover:border-[#7fae7a] bg-white'
                }`}
              >
                <span className="material-symbols-outlined text-3xl text-[#416840] mb-2">timelapse</span>
                <h3 className="text-sm font-bold text-[#161d15]">Horario Rotativo / Mixto</h3>
                <p className="text-[11px] text-[#70796d] mt-1">
                  Turnos variables o freelance con disponibilidad adaptable.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#e9f0e4]/70 border border-[#c0c9bb]/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#416840]">document_scanner</span>
                <div>
                  <h4 className="text-xs font-bold text-[#161d15]">¿Tienes tu horario en PDF o Foto?</h4>
                  <p className="text-[11px] text-[#70796d]">
                    Podrás subirlo vía OCR en cualquier momento desde "Mi Horario".
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#416840] bg-white px-3 py-1 rounded-full border border-[#c0c9bb]/40">
                OCR Listo
              </span>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#c0c9bb]/40">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-2xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold transition-all shadow-md shadow-[#416840]/20 cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>Continuar al Paso 2</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: CREAR O UNIRSE A UN GRUPO */}
        {step === 2 && (
          <div className="bg-white border border-[#c0c9bb]/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div>
              <span className="text-xs font-bold text-[#416840] uppercase">Módulo 2: Coordinación Grupal</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#161d15] mt-1">
                Conéctate con tu círculo
              </h2>
              <p className="text-xs sm:text-sm text-[#70796d] mt-1">
                Crea un espacio para tus amigos o únete con un código que te hayan compartido.
              </p>
            </div>

            {/* Selector de Pestaña */}
            <div className="flex bg-[#e9f0e4] p-1 rounded-2xl border border-[#c0c9bb]/40">
              <button
                type="button"
                onClick={() => setGroupAction('create')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  groupAction === 'create'
                    ? 'bg-[#416840] text-white shadow-xs'
                    : 'text-[#40493e] hover:text-[#161d15]'
                }`}
              >
                Crear Nuevo Grupo
              </button>

              <button
                type="button"
                onClick={() => setGroupAction('join')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  groupAction === 'join'
                    ? 'bg-[#416840] text-white shadow-xs'
                    : 'text-[#40493e] hover:text-[#161d15]'
                }`}
              >
                Unirme por Código
              </button>
            </div>

            {groupAction === 'create' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#40493e] block mb-1">Nombre del Grupo</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Ej. Grupo de Tesis / Amigos de Fin de Semana"
                    className="w-full p-3 rounded-xl border border-[#c0c9bb] text-xs focus:outline-none focus:border-[#416840]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#40493e] block mb-1">Descripción</label>
                  <input
                    type="text"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Ej. Coordinación de planes y salidas"
                    className="w-full p-3 rounded-xl border border-[#c0c9bb] text-xs focus:outline-none focus:border-[#416840]"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#e9f0e4]/60 border border-[#c0c9bb]/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#161d15]">
                      Umbral Mínimo de Disponibilidad Grupal
                    </label>
                    <span className="text-xs font-bold text-[#416840] bg-white px-2 py-0.5 rounded border border-[#c0c9bb]/40">
                      {groupThreshold}% libre
                    </span>
                  </div>
                  <p className="text-[11px] text-[#70796d]">
                    Huecko considerará un hueco válido cuando al menos el {groupThreshold}% de los integrantes pueda asistir.
                  </p>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="10"
                    value={groupThreshold}
                    onChange={(e) => setGroupThreshold(parseInt(e.target.value, 10))}
                    className="w-full accent-[#416840] cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-xs font-bold text-[#40493e] block mb-1">
                    Código de Invitación (ej. HUECKO-78A9)
                  </label>
                  <input
                    type="text"
                    value={invitationCodeInput}
                    onChange={(e) => setInvitationCodeInput(e.target.value.toUpperCase())}
                    placeholder="HUECKO-XXXX"
                    className="w-full p-3 rounded-xl border border-[#c0c9bb] font-mono text-center text-sm font-bold tracking-widest focus:outline-none focus:border-[#416840]"
                  />
                </div>
                <p className="text-xs text-[#70796d] text-center">
                  Pídele el código al creador del grupo para sincronizar tus huecos de inmediato.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-[#c0c9bb]/40">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-[#c0c9bb] text-xs font-semibold text-[#40493e] hover:bg-gray-50 cursor-pointer"
              >
                Atrás
              </button>

              <button
                type="button"
                onClick={handleStep2Submit}
                className="px-6 py-3 rounded-2xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold transition-all shadow-md shadow-[#416840]/20 cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>Continuar al Paso 3</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: INVITAR AMIGOS */}
        {step === 3 && (
          <div className="bg-white border border-[#c0c9bb]/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div>
              <span className="text-xs font-bold text-[#416840] uppercase">Módulo 2: Invitaciones</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#161d15] mt-1">
                ¡Tu grupo está listo! Ahora invita a tus amigos
              </h2>
              <p className="text-xs sm:text-sm text-[#70796d] mt-1">
                Comparte este código con los integrantes para que carguen sus horarios y el sistema empiece a cruzar coincidencias.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#e9f0e4] border-2 border-dashed border-[#7fae7a] text-center space-y-4">
              <span className="text-xs font-semibold text-[#70796d]">CÓDIGO EXCLUSIVO DE INVITACIÓN</span>
              <div className="text-3xl sm:text-4xl font-mono font-bold text-[#2a4f2b] tracking-wider">
                {activeInviteCode}
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-5 py-2.5 rounded-xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedCode ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `¡Hola! Únete a mi grupo en Huecko para coordinar nuestros horarios libres. Usa el código: ${activeInviteCode}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[#c0c9bb]/40">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-[#c0c9bb] text-xs font-semibold text-[#40493e] hover:bg-gray-50 cursor-pointer"
              >
                Atrás
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-3 rounded-2xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold transition-all shadow-md shadow-[#416840]/20 cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>Finalizar Onboarding</span>
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
              </button>
            </div>
          </div>
        )}

        {/* PASO 4: CONFIRMACIÓN Y ACCESO AL DASHBOARD */}
        {step === 4 && (
          <div className="bg-white border border-[#c0c9bb]/70 rounded-3xl p-8 sm:p-10 space-y-6 text-center shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[#416840] text-white flex items-center justify-center mx-auto text-3xl shadow-lg shadow-[#416840]/20">
              ✓
            </div>

            <div>
              <h2 className="text-3xl font-serif font-bold text-[#161d15]">
                ¡Todo listo, {user?.nombre || 'Alejandro'}!
              </h2>
              <p className="text-xs sm:text-sm text-[#70796d] mt-2 max-w-md mx-auto">
                Ya tienes tu perfil configurado y tu primer grupo creado. Ahora puedes ver las coincidencias en tiempo real y proponer planes sin fricción.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              <div className="p-3.5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60">
                <span className="text-[10px] font-bold text-[#416840] uppercase block">Perfil</span>
                <span className="text-xs font-bold text-[#161d15]">
                  {profileType === 'universitario'
                    ? 'Universitario'
                    : profileType === 'trabajador'
                    ? 'Trabajador'
                    : 'Mixto'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60">
                <span className="text-[10px] font-bold text-[#416840] uppercase block">Grupo</span>
                <span className="text-xs font-bold text-[#161d15] truncate block">
                  {groupAction === 'create' ? groupName : 'Unido por código'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#e9f0e4]/80 border border-[#c0c9bb]/60">
                <span className="text-[10px] font-bold text-[#416840] uppercase block">Umbral</span>
                <span className="text-xs font-bold text-[#161d15]">{groupThreshold}% libre</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3.5 rounded-2xl bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-bold transition-all shadow-md shadow-[#416840]/20 cursor-pointer active:scale-95"
              >
                Ir a mi Dashboard Principal
              </button>

              <button
                type="button"
                onClick={() => navigate('/schedule')}
                className="px-8 py-3.5 rounded-2xl bg-[#e9f0e4] hover:bg-[#dbe5d6] text-[#2a4f2b] border border-[#c0c9bb] text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Ver Mi Horario Detallado
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
