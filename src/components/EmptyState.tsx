interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-outline-variant bg-surface-container ${className}`}
    >
      {/* Recto y sin rótulo de adorno: antes iba torcido y con un «404 · nada
          por aquí», un código de error falso encima de cada lista vacía. */}
      <div className="w-12 h-12 rounded-xl bg-ink flex items-center justify-center text-olive mb-3">
        <span aria-hidden="true" className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <h3 className="font-headline text-base text-on-surface mb-1">{title}</h3>
      {/* `text-sm` y no `text-xs`: esto es texto de lectura, no metadato de
          interfaz. `max-w-sm` mantiene la medida en torno a 60 caracteres. */}
      <p className="text-sm text-on-surface-variant max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add</span>
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
