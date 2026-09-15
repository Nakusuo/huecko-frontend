import { describe, expect, it } from 'vitest';
import { describirAviso } from './avisosIncidencia';

describe('describirAviso', () => {
  it('una tardanza dice los minutos y que el plan sigue', () => {
    const texto = describirAviso('Sam', 'Repaso', 20, { replantea: false, criticidad: null });
    expect(texto).toContain('20 min tarde');
    expect(texto).toContain('sigue en pie');
    expect(texto).not.toContain('re-coordinación');
  });

  it('una ausencia crítica anuncia la votación', () => {
    const texto = describirAviso('Sam', 'Repaso', null, { replantea: true, criticidad: 'CRITICA' });
    expect(texto).toContain('votación');
  });

  it('una ausencia no crítica explica por qué el plan sigue', () => {
    const texto = describirAviso('Sam', 'Repaso', null, {
      replantea: false,
      criticidad: 'NO_CRITICA',
      razon: 'no es imprescindible',
    });
    expect(texto).toContain('sigue en pie');
    expect(texto).toContain('no es imprescindible');
  });

  it('usa el nombre real, no el del usuario de demo', () => {
    const texto = describirAviso('Marcela', 'Repaso', 10, { replantea: false, criticidad: null });
    expect(texto).toContain('Marcela');
    expect(texto).not.toContain('Alex');
  });
});
