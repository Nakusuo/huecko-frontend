import { describe, expect, it } from 'vitest';
import { codigoDelEnlace, enlaceDeInvitacion } from './invitacion';

describe('enlace de invitación', () => {
  it('lleva a Mis grupos con el código, sin barras dobles', () => {
    expect(enlaceDeInvitacion('HUECKO26', 'https://huecko.vercel.app/')).toBe('https://huecko.vercel.app/groups?unirse=HUECKO26');
  });

  it('del enlace solo se toman letras y números', () => {
    expect(codigoDelEnlace('huec-ko 26')).toBe('HUECKO26');
    expect(codigoDelEnlace('<script>')).toBe('SCRIPT');
    expect(codigoDelEnlace('ab')).toBeNull();
    expect(codigoDelEnlace(null)).toBeNull();
  });
});
