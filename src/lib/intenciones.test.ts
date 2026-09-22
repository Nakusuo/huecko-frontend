import { describe, expect, it } from 'vitest';
import { RUTA_CREAR_GRUPO, rutaProponerPlan } from './intenciones';

describe('rutaProponerPlan', () => {
  it('sin grupos lleva a crear el primero', () => {
    expect(rutaProponerPlan([])).toBe(RUTA_CREAR_GRUPO);
  });

  it('con un solo grupo abre el formulario en ese grupo', () => {
    expect(rutaProponerPlan([{ id: 'g-1' }])).toBe('/groups/g-1?proponer=1');
  });

  it('con varios grupos pide elegir en la lista', () => {
    expect(rutaProponerPlan([{ id: 'a' }, { id: 'b' }])).toBe('/groups?proponer=1');
  });
});
