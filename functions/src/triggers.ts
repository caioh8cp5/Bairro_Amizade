/**
 * Regras executadas pelos gatilhos do Firestore (ver index.ts).
 * Ficam separadas das funções do Firebase para poderem ser testadas
 * diretamente contra o emulador, sem depender do formato dos eventos.
 */
import { DocumentData, FieldValue, getFirestore } from 'firebase-admin/firestore';
import { buildKeywords } from './keywords';
import { formatMeetingDate, notifyResidents, short } from './push';

const db = () => getFirestore();

type Snap = { exists: boolean; get: (field: string) => unknown } | undefined;

/** Valor de um voto: 1 (gostei), -1 (não gostei) ou 0 (sem voto). Votos antigos sem "value" contam como 1. */
export function voteValue(snap: Snap): -1 | 0 | 1 {
  if (!snap?.exists) return 0;
  return snap.get('value') === -1 ? -1 : 1;
}

/** Quanto cada contador muda quando um voto passa de "before" para "after". */
export function voteDelta(before: -1 | 0 | 1, after: -1 | 0 | 1) {
  return {
    up: (after === 1 ? 1 : 0) - (before === 1 ? 1 : 0),
    down: (after === -1 ? 1 : 0) - (before === -1 ? 1 : 0),
  };
}

/** Atualiza voteCount/downCount da sugestão. Retorna false se nada mudou. */
export async function applyVoteChange(suggestionId: string, before: Snap, after: Snap): Promise<boolean> {
  const b = voteValue(before);
  const a = voteValue(after);
  if (a === b) return false;
  const { up, down } = voteDelta(b, a);
  await db()
    .doc(`suggestions/${suggestionId}`)
    .update({ voteCount: FieldValue.increment(up), downCount: FieldValue.increment(down) })
    .catch(() => null); // a sugestão pode ter sido apagada
  return true;
}

/** Soma (+1) ou subtrai (-1) uma confirmação de presença. */
export async function applyRsvpChange(meetingId: string, delta: 1 | -1): Promise<void> {
  await db()
    .doc(`meetings/${meetingId}`)
    .update({ goingCount: FieldValue.increment(delta) })
    .catch(() => null);
}

/**
 * Gera as palavras-chave da busca do mural (seção 3.2 do TCC).
 * Retorna as palavras novas, ou null se já estavam corretas (evita gravação em loop).
 */
export function keywordsToUpdate(data: DocumentData): string[] | null {
  const keywords = buildKeywords(data.title ?? '', data.description ?? '');
  const current = data.keywords;
  const same =
    Array.isArray(current) && current.length === keywords.length && keywords.every((k, i) => current[i] === k);
  return same ? null : keywords;
}

/** Monta e envia a notificação de um comunicado novo. */
export function notifyAnnouncement(data: DocumentData) {
  return notifyResidents({
    title: data.urgent ? `URGENTE: ${data.title}` : `Novo comunicado: ${data.title}`,
    body: short(String(data.body ?? '')),
    url: '/',
    exceptUid: data.authorId,
  });
}

/** Monta e envia a notificação de uma reunião nova. */
export function notifyMeeting(meetingId: string, data: DocumentData) {
  const when = data.date?.toDate ? formatMeetingDate(data.date.toDate()) : '';
  return notifyResidents({
    title: `Reunião marcada: ${data.title}`,
    body: [when, data.location].filter(Boolean).join(' · '),
    url: `/reuniao/${meetingId}`,
    exceptUid: data.authorId,
  });
}
