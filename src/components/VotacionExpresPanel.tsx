import { useEffect, useMemo, useState } from 'react';
import type { OrigenCriticidad } from '../types/incidents.types';
import {
  ORDEN_OPCIONES,
  OPCION_TEXTO,
  type OpcionExpres,
  type VotacionExpres,
} from '../types/incidents.types';

/**
 * Votación exprés (RF-17, RF-18).
 *
 * Es la superficie más urgente de Huecko: alguien imprescindible acaba de
 * decir que no viene y el grupo tiene una hora para decidir. Todo lo que se ve
 * aquí está al servicio de decidir rápido y con información:
 *
 * - **La razón por la que es crítica** va arriba del todo. «Tu ausencia abrió
 *   una votación» sin decir por qué se lee como un castigo arbitrario.
 * - **Cada opción dice su consecuencia**, no solo su nombre. Votar
 *   «Reagendar» sin saber que eso devuelve el plan a coordinación es votar a
 *   ciegas.
 * - **El resultado por defecto es visible antes de votar.** Es la pregunta que
 *   se hace todo el mundo — «¿y si nadie contesta?»— y RF-18 ya tiene una
 *   respuesta; ocultarla no la hace menos cierta.
 *
 * El reloj no es decoración: es la restricción real, así que es el elemento
 * que organiza la cabecera.
 */

interface Props {
  votacion: VotacionExpres;
  /** Nombre del resultado por defecto, para el aviso de RF-18. */
  resultadoPorDefecto?: OpcionExpres;
  onVotar: (opcion: OpcionExpres) => Promise<void>;
}

