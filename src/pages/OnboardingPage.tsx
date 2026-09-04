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
  const [profileType, setProfileType] = useState<
    'universitario' | 'trabajador' | 'mixto'
  >('universitario');

  // Estado del Grupo
  const [groupAction, setGroupAction] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('Mis Amigos de Siempre');
  const [groupDescription, setGroupDescription] = useState(
    'Coordinar salidas, reuniones y estudio'
  );
  const [groupThreshold, setGroupThreshold] = useState<number>(100);
  const [invitationCodeInput, setInvitationCodeInput] = useState('');

  // Código de invitación
  const [activeInviteCode, setActiveInviteCode] = useState(() => {
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
    return `HUECKO-${randomSuffix}`;
  });
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeInviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleStep2Submit = async () => {
    const userEmail = user?.email || 'alex.rodriguez@huecko.com';
    const userName = user?.nombre || 'Alex R.';

    if (groupAction === 'create') {
      const newG = await createGroup(
        groupName || 'Mi Nuevo Grupo',
        groupDescription || 'Coordinación de horarios',
        groupThreshold,
        userEmail,
        userName
      );
      setActiveInviteCode(newG.codigoInvitacion);
    } else if (invitationCodeInput.trim()) {
      await joinGroupByCode(invitationCodeInput, userEmail, userName);
      setActiveInviteCode(invitationCodeInput.toUpperCase());
    }
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface pb-28 md:pb-12 pt-6 md:pt-24 px-4 sm:px-6 lg:px-8">
      <Navbar currentTab="dashboard" />

      <main id="contenido" tabIndex={-1} className="max-w-3xl mx-auto space-y-8">
        {/* Barra de Progreso del Asistente */}
        <div className="bg-surface-container-lowest/80 border border-outline-variant/60 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Paso {step} de 4
            </span>
            <span className="text-xs font-semibold text-on-surface-variant">
              {step === 1 && '1. Tu Disponibilidad'}
              {step === 2 && '2. Tu Primer Grupo'}
              {step === 3 && '3. Invitar Amigos'}
              {step === 4 && '4. ¡Comencemos!'}
            </span>
          </div>

          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* PASO 1: CONFIGURAR DISPONIBILIDAD INICIAL */}
        {step === 1 && (
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-modal-in">
            <div>
              <h2 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface mt-1">
                ¿Cuál es tu tipo de rutina habitual?
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                Huecko utilizará este perfil para sugerirte horarios y organizar tus huecos libres de cada semana.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button type="button"
                onClick={() => setProfileType('universitario')}
                aria-pressed={profileType === 'universitario'}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                  profileType === 'universitario'
                    ? 'border-primary bg-surface-container/80 shadow-xs'
                    : 'border-outline-variant/50 hover:border-secondary bg-surface-container-lowest'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary mb-2">school</span>
                <h3 className="text-sm font-bold text-on-surface">Universitario / Estudiante</h3>
                <p className="text-2xs text-on-surface-variant mt-1">
                  Clases por bloques entre semana, laboratorios y fines de semana libres.
                </p>
              </button>

              <button type="button"
                onClick={() => setProfileType('trabajador')}
                aria-pressed={profileType === 'trabajador'}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                  profileType === 'trabajador'
                    ? 'border-primary bg-surface-container/80 shadow-xs'
                    : 'border-outline-variant/50 hover:border-secondary bg-surface-container-lowest'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary mb-2">work</span>
                <h3 className="text-sm font-bold text-on-surface">Trabajador / Oficina</h3>
                <p className="text-2xs text-on-surface-variant mt-1">
                  Lunes a Viernes ocupado en horario laboral. Tardes y fin de semana disponibles.
                </p>
              </button>

              <button type="button"
                onClick={() => setProfileType('mixto')}
                aria-pressed={profileType === 'mixto'}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                  profileType === 'mixto'
                    ? 'border-primary bg-surface-container/80 shadow-xs'
                    : 'border-outline-variant/50 hover:border-secondary bg-surface-container-lowest'
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary mb-2">timelapse</span>
                <h3 className="text-sm font-bold text-on-surface">Horario Rotativo / Mixto</h3>
                <p className="text-2xs text-on-surface-variant mt-1">
                  Turnos variables o freelance con disponibilidad adaptable.
                </p>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container/70 border border-outline-variant/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">document_scanner</span>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">¿Tienes tu horario en PDF o Foto?</h4>
                  <p className="text-2xs text-on-surface-variant">
                    Podrás subirlo vía OCR en cualquier momento desde "Mi Horario".
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-primary bg-surface-container-lowest px-3 py-1 rounded-full border border-outline-variant/40">
                OCR Listo
              </span>
            </div>

            <div className="flex justify-end pt-4 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>Continuar al Paso 2</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: CREAR O UNIRSE A UN GRUPO */}
        {step === 2 && (
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-modal-in">
            <div>
              <h2 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface mt-1">
                Conéctate con tu círculo
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                Crea un espacio para tus amigos o únete con un código que te hayan compartido.
              </p>
            </div>

            {/* Selector de Pestaña */}
            <div className="flex bg-surface-container p-1 rounded-2xl border border-outline-variant/40">
              <button
                type="button"
                onClick={() => setGroupAction('create')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  groupAction === 'create'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Crear Nuevo Grupo
              </button>

              <button
                type="button"
                onClick={() => setGroupAction('join')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  groupAction === 'join'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Unirme por Código
              </button>
            </div>

            {groupAction === 'create' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Nombre del Grupo</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Ej. Grupo de Tesis / Amigos de Fin de Semana"
                    className="w-full p-3 rounded-xl border border-outline-variant text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">Descripción</label>
                  <input
                    type="text"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Ej. Coordinación de planes y salidas"
                    className="w-full p-3 rounded-xl border border-outline-variant text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-surface-container/60 border border-outline-variant/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-on-surface">
                      Umbral Mínimo de Disponibilidad Grupal
                    </label>
                    <span className="text-xs font-bold text-primary bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant/40">
                      {groupThreshold}% libre
                    </span>
                  </div>
                  <p className="text-2xs text-on-surface-variant">
                    Huecko considerará un hueco válido cuando al menos el {groupThreshold}% de los integrantes pueda asistir.
                  </p>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="10"
                    value={groupThreshold}
                    onChange={(e) => setGroupThreshold(parseInt(e.target.value, 10))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1">
                    Código de Invitación (ej. HUECKO-78A9)
                  </label>
                  <input
                    type="text"
                    value={invitationCodeInput}
                    onChange={(e) => setInvitationCodeInput(e.target.value.toUpperCase())}
                    placeholder="HUECKO-XXXX"
                    className="w-full p-3 rounded-xl border border-outline-variant font-mono text-center text-sm font-bold tracking-widest focus:outline-none focus:border-primary"
                  />
                </div>
                <p className="text-xs text-on-surface-variant text-center">
                  Pídele el código al creador del grupo para sincronizar tus huecos de inmediato.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low cursor-pointer"
              >
                Atrás
              </button>

              <button
                type="button"
                onClick={handleStep2Submit}
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>Continuar al Paso 3</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: INVITAR AMIGOS */}
        {step === 3 && (
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-modal-in">
            <div>
              <h2 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface mt-1">
                ¡Tu grupo está listo! Ahora invita a tus amigos
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                Comparte este código con los integrantes para que carguen sus horarios y el sistema empiece a cruzar coincidencias.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-container border-2 border-dashed border-secondary text-center space-y-4">
              <span className="text-xs font-semibold text-on-surface-variant">CÓDIGO EXCLUSIVO DE INVITACIÓN</span>
              <div className="text-3xl sm:text-4xl font-mono font-bold text-primary-hover tracking-wider">
                {activeInviteCode}
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
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
                  className="px-5 py-2.5 rounded-xl bg-whatsapp hover:bg-whatsapp-hover text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">share</span>
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low cursor-pointer"
              >
                Atrás
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <span>Finalizar Onboarding</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
              </button>
            </div>
          </div>
        )}

        {/* PASO 4: CONFIRMACIÓN Y ACCESO AL DASHBOARD */}
        {step === 4 && (
          <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-3xl p-8 sm:p-10 space-y-6 text-center shadow-sm animate-modal-in">
            <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center mx-auto text-3xl shadow-lg shadow-primary/20">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check</span>
            </div>

            <div>
              <h2 className="text-3xl font-headline font-bold text-on-surface">
                ¡Todo listo, {user?.nombre || 'Alejandro'}!
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-2 max-w-md mx-auto">
                Ya tienes tu perfil configurado y tu primer grupo creado. Ahora puedes ver las coincidencias en tiempo real y proponer planes sin fricción.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              <div className="p-3.5 rounded-2xl bg-surface-container/80 border border-outline-variant/60">
                <span className="text-2xs font-bold text-primary uppercase block">Perfil</span>
                <span className="text-xs font-bold text-on-surface">
                  {profileType === 'universitario'
                    ? 'Universitario'
                    : profileType === 'trabajador'
                    ? 'Trabajador'
                    : 'Mixto'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-container/80 border border-outline-variant/60">
                <span className="text-2xs font-bold text-primary uppercase block">Grupo</span>
                <span className="text-xs font-bold text-on-surface truncate block">
                  {groupAction === 'create' ? groupName : 'Unido por código'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-container/80 border border-outline-variant/60">
                <span className="text-2xs font-bold text-primary uppercase block">Umbral</span>
                <span className="text-xs font-bold text-on-surface">{groupThreshold}% libre</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95"
              >
                Ir a mi Dashboard Principal
              </button>

              <button
                type="button"
                onClick={() => navigate('/schedule')}
                className="px-8 py-3.5 rounded-2xl bg-surface-container hover:bg-surface-variant text-primary-hover border border-outline-variant text-xs font-bold transition-all cursor-pointer active:scale-95"
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
