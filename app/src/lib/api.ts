import { API_URL, auth } from './firebase';

/** Cliente da API REST (Express nas Cloud Functions). */
async function request<T>(method: string, path: string, body?: unknown, authed = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authed) {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique sua internet.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erro ${res.status}`);
  return data as T;
}

export type Invite = {
  code: string;
  note: string;
  role: 'resident' | 'admin';
  used: boolean;
  createdAt: number | null;
};

export const api = {
  register: (data: {
    code: string;
    name: string;
    unit: string;
    email: string;
    password: string;
    acceptedTerms: boolean;
  }) => request<{ ok: true }>('POST', '/register', data, false),
  deleteMyAccount: () => request<{ ok: true }>('DELETE', '/me'),
  listInvites: () => request<Invite[]>('GET', '/invites'),
  createInvite: (role: 'resident' | 'admin', note = '') =>
    request<{ code: string }>('POST', '/invites', { role, note }),
  deleteInvite: (code: string) => request<{ ok: true }>('DELETE', `/invites/${code}`),
  updateResident: (uid: string, change: { active?: boolean; role?: 'resident' | 'admin' }) =>
    request<{ ok: true }>('PATCH', `/residents/${uid}`, change),
};
