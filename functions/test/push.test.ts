import { formatMeetingDate, notifyResidents, short } from '../src/push';
import { db, resetEmulators } from './helpers';

const realFetch = global.fetch;
let sent: { to: string; title: string; body: string; data: { url: string } }[][];

beforeEach(async () => {
  await resetEmulators();
  sent = [];
  // Intercepta só o serviço de push do Expo; o resto (emuladores) segue normal
  global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).startsWith('https://exp.host')) {
      sent.push(JSON.parse(String(init?.body)));
      return new Response('{"data":[]}', { status: 200 });
    }
    return realFetch(url, init);
  }) as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
});

async function addResident(id: string, data: Record<string, unknown>) {
  await db().doc(`residents/${id}`).set({ name: id, active: true, role: 'resident', ...data });
}

describe('notifyResidents', () => {
  it('envia só para moradores ativos com token válido, sem o autor e sem repetir', async () => {
    await addResident('a', { pushToken: 'ExponentPushToken[AAA]' });
    await addResident('b', { pushToken: 'ExponentPushToken[BBB]' });
    await addResident('c', { pushToken: 'ExponentPushToken[AAA]' }); // mesmo aparelho
    await addResident('bloqueado', { active: false, pushToken: 'ExponentPushToken[CCC]' });
    await addResident('sem-token', { pushToken: null });
    await addResident('lixo', { pushToken: 'qualquer-coisa' });
    await addResident('autor', { pushToken: 'ExponentPushToken[DDD]' });

    const total = await notifyResidents({ title: 'T', body: 'B', url: '/', exceptUid: 'autor' });

    expect(total).toBe(2);
    expect(sent).toHaveLength(1);
    expect(sent[0].map((m) => m.to).sort()).toEqual(['ExponentPushToken[AAA]', 'ExponentPushToken[BBB]']);
    expect(sent[0][0]).toMatchObject({ title: 'T', body: 'B', data: { url: '/' } });
  });

  it('divide em lotes de 100 mensagens', async () => {
    await Promise.all(
      Array.from({ length: 150 }, (_, i) => addResident(`m${i}`, { pushToken: `ExponentPushToken[${i}]` })),
    );
    await notifyResidents({ title: 'T', body: 'B', url: '/' });
    expect(sent.map((lote) => lote.length)).toEqual([100, 50]);
  });

  it('não chama o serviço quando ninguém tem token', async () => {
    await addResident('a', {});
    expect(await notifyResidents({ title: 'T', body: 'B', url: '/' })).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it('registra erro sem quebrar quando o serviço de push falha', async () => {
    await addResident('a', { pushToken: 'ExponentPushToken[AAA]' });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    global.fetch = jest.fn(async () => new Response('erro', { status: 500 })) as typeof fetch;
    await expect(notifyResidents({ title: 'T', body: 'B', url: '/' })).resolves.toBe(1);
    expect(spy).toHaveBeenCalled();
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
