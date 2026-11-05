/**
 * Google Identity Services (GIS): el script oficial que dibuja el botón
 * «Continuar con Google» y devuelve un ID token (`credential`) que verifica
 * el backend. Se carga solo cuando hace falta y una sola vez.
 */

export const URL_SCRIPT_GOOGLE = 'https://accounts.google.com/gsi/client';

/** Lo poco de `google.accounts.id` que usa Huecko. */
export interface GoogleId {
  initialize(opciones: {
    client_id: string;
    callback: (respuesta: { credential?: string }) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
  }): void;
  renderButton(
    contenedor: HTMLElement,
    opciones: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    }
  ): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

let carga: Promise<GoogleId> | null = null;

/**
 * Promesa con `google.accounts.id`. Si el script no carga (sin internet, un
 * bloqueador), se rechaza y la próxima llamada lo intenta otra vez.
 */
export function cargarGoogleIdentity(): Promise<GoogleId> {
  const yaCargado = window.google?.accounts?.id;
  if (yaCargado) return Promise.resolve(yaCargado);
  if (carga) return carga;

  carga = new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = URL_SCRIPT_GOOGLE;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error('Google Identity Services no respondió'));
    };
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  }).catch((err: unknown) => {
    carga = null;
    throw err;
  });
  return carga;
}

/** Solo para pruebas: olvida la carga anterior. */
export function reiniciarGoogleIdentity(): void {
  carga = null;
}

/** Ancho máximo que admite Google para su botón. */
const ANCHO_MAXIMO = 400;

export interface OpcionesBotonGoogle {
  clientId: string | null;
  texto: 'signin_with' | 'signup_with';
  /** Recibe el ID token cuando la persona elige su cuenta. */
  onCredential: (credential: string) => void;
  /** Ancho disponible; Google no acepta más de 400 px. */
  ancho: number;
}

/**
 * Dibuja el botón oficial en `destino`. Devuelve `false` sin tocar nada si no
 * hay Client ID o el script de Google no carga: así la página sigue sin botón.
 */
export async function montarBotonGoogle(
  destino: HTMLElement,
  { clientId, texto, onCredential, ancho }: OpcionesBotonGoogle,
  cargar: () => Promise<GoogleId> = cargarGoogleIdentity
): Promise<boolean> {
  if (!clientId) return false;
  let google: GoogleId;
  try {
    google = await cargar();
  } catch {
    return false;
  }
  google.initialize({
    client_id: clientId,
    callback: ({ credential }) => {
      if (credential) onCredential(credential);
    },
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    context: texto === 'signup_with' ? 'signup' : 'signin',
  });
  google.renderButton(destino, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: texto,
    shape: 'rectangular',
    logo_alignment: 'center',
    width: Math.max(200, Math.min(ANCHO_MAXIMO, Math.round(ancho))),
    locale: 'es',
  });
  return true;
}
