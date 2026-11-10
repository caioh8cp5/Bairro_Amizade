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
import { app } from './api';
import { buildKeywords } from './keywords';

initializeApp();
// São Paulo: menor latência para Jaraguá do Sul (RNF02)
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 5 });

/** API REST (Express) — URL: https://southamerica-east1-<projeto>.cloudfunctions.net/api */
export const api = onRequest(app);

const db = () => getFirestore();

/** Contadores mantidos no servidor para o app não conseguir fraudar votos. */
export const onVoteCreated = onDocumentCreated('suggestions/{id}/votes/{uid}', (e) =>
  db().doc(`suggestions/${e.params.id}`).update({ voteCount: FieldValue.increment(1) }).catch(() => null),
);
export const onVoteDeleted = onDocumentDeleted('suggestions/{id}/votes/{uid}', (e) =>
  db().doc(`suggestions/${e.params.id}`).update({ voteCount: FieldValue.increment(-1) }).catch(() => null),
);
export const onRsvpCreated = onDocumentCreated('meetings/{id}/rsvps/{uid}', (e) =>
  db().doc(`meetings/${e.params.id}`).update({ goingCount: FieldValue.increment(1) }).catch(() => null),
);
export const onRsvpDeleted = onDocumentDeleted('meetings/{id}/rsvps/{uid}', (e) =>
  db().doc(`meetings/${e.params.id}`).update({ goingCount: FieldValue.increment(-1) }).catch(() => null),
);

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
