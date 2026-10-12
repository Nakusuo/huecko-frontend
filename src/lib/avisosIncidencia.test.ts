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

  it('si lo decidió la IA, lo dice: quien reporta debe saber quién juzgó su motivo', () => {
    const texto = describirAviso('Sam', 'Repaso', null, {
      replantea: false,
      criticidad: 'NO_CRITICA',
      razon: 'la persona avisó que se quedó dormida',
      origen: 'IA',
    });
    expect(texto).toContain('según la IA');
    expect(texto).toContain('se quedó dormida');
  });

  it('si la IA no respondió, dice que decidieron las reglas', () => {
    const texto = describirAviso('Sam', 'Repaso', null, {
      replantea: false,
      criticidad: 'NO_CRITICA',
      razon: 'no es imprescindible',
      origen: 'REGLAS_POR_FALLO',
    });
    expect(texto).toContain('la IA no respondió');
  });

  it('con las reglas de siempre no menciona la IA', () => {
    const texto = describirAviso('Sam', 'Repaso', null, {
      replantea: false,
      criticidad: 'NO_CRITICA',
      razon: 'no es imprescindible',
      origen: 'REGLAS',
    });
    expect(texto).not.toContain('IA');
  });

  it('usa el nombre real, no el del usuario de demo', () => {
    const texto = describirAviso('Marcela', 'Repaso', 10, { replantea: false, criticidad: null });
    expect(texto).toContain('Marcela');
    expect(texto).not.toContain('Alex');
  });
});
