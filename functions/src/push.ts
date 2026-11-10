import { getFirestore } from 'firebase-admin/firestore';

/**
 * Envia notificações push para todos os moradores ativos que autorizaram,
 * usando o serviço de push do Expo (que entrega via Firebase Cloud Messaging).
 */
export async function notifyResidents(opts: { title: string; body: string; url: string; exceptUid?: string }) {
  const snap = await getFirestore().collection('residents').where('active', '==', true).get();
  const tokens = snap.docs
    .filter((d) => d.id !== opts.exceptUid)
    .map((d) => d.get('pushToken'))
    .filter((t): t is string => typeof t === 'string' && t.startsWith('ExponentPushToken'));

  const unique = [...new Set(tokens)];
  for (let i = 0; i < unique.length; i += 100) {
    const messages = unique.slice(i, i + 100).map((to) => ({
      to,
      title: opts.title,
      body: opts.body,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      data: { url: opts.url },
    }));
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) console.error('Falha ao enviar push', res.status, await res.text());
  }
  return unique.length;
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
