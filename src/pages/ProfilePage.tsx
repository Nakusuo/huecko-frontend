import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../store/authStore';
import { useProfileStore, type UserProfileData } from '../store/profileStore';
import Toggle from '../components/Toggle';
import { useGroupsStore } from '../store/groupsStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { profile, updateProfile } = useProfileStore();
  const activeGroupsCount = useGroupsStore((s) => s.groups.length);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const [isEditing, setIsEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfileData>(profile);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const startEdit = () => {
    setTempProfile(profile);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(tempProfile);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCancel = () => {
    setTempProfile(profile);
    setIsEditing(false);
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col pt-6 md:pt-[104px]">
      <Navbar currentTab="profile" />

      {/* Main Container */}
      <main id="contenido" tabIndex={-1} className="flex-grow w-full max-w-4xl mx-auto px-6 md:px-10 pb-24 md:pb-12">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2 font-headline">Perfil de Usuario</h1>
          <p className="text-on-surface-variant text-sm md:text-base">
            Administra tu información personal, privacidad de agendas y preferencias.
          </p>
        </header>

        {saveSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-success-container border border-success/40 text-on-success-container text-sm flex items-center gap-2 animate-fade-in">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Perfil actualizado correctamente.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card: Avatar e Información básica */}
          <div className="bg-surface-container/80 border border-outline-variant rounded-2xl p-6 shadow-sm backdrop-blur-md flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white text-3xl font-black shadow-md shadow-secondary/20">
                {profile.nombre.charAt(0)}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-surface-container-lowest border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface transition-all cursor-pointer shadow-xs"
                title="Cambiar foto"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">photo_camera</span>
              </button>
            </div>
            <h2 className="text-xl font-bold text-on-surface">{profile.nombre}</h2>
            <p className="text-xs text-on-surface-variant mb-4">{profile.email}</p>

            <div className="w-full pt-4 border-t border-outline-variant/60 flex flex-col gap-2 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant">Estado de cuenta:</span>
                <span className="text-success font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success inline-block" /> Activo
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant">Grupos activos:</span>
                <span className="text-on-surface font-medium">{activeGroupsCount} {activeGroupsCount === 1 ? 'grupo' : 'grupos'}</span>
              </div>
            </div>

            <div className="w-full pt-4 mt-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl border border-error/30 bg-error-container hover:bg-error-container text-error hover:text-error text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </div>

          {/* Formulario y Configuraciones */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sección: Datos de Cuenta */}
            <div className="bg-surface-container/80 border border-outline-variant rounded-2xl p-6 shadow-sm backdrop-blur-md">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/60">
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-primary">person</span>
                  Datos Personales
                </h3>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                )}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Nombre Completo</label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={tempProfile.nombre}
                        onChange={(e) => setTempProfile({ ...tempProfile, nombre: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                      />
                    ) : (
                      <div className="px-3.5 py-2.5 bg-surface-container-lowest/70 rounded-xl border border-outline-variant/60 text-sm text-on-surface">
                        {profile.nombre}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Correo Electrónico</label>
                    {isEditing ? (
                      <input
                        type="email"
                        required
                        value={tempProfile.email}
                        onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                      />
                    ) : (
                      <div className="px-3.5 py-2.5 bg-surface-container-lowest/70 rounded-xl border border-outline-variant/60 text-sm text-on-surface">
                        {profile.email}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Zona Horaria</label>
                  {isEditing ? (
                    <select
                      value={tempProfile.timezone}
                      onChange={(e) => setTempProfile({ ...tempProfile, timezone: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                    >
                      <option value="America/Lima (GMT-5)">America/Lima (GMT-5)</option>
                      <option value="America/Mexico_City (GMT-6)">America/Mexico_City (GMT-6)</option>
                      <option value="America/Bogota (GMT-5)">America/Bogota (GMT-5)</option>
                      <option value="America/Santiago (GMT-3)">America/Santiago (GMT-3)</option>
                      <option value="Europe/Madrid (GMT+1)">Europe/Madrid (GMT+1)</option>
                    </select>
                  ) : (
                    <div className="px-3.5 py-2.5 bg-surface-container-lowest/70 rounded-xl border border-outline-variant/60 text-sm text-on-surface">
                      {profile.timezone}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest text-xs font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Sección de privacidad y visibilidad */}
            <div className="bg-surface-container/80 border border-outline-variant rounded-2xl p-6 shadow-sm backdrop-blur-md">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant/60">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">lock</span>
                Privacidad de horarios
              </h3>

              <div className="space-y-4">
                <Toggle
                  checked={profile.compartirDetallesHorario}
                  onChange={(checked) => updateProfile({ compartirDetallesHorario: checked })}
                  label="Compartir detalles de bloques"
                  description="Si está desactivado, tus amigos en el grupo solo verán si estás «Ocupado» o «Libre», pero no los nombres de tus clases o actividades."
                />
              </div>
            </div>

            {/* Sección: Notificaciones */}
            <div className="bg-surface-container/80 border border-outline-variant rounded-2xl p-6 shadow-sm backdrop-blur-md">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant/60">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">notifications</span>
                Notificaciones y Alertas
              </h3>

              <div className="space-y-3">
                <Toggle
                  checked={profile.notificacionesWebSockets}
                  onChange={(checked) => updateProfile({ notificacionesWebSockets: checked })}
                  label="Alertas de retrasos e imprevistos"
                  description="Recibe notificaciones inmediatas cuando alguien de tu grupo avisa de un cambio."
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
