import { useEstadoServidor } from '../lib/servidor';

/**
 * Mientras la API despierta (plan gratuito, ver `lib/servidor.ts`) el botón de
 * entrar se queda esperando: sin este aviso parecería que la app se colgó.
 */
export default function AvisoServidorDespertando() {
  const estado = useEstadoServidor((s) => s.estado);
  if (estado !== 'despertando') return null;

  return (
    <div role="status" className="mb-4 px-3 py-2 rounded-xl bg-warning-container border border-warning/30 text-xs text-on-warning-container flex items-start gap-2">
      <span aria-hidden="true" className="material-symbols-outlined text-[16px] shrink-0">bedtime</span>
      <span>El servidor se está despertando; puede tardar hasta un minuto. Puedes ir rellenando el formulario.</span>
    </div>
  );
}
