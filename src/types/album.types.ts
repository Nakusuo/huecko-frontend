/** Espejo de `AlbumResponses` del backend: el álbum de recuerdos. */

/** Los planes ya vividos de un grupo, con o sin fotos, y cuánto del tope se ha usado. */
export interface AlbumGrupo {
  usadas: number;
  maximo: number;
  planes: PlanConFotos[];
}

export interface PlanConFotos {
  planId: string;
  titulo: string;
  fecha: string | null;
  horaInicio: string | null;
  fotos: number;
  /** La primera foto que se subió; `null` si aún no hay ninguna. */
  portadaId: string | null;
}

/** El álbum de un plan visto por ti: ya tiene en cuenta si empezó y los topes. */
export interface AlbumPlan {
  planId: string;
  grupoId: string;
  titulo: string;
  fecha: string | null;
  horaInicio: string | null;
  puedeSubir: boolean;
  restantesMias: number;
  restantesGrupo: number;
  fotos: FotoAlbum[];
}

export interface FotoAlbum {
  id: string;
  autorId: string;
  autorNombre: string;
  ancho: number;
  alto: number;
  subidaEn: string;
  puedeBorrar: boolean;
}

export type VarianteFoto = 'miniatura' | 'completa';
