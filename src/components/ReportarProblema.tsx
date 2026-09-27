import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { useAuthStore } from '../store/authStore';
import { reportesService } from '../services/reportesService';
import type { TipoReporte } from '../types/admin.types';

const MIN_DESCRIPCION = 10;
const MAX_DESCRIPCION = 1000;

const TIPOS: { valor: TipoReporte; titulo: string; detalle: string; icon: string }[] = [
  { valor: 'FALLO', titulo: 'Algo no funciona', detalle: 'Un error, algo que no carga o se ve mal.', icon: 'bug_report' },
  {
    valor: 'CONDUCTA',
    titulo: 'Problema con otra persona',
    detalle: 'Alguien de un grupo actúa de mala fe.',
    icon: 'person_alert',
  },
];

/**
 * Diálogo para avisar al equipo de Huecko. Va con la página en la que se está,
 * para que quien lo lea sepa dónde mirar sin tener que preguntar.
 */
function ReportarProblemaModal({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const [tipo, setTipo] = useState<TipoReporte>('FALLO');
  const [descripcion, setDescripcion] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  useModalDismiss(true, onClose);

  const largo = descripcion.trim().length;
  const valido = largo >= MIN_DESCRIPCION && largo <= MAX_DESCRIPCION && (tipo === 'FALLO' || email.trim() !== '');

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !valido) return;
    setEnviando(true);
    setError(null);
    try {
      await reportesService.enviarReporte({ tipo, descripcion, ruta: pathname, emailReportado: email }, user);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el reporte.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reportar-titulo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim/50 p-4 animate-scrim-in"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 elev-3 animate-modal-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="reportar-titulo" className="font-headline text-xl font-bold text-on-surface">
            Reportar un problema
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="cursor-pointer text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </div>

        {enviado ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center animate-fade-in">
            <div className="flex h-12 w-12 -rotate-3 items-center justify-center bg-ink text-olive shadow-md">
              <span aria-hidden="true" className="material-symbols-outlined">mark_email_read</span>
            </div>
            <p className="font-semibold text-on-surface">Gracias, lo revisaremos.</p>
            <p className="max-w-sm text-sm text-on-surface-variant">
              El equipo de Huecko lo verá en su panel. No hace falta que lo mandes otra vez.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover active:scale-95"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-5">
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="mb-1.5 text-xs font-semibold text-on-surface-variant">¿Qué pasa?</legend>
              {TIPOS.map((t) => (
                <label
                  key={t.valor}
                  className={`flex cursor-pointer gap-2.5 rounded-xl border p-3 transition-colors ${
                    tipo === t.valor
                      ? 'border-secondary bg-secondary-container'
                      : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo-reporte"
                    value={t.valor}
                    checked={tipo === t.valor}
                    onChange={() => setTipo(t.valor)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-on-surface-variant">
                    {t.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-on-surface">{t.titulo}</span>
                    <span className="block text-2xs text-on-surface-variant">{t.detalle}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {tipo === 'CONDUCTA' && (
              <div className="space-y-1.5 animate-fade-in">
                <label htmlFor="reportar-email" className="block text-xs font-semibold text-on-surface-variant">
                  Correo de esa persona *
                </label>
                <input
                  id="reportar-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@huecko.com"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:border-secondary focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="reportar-descripcion" className="block text-xs font-semibold text-on-surface-variant">
                Cuéntanos qué pasó *
              </label>
              <textarea
                id="reportar-descripcion"
                rows={4}
                required
                maxLength={MAX_DESCRIPCION}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={
                  tipo === 'FALLO'
                    ? 'Qué intentabas hacer y qué pasó en su lugar.'
                    : 'Qué hizo y en qué grupo, con el máximo detalle que puedas.'
                }
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:border-secondary focus:outline-none"
              />
              <p className="flex justify-between text-2xs text-on-surface-variant">
                <span>{largo < MIN_DESCRIPCION ? `Al menos ${MIN_DESCRIPCION} caracteres.` : 'Se envía también la página en la que estás.'}</span>
                <span className="tabular-nums">
                  {largo}/{MAX_DESCRIPCION}
                </span>
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-error/30 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!valido || enviando}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
              >
                {enviando ? 'Enviando…' : 'Enviar reporte'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Botón que abre el diálogo. `variante` ajusta el tamaño a la barra donde va. */
export function BotonReportar({ variante = 'icono' }: { variante?: 'icono' | 'fila' }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {variante === 'icono' ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Reportar un problema"
          title="Reportar un problema"
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[22px]">feedback</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-left transition-colors hover:bg-surface-container"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">feedback</span>
          <span>
            <span className="block text-sm font-semibold text-on-surface">Reportar un problema</span>
            <span className="block text-xs text-on-surface-variant">Algo no funciona o alguien actúa de mala fe.</span>
          </span>
        </button>
      )}
      {abierto && <ReportarProblemaModal onClose={() => setAbierto(false)} />}
    </>
  );
}
