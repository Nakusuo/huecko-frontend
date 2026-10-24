import { useEffect, useState } from 'react';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { enlaceDeInvitacion } from '../lib/invitacion';

/**
 * El código del grupo como QR, para enseñarlo en pantalla (una clase, una
 * presentación) y que la gente entre escaneándolo con el celular.
 */
export function QrInvitacion({ codigo, nombreGrupo, onCerrar }: { codigo: string; nombreGrupo: string; onCerrar: () => void }) {
  const [imagen, setImagen] = useState<{ codigo: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enlace = enlaceDeInvitacion(codigo, window.location.origin);

  useModalDismiss(true, onCerrar);

  useEffect(() => {
    let vigente = true;
    // La librería se carga al abrir el QR, no con el resto de la app.
    // Tinta sobre papel, como el resto de Huecko, y margen para que se lea bien.
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(enlace, { width: 512, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1f1f1d', light: '#f5f3ec' } })
      )
      .then(
      (url) => vigente && setImagen({ codigo, url }),
      () => vigente && setError('No se pudo generar el QR. Comparte el código escrito.')
    );
    return () => {
      vigente = false;
    };
  }, [enlace, codigo]);

  const lista = imagen?.codigo === codigo ? imagen.url : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-titulo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim/60 p-4 animate-scrim-in"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-surface p-6 text-center elev-3 animate-modal-in">
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onCerrar}
          className="absolute right-4 top-4 cursor-pointer text-on-surface-variant hover:text-on-surface"
        >
          <span aria-hidden="true" className="material-symbols-outlined">close</span>
        </button>
        <h2 id="qr-titulo" className="font-headline text-xl font-bold text-on-surface">Únete a «{nombreGrupo}»</h2>
        <p className="mt-1 text-xs text-on-surface-variant">Escanéalo con la cámara del celular.</p>

        <div className="mx-auto mt-4 aspect-square w-full max-w-[18rem] rounded-xl bg-cream p-2">
          {lista ? (
            <img src={lista} alt={`Código QR para unirse a ${nombreGrupo} con el código ${codigo}`} className="h-full w-full" />
          ) : (
            <p className="flex h-full items-center justify-center text-xs text-on-surface-variant" aria-live="polite">
              {error ?? 'Generando…'}
            </p>
          )}
        </div>

        <p className="mt-4 font-mono text-2xl font-bold tracking-[0.2em] text-on-surface">{codigo}</p>
        <p className="mt-1 break-all text-2xs text-on-surface-variant">{enlace}</p>

        {lista && (
          <a
            href={lista}
            download={`huecko-${codigo}.png`}
            className="mt-4 inline-flex items-center gap-1 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-on-secondary hover:bg-secondary-hover"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">download</span>
            Descargar imagen
          </a>
        )}
        <p className="mt-3 text-2xs text-on-surface-variant">
          Quien lo escanee entra con tu código; si se filtra, genera otro y este QR deja de servir.
        </p>
      </div>
    </div>
  );
}
