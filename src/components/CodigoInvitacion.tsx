import { useState } from 'react';
import { QrInvitacion } from './QrInvitacion';
import { useGroupsStore } from '../store/groupsStore';
import type { Group } from '../types/groups.types';

/**
 * El código de invitación del grupo, solo para quien organiza (el servidor no
 * se lo manda a nadie más).
 *
 * Con el código la entrada ya no se decide persona a persona, así que aquí
 * se puede cambiar si se filtra y desactivar cuando el grupo está completo.
 */
export function CodigoInvitacion({ grupo }: { grupo: Group }) {
  const changeInviteCode = useGroupsStore((s) => s.changeInviteCode);
  const [cambiando, setCambiando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verQr, setVerQr] = useState(false);
  const codigo = grupo.codigoInvitacion ?? null;

  const cambiar = async (activar: boolean) => {
    if (cambiando) return;
    setCambiando(true);
    setError(null);
    try {
      await changeInviteCode(grupo.id, activar);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo cambiar el código.');
    } finally {
      setCambiando(false);
    }
  };

  const copiar = async () => {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar: selecciónalo y cópialo a mano.');
    }
  };

  return (
    <section aria-label="Código de invitación" className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-primary">vpn_key</span>
        <h3 className="text-sm font-bold text-on-surface">Código de invitación</h3>
      </div>

      {codigo ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="select-all font-mono text-2xl font-bold tracking-[0.2em] text-on-surface">{codigo}</span>
            <button
              type="button"
              onClick={() => void copiar()}
              className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer flex items-center gap-1"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">{copiado ? 'check' : 'content_copy'}</span>
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <button
              type="button"
              onClick={() => setVerQr(true)}
              className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer flex items-center gap-1"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">qr_code_2</span>
              Mostrar QR
            </button>
          </div>
          <p className="text-2xs text-on-surface-variant">
            Quien lo tenga entra al grupo con «Unirme con código» y todos reciben un aviso. Solo tú lo ves: compártelo
            con quien quieras sumar. Si se filtra, genera otro.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={cambiando} onClick={() => void cambiar(true)} className="text-2xs font-bold text-primary hover:text-primary-hover cursor-pointer disabled:opacity-50">
              Generar otro
            </button>
            <button type="button" disabled={cambiando} onClick={() => void cambiar(false)} className="text-2xs font-bold text-error cursor-pointer disabled:opacity-50">
              Desactivar
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-2xs text-on-surface-variant">Desactivado: solo se entra si añades a alguien por su correo.</p>
          <button type="button" disabled={cambiando} onClick={() => void cambiar(true)} className="text-2xs font-bold text-primary hover:text-primary-hover cursor-pointer disabled:opacity-50">
            Activar código
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-2xs text-error">
          {error}
        </p>
      )}
      {verQr && codigo && <QrInvitacion codigo={codigo} nombreGrupo={grupo.nombre} onCerrar={() => setVerQr(false)} />}
    </section>
  );
}
