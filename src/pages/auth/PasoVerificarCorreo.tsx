import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LARGO_CODIGO_CORREO, limpiarEntradaCodigo, reenviarCodigo, verificarCorreo } from '../../services/authService';
import type { AuthResponse, VerificacionPendiente } from '../../types/auth.types';
import { useReenvio } from './useReenvio';

/**
 * Confirmar el correo tras registrarse (o al entrar con una cuenta que aún no
 * lo hizo): llegó un código de 4 caracteres, como `8JR6`, y la sesión se abre
 * al escribirlo. Así ninguna cuenta queda a nombre de un correo que no es de
 * quien la crea.
 */
export default function PasoVerificarCorreo({
  pendiente,
  onSesion,
  onVolver,
  textoVolver = 'Volver y usar otra cuenta',
}: {
  pendiente: VerificacionPendiente;
  onSesion: (respuesta: AuthResponse) => void;
  onVolver: () => void;
  textoVolver?: string;
}) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [codigoDemo, setCodigoDemo] = useState(pendiente.codigoDemo);
  const { puedeReenviar, reenviar, texto: textoReenvio } = useReenvio(() => reenviarCodigo(pendiente.desafio));
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current?.focus();
  }, []);

  const valido = codigo.length === LARGO_CODIGO_CORREO;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido || enviando) return;
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      onSesion(await verificarCorreo(pendiente.desafio, codigo));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo comprobar el código.');
      setCodigo('');
      campo.current?.focus();
    } finally {
      setEnviando(false);
    }
  };

  const pedirOtro = async () => {
    setError(null);
    setAviso(null);
    try {
      const nuevo = await reenviar();
      if (nuevo) setCodigoDemo(nuevo);
      setCodigo('');
      setAviso('Te enviamos un código nuevo. El anterior ya no vale.');
      campo.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar otro código.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <span
          aria-hidden="true"
          className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-primary"
        >
          <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-on-surface font-headline mb-1.5">Verifica tu correo</h2>
        <p className="text-on-surface-variant text-sm">
          Te enviamos un código de 4 caracteres a{' '}
          <strong className="font-semibold text-on-surface break-all">{pendiente.email}</strong>. Caduca en 10 minutos.
          Si no lo ves, revisa la carpeta de spam.
        </p>
      </div>

      {codigoDemo && (
        <p role="status" className="mb-4 px-3 py-2 rounded-xl border border-dashed border-secondary bg-surface-container-low text-xs text-on-surface-variant">
          Modo demo: no se envían correos. Tu código es{' '}
          <span className="font-mono font-bold tracking-widest text-primary">{codigoDemo}</span>
        </p>
      )}

      <form onSubmit={enviar} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="codigo-verificacion"
            className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
          >
            Código del correo
          </label>
          <input
            ref={campo}
            id="codigo-verificacion"
            value={codigo}
            onChange={(e) => setCodigo(limpiarEntradaCodigo(e.target.value, LARGO_CODIGO_CORREO))}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            spellCheck={false}
            placeholder="XXXX"
            aria-invalid={!!error}
            className="w-full px-4 py-3 rounded-xl text-center font-mono text-2xl uppercase tracking-[0.5em] bg-surface-container-lowest text-on-surface placeholder-outline/60 border border-outline-variant outline-none transition-all duration-200 hover:border-secondary focus:ring-2 focus:ring-secondary/30 focus:border-primary"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="px-3 py-2 rounded-xl bg-error-container border border-error/30 text-2xs text-error flex items-start gap-2"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[15px] shrink-0 text-error">cancel</span>
            <span>{error}</span>
          </div>
        )}
        {aviso && !error && (
          <p role="status" className="text-2xs text-on-surface-variant">{aviso}</p>
        )}

        <button
          type="submit"
          disabled={!valido || enviando}
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-primary hover:bg-primary-hover active:scale-[0.98] text-on-primary shadow-md shadow-primary/25 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {enviando ? (
            <>
              <span aria-hidden="true" className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              <span>Comprobando…</span>
            </>
          ) : (
            <>
              <span>Confirmar y entrar</span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={pedirOtro}
          disabled={!puedeReenviar}
          className="font-semibold text-primary hover:text-primary-hover underline cursor-pointer disabled:no-underline disabled:text-on-surface-variant disabled:cursor-not-allowed"
        >
          {textoReenvio}
        </button>
        <button type="button" onClick={onVolver} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
          {textoVolver}
        </button>
      </div>
    </div>
  );
}
