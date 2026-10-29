import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import { VerificacionDosPasos } from '../../components/perfil/VerificacionDosPasos';
import { useAuthStore } from '../../store/authStore';

/**
 * La cuenta de administración. No tiene página de perfil (no participa en
 * grupos), pero sí debe poder proteger su acceso: es la cuenta que ve los
 * reportes y puede suspender a otras.
 */
export default function AdminCuentaPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <CabeceraAdmin titulo="Cuenta" bajada="Tu acceso al panel y cómo protegerlo." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] animate-fade-in">
        <dl className="h-fit rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-sm">
          <dt className="text-xs text-on-surface-variant">Nombre</dt>
          <dd className="mb-3 font-semibold text-on-surface">{user?.nombre}</dd>
          <dt className="text-xs text-on-surface-variant">Correo</dt>
          <dd className="mb-3 font-semibold text-on-surface break-all">{user?.email}</dd>
          <dt className="text-xs text-on-surface-variant">Rol</dt>
          <dd className="font-semibold text-on-surface">Administración</dd>
        </dl>
        <VerificacionDosPasos />
      </div>
    </>
  );
}
