import { formatMeetingDate, notifyResidents, short } from '../src/push';
import { db, resetEmulators } from './helpers';

type Multicast = { tokens: string[]; notification: { title: string; body: string }; data: { url: string } };
type Resp = { success: boolean; error?: { code: string; message: string } };

// O envio real passa pelo Firebase Cloud Messaging; nos testes ele é simulado
const mockSent: Multicast[] = [];
let mockRespond: (token: string) => Resp = () => ({ success: true });

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({
    sendEachForMulticast: async (msg: Multicast) => {
      mockSent.push(msg);
      const responses = msg.tokens.map((t) => mockRespond(t));
      return { successCount: responses.filter((r) => r.success).length, responses };
    },
  }),
}));

const token = (n: string | number) => `fcm-token-${String(n).padEnd(20, 'x')}`;

beforeEach(async () => {
  await resetEmulators();
  mockSent.length = 0;
  mockRespond = () => ({ success: true });
});

async function addResident(id: string, data: Record<string, unknown>) {
  await db().doc(`residents/${id}`).set({ name: id, active: true, role: 'resident', ...data });
}

describe('notifyResidents', () => {
  it('envia só para moradores ativos com token válido, sem o autor e sem repetir aparelho', async () => {
    await addResident('a', { pushToken: token('A') });
    await addResident('b', { pushToken: token('B') });
    await addResident('c', { pushToken: token('A') }); // mesmo aparelho de "a"
    await addResident('bloqueado', { active: false, pushToken: token('C') });
    await addResident('sem-token', { pushToken: null });
    await addResident('lixo', { pushToken: 'curto' });
    await addResident('autor', { pushToken: token('D') });

    const total = await notifyResidents({ title: 'T', body: 'B', url: '/', exceptUid: 'autor' });

    expect(total).toBe(2);
    expect(mockSent).toHaveLength(1);
    expect(mockSent[0].tokens.sort()).toEqual([token('A'), token('B')]);
    expect(mockSent[0]).toMatchObject({ notification: { title: 'T', body: 'B' }, data: { url: '/' } });
  });

  it('divide em lotes de 500 aparelhos', async () => {
    await Promise.all(Array.from({ length: 520 }, (_, i) => addResident(`m${i}`, { pushToken: token(i) })));
    await notifyResidents({ title: 'T', body: 'B', url: '/' });
    expect(mockSent.map((lote) => lote.tokens.length)).toEqual([500, 20]);
  });

  it('não chama o FCM quando ninguém tem token', async () => {
    await addResident('a', {});
    expect(await notifyResidents({ title: 'T', body: 'B', url: '/' })).toBe(0);
    expect(mockSent).toHaveLength(0);
  });

  it('apaga tokens de aparelhos que não existem mais e mantém os outros', async () => {
    await addResident('a', { pushToken: token('velho') });
    await addResident('b', { pushToken: token('velho') });
    await addResident('c', { pushToken: token('bom') });
    mockRespond = (t) =>
      t === token('velho')
        ? { success: false, error: { code: 'messaging/registration-token-not-registered', message: 'x' } }
        : { success: true };

    expect(await notifyResidents({ title: 'T', body: 'B', url: '/' })).toBe(1);
    expect((await db().doc('residents/a').get()).get('pushToken')).toBeNull();
    expect((await db().doc('residents/b').get()).get('pushToken')).toBeNull();
    expect((await db().doc('residents/c').get()).get('pushToken')).toBe(token('bom'));
  });

  it('registra outras falhas sem apagar o token', async () => {
    await addResident('a', { pushToken: token('A') });
    mockRespond = () => ({ success: false, error: { code: 'messaging/internal-error', message: 'fora do ar' } });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await notifyResidents({ title: 'T', body: 'B', url: '/' })).toBe(0);
    expect(spy).toHaveBeenCalled();
    expect((await db().doc('residents/a').get()).get('pushToken')).toBe(token('A'));
    spy.mockRestore();
  });
});

describe('short', () => {
  it('mantém textos curtos e corta os longos com reticências', () => {
    expect(short('oi')).toBe('oi');
    const cortado = short('x'.repeat(200));
    expect(cortado).toHaveLength(140);
    expect(cortado.endsWith('…')).toBe(true);
  });
});

describe('formatMeetingDate', () => {
  it('formata no horário de Brasília', () => {
    // 23:30 UTC = 20:30 em Brasília
    expect(formatMeetingDate(new Date('2026-12-10T23:30:00Z'))).toContain('20:30');
  });
});
