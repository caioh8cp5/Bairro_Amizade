import type { Timestamp } from 'firebase/firestore';

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(ts: Timestamp | Date | null | undefined, withTime = true): string {
  if (!ts) return 'agora';
  const d = ts instanceof Date ? ts : ts.toDate();
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${date} às ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export function weekday(ts: Timestamp): string {
  return WEEKDAYS[ts.toDate().getDay()];
}

/** Converte "25/12/2026" + "19:30" em Date (ou null se inválido). */
export function parseDateTime(date: string, time: string): Date | null {
  const dm = date.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const tm = time.trim().match(/^(\d{1,2})[:h](\d{2})$/);
  if (!dm || !tm) return null;
  const d = new Date(+dm[3], +dm[2] - 1, +dm[1], +tm[1], +tm[2]);
  if (d.getDate() !== +dm[1] || d.getMonth() !== +dm[2] - 1 || +tm[1] > 23 || +tm[2] > 59) return null;
  return d;
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function errorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/user-disabled': 'Seu acesso foi bloqueado pela associação.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
    'auth/network-request-failed': 'Sem conexão com a internet.',
    'permission-denied': 'Você não tem permissão para isso.',
    unavailable: 'Sem conexão com o servidor.',
  };
  if (map[code]) return map[code];
  return e instanceof Error ? e.message : 'Algo deu errado. Tente novamente.';
}
