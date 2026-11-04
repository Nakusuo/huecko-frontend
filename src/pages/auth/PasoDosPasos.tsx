import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LARGO_CODIGO_CORREO, limpiarEntradaCodigo, reenviarCodigo, verificarDosPasos } from '../../services/authService';
import type { AuthResponse, MetodoDosPasos } from '../../types/auth.types';
import { useReenvio } from './useReenvio';

/**
 * Segundo paso del login: la contraseña ya fue correcta y falta el código.
 * Según cómo lo configuró la cuenta, es el de 6 dígitos de la app de
 * autenticación o el de 4 caracteres que acaba de llegar al correo. En los
 * dos casos vale también uno de los de respaldo.
 */
export default function PasoDosPasos({
  desafio,
  metodo = 'APP',
  correo,
  onSesion,
  onVolver,
}: {
  desafio: string;
  metodo?: MetodoDosPasos;
  /** Correo enmascarado (`al***@gmail.com`), solo con `CORREO`. */
  correo?: string;
  onSesion: (respuesta: AuthResponse) => void;
  onVolver: () => void;
}) {
  const porCorreo = metodo === 'CORREO';
  const [codigo, setCodigo] = useState('');
  const [respaldo, setRespaldo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { puedeReenviar, reenviar, texto: textoReenvio } = useReenvio(() => reenviarCodigo(desafio));
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campo.current?.focus();
  }, [respaldo]);

  const valido = respaldo
    ? codigo.replace(/[\s-]/g, '').length === 8
    : porCorreo
      ? codigo.length === LARGO_CODIGO_CORREO
      : /^\d{6}$/.test(codigo);

  const pedirOtro = async () => {
    setError(null);
    setAviso(null);
    try {
      await reenviar();
      setCodigo('');
      setAviso('Te enviamos un código nuevo. El anterior ya no vale.');
      campo.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar otro código.');
    }
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido || enviando) return;
    setError(null);
    setEnviando(true);
    try {
      onSesion(await verificarDosPasos(desafio, codigo));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo comprobar el código.');
      setCodigo('');
      campo.current?.focus();
    } finally {
      setEnviando(false);
    }
  };

  const cambiarModo = () => {
    setRespaldo((r) => !r);
    setCodigo('');
    setError(null);
    setAviso(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <span
          aria-hidden="true"
          className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-primary"
        >
          <span className="material-symbols-outlined text-[24px]">{porCorreo ? 'mail_lock' : 'phonelink_lock'}</span>
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-on-surface font-headline mb-1.5">Verificación en dos pasos</h2>
        <p className="text-on-surface-variant text-sm">
          {respaldo ? (
            'Escribe uno de tus códigos de respaldo. Cada uno sirve una sola vez.'
          ) : porCorreo ? (
            <>
              Te enviamos un código de 4 caracteres a{' '}
              <strong className="font-semibold text-on-surface break-all">{correo ?? 'tu correo'}</strong>. Caduca en
              10 minutos.
            </>
          ) : (
            'Abre tu app de autenticación y escribe el código de 6 dígitos de Huecko.'
          )}
        </p>
      </div>

      <form onSubmit={enviar} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="codigo-dos-pasos"
            className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
          >
            {respaldo ? 'Código de respaldo' : porCorreo ? 'Código del correo' : 'Código de la app'}
          </label>
          <input
            ref={campo}
            id="codigo-dos-pasos"
            value={codigo}
            onChange={(e) =>
              setCodigo(
                respaldo
                  ? e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9)
                  : porCorreo
                    ? limpiarEntradaCodigo(e.target.value, LARGO_CODIGO_CORREO)
                    : e.target.value.replace(/\D/g, '').slice(0, 6)
              )
            }
            inputMode={respaldo || porCorreo ? 'text' : 'numeric'}
            autoCapitalize={respaldo || porCorreo ? 'characters' : undefined}
            spellCheck={false}
            autoComplete="one-time-code"
            placeholder={respaldo ? 'XXXX-XXXX' : porCorreo ? 'XXXX' : '000000'}
            aria-invalid={!!error}
            className="w-full px-4 py-3 rounded-xl text-center font-mono text-2xl tracking-[0.4em] bg-surface-container-lowest text-on-surface placeholder-outline/60 border border-outline-variant outline-none transition-all duration-200 hover:border-secondary focus:ring-2 focus:ring-secondary/30 focus:border-primary"
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
        {aviso && !error && <p role="status" className="text-2xs text-on-surface-variant">{aviso}</p>}

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
              <span>Entrar</span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        {porCorreo && !respaldo && (
          <button
            type="button"
            onClick={pedirOtro}
            disabled={!puedeReenviar}
            className="font-semibold text-primary hover:text-primary-hover underline cursor-pointer disabled:no-underline disabled:text-on-surface-variant disabled:cursor-not-allowed"
          >
            {textoReenvio}
          </button>
        )}
        <button
          type="button"
          onClick={cambiarModo}
          className="font-semibold text-primary hover:text-primary-hover underline cursor-pointer"
        >
          {respaldo
            ? porCorreo
              ? 'Usar el código del correo'
              : 'Usar el código de la app'
            : porCorreo
              ? '¿No te llega el correo? Usa un código de respaldo'
              : '¿No tienes el móvil? Usa un código de respaldo'}
        </button>
        <button
          type="button"
          onClick={onVolver}
          className="text-on-surface-variant hover:text-on-surface cursor-pointer"
        >
          Volver y usar otra cuenta
        </button>
      </div>
    </div>
  );
}
