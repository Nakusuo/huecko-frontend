import { useEffect, useRef, useState } from 'react';
import { configGoogle } from '../../services/authService';
import { montarBotonGoogle } from '../../lib/googleIdentity';

interface Props {
  /** Llega con el ID token de Google cuando la persona elige su cuenta. */
  onCredential: (credential: string) => void;
  /** «Iniciar sesión con Google» en el login, «Registrarse con Google» en el registro. */
  texto: 'signin_with' | 'signup_with';
  /** Mientras el backend comprueba la cuenta: se tapa el botón para no pulsarlo dos veces. */
  ocupado?: boolean;
}

/**
 * El botón OFICIAL de Google (lo dibuja su script en un iframe; no se puede
 * ni se debe imitar). No aparece nada si el backend no tiene Google
 * configurado, si no hay backend (modo demo) o si el script no carga: el
 * resto de la página sigue igual.
 */
export default function BotonGoogle({ onCredential, texto, ocupado = false }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const alRecibir = useRef(onCredential);
  const [listo, setListo] = useState(false);

  // El callback se registra una vez en Google: así siempre llama al último.
  useEffect(() => {
    alRecibir.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const clientId = await configGoogle();
      const destino = contenedor.current;
      if (cancelado || !destino) return;
      const montado = await montarBotonGoogle(destino, {
        clientId,
        texto,
        onCredential: (credential) => alRecibir.current(credential),
        ancho: destino.parentElement?.clientWidth ?? 320,
      });
      if (!cancelado && montado) setListo(true);
    })();
    return () => {
      cancelado = true;
    };
  }, [texto]);

  return (
    <div className={listo ? 'mb-5' : undefined} data-testid="acceso-google" aria-busy={ocupado || undefined}>
      <div
        ref={contenedor}
        className={`flex justify-center transition-opacity ${ocupado ? 'opacity-50 pointer-events-none' : ''}`}
      />
      {listo && ocupado && (
        <p role="status" className="mt-2 text-center text-xs text-on-surface-variant">
          Entrando con Google…
        </p>
      )}
    </div>
  );
}
