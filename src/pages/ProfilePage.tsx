import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAvisoEfimero } from '../hooks/useAvisoEfimero';
import { useAuthStore } from '../store/authStore';
import { useProfileStore, usePreferenciasLocales } from '../store/profileStore';
import Toggle from '../components/Toggle';
import { useGroupsStore } from '../store/groupsStore';
import { isApiEnabled } from '../lib/apiClient';

/** Lo que se edita en «Datos personales»: lo único que guarda el servidor. */
interface DatosCuenta {
  nombre: string;
  email: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const guardarPerfil = useProfileStore((s) => s.guardarPerfil);
  const isSaving = useProfileStore((s) => s.isSaving);
  const syncError = useProfileStore((s) => s.syncError);
  const setPreferencias = useProfileStore((s) => s.setPreferencias);
  const { avatarUrl, alertasRetrasos } = usePreferenciasLocales();
  const activeGroupsCount = useGroupsStore((s) => s.groups.length);

  /* Nombre y correo salen de la sesión: es lo mismo que pintan la barra y el
     saludo, así que tras guardar todo muestra el dato nuevo a la vez. */
  const datos: DatosCuenta = { nombre: user?.nombre ?? '', email: user?.email ?? '' };

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
  const [tempProfile, setTempProfile] = useState<DatosCuenta>(datos);
  const [saveError, setSaveError] = useState('');
  /* El aviso de «guardado» comparte el problema de los demás: dos guardados
     seguidos y el temporizador del primero apagaba el segundo antes de tiempo. */
  const [saveSuccess, marcarGuardado] = useAvisoEfimero<true>(3000);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState('');

  /**
   * Reduce la imagen elegida a un cuadrado de 256 px antes de guardarla.
   *
   * La foto se persiste como data URL en las preferencias locales, que viven en
   * `localStorage` (el servidor no guarda fotos): una foto de cámara sin reescalar (varios MB en base64)
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
      setPreferencias({ avatarUrl: await shrinkToDataUrl(file) });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'No se pudo cargar la imagen.');
    }
  };

  const startEdit = () => {
    setTempProfile(datos);
    setSaveError('');
    setIsEditing(true);
  };

  /* Antes el correo se podía editar pero no se enviaba, y el aviso de éxito
     salía siempre, fallara o no el guardado. Ahora se espera la respuesta: si
     el servidor lo rechaza (p. ej. correo en uso) se muestra su mensaje y el
     formulario sigue abierto con lo escrito. */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    try {
      await guardarPerfil(tempProfile);
      setIsEditing(false);
      marcarGuardado(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar el perfil. Inténtalo de nuevo.');
    }
  };

  const handleCancel = () => {
    setTempProfile(datos);
    setSaveError('');
    setIsEditing(false);
  };

  return (
    <div className="bg-surface text-on-surface min-h-dvh flex flex-col">
      <Navbar currentTab="profile" />

      {/* Main Container */}
      <main id="contenido" tabIndex={-1} className="flex-grow w-full max-w-4xl mx-auto px-6 md:px-10 pt-8 pb-24 md:pb-12">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2 font-headline">Perfil de usuario</h1>
          <p className="text-on-surface-variant text-sm md:text-base">
            Administra los datos de tu cuenta y las preferencias de este dispositivo.
          </p>
        </header>

        {syncError && !isEditing && (
          <div role="status" className="mb-6 p-4 rounded-xl bg-warning-container border border-warning/30 text-on-warning-container text-sm flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">cloud_off</span>
            <span>No se pudieron traer tus datos del servidor: {syncError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-success-container border border-success/40 text-on-success-container text-sm flex items-center gap-2 animate-fade-in">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Perfil actualizado correctamente.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card: Avatar e Información básica */}
          <div className="bg-surface-container-lowest elev-1 rounded-2xl p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`Foto de perfil de ${datos.nombre}`}
                  className="w-24 h-24 rounded-full object-cover shadow-md shadow-secondary/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-olive flex items-center justify-center text-ink font-headline text-3xl shadow-md">
                  {datos.nombre.charAt(0).toUpperCase()}
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
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface transition-all cursor-pointer elev-0"
                aria-label={avatarUrl ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
                title={avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">photo_camera</span>
              </button>
            </div>
            <h2 className="text-xl font-bold text-on-surface">{datos.nombre}</h2>
            <p className="text-xs text-on-surface-variant">{datos.email}</p>

            {/* El servidor no guarda fotos: decirlo evita que alguien crea que su
                grupo la ve o que la encontrará en otro dispositivo. */}
            <p className="mt-2 text-2xs text-on-surface-variant flex items-center gap-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">devices</span>
              La foto se guarda solo en este dispositivo.
            </p>

            {avatarError && <p className="mt-2 text-xs text-error font-medium">{avatarError}</p>}

            {avatarUrl && (
              <button
                type="button"
                onClick={() => {
                  setAvatarError('');
                  setPreferencias({ avatarUrl: undefined });
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
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Formulario y Configuraciones */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sección: Datos de Cuenta */}
            <div className="bg-surface-container-lowest elev-1 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/60">
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-primary">person</span>
                  Datos personales
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
                    <label htmlFor={isEditing ? 'perfil-nombre' : undefined} className="block text-xs font-medium text-on-surface-variant mb-1.5">Nombre completo</label>
                    {isEditing ? (
                      <input
                        id="perfil-nombre"
                        type="text"
                        required
                        maxLength={120}
                        autoComplete="name"
                        value={tempProfile.nombre}
                        onChange={(e) => setTempProfile({ ...tempProfile, nombre: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                      />
                    ) : (
                      <div className="px-3.5 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/60 text-sm text-on-surface">
                        {datos.nombre}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor={isEditing ? 'perfil-email' : undefined} className="block text-xs font-medium text-on-surface-variant mb-1.5">Correo electrónico</label>
                    {isEditing ? (
                      <input
                        id="perfil-email"
                        type="email"
                        required
                        maxLength={180}
                        autoComplete="email"
                        value={tempProfile.email}
                        onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                      />
                    ) : (
                      <div className="px-3.5 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/60 text-sm text-on-surface break-all">
                        {datos.email}
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && saveError && (
                  <div role="alert" className="px-3 py-2 rounded-xl bg-error-container border border-error/30 text-xs text-error flex items-start gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px] shrink-0">cancel</span>
                    <span>{saveError}</span>
                  </div>
                )}

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest text-xs font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Sección: Notificaciones */}
            <div className="bg-surface-container-lowest elev-1 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant/60">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">notifications</span>
                Notificaciones
              </h3>

              {/* Solo silencia esos avisos en la campana. Antes desconectaba todo
                  el tiempo real y los votos y planes dejaban de actualizarse. */}
              <div className="space-y-3">
                <Toggle
                  checked={alertasRetrasos}
                  onChange={(checked) => setPreferencias({ alertasRetrasos: checked })}
                  label="Avisos de retrasos e imprevistos"
                  description={
                    'Muestra en la campana cuando alguien de tu grupo avisa de un retraso, una baja o abre una votación exprés. ' +
                    'Apagado, los planes y las votaciones se siguen actualizando en vivo. Solo en este dispositivo.' +
                    (isApiEnabled ? '' : ' En modo demo no llegan avisos de otras personas.')
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
