import { useFotoDeAlbum } from '../../hooks/useFoto';
import type { VarianteFoto } from '../../types/album.types';

/** Una foto o miniatura del álbum; mientras llega, un hueco del mismo tamaño. */
export function FotoDeAlbum({
  fotoId,
  variante,
  alt,
  className = '',
}: {
  fotoId: string;
  variante: VarianteFoto;
  alt: string;
  className?: string;
}) {
  const src = useFotoDeAlbum(fotoId, variante);
  if (!src) {
    return <span aria-hidden="true" className={`${className} block animate-pulse bg-surface-container`} />;
  }
  return <img src={src} alt={alt} className={className} />;
}
