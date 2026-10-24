import { useCarga } from '../../hooks/useCarga';
import { adminService } from '../../services/adminService';
import type { FuncionIA } from '../../types/admin.types';

const NOMBRE: Record<FuncionIA, string> = {
  ESCANEO_HORARIO: 'Leer horario de una foto',
  BORRADOR_PLAN: 'Borrador de plan',
  IDEAS_PLAN: 'Ideas de plan',
  RESUMEN_VOTACION: 'Resumen de votación',
};

/** «2,4 s»; por debajo de un segundo, en milisegundos para que no salga «0 s». */
const duracion = (ms: number) =>
  ms < 1000 ? `${ms} ms` : `${(ms / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })} s`;

/**
 * Uso de Huecko IA por función, como la tarjeta de la app móvil. Va aparte del
 * resumen: si la consulta falla, el resto del panel se sigue viendo.
 */
export default function UsoIA() {
  const { datos: uso, error, cargando, recargar } = useCarga(() => adminService.getUsoIA());

  return (
    <section className="mt-10" aria-label="Uso de Huecko IA">
      <h2 className="font-headline text-xl text-on-surface">Uso de Huecko IA</h2>
      <p className="mt-1 text-xs text-on-surface-variant">
        Lo que piden las personas (leer fotos, redactar planes, ideas y resúmenes) en los últimos{' '}
        {uso?.dias ?? 30} días. Solo cuentas: no se guarda quién la usó ni qué escribió.
      </p>

      {error && (
        <p role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-on-error-container">
          {error}
          <button type="button" onClick={recargar} className="font-semibold underline">
            Reintentar
          </button>
        </p>
      )}
      {!uso && cargando && <p className="mt-4 text-sm text-on-surface-variant">Cargando…</p>}

      {uso && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-on-surface-variant">
                <th className="px-4 py-2 font-semibold">Función</th>
                <th className="px-4 py-2 font-semibold text-right">Llamadas</th>
                <th className="px-4 py-2 font-semibold text-right">Éxito</th>
                <th className="px-4 py-2 font-semibold text-right">Tiempo medio</th>
              </tr>
            </thead>
            <tbody>
              {uso.funciones.map((f) => (
                <tr key={f.funcion} className="border-t border-outline-variant/60 tabular-nums">
                  <td className="px-4 py-2 text-on-surface">{NOMBRE[f.funcion] ?? f.funcion}</td>
                  <td className="px-4 py-2 text-right text-on-surface">{f.llamadas}</td>
                  <td className="px-4 py-2 text-right text-on-surface">
                    {f.tasaExito === null ? '—' : `${Math.round(f.tasaExito * 100)} %`}
                  </td>
                  <td className="px-4 py-2 text-right text-on-surface">
                    {f.msPromedio === null ? '—' : duracion(f.msPromedio)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-outline-variant text-xs text-on-surface-variant">
                <td className="px-4 py-2 font-semibold">Total</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{uso.llamadas}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
