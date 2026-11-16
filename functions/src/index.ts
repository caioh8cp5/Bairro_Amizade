/**
 * Ponto de entrada das Cloud Functions: só "liga" cada função ao seu gatilho.
 * As regras ficam em api.ts (API REST) e triggers.ts (gatilhos), que são testadas.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentDeleted, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { app, setResidentClaims } from './api';
import { applyRsvpChange, applyVoteChange, keywordsToUpdate, notifyAnnouncement, notifyMeeting } from './triggers';

initializeApp();
// São Paulo: menor latência para Jaraguá do Sul (RNF02)
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 5 });

const db = () => getFirestore();

/** API REST (Express) — URL: https://southamerica-east1-<projeto>.cloudfunctions.net/api */
export const api = onRequest(app);

/** Contadores de votos mantidos no servidor para o app não conseguir fraudar. */
export const onVoteWritten = onDocumentWritten('suggestions/{id}/votes/{uid}', (e) =>
  applyVoteChange(e.params.id, e.data?.before, e.data?.after),
);

/** Contador de presenças das reuniões. */
export const onRsvpCreated = onDocumentCreated('meetings/{id}/rsvps/{uid}', (e) => applyRsvpChange(e.params.id, 1));
export const onRsvpDeleted = onDocumentDeleted('meetings/{id}/rsvps/{uid}', (e) => applyRsvpChange(e.params.id, -1));

/** Mantém a marca "resident" no token de login (usada pelas regras do Storage). */
export const syncResidentClaims = onDocumentWritten('residents/{uid}', async (e) => {
  const after = e.data?.after;
  if (!after?.exists) return;
  await setResidentClaims(e.params.uid, after.get('active') === true, after.get('role') === 'admin');
});

/** Notificações push. */
export const onAnnouncementCreated = onDocumentCreated('announcements/{id}', async (e) => {
  const d = e.data?.data();
  if (d) await notifyAnnouncement(d);
});
export const onMeetingCreated = onDocumentCreated('meetings/{id}', async (e) => {
  const d = e.data?.data();
  if (d) await notifyMeeting(e.params.id, d);
});

/** Indexação para a busca do mural de Achados e Perdidos (seção 3.2 do TCC). */
export const indexLostFound = onDocumentWritten('lostFound/{id}', async (e) => {
  const after = e.data?.after;
  if (!after?.exists) return;
  const keywords = keywordsToUpdate(after.data()!);
  if (keywords) await after.ref.update({ keywords });
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
