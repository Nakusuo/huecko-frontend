import { useEffect, useMemo, useRef, useState } from 'react';
import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import { ErrorCarga, Filtro, SinServidor } from '../../components/admin/Estados';
import { useCarga } from '../../hooks/useCarga';
import { adminService } from '../../services/adminService';
import { isApiEnabled } from '../../lib/apiClient';
import type { EventoLog, NivelLog, PropiedadConfig } from '../../types/admin.types';

const REFRESCO_MS = 3000;
/** Lo que se conserva en pantalla. El backend guarda 1000; aquí no hace falta más. */
const MAX_LINEAS = 1000;

const NIVELES: { valor: NivelLog; texto: string }[] = [
  { valor: 'INFO', texto: 'Todo' },
  { valor: 'WARN', texto: 'Avisos y errores' },
  { valor: 'ERROR', texto: 'Solo errores' },
];

/* Sobre fondo de tinta: el nivel va en palabra, y el color solo lo refuerza. */
const COLOR_NIVEL: Record<NivelLog, string> = {
  ERROR: 'text-[#ff8a80]',
  WARN: 'text-[#ffd180]',
  INFO: 'text-[#b9c99f]',
};

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

function LogEnVivo() {
  const [nivel, setNivel] = useState<NivelLog>('INFO');
  const [eventos, setEventos] = useState<EventoLog[]>([]);
  const [pausado, setPausado] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);
  const ultimoId = useRef(0);
  const caja = useRef<HTMLDivElement>(null);
  const pegadoAbajo = useRef(true);

  const nivelLeido = useRef<NivelLog>(nivel);

  useEffect(() => {
    /* Cambiar de nivel empieza de cero: lo que el filtro anterior descartó no
       se recupera pidiendo solo «lo posterior». Reanudar tras una pausa, en
       cambio, sigue donde se quedó: si no, se repetirían las líneas. */
    if (nivelLeido.current !== nivel) {
      nivelLeido.current = nivel;
      ultimoId.current = 0;
    }
    let vigente = true;

    const pedir = async () => {
      try {
        const pagina = await adminService.getLogs(ultimoId.current, nivel);
        if (!vigente) return;
        ultimoId.current = pagina.ultimoId;
        if (pagina.eventos.length > 0) {
          setEventos((previos) => [...previos, ...pagina.eventos].slice(-MAX_LINEAS));
        }
        setError(null);
      } catch (err) {
        if (vigente) setError(err instanceof Error ? err.message : 'No se pudo leer el log.');
      } finally {
        if (vigente) setCargado(true);
      }
    };

    void pedir();
    const id = pausado ? null : window.setInterval(() => void pedir(), REFRESCO_MS);
    return () => {
      vigente = false;
      if (id !== null) window.clearInterval(id);
    };
  }, [nivel, pausado]);

  // Si se estaba mirando el final, se sigue: si se subió a leer algo, no se le mueve.
  useEffect(() => {
    if (pegadoAbajo.current && caja.current) caja.current.scrollTop = caja.current.scrollHeight;
  }, [eventos]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return eventos;
    return eventos.filter((e) => `${e.logger} ${e.mensaje} ${e.excepcion ?? ''}`.toLowerCase().includes(texto));
  }, [eventos, busqueda]);

  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Filtro
          etiqueta="Nivel mínimo"
          opciones={NIVELES}
          valor={nivel}
          onCambiar={(n) => {
            setEventos([]);
            setNivel(n);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block">
            <span className="sr-only">Buscar en el log</span>
            <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              search
            </span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar"
              className="w-44 rounded-lg border border-outline-variant bg-surface-container-lowest py-1.5 pl-8 pr-2 text-xs text-on-surface focus:border-secondary focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setPausado((p) => !p)}
            aria-pressed={pausado}
            className="flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">{pausado ? 'play_arrow' : 'pause'}</span>
            {pausado ? 'Reanudar' : 'Pausar'}
          </button>
          <button
            type="button"
            onClick={() => setEventos([])}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
          >
            Limpiar vista
          </button>
        </div>
      </div>

      {error && <ErrorCarga mensaje={error} onReintentar={() => setPausado(false)} />}

      <div
        ref={caja}
        role="log"
        aria-live="off"
        aria-label="Log del backend"
        onScroll={(e) => {
          const el = e.currentTarget;
          pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="h-[28rem] overflow-auto rounded-2xl bg-ink p-3 font-mono text-2xs leading-relaxed text-cream"
      >
        {!cargado && <p className="text-cream/60">Conectando…</p>}
        {cargado && visibles.length === 0 && (
          <p className="text-cream/60">{busqueda ? 'Ninguna línea coincide.' : 'Sin líneas todavía. Las nuevas aparecen solas.'}</p>
        )}
        {visibles.map((e) => (
          <div key={e.id} className="whitespace-pre-wrap break-words border-b border-white/5 py-0.5">
            <span className="text-cream/50">{hora(e.momento)}</span>{' '}
            <span className={`font-bold ${COLOR_NIVEL[e.nivel] ?? ''}`}>{e.nivel.padEnd(5)}</span>{' '}
            <span className="text-cream/70">{e.logger}</span> {e.mensaje}
            {e.excepcion && <span className="block pl-4 text-[#ff8a80]">↳ {e.excepcion}</span>}
          </div>
        ))}
      </div>
      <p className="mt-2 text-2xs text-on-surface-variant">
        {pausado ? 'En pausa.' : 'En vivo: se actualiza cada 3 s.'} Guarda INFO de Huecko y avisos o errores de las
        librerías. Las líneas viven en memoria: se pierden al reiniciar el backend.
      </p>
    </section>
  );
}

function Configuracion({ propiedades }: { propiedades: PropiedadConfig[] }) {
  const grupos = propiedades.reduce<Record<string, PropiedadConfig[]>>((acc, p) => {
    (acc[p.grupo] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Object.entries(grupos).map(([grupo, lista]) => (
        <section key={grupo} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <h3 className="mb-3 text-sm font-semibold text-on-surface">{grupo}</h3>
          <dl className="flex flex-col gap-3">
            {lista.map((p) => (
              <div key={p.clave}>
                <dt className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <code className="text-2xs text-on-surface-variant">{p.clave}</code>
                  <dd className="break-all text-right font-mono text-xs font-semibold text-on-surface">{p.valor}</dd>
                </dt>
                <p className="text-2xs text-on-surface-variant">{p.descripcion}</p>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export default function AdminConsolaPage() {
  const config = useCarga(adminService.getConfiguracion);

  return (
    <>
      <CabeceraAdmin
        titulo="Consola"
        bajada="Lo que está pasando en el servidor y con qué configuración corre. Solo lectura: desde aquí no se cambia nada."
      />

      {!isApiEnabled ? (
        <SinServidor que="el log ni la configuración" />
      ) : (
        <>
          <LogEnVivo />
          <section className="mt-10">
            <h2 className="font-headline text-xl text-on-surface">Configuración activa</h2>
            <p className="mb-4 mt-1 text-xs text-on-surface-variant">
              Sin secretos: de la clave JWT solo se dice si es la de desarrollo, y de las bases se ocultan usuario y
              contraseña. Para cambiar algo hay que editar las variables de entorno y reiniciar.
            </p>
            {config.error && <ErrorCarga mensaje={config.error} onReintentar={config.recargar} />}
            {config.datos && <Configuracion propiedades={config.datos} />}
          </section>
        </>
      )}
    </>
  );
}
