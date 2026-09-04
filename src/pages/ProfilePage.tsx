import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../store/authStore';
import { useProfileStore, type UserProfileData } from '../store/profileStore';
import Toggle from '../components/Toggle';
import { useGroupsStore } from '../store/groupsStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { profile, updateProfile, fetchProfile } = useProfileStore();
  const activeGroupsCount = useGroupsStore((s) => s.groups.length);

  /* Trae el perfil del backend al abrir la página. En modo demo `fetchProfile`
     no hace nada, así que el efecto es inofensivo sin servidor. */
  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const [isEditing, setIsEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfileData>(profile);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState('');

  /**
   * Reduce la imagen elegida a un cuadrado de 256 px antes de guardarla.
   *
   * La foto se persiste como data URL dentro del perfil, y el perfil vive en
   * `localStorage`: una foto de cámara sin reescalar (varios MB en base64)
   * revienta la cuota del navegador. Recortar al centro además evita que las
   * fotos verticales salgan deformadas en el círculo del avatar.
   */
  const shrinkToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const LADO = 256;
        const canvas = document.createElement('canvas');
        canvas.width = LADO;
        canvas.height = LADO;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('El navegador no pudo procesar la imagen.'));
          return;
        }

        const recorte = Math.min(image.width, image.height);
        context.drawImage(
          image,
          (image.width - recorte) / 2,
          (image.height - recorte) / 2,
          recorte,
          recorte,
          0,
          0,
          LADO,
          LADO
        );
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('No se pudo leer la imagen.'));
      };

      image.src = objectUrl;
    });

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Permite volver a elegir el mismo archivo si algo falló.
    event.target.value = '';
    if (!file) return;

    setAvatarError('');

    if (!file.type.startsWith('image/')) {
      setAvatarError('Elige un archivo de imagen.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarError('La imagen no puede pesar más de 8 MB.');
      return;
    }

    try {
      const avatarUrl = await shrinkToDataUrl(file);
      await updateProfile({ avatarUrl });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'No se pudo cargar la imagen.');
    }
  };

  const startEdit = () => {
    setTempProfile(profile);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(tempProfile);
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
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`Foto de perfil de ${profile.nombre}`}
                  className="w-24 h-24 rounded-full object-cover shadow-md shadow-secondary/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white text-3xl font-black shadow-md shadow-secondary/20">
                  {profile.nombre.charAt(0)}
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-surface-container-lowest border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface transition-all cursor-pointer shadow-xs"
                aria-label={profile.avatarUrl ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
                title={profile.avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">photo_camera</span>
              </button>
            </div>
            <h2 className="text-xl font-bold text-on-surface">{profile.nombre}</h2>
            <p className="text-xs text-on-surface-variant">{profile.email}</p>

            {avatarError && <p className="mt-2 text-xs text-error font-medium">{avatarError}</p>}

            {profile.avatarUrl && (
              <button
                type="button"
                onClick={() => {
                  setAvatarError('');
                  void updateProfile({ avatarUrl: undefined });
                }}
                className="mt-2 text-2xs text-on-surface-variant hover:text-error underline cursor-pointer"
              >
                Quitar foto
              </button>
            )}

            <div className="mb-4" />

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
