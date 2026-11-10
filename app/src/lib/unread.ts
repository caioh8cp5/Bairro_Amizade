import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Guarda no aparelho quando o morador abriu o mural pela última vez,
 * para marcar comunicados como "NOVO" e mostrar o contador na aba.
 */
const KEY = 'announcements:lastSeen';
let lastSeen: number | null | undefined; // undefined = ainda carregando
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

AsyncStorage.getItem(KEY)
  .then((v) => {
    lastSeen = v ? Number(v) : null;
    emit();
  })
  .catch(() => {
    lastSeen = null;
    emit();
  });

export function markAnnouncementsSeen() {
  lastSeen = Date.now();
  AsyncStorage.setItem(KEY, String(lastSeen)).catch(() => null);
  emit();
}

export function useLastSeen(): number | null | undefined {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => lastSeen,
  );
}

/** Um comunicado é "novo" se chegou depois da última visita (no primeiro uso, nada é marcado). */
export function isNew(createdAtMs: number | undefined, seen: number | null | undefined) {
  return seen != null && createdAtMs != null && createdAtMs > seen;
}
