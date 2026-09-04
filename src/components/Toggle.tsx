import { useId } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Etiqueta visible. Se asocia al control, así que el clic en el texto también alterna. */
  label: string;
  /** Texto de apoyo bajo la etiqueta. */
  description?: string;
  disabled?: boolean;
}

/**
 * Interruptor de ajuste.
 *
 * Sustituye al patrón `sr-only peer` que había repetido en ProfilePage: aquel
 * llevaba `peer-focus:outline-none`, de modo que al tabular no había ninguna
 * señal de qué interruptor tenía el foco, y el `<input>` no estaba asociado a
 * ningún texto, así que un lector de pantalla solo anunciaba "casilla".
 */
export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleProps) {
  const id = useId();
  const descriptionId = description ? `${id}-desc` : undefined;

  return (
    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/60">
      <div className="space-y-1">
        <label
          htmlFor={id}
          className={`block text-sm font-semibold text-on-surface ${
            disabled ? 'opacity-60' : 'cursor-pointer'
          }`}
        >
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-xs text-on-surface-variant leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <label className="relative inline-flex items-center shrink-0 mt-0.5 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={descriptionId}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span
          aria-hidden="true"
          className="
            block w-11 h-6 rounded-full bg-outline-variant
            transition-colors duration-200
            peer-checked:bg-primary
            peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2
            peer-focus-visible:ring-offset-surface-container-lowest
            after:content-[''] after:absolute after:top-0.5 after:left-0.5
            after:h-5 after:w-5 after:rounded-full after:bg-surface-container-lowest after:shadow-xs
            after:transition-transform after:duration-200 after:ease-out
            peer-checked:after:translate-x-5
          "
        />
      </label>
    </div>
  );
}
