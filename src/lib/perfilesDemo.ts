import type { PerfilSocial } from '../types/auth.types';
import type { Insignia, Logros } from '../types/profile.types';
import { insigniasDe } from './insignias';

/**
 * Perfiles de las personas de los grupos del modo demo, por correo (en demo
 * los integrantes no tienen id de cuenta). Sin servidor no hay fotos ajenas:
 * la tarjeta enseña la inicial.
 */
interface PerfilDemo extends PerfilSocial {
  planesJuntos: number;
  insignias: Insignia[];
}

const PERFILES: Record<string, PerfilDemo> = {
  'maria.c@huecko.com': {
    carrera: 'Ingeniería de Software',
    ciclo: 6,
    bio: 'Si el plan es antes de las 10, cuenten conmigo.',
    intereses: ['Café', 'Lectura', 'Running'],
    planesJuntos: 4,
    insignias: ['PRIMER_PLAN', 'PUNTUAL'],
  },
  'sam.p@huecko.com': {
    carrera: 'Ingeniería de Software',
    ciclo: 7,
    bio: 'Trabajo por las tardes: avísenme con tiempo.',
    intereses: ['Videojuegos', 'Música'],
    planesJuntos: 2,
    insignias: ['PRIMER_PLAN'],
  },
  'lucia.t@huecko.com': {
    carrera: 'Ingeniería de Software',
    ciclo: 6,
    bio: 'La del grupo que siempre lleva los apuntes.',
    intereses: ['Anime', 'Biblioteca', 'Vóley'],
    planesJuntos: 5,
    insignias: ['PRIMER_PLAN', 'HABITUAL', 'PUNTUAL', 'ORGANIZA'],
  },
  'diego.r@huecko.com': {
    carrera: 'Ciencias de la Computación',
    ciclo: 5,
    bio: null,
    intereses: ['Fútbol'],
    planesJuntos: 1,
    insignias: ['PRIMER_PLAN'],
  },
  'carlos.m@huecko.com': {
    carrera: 'Administración',
    ciclo: 8,
    bio: 'Organizo las pichangas de los sábados.',
    intereses: ['Fútbol', 'Parrilla'],
    planesJuntos: 6,
    insignias: ['PRIMER_PLAN', 'HABITUAL', 'ORGANIZA'],
  },
  'jorge.l@huecko.com': {
    carrera: 'Arquitectura',
    ciclo: 4,
    bio: null,
    intereses: ['Dibujo', 'Cine'],
    planesJuntos: 3,
    insignias: ['PRIMER_PLAN'],
  },
  'valeria.v@huecko.com': {
    carrera: 'Psicología',
    ciclo: 3,
    bio: 'Me apunto a todo lo que tenga karaoke.',
    intereses: ['Karaoke', 'Baile'],
    planesJuntos: 2,
    insignias: ['PRIMER_PLAN', 'PUNTUAL'],
  },
};

const VACIO: PerfilDemo = { carrera: null, ciclo: null, bio: null, intereses: [], planesJuntos: 0, insignias: [] };

export function perfilDemo(email: string): PerfilDemo {
  return PERFILES[email.trim().toLowerCase()] ?? VACIO;
}

/** Logros de la cuenta de ejemplo; una cuenta recién registrada en demo empieza sin ninguno. */
export function logrosDemo(esCuentaEjemplo: boolean): Logros {
  const [planesVividos, aTiempo, propuestos] = esCuentaEjemplo ? [6, 6, 3] : [0, 0, 0];
  return { planesVividos, aTiempo, propuestos, insignias: insigniasDe(planesVividos, aTiempo, propuestos) };
}
