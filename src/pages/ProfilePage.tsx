import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { useProfileStore, type UserProfileData } from '../store/profileStore';

export default function ProfilePage() {
  const { profile, updateProfile } = useProfileStore();

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
    <div className="bg-[#f4fbf1] text-[#161d15] min-h-screen flex flex-col pt-[88px] md:pt-[104px]">
      <Navbar currentTab="profile" />

      {/* Main Container */}
      <main className="flex-grow w-full max-w-4xl mx-auto px-6 md:px-10 pb-24 md:pb-12">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#161d15] mb-2 font-headline">Perfil de Usuario</h1>
          <p className="text-[#40493e] text-sm md:text-base">
            Administra tu información personal, privacidad de agendas y preferencias.
          </p>
        </header>

        {saveSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-sm flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Perfil actualizado correctamente.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card: Avatar e Información básica */}
          <div className="bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 shadow-sm backdrop-blur-md flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7fae7a] to-[#416840] flex items-center justify-center text-white text-3xl font-black shadow-md shadow-[#7fae7a]/20">
                {profile.nombre.charAt(0)}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-[#c0c9bb] flex items-center justify-center text-[#40493e] hover:text-[#161d15] hover:bg-[#f4fbf1] transition-all cursor-pointer shadow-xs"
                title="Cambiar foto"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              </button>
            </div>
            <h2 className="text-xl font-bold text-[#161d15]">{profile.nombre}</h2>
            <p className="text-xs text-[#70796d] mb-4">{profile.email}</p>

            <div className="w-full pt-4 border-t border-[#c0c9bb]/60 flex flex-col gap-2 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#40493e]">Estado de cuenta:</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Activo
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#40493e]">Grupos activos:</span>
                <span className="text-[#161d15] font-medium">3 grupos</span>
              </div>
            </div>
          </div>

          {/* Formulario y Configuraciones */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sección: Datos de Cuenta */}
            <div className="bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 shadow-sm backdrop-blur-md">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#c0c9bb]/60">
                <h3 className="text-lg font-bold text-[#161d15] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#416840]">person</span>
                  Datos Personales
                </h3>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="text-xs font-bold text-[#416840] hover:text-[#2a4f2b] flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                )}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#40493e] mb-1.5">Nombre Completo</label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={tempProfile.nombre}
                        onChange={(e) => setTempProfile({ ...tempProfile, nombre: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#7fae7a]"
                      />
                    ) : (
                      <div className="px-3.5 py-2.5 bg-white/70 rounded-xl border border-[#c0c9bb]/60 text-sm text-[#161d15]">
                        {profile.nombre}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#40493e] mb-1.5">Correo Electrónico</label>
                    {isEditing ? (
                      <input
                        type="email"
                        required
                        value={tempProfile.email}
                        onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#7fae7a]"
                      />
                    ) : (
                      <div className="px-3.5 py-2.5 bg-white/70 rounded-xl border border-[#c0c9bb]/60 text-sm text-[#161d15]">
                        {profile.email}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#40493e] mb-1.5">Zona Horaria</label>
                  {isEditing ? (
                    <select
                      value={tempProfile.timezone}
                      onChange={(e) => setTempProfile({ ...tempProfile, timezone: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-[#c0c9bb] rounded-xl bg-white text-[#161d15] text-sm focus:outline-none focus:border-[#7fae7a]"
                    >
                      <option value="America/Lima (GMT-5)">America/Lima (GMT-5)</option>
                      <option value="America/Mexico_City (GMT-6)">America/Mexico_City (GMT-6)</option>
                      <option value="America/Bogota (GMT-5)">America/Bogota (GMT-5)</option>
                      <option value="America/Santiago (GMT-3)">America/Santiago (GMT-3)</option>
                      <option value="Europe/Madrid (GMT+1)">Europe/Madrid (GMT+1)</option>
                    </select>
                  ) : (
                    <div className="px-3.5 py-2.5 bg-white/70 rounded-xl border border-[#c0c9bb]/60 text-sm text-[#161d15]">
                      {profile.timezone}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 rounded-xl border border-[#c0c9bb] text-[#40493e] hover:bg-white text-xs font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#7fae7a] hover:bg-[#6f9e6a] text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Sección: Privacidad y Visibilidad (RNF-02) */}
            <div className="bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 shadow-sm backdrop-blur-md">
              <h3 className="text-lg font-bold text-[#161d15] flex items-center gap-2 mb-4 pb-3 border-b border-[#c0c9bb]/60">
                <span className="material-symbols-outlined text-[#416840]">lock</span>
                Privacidad de Horarios (RNF-02)
              </h3>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-white/70 border border-[#c0c9bb]/60">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#161d15]">Compartir detalles de bloques</p>
                    <p className="text-xs text-[#70796d] leading-relaxed">
                      Si está desactivado, tus amigos en el grupo solo verán si estás "Ocupado" o "Libre", pero no los nombres de tus clases o actividades.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={profile.compartirDetallesHorario}
                      onChange={(e) => {
                        updateProfile({ compartirDetallesHorario: e.target.checked });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#c0c9bb] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7fae7a]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Sección: Notificaciones */}
            <div className="bg-[#e9f0e4]/80 border border-[#d5e3cf] rounded-2xl p-6 shadow-sm backdrop-blur-md">
              <h3 className="text-lg font-bold text-[#161d15] flex items-center gap-2 mb-4 pb-3 border-b border-[#c0c9bb]/60">
                <span className="material-symbols-outlined text-[#416840]">notifications</span>
                Notificaciones y Alertas
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/70 border border-[#c0c9bb]/60">
                  <div>
                    <p className="text-sm font-semibold text-[#161d15]">Alertas de retrasos e imprevistos (Tiempo real)</p>
                    <p className="text-xs text-[#70796d]">Recibir notificaciones inmediatas de tu grupo.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.notificacionesWebSockets}
                      onChange={(e) => updateProfile({ notificacionesWebSockets: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#c0c9bb] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7fae7a]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
