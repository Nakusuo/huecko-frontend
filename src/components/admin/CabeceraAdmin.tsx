import type { ReactNode } from 'react';

/** Título y bajada de cada página del panel. */
export default function CabeceraAdmin({ titulo, bajada, children }: { titulo: string; bajada: string; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">{titulo}</h1>
        <p className="mt-1.5 text-sm text-on-surface-variant md:text-base">{bajada}</p>
      </div>
      {children}
    </header>
  );
}
