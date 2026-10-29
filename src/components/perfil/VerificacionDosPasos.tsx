import { useEffect, useState, type FormEvent } from 'react';
import { isApiEnabled } from '../../lib/apiClient';
import { esAdmin } from '../../lib/rol';
import {
  activarDosPasos,
  desactivarDosPasos,
  estadoDosPasos,
  iniciarDosPasos,
  regenerarCodigosRespaldo,
} from '../../services/dosPasosService';
import { useAuthStore } from '../../store/authStore';
import type { ConfiguracionDosPasos, EstadoDosPasos } from '../../types/auth.types';

type Paso = 'resumen' | 'configurar' | 'codigos' | 'regenerar' | 'desactivar';

const formatoFecha = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Seguridad de la cuenta: verificación en dos pasos con una app de códigos
 * (Google Authenticator, Microsoft Authenticator, Authy…).
 *
 * Activar: se escanea el QR, se escribe el primer código y se guardan los
 * códigos de respaldo, que solo se muestran esa vez.
 */
export function VerificacionDosPasos() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [estado, setEstado] = useState<EstadoDosPasos | null>(null);
  const [paso, setPaso] = useState<Paso>('resumen');
  const [config, setConfig] = useState<ConfiguracionDosPasos | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [codigos, setCodigos] = useState<string[]>([]);
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isApiEnabled) return;
    let vigente = true;
    estadoDosPasos().then(
      (e) => vigente && setEstado(e),
      (err: unknown) => vigente && setError(err instanceof Error ? err.message : 'No se pudo cargar.')
    );
    return () => {
      vigente = false;
    };
  }, []);

  // El QR se dibuja aquí, sin mandar el secreto a ningún servicio externo.
  useEffect(() => {
    if (!config) return;
    let vigente = true;
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(config.uri, { width: 360, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1f1f1d', light: '#f5f3ec' } })
      )
      .then(
        (url) => vigente && setQr(url),
        () => vigente && setError('No se pudo dibujar el QR. Escribe la clave a mano en la app.')
      );
    return () => {
      vigente = false;
    };
  }, [config]);

  const reiniciarFormulario = () => {
    setCodigo('');
    setPassword('');
    setError(null);
  };

  /** Envuelve una llamada: muestra el error del servidor y bloquea los botones mientras tanto. */
  const conCarga = async (accion: () => Promise<void>) => {
    setError(null);
    setOcupado(true);
    try {
      await accion();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  const empezar = () =>
    conCarga(async () => {
      reiniciarFormulario();
      setQr(null);
      setConfig(await iniciarDosPasos());
      setPaso('configurar');
    });

  const activar = (e: FormEvent) => {
    e.preventDefault();
    return conCarga(async () => {
      setCodigos(await activarDosPasos(codigo));
      setEstado(await estadoDosPasos());
      if (user) setUser({ ...user, dosPasosActivo: true });
      setConfig(null);
      reiniciarFormulario();
      setPaso('codigos');
    });
  };

  const regenerar = (e: FormEvent) => {
    e.preventDefault();
    return conCarga(async () => {
      setCodigos(await regenerarCodigosRespaldo(codigo));
      setEstado(await estadoDosPasos());
      reiniciarFormulario();
      setPaso('codigos');
    });
  };

  const desactivar = (e: FormEvent) => {
    e.preventDefault();
    return conCarga(async () => {
      await desactivarDosPasos(password, codigo);
      setEstado(await estadoDosPasos());
      if (user) setUser({ ...user, dosPasosActivo: false });
      reiniciarFormulario();
      setPaso('resumen');
    });
  };

  const copiarCodigos = async () => {
    try {
      await navigator.clipboard.writeText(codigos.join('\n'));
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar: selecciónalos y cópialos a mano.');
    }
  };

  const descargarCodigos = () => {
    const texto =
      `Códigos de respaldo de Huecko (${user?.email ?? ''})\n` +
      'Cada uno sirve una sola vez para entrar sin la app de códigos.\n\n' +
      codigos.join('\n') +
      '\n';
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
    enlace.download = 'huecko-codigos-de-respaldo.txt';
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  };

  const campoCodigo = (id: string, etiqueta: string, admiteRespaldo = false) => (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-on-surface-variant">
        {etiqueta}
      </label>
      <input
        id={id}
        value={codigo}
        onChange={(e) =>
          setCodigo(
            admiteRespaldo
              ? e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9)
              : e.target.value.replace(/\D/g, '').slice(0, 6)
          )
        }
        inputMode={admiteRespaldo ? 'text' : 'numeric'}
        autoComplete="one-time-code"
        placeholder={admiteRespaldo ? '000000 o XXXX-XXXX' : '000000'}
        className="w-full px-3 py-2.5 rounded-xl font-mono text-lg tracking-[0.25em] bg-surface-container-lowest text-on-surface border border-outline-variant outline-none focus:ring-2 focus:ring-secondary/30 focus:border-primary"
      />
    </div>
  );

  const botonPrincipal = (texto: string, deshabilitado: boolean) => (
    <button
      type="submit"
      disabled={deshabilitado || ocupado}
      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {ocupado ? 'Un momento…' : texto}
    </button>
  );

  const botonCancelar = (
    <button
      type="button"
      onClick={() => {
        reiniciarFormulario();
        setConfig(null);
        setPaso('resumen');
      }}
      className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
    >
      Cancelar
    </button>
  );

  return (
    <div className="bg-surface-container-lowest elev-1 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant/60">
        <span aria-hidden="true" className="material-symbols-outlined text-primary">shield_lock</span>
        Seguridad
      </h3>

      {!isApiEnabled && (
        <p className="text-xs text-on-surface-variant">
          La verificación en dos pasos necesita el servidor: en el modo demo no hay nadie que compruebe los códigos.
        </p>
      )}

      {isApiEnabled && !estado && !error && (
        <p className="text-xs text-on-surface-variant" aria-live="polite">Cargando…</p>
      )}

      {isApiEnabled && estado && paso === 'resumen' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`material-symbols-outlined text-[26px] ${estado.activo ? 'text-primary' : 'text-on-surface-variant'}`}
            >
              {estado.activo ? 'verified_user' : 'gpp_maybe'}
            </span>
            <div>
              <p className="text-sm font-semibold text-on-surface">
                Verificación en dos pasos {estado.activo ? 'activada' : 'desactivada'}
              </p>
              <p className="text-xs text-on-surface-variant">
                {estado.activo
                  ? `Desde el ${estado.activadoEn ? formatoFecha.format(new Date(estado.activadoEn)) : '—'}. ` +
                    `Te quedan ${estado.codigosRespaldoRestantes} códigos de respaldo.`
                  : 'Además de la contraseña, al entrar se pedirá un código de 6 dígitos de una app como Google Authenticator. Si alguien descubre tu contraseña, no podrá entrar.'}
              </p>
              {!estado.activo && user && esAdmin(user) && (
                <p className="mt-1 text-xs font-semibold text-warning">Recomendado para cuentas de administración.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {estado.activo ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    reiniciarFormulario();
                    setPaso('regenerar');
                  }}
                  className="px-3 py-2 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Nuevos códigos de respaldo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reiniciarFormulario();
                    setPaso('desactivar');
                  }}
                  className="px-3 py-2 rounded-xl border border-error/40 text-xs font-semibold text-error hover:bg-error-container/50 cursor-pointer"
                >
                  Desactivar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={empezar}
                disabled={ocupado}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
              >
                {ocupado ? 'Preparando…' : 'Activar verificación en dos pasos'}
              </button>
            )}
          </div>
        </div>
      )}

      {paso === 'configurar' && config && (
        <form onSubmit={activar} className="space-y-4">
          <ol className="list-decimal pl-5 space-y-1 text-xs text-on-surface-variant">
            <li>Instala una app de códigos: Google Authenticator, Microsoft Authenticator o Authy.</li>
            <li>En la app, añade una cuenta y escanea este código QR.</li>
            <li>Escribe el código de 6 dígitos que te muestra.</li>
          </ol>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-44 w-44 shrink-0 rounded-2xl border border-outline-variant bg-surface p-2 flex items-center justify-center">
              {qr ? (
                <img src={qr} alt="Código QR para tu app de autenticación" className="h-full w-full" />
              ) : (
                <span aria-hidden="true" className="material-symbols-outlined animate-spin text-on-surface-variant">progress_activity</span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3 w-full">
              <div>
                <p className="text-2xs text-on-surface-variant mb-1">¿No puedes escanear? Escribe esta clave en la app:</p>
                <p className="font-mono text-xs break-all rounded-lg bg-surface px-2 py-1.5 border border-outline-variant/60 select-all">
                  {config.secreto.replace(/(.{4})/g, '$1 ').trim()}
                </p>
              </div>
              {campoCodigo('codigo-activar', 'Código de la app')}
            </div>
          </div>
          {error && <p role="alert" className="text-xs font-medium text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            {botonCancelar}
            {botonPrincipal('Activar', codigo.length !== 6)}
          </div>
        </form>
      )}

      {paso === 'codigos' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-on-surface flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary">key</span>
            Guarda tus códigos de respaldo
          </p>
          <p className="text-xs text-on-surface-variant">
            Si pierdes el móvil, cada código te deja entrar una vez. <strong>Solo se muestran ahora</strong>: cópialos o
            descárgalos y guárdalos en un lugar seguro.
          </p>
          <ul className="grid grid-cols-2 gap-1.5 rounded-xl bg-surface p-3 border border-outline-variant/60" aria-label="Códigos de respaldo">
            {codigos.map((c) => (
              <li key={c} className="font-mono text-sm text-on-surface text-center tracking-wider">{c}</li>
            ))}
          </ul>
          {error && <p role="alert" className="text-xs font-medium text-error">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={copiarCodigos}
              className="px-3 py-2 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
            >
              {copiado ? 'Copiados' : 'Copiar'}
            </button>
            <button
              type="button"
              onClick={descargarCodigos}
              className="px-3 py-2 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
            >
              Descargar .txt
            </button>
            <button
              type="button"
              onClick={() => {
                setCodigos([]);
                setPaso('resumen');
              }}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold cursor-pointer"
            >
              Ya los guardé
            </button>
          </div>
        </div>
      )}

      {paso === 'regenerar' && (
        <form onSubmit={regenerar} className="space-y-3">
          <p className="text-xs text-on-surface-variant">
            Se crean 10 códigos nuevos y los anteriores dejan de valer. Confírmalo con el código de tu app.
          </p>
          {campoCodigo('codigo-regenerar', 'Código de la app')}
          {error && <p role="alert" className="text-xs font-medium text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            {botonCancelar}
            {botonPrincipal('Generar códigos', codigo.length !== 6)}
          </div>
        </form>
      )}

      {paso === 'desactivar' && (
        <form onSubmit={desactivar} className="space-y-3">
          <p className="text-xs text-on-surface-variant">
            Para quitar la protección, confirma tu contraseña y un código de la app (o uno de respaldo).
          </p>
          <div className="space-y-1">
            <label htmlFor="password-desactivar" className="text-xs font-semibold text-on-surface-variant">
              Contraseña
            </label>
            <input
              id="password-desactivar"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-container-lowest text-on-surface border border-outline-variant outline-none focus:ring-2 focus:ring-secondary/30 focus:border-primary"
            />
          </div>
          {campoCodigo('codigo-desactivar', 'Código de la app o de respaldo', true)}
          {error && <p role="alert" className="text-xs font-medium text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            {botonCancelar}
            {botonPrincipal('Desactivar', !password || codigo.length < 6)}
          </div>
        </form>
      )}

      {isApiEnabled && !estado && error && paso === 'resumen' && (
        <p role="alert" className="text-xs font-medium text-error">{error}</p>
      )}
    </div>
  );
}
