import { useFoto } from '../hooks/useFoto';
import { isApiEnabled } from '../lib/apiClient';
import { normalizarEmail } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { usePreferenciasLocales } from '../store/profileStore';
import type { GroupMember } from '../types/groups.types';

interface AvatarProps {
  nombre: string;
  usuarioId?: string;
  fotoActualizadaEn?: string | null;
  /** Data URL guardada en este navegador (modo demo). Gana a la del servidor. */
  fotoLocal?: string;
  /** Tamaño y tipografía, p. ej. `size-8 text-xs`. */
  className?: string;
  /** Fondo de la inicial; por defecto, oliva. */
  color?: string;
}

/** Foto redonda o, si no hay, la inicial. Decorativo: el nombre siempre va al lado o en la etiqueta del botón. */
export function Avatar({ nombre, usuarioId, fotoActualizadaEn, fotoLocal, className = 'size-8 text-xs', color }: AvatarProps) {
  const remota = useFoto(usuarioId, fotoActualizadaEn);
  const src = fotoLocal ?? remota;

  if (src) {
    return <img src={src} alt="" aria-hidden="true" className={`${className} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      aria-hidden="true"
      style={color ? { backgroundColor: color } : undefined}
      className={`${className} flex shrink-0 items-center justify-center rounded-full font-headline font-bold ${
        color ? 'text-white' : 'bg-olive text-ink'
      }`}
    >
      {nombre.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** Tu propio avatar: la foto del servidor o, en demo, la de este navegador. */
export function MiAvatar({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const { avatarUrl } = usePreferenciasLocales();
  return (
    <Avatar
      nombre={user?.nombre ?? ''}
      usuarioId={user?.id}
      fotoActualizadaEn={user?.fotoActualizadaEn}
      fotoLocal={isApiEnabled ? undefined : avatarUrl}
      className={className}
    />
  );
}

/**
 * El avatar de alguien de un grupo. Si eres tú, la foto sale de tu sesión:
 * la lista del grupo puede traer todavía la de antes de cambiarla.
 */
export function AvatarMiembro({ miembro, className }: { miembro: GroupMember; className?: string }) {
  const yo = useAuthStore((s) => s.user);
  const { avatarUrl } = usePreferenciasLocales();
  const esYo = Boolean(yo) && normalizarEmail(yo?.email ?? '') === normalizarEmail(miembro.email);
  return (
    <Avatar
      nombre={miembro.nombre}
      usuarioId={miembro.userId}
      fotoActualizadaEn={esYo ? yo?.fotoActualizadaEn : miembro.fotoActualizadaEn}
      fotoLocal={esYo && !isApiEnabled ? avatarUrl : undefined}
      color={miembro.color}
      className={className}
    />
  );
}
