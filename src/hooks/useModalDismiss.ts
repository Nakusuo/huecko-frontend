import { useEffect } from 'react';

/**
 * Cierra un diálogo con Escape y bloquea el desplazamiento del fondo mientras
 * está abierto.
 *
 * Los diez modales de la app solo se podían cerrar pulsando su botón Cancelar:
 * Escape no hacía nada, y la página de debajo seguía desplazándose bajo el
 * scrim, lo que en móvil hacía perder el sitio al cerrar.
 *
 * @param isOpen  Si el diálogo está visible.
 * @param onClose Qué hacer al pulsar Escape.
 */
export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);
}
