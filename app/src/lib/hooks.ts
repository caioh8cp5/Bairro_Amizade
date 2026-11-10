import { DocumentReference, onSnapshot, Query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { errorMessage } from './format';

/** Escuta uma consulta do Firestore em tempo real. */
export function useLiveQuery<T>(makeQuery: () => Query, deps: unknown[]) {
  const key = JSON.stringify(deps);
  const [state, setState] = useState<{ key: string; items: T[]; error: string | null } | null>(null);

  useEffect(() => {
    return onSnapshot(
      makeQuery(),
      (snap) =>
        setState({ key, items: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T), error: null }),
      (e) => setState({ key, items: [], error: errorMessage(e) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = state?.key === key ? state : null;
  return { items: current?.items ?? [], loading: !current, error: current?.error ?? null };
}

/** Escuta um documento em tempo real. `undefined` = carregando, `null` = não existe. */
export function useLiveDoc<T>(makeRef: () => DocumentReference, deps: unknown[]) {
  const key = JSON.stringify(deps);
  const [state, setState] = useState<{ key: string; data: T | null } | null>(null);
  useEffect(() => {
    return onSnapshot(
      makeRef(),
      (snap) => setState({ key, data: snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null }),
      () => setState({ key, data: null }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state?.key === key ? state.data : undefined;
}
