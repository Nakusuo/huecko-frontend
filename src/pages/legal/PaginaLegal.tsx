import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Marco de las páginas de privacidad y términos. Son públicas (Google las
 * enlaza desde la pantalla de «Continuar con Google»), así que no dependen de
 * la sesión ni del menú de la app.
 */
export default function PaginaLegal({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <Link to="/login" className="text-sm text-on-surface-variant underline hover:text-on-surface">
          Volver a Huecko
        </Link>
        <h1 className="mt-6 font-headline text-3xl font-bold">{titulo}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">Última actualización: {actualizado}</p>
        <div className="mt-8 flex flex-col gap-6 leading-relaxed [&_h2]:font-headline [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          {children}
        </div>
        <nav className="mt-12 flex gap-4 border-t border-outline-variant pt-6 text-sm text-on-surface-variant">
          <Link to="/privacidad" className="underline hover:text-on-surface">Privacidad</Link>
          <Link to="/terminos" className="underline hover:text-on-surface">Términos</Link>
        </nav>
      </main>
    </div>
  );
}

/** Enlaces pequeños bajo los formularios de acceso. */
export function EnlacesLegales() {
  return (
    <p className="mt-4 text-center text-xs text-on-surface-variant">
      <Link to="/privacidad" className="underline hover:text-on-surface">Privacidad</Link>
      {' · '}
      <Link to="/terminos" className="underline hover:text-on-surface">Términos</Link>
    </p>
  );
}
