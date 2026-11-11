import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import { app, setResidentClaims } from './api';
import { buildKeywords } from './keywords';
import { formatMeetingDate, notifyResidents, short } from './push';

initializeApp();
// São Paulo: menor latência para Jaraguá do Sul (RNF02)
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 5 });

/** API REST (Express) — URL: https://southamerica-east1-<projeto>.cloudfunctions.net/api */
export const api = onRequest(app);

const db = () => getFirestore();

/**
 * Contadores de votos mantidos no servidor para o app não conseguir fraudar.
 * Cada voto vale 1 (gostei) ou -1 (não gostei); trocar de opinião move o voto.
 */
export const onVoteWritten = onDocumentWritten('suggestions/{id}/votes/{uid}', async (e) => {
  const val = (snap: { exists: boolean; get: (f: string) => unknown } | undefined) =>
    snap?.exists ? (snap.get('value') === -1 ? -1 : 1) : 0;
  const before = val(e.data?.before);
  const after = val(e.data?.after);
  if (before === after) return;
  const up = (after === 1 ? 1 : 0) - (before === 1 ? 1 : 0);
  const down = (after === -1 ? 1 : 0) - (before === -1 ? 1 : 0);
  await db()
    .doc(`suggestions/${e.params.id}`)
    .update({ voteCount: FieldValue.increment(up), downCount: FieldValue.increment(down) })
    .catch(() => null);
});

/** Mantém a marca "resident" no token de login (usada pelas regras do Storage). */
export const syncResidentClaims = onDocumentWritten('residents/{uid}', async (e) => {
  const after = e.data?.after;
  if (!after?.exists) return;
  await setResidentClaims(e.params.uid, after.get('active') === true, after.get('role') === 'admin');
});
export const onRsvpCreated = onDocumentCreated('meetings/{id}/rsvps/{uid}', (e) =>
  db().doc(`meetings/${e.params.id}`).update({ goingCount: FieldValue.increment(1) }).catch(() => null),
);
export const onRsvpDeleted = onDocumentDeleted('meetings/{id}/rsvps/{uid}', (e) =>
  db().doc(`meetings/${e.params.id}`).update({ goingCount: FieldValue.increment(-1) }).catch(() => null),
);

/** Notificação push quando a diretoria publica um comunicado. */
export const onAnnouncementCreated = onDocumentCreated('announcements/{id}', async (e) => {
  const d = e.data?.data();
  if (!d) return;
  await notifyResidents({
    title: d.urgent ? `URGENTE: ${d.title}` : `Novo comunicado: ${d.title}`,
    body: short(String(d.body ?? '')),
    url: '/',
    exceptUid: d.authorId,
  });
});

/** Notificação push quando uma reunião é marcada. */
export const onMeetingCreated = onDocumentCreated('meetings/{id}', async (e) => {
  const d = e.data?.data();
  if (!d) return;
  const when = d.date?.toDate ? formatMeetingDate(d.date.toDate()) : '';
  await notifyResidents({
    title: `Reunião marcada: ${d.title}`,
    body: [when, d.location].filter(Boolean).join(' · '),
    url: `/reuniao/${e.params.id}`,
    exceptUid: d.authorId,
  });
});

/** Indexação para a busca do mural de Achados e Perdidos (seção 3.2 do TCC). */
export const indexLostFound = onDocumentWritten('lostFound/{id}', async (e) => {
  const after = e.data?.after;
  if (!after?.exists) return;
  const d = after.data()!;
  const keywords = buildKeywords(d.title ?? '', d.description ?? '');
  const same =
    Array.isArray(d.keywords) &&
    d.keywords.length === keywords.length &&
    keywords.every((k, i) => d.keywords[i] === k);
  if (!same) await after.ref.update({ keywords });
});

/** Ao apagar um item (inclusive por admin), remove a foto do Storage. */
export const cleanupLostFound = onDocumentDeleted('lostFound/{id}', async (e) => {
  const path = e.data?.get('photoPath');
  if (typeof path === 'string' && path) {
    await getStorage().bucket().file(path).delete({ ignoreNotFound: true });
  }
});

/** Ao apagar sugestão/reunião, limpa subcoleções de votos/presenças. */
export const cleanupSuggestion = onDocumentDeleted('suggestions/{id}', (e) =>
  db().recursiveDelete(db().collection(`suggestions/${e.params.id}/votes`)),
);
export const cleanupMeeting = onDocumentDeleted('meetings/{id}', (e) =>
  db().recursiveDelete(db().collection(`meetings/${e.params.id}/rsvps`)),
);
