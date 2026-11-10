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
