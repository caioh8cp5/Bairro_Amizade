import { Timestamp } from 'firebase-admin/firestore';
import * as push from '../src/push';
import {
  applyRsvpChange,
  applyVoteChange,
  keywordsToUpdate,
  notifyAnnouncement,
  notifyMeeting,
  voteDelta,
  voteValue,
} from '../src/triggers';
import { db, resetEmulators } from './helpers';

beforeEach(resetEmulators);

const snap = (data?: Record<string, unknown>) =>
  data ? { exists: true, get: (f: string) => data[f] } : { exists: false, get: () => undefined };

describe('votos', () => {
  it('voteValue: sem voto = 0, "não gostei" = -1, o resto = 1', () => {
    expect(voteValue(undefined)).toBe(0);
    expect(voteValue(snap())).toBe(0);
    expect(voteValue(snap({ value: -1 }))).toBe(-1);
    expect(voteValue(snap({ value: 1 }))).toBe(1);
    expect(voteValue(snap({}))).toBe(1); // votos antigos, de antes do "não gostei"
  });

  it('voteDelta: cada transição move os contadores certos', () => {
    expect(voteDelta(0, 1)).toEqual({ up: 1, down: 0 });
    expect(voteDelta(0, -1)).toEqual({ up: 0, down: 1 });
    expect(voteDelta(1, -1)).toEqual({ up: -1, down: 1 });
    expect(voteDelta(-1, 0)).toEqual({ up: 0, down: -1 });
  });

  it('applyVoteChange atualiza a sugestão no banco', async () => {
    const ref = db().doc('suggestions/s1');
    await ref.set({ voteCount: 0, downCount: 0 });

    expect(await applyVoteChange('s1', snap(), snap({ value: 1 }))).toBe(true);
    expect(await applyVoteChange('s1', snap({ value: 1 }), snap({ value: -1 }))).toBe(true);
    expect((await ref.get()).data()).toMatchObject({ voteCount: 0, downCount: 1 });
  });

  it('applyVoteChange não grava quando o voto não mudou', async () => {
    expect(await applyVoteChange('s1', snap({ value: 1 }), snap({ value: 1 }))).toBe(false);
  });

  it('applyVoteChange não quebra se a sugestão foi apagada', async () => {
    await expect(applyVoteChange('nao-existe', snap(), snap({ value: 1 }))).resolves.toBe(true);
  });
});

describe('presenças', () => {
  it('soma e subtrai confirmações', async () => {
    const ref = db().doc('meetings/m1');
    await ref.set({ goingCount: 0 });
    await applyRsvpChange('m1', 1);
    await applyRsvpChange('m1', 1);
    await applyRsvpChange('m1', -1);
    expect((await ref.get()).get('goingCount')).toBe(1);
  });

  it('não quebra se a reunião foi apagada', async () => {
    await expect(applyRsvpChange('nao-existe', 1)).resolves.toBeUndefined();
  });
});

describe('keywordsToUpdate', () => {
  it('gera as palavras-chave de um item novo', () => {
    expect(keywordsToUpdate({ title: 'Gato', description: '' })).toEqual(['gat', 'gato']);
  });

  it('retorna null quando já estão corretas (evita loop de gravação)', () => {
    expect(keywordsToUpdate({ title: 'Gato', keywords: ['gat', 'gato'] })).toBeNull();
  });

  it('recalcula quando o título muda', () => {
    expect(keywordsToUpdate({ title: 'Cão', keywords: ['gat', 'gato'] })).toEqual(['cao']);
  });

  it('aceita item sem título ou descrição', () => {
    expect(keywordsToUpdate({})).toEqual([]);
  });
});

describe('notificações', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(push, 'notifyResidents').mockResolvedValue(0);
  });
  afterEach(() => spy.mockRestore());

  it('comunicado urgente leva o prefixo URGENTE e não notifica o autor', async () => {
    await notifyAnnouncement({ title: 'Falta de água', body: 'Amanhã', urgent: true, authorId: 'adm' });
    expect(spy).toHaveBeenCalledWith({ title: 'URGENTE: Falta de água', body: 'Amanhã', url: '/', exceptUid: 'adm' });
  });

  it('comunicado comum', async () => {
    await notifyAnnouncement({ title: 'Festa', authorId: 'adm' });
    expect(spy.mock.calls[0][0]).toMatchObject({ title: 'Novo comunicado: Festa', body: '' });
  });

  it('reunião traz data e local e abre a tela da reunião', async () => {
    await notifyMeeting('m1', {
      title: 'Assembleia',
      location: 'Salão',
      date: Timestamp.fromDate(new Date('2026-12-10T23:30:00Z')),
      authorId: 'adm',
    });
    const msg = spy.mock.calls[0][0];
    expect(msg.title).toBe('Reunião marcada: Assembleia');
    expect(msg.body).toContain('20:30');
    expect(msg.body).toContain('Salão');
    expect(msg.url).toBe('/reuniao/m1');
  });

  it('reunião sem data nem local', async () => {
    await notifyMeeting('m2', { title: 'Mutirão' });
    expect(spy.mock.calls[0][0].body).toBe('');
  });
});
