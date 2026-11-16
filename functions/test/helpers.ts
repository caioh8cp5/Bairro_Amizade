import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const PROJECT = process.env.GCLOUD_PROJECT!;
const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST!;
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST!;
export const PASSWORD = 'senha-de-teste';

export const db = () => getFirestore();

/** Apaga todos os dados e usuários dos emuladores entre os testes. */
export async function resetEmulators() {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE',
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

/** Cria um usuário no Auth e o perfil correspondente na whitelist (residents). */
export async function createResident(
  email: string,
  opts: { role?: 'resident' | 'admin'; active?: boolean; name?: string } = {},
) {
  const user = await getAuth().createUser({ email, password: PASSWORD });
  await db()
    .doc(`residents/${user.uid}`)
    .set({
      name: opts.name ?? email.split('@')[0],
      unit: 'Rua Teste, 1',
      email,
      phone: '',
      role: opts.role ?? 'resident',
      active: opts.active ?? true,
    });
  return user.uid;
}

/** Faz login no emulador do Auth e devolve o ID token, como o app faz. */
export async function idToken(email: string, password = PASSWORD): Promise<string> {
  const res = await fetch(
    `http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = (await res.json()) as { idToken?: string };
  if (!data.idToken) throw new Error(`Login falhou para ${email}`);
  return data.idToken;
}
