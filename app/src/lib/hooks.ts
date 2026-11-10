import { DocumentReference, onSnapshot, Query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { errorMessage } from './format';

/**
 * Escuta uma consulta do Firestore em tempo real.
 * `refresh()` refaz a assinatura (usado no "puxar para atualizar").
 */
export function useLiveQuery<T>(makeQuery: () => Query, deps: unknown[]) {
  const [nonce, setNonce] = useState(0);
  const [refreshKey, setRefreshKey] = useState<string | null>(null);
  const key = JSON.stringify([...deps, nonce]);
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
  const sameFilter = state != null && JSON.stringify(JSON.parse(state.key).slice(0, -1)) === JSON.stringify(deps);

  return {
    // Ao atualizar, mantém os itens antigos na tela até chegarem os novos
    items: current?.items ?? (sameFilter ? state.items : []),
    loading: !current && !sameFilter,
    error: current?.error ?? null,
    refreshing: refreshKey === key && !current,
    refresh: () => {
      const next = JSON.stringify([...deps, nonce + 1]);
      setRefreshKey(next);
      setNonce((n) => n + 1);
    },
  };
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
