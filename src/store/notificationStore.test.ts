import { beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

vi.stubEnv('VITE_API_URL', '');
instalarAlmacenamientoEnMemoria();
const { useNotificationStore, MAX_NOTIFICACIONES, migrarNotificaciones } = await import('./notificationStore');

const aviso = (i: number) => ({ title: `Aviso ${i}`, description: '', type: 'system' as const, groupId: 'g1' });

describe('notificationStore', () => {
  beforeEach(() => useNotificationStore.getState().reset());

  it('arranca sin avisos de ejemplo', () => {
    expect(useNotificationStore.getState().notifications).toEqual([]);
  });

  it('guarda la hora en ISO, no un texto fijo', () => {
    useNotificationStore.getState().addNotification(aviso(1));
    const [n] = useNotificationStore.getState().notifications;
    expect(n.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Number.isNaN(Date.parse(n.timestamp))).toBe(false);
  });

  it(`no guarda más de ${MAX_NOTIFICACIONES}: se quedan los más recientes`, () => {
    for (let i = 1; i <= MAX_NOTIFICACIONES + 5; i++) {
      useNotificationStore.getState().addNotification(aviso(i));
    }
    const lista = useNotificationStore.getState().notifications;
    expect(lista).toHaveLength(MAX_NOTIFICACIONES);
    expect(lista[0].title).toBe(`Aviso ${MAX_NOTIFICACIONES + 5}`);
    expect(lista.at(-1)?.title).toBe('Aviso 6');
  });

  it('descartar quita solo ese aviso', () => {
    useNotificationStore.getState().addNotification(aviso(1));
    useNotificationStore.getState().addNotification(aviso(2));
    const [segundo] = useNotificationStore.getState().notifications;
    useNotificationStore.getState().clearNotification(segundo.id);
    expect(useNotificationStore.getState().notifications.map((n) => n.title)).toEqual(['Aviso 1']);
  });

  it('reset no vuelve a meter avisos de ejemplo', () => {
    useNotificationStore.getState().addNotification(aviso(1));
    useNotificationStore.getState().reset();
    expect(useNotificationStore.getState().notifications).toEqual([]);
  });
});

describe('migrarNotificaciones', () => {
  const ahora = new Date('2026-09-21T12:00:00.000Z');
  const vieja = (id: string, timestamp: string) => ({ id, title: id, description: '', timestamp, read: false, type: 'system' });

  it('convierte los textos antiguos a ISO', () => {
    const [a, b] = migrarNotificaciones([vieja('a', 'Hace 10 min'), vieja('b', 'Ahora mismo')], ahora);
    expect(a.timestamp).toBe('2026-09-21T11:50:00.000Z');
    expect(b.timestamp).toBe(ahora.toISOString());
  });

  it('respeta las que ya tienen ISO y descarta los avisos de ejemplo', () => {
    const lista = migrarNotificaciones(
      [vieja('n1', 'Hace 10 min'), vieja('n2', 'Hace 5 min'), vieja('c', '2026-09-01T08:00:00.000Z')],
      ahora
    );
    expect(lista.map((n) => [n.id, n.timestamp])).toEqual([['c', '2026-09-01T08:00:00.000Z']]);
  });

  it('recorta lo persistido al límite y tolera basura', () => {
    const muchas = Array.from({ length: MAX_NOTIFICACIONES + 10 }, (_, i) => vieja(`x${i}`, 'Ahora mismo'));
    expect(migrarNotificaciones(muchas, ahora)).toHaveLength(MAX_NOTIFICACIONES);
    expect(migrarNotificaciones(null, ahora)).toEqual([]);
    expect(migrarNotificaciones([null, 3, { sinId: true }], ahora)).toEqual([]);
  });
});
