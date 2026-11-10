import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { unregisterPush } from './notifications';
import type { Resident } from './types';

/**
 * Estado de acesso do app (Módulo de Controle de Acesso):
 * - signedOut: ninguém logado
 * - blocked: logado no Firebase, mas fora da whitelist ou bloqueado
 * - ready: morador ativo na whitelist
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'blocked'; user: User }
  | { status: 'ready'; user: User; resident: Resident };

const AuthContext = createContext<AuthState>({ status: 'loading' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<{ uid: string; resident: Resident | null } | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'residents', user.uid),
      (snap) => {
        const data = snap.data() as Omit<Resident, 'id'> | undefined;
        setProfile({ uid: user.uid, resident: snap.exists() && data?.active ? { id: snap.id, ...data } : null });
      },
      // As Security Rules negam a leitura para quem não está na whitelist
      () => setProfile({ uid: user.uid, resident: null }),
    );
  }, [user]);

  let state: AuthState;
  if (user === undefined) state = { status: 'loading' };
  else if (user === null) state = { status: 'signedOut' };
  else if (profile?.uid !== user.uid) state = { status: 'loading' };
  else if (!profile.resident) state = { status: 'blocked', user };
  else state = { status: 'ready', user, resident: profile.resident };

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Usar apenas em telas protegidas (status === 'ready'). */
export function useResident(): Resident {
  const state = useAuth();
  if (state.status !== 'ready') throw new Error('Tela protegida acessada sem login.');
  return state.resident;
}

export async function logout() {
  const uid = auth.currentUser?.uid;
  if (uid) await unregisterPush(uid);
  await signOut(auth);
}