export function VotacionExpresPanel({
  votacion,
  resultadoPorDefecto = 'MANTENER',
  onVotar,
}: Props) {
  const restante = useCuentaAtras(votacion.expiraEn);
  const [enviando, setEnviando] = useState<OpcionExpres | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vencida = restante.totalSegundos <= 0;
  /* Los últimos diez minutos cambian el tono del reloj. Un solo salto, no un
     degradado continuo: el cambio se nota justo porque es discreto. */
  const apremia = !vencida && restante.totalSegundos <= 600;

  const totalVotos = votacion.votosEmitidos;
  const maximo = useMemo(
    () => Math.max(1, ...ORDEN_OPCIONES.map((o) => votacion.recuento[o] ?? 0)),
    [votacion.recuento],
  );

  async function elegir(opcion: OpcionExpres) {
    if (vencida || enviando) return;
    setEnviando(opcion);
    setError(null);
    try {
      await onVotar(opcion);
    } catch {
      setError('No se pudo registrar tu voto. Vuelve a intentarlo.');
    } finally {
      setEnviando(null);
    }
  }

  return (
    <section
      aria-labelledby="votacion-expres-titulo"
      className="rounded-2xl border border-warning/40 bg-warning-container/40 overflow-hidden"
    >
      {/* Cabecera: quién falta, por qué es crítico, y cuánto queda */}
      <header className="px-4 pt-4 pb-3 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide text-on-warning-container">
              <span aria-hidden="true" className="material-symbols-outlined text-[0.875rem]">
                priority_high
              </span>
              Decisión del grupo
            </p>
            <h3
              id="votacion-expres-titulo"
              className="mt-1 text-sm font-bold text-on-surface"
            >
              {votacion.nombreReporta} no podrá asistir
            </h3>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Se abrió esta votación porque {votacion.razonCriticidad}.{' '}
              <SelloDeOrigen origen={votacion.origenCriticidad} />
            </p>
            {votacion.motivo && (
              <p className="mt-1.5 text-xs text-on-surface-variant">
                <span className="text-on-surface-variant/80">Motivo: </span>
                <span className="italic">«{votacion.motivo}»</span>
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <span className="block text-2xs font-bold uppercase tracking-wide text-on-surface-variant">
              {vencida ? 'Cerrando' : 'Queda'}
            </span>
            <span
              className={[
                'block font-bold tabular-nums leading-none transition-colors duration-500',
                vencida ? 'text-base text-on-surface-variant' : 'text-xl',
                apremia ? 'text-error' : 'text-on-surface',
              ].join(' ')}
              /* El tiempo cambia solo; sin esto el lector de pantalla anunciaría
                 cada segundo. Se lee al entrar y cuando el usuario lo enfoque. */
              aria-live="off"
            >
              {vencida ? '—' : restante.etiqueta}
            </span>
            {!vencida && (
              <span className="mt-0.5 block text-2xs text-on-surface-variant">
                {restante.totalSegundos > 3600 ? 'horas' : 'min : seg'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Opciones */}
      <div className="space-y-1.5 px-3 pb-3 sm:px-4">
        {ORDEN_OPCIONES.map((opcion) => {
          const texto = OPCION_TEXTO[opcion];
          const votos = votacion.recuento[opcion] ?? 0;
          const elegida = votacion.miVoto === opcion;
          const cargando = enviando === opcion;

          return (
            <button
              key={opcion}
              type="button"
              onClick={() => elegir(opcion)}
              disabled={vencida || enviando !== null}
              aria-pressed={elegida}
              className={[
                'group relative w-full overflow-hidden rounded-xl px-3 py-2.5 text-left',
                'transition-colors duration-150 cursor-pointer',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                'disabled:cursor-not-allowed disabled:opacity-60',
                elegida
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container',
              ].join(' ')}
            >
              {/* Barra de recuento. Va detrás del contenido y no como elemento
                  aparte: el peso relativo se lee sin tener que compararlo con
                  una leyenda. */}
              <span
                aria-hidden="true"
                className={[
                  'absolute inset-y-0 left-0 transition-[width] duration-500 ease-out',
                  elegida ? 'bg-on-primary/15' : 'bg-primary/10',
                ].join(' ')}
                style={{ width: `${(votos / maximo) * 100}%` }}
              />

              <span className="relative flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={[
                    'material-symbols-outlined text-[1.125rem]',
                    elegida ? 'text-on-primary' : 'text-on-surface-variant',
                  ].join(' ')}
                >
                  {cargando ? 'progress_activity' : texto.icono}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">{texto.titulo}</span>
                  <span
                    className={[
                      'block text-2xs',
                      elegida ? 'text-on-primary/80' : 'text-on-surface-variant',
                    ].join(' ')}
                  >
                    {texto.consecuencia}
                  </span>
                </span>

                <span
                  className={[
                    'shrink-0 text-sm font-bold tabular-nums',
                    elegida ? 'text-on-primary' : 'text-on-surface-variant',
                  ].join(' ')}
                >
                  {votos}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Pie: participación, lo que pasa si nadie vota, y errores */}
      <footer className="border-t border-warning/25 px-4 py-2.5 sm:px-5">
        {error ? (
          <p role="alert" className="text-2xs font-semibold text-error">
            {error}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-2xs text-on-surface-variant">
              <strong className="font-bold text-on-surface tabular-nums">
                {totalVotos}
              </strong>{' '}
              de {votacion.miembrosDelGrupo} han votado
              {votacion.miVoto && ' · puedes cambiar tu voto'}
            </span>

            {!vencida && totalVotos === 0 && (
              <span className="text-2xs text-on-surface-variant">
                Si nadie vota, el plan se{' '}
                {resultadoPorDefecto === 'MANTENER' ? 'mantiene' : 'reagenda'}.
              </span>
            )}

            {vencida && (
              <span className="text-2xs text-on-surface-variant">
                Aplicando el resultado…
              </span>
            )}
          </div>
        )}
      </footer>
    </section>
  );
}

/* ------------------------------------------------------------------ */

interface CuentaAtras {
  totalSegundos: number;
  etiqueta: string;
}

/**
 * Cuenta atrás hasta una fecha ISO.
 *
 * Tiquea cada segundo por debajo de una hora y cada minuto por encima: un
 * intervalo de un segundo para mostrar «2 h 14 min» redibuja sesenta veces
 * para cambiar nada.
 */
function useCuentaAtras(expiraEnISO: string): CuentaAtras {
  const objetivo = useMemo(() => new Date(expiraEnISO).getTime(), [expiraEnISO]);
  const [ahora, setAhora] = useState(() => Date.now());
  const vencido = ahora >= objetivo;
  /* Por encima de una hora basta con refrescar cada minuto: un intervalo de un
     segundo para mostrar «2 h 14 min» redibuja sesenta veces sin cambiar nada.
     Va en las dependencias porque al cruzar la hora hay que rearmar el
     intervalo; sin eso, la última hora avanzaría a saltos de un minuto. */
  const porMinutos = objetivo - ahora > 3_600_000;

  useEffect(() => {
    if (vencido) return;

    const id = window.setInterval(
      () => setAhora(Date.now()),
      porMinutos ? 60_000 : 1_000,
    );
    return () => window.clearInterval(id);
  }, [objetivo, vencido, porMinutos]);

  const totalSegundos = Math.max(0, Math.floor((objetivo - ahora) / 1000));

  if (totalSegundos > 3600) {
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    return { totalSegundos, etiqueta: `${horas} h ${minutos} min` };
  }

  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return {
    totalSegundos,
    etiqueta: `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`,
  };
}

/**
 * Quién decidió que esta ausencia era crítica.
 *
 * Se muestra siempre, también cuando lo decidieron las reglas. Enseñarlo solo
 * cuando responde un modelo convertiría el sello en una alarma; enseñarlo
 * siempre lo convierte en información.
 *
 * `REGLAS_POR_FALLO` se dice tal cual: si el modelo no contestó y respondieron
 * las reglas, el grupo debería poder saberlo antes de discutir el resultado.
 */
function SelloDeOrigen({ origen }: { origen: OrigenCriticidad }) {
  const texto: Record<OrigenCriticidad, string> = {
    REGLAS: 'Según las reglas del grupo.',
    IA: 'Evaluado automáticamente.',
    REGLAS_POR_FALLO: 'Evaluado con las reglas del grupo: la evaluación automática no respondió.',
  };

  return (
    <span className="text-on-surface-variant/75">{texto[origen] ?? texto.REGLAS}</span>
  );
}
