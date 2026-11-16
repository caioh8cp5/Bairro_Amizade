import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/** O FCM aceita no máximo 500 aparelhos por envio. */
const BATCH = 500;

/** Erros que indicam que o token não vale mais (app desinstalado, dados apagados...). */
const DEAD_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/**
 * Envia notificações push para todos os moradores ativos que autorizaram,
 * pelo Firebase Cloud Messaging (FCM). Tokens que deixaram de valer são
 * removidos do perfil para não tentar de novo.
 * Retorna quantos aparelhos receberam o envio.
 */
export async function notifyResidents(opts: { title: string; body: string; url: string; exceptUid?: string }) {
  const snap = await getFirestore().collection('residents').where('active', '==', true).get();

  // token -> perfis que usam esse aparelho (o mesmo celular pode ter sido usado por duas contas)
  const owners = new Map<string, string[]>();
  for (const d of snap.docs) {
    const token = d.get('pushToken');
    if (d.id === opts.exceptUid || typeof token !== 'string' || token.length < 20) continue;
    owners.set(token, [...(owners.get(token) ?? []), d.id]);
  }
  const tokens = [...owners.keys()];

  let delivered = 0;
  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const res = await getMessaging().sendEachForMulticast({
      tokens: batch,
      notification: { title: opts.title, body: opts.body },
      data: { url: opts.url },
      android: { priority: 'high', notification: { channelId: 'default', sound: 'default' } },
    });
    delivered += res.successCount;

    const dead: string[] = [];
    res.responses.forEach((r, idx) => {
      if (r.success) return;
      if (r.error && DEAD_TOKEN_ERRORS.has(r.error.code)) dead.push(batch[idx]);
      else console.error('Falha ao enviar push', r.error?.code, r.error?.message);
    });
    await Promise.all(
      dead.flatMap((t) =>
        (owners.get(t) ?? []).map((uid) => getFirestore().doc(`residents/${uid}`).update({ pushToken: null })),
      ),
    );
  }
  return delivered;
}

export function short(text: string, max = 140) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function formatMeetingDate(d: Date) {
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
