/** Hueco reservado para una sección del panel que aún no tiene datos. */
export default function EnConstruccion({ icon, texto }: { icon: string; texto: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container p-10 text-center">
      <div className="mb-3 flex h-12 w-12 -rotate-3 items-center justify-center bg-ink text-olive shadow-md">
        <span aria-hidden="true" className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <p className="max-w-sm text-sm text-on-surface-variant">{texto}</p>
    </div>
  );
}
