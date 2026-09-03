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
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-[#c0c9bb] bg-[#e9f0e4]/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#7fae7a]/20 border border-[#7fae7a]/30 flex items-center justify-center text-[#416840] mb-3 shadow-xs">
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <h3 className="text-base font-bold text-[#161d15] mb-1">{title}</h3>
      <p className="text-xs text-[#70796d] max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 bg-[#416840] hover:bg-[#2a4f2b] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
