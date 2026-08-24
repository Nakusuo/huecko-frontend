import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserProfileData {
  nombre: string;
  email: string;
  avatarUrl?: string;
  timezone: string;
  compartirDetallesHorario: boolean;
  notificacionesEmail: boolean;
  notificacionesWebSockets: boolean;
}

export default function ProfilePage() {
  const navigate = useNavigate();

  // Initial state aligned with user data structure (RNF-02, Postgres usuarios)
  const [profile, setProfile] = useState<UserProfileData>({
    nombre: 'Alex Rodríguez',
    email: 'alex.rodriguez@huecko.com',
    timezone: 'America/Lima (GMT-5)',
    compartirDetallesHorario: false, // Default false according to RNF-02 (Privacy: only show free/busy unless opted in)
    notificacionesEmail: true,
    notificacionesWebSockets: true,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfileData>(profile);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(tempProfile);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCancel = () => {
    setTempProfile(profile);
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col pt-[88px] md:pt-[104px]">
      {/* TopNavBar (Web) */}
      <nav className="hidden md:flex bg-slate-900/80 backdrop-blur-md fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl rounded-full border border-slate-800 shadow-xl shadow-violet-950/20 justify-between items-center px-8 py-3 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/schedule')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg">
            H
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Huecko</span>
        </div>
        <div className="flex gap-8 items-center">
          <button onClick={() => navigate('/schedule')} className="text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer">
            Mi Horario
          </button>
          <a className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="#">
            Mis Grupos
          </a>
          <a className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="#">
            Descubrir
          </a>
        </div>
        <button className="text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 rounded-full shadow-md shadow-violet-600/20 cursor-pointer">
          Mi Perfil
        </button>
      </nav>

      {/* Main Container */}
      <main className="flex-grow w-full max-w-4xl mx-auto px-6 md:px-10 pb-24 md:pb-12">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Perfil de Usuario</h1>
          <p className="text-slate-400 text-sm md:text-base">
            Administra tu información personal, privacidad de agendas y preferencias.
          </p>
        </header>

        {saveSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Perfil actualizado correctamente.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card: Avatar e Información básica */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-violet-500/25">
                {profile.nombre.charAt(0)}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
                title="Cambiar foto"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              </button>
            </div>
            <h2 className="text-xl font-bold text-white">{profile.nombre}</h2>
            <p className="text-xs text-slate-400 mb-4">{profile.email}</p>

            <div className="w-full pt-4 border-t border-slate-800/80 flex flex-col gap-2 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Estado de cuenta:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Activo
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Grupos activos:</span>
                <span className="text-slate-200 font-medium">3 grupos</span>
              </div>
            </div>
          </div>

          {/* Formulario y Configuraciones */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sección: Datos de Cuenta */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-violet-400">person</span>
                  Datos Personales
                </h3>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempProfile(profile);
                      setIsEditing(true);
                    }}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                )}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre Completo</label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={tempProfile.nombre}
                        onChange={(e) => setTempProfile({ ...tempProfile, nombre: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white text-sm focus:outline-none focus:border-violet-500"
                      />
                    ) : (
                      <div className="px-3.5 py-2.5 bg-slate-950/50 rounded-xl border border-slate-800/60 text-sm text-slate-200">
                        {profile.nombre}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo Electrónico</label>
                    {isEditing ? (
                      <input
                        type="email"
                        required
                        value={tempProfile.email}
                        onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white text-sm focus:outline-none focus:border-violet-500"
                      />
                    ) : (
                      <div className="px-3.5 py-2.5 bg-slate-950/50 rounded-xl border border-slate-800/60 text-sm text-slate-200">
                        {profile.email}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Zona Horaria</label>
                  {isEditing ? (
                    <select
                      value={tempProfile.timezone}
                      onChange={(e) => setTempProfile({ ...tempProfile, timezone: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="America/Lima (GMT-5)">America/Lima (GMT-5)</option>
                      <option value="America/Mexico_City (GMT-6)">America/Mexico_City (GMT-6)</option>
                      <option value="America/Bogota (GMT-5)">America/Bogota (GMT-5)</option>
                      <option value="America/Santiago (GMT-3)">America/Santiago (GMT-3)</option>
                      <option value="Europe/Madrid (GMT+1)">Europe/Madrid (GMT+1)</option>
                    </select>
                  ) : (
                    <div className="px-3.5 py-2.5 bg-slate-950/50 rounded-xl border border-slate-800/60 text-sm text-slate-200">
                      {profile.timezone}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold shadow-md shadow-violet-500/20 cursor-pointer"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Sección: Privacidad y Visibilidad (RNF-02) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                <span className="material-symbols-outlined text-violet-400">lock</span>
                Privacidad de Horarios (RNF-02)
              </h3>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-200">Compartir detalles de bloques</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Si está desactivado, tus amigos en el grupo solo verán si estás "Ocupado" o "Libre", pero no los nombres de tus clases o actividades.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={profile.compartirDetallesHorario}
                      onChange={(e) => {
                        const updated = { ...profile, compartirDetallesHorario: e.target.checked };
                        setProfile(updated);
                        setTempProfile(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Sección: Notificaciones */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                <span className="material-symbols-outlined text-violet-400">notifications</span>
                Notificaciones y Alertas
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Alertas de retrasos e imprevistos (Tiempo real)</p>
                    <p className="text-xs text-slate-400">Recibir notificaciones inmediatas de tu grupo.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.notificacionesWebSockets}
                      onChange={(e) => setProfile({ ...profile, notificacionesWebSockets: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-slate-900 border-t border-slate-800">
        <button onClick={() => navigate('/schedule')} className="flex flex-col items-center justify-center text-slate-400 hover:text-white px-4 py-1.5 transition-colors cursor-pointer">
          <span className="material-symbols-outlined">calendar_month</span>
          <span className="text-[11px] font-medium">Horarios</span>
        </button>
        <button className="flex flex-col items-center justify-center text-violet-400 px-4 py-1.5 cursor-pointer">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[11px] font-bold">Perfil</span>
        </button>
      </nav>
    </div>
  );
}
