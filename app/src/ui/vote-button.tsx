import { Ionicons } from '@expo/vector-icons';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { useLiveDoc } from '@/lib/hooks';
import type { Suggestion } from '@/lib/types';
import { colors } from './theme';

/**
 * Voto unitário (RF04): o voto é o documento suggestions/{id}/votes/{uid}.
 * Como o id é o próprio uid, cada morador só consegue ter um voto por ideia,
 * e o total (voteCount) é atualizado no servidor pela Cloud Function.
 */
export function VoteButton({ suggestion, large }: { suggestion: Suggestion; large?: boolean }) {
  const me = useResident();
  const vote = useLiveDoc<{ id: string }>(
    () => doc(db, 'suggestions', suggestion.id, 'votes', me.id),
    [suggestion.id, me.id],
  );
  const [busy, setBusy] = useState(false);
  const voted = !!vote;
  const open = suggestion.status === 'aberta' || suggestion.status === 'em_analise';

  async function toggle() {
    if (!open) return;
    setBusy(true);
    try {
      const ref = doc(db, 'suggestions', suggestion.id, 'votes', me.id);
      if (voted) await deleteDoc(ref);
      else await setDoc(ref, { createdAt: serverTimestamp() });
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const size = large ? 84 : 64;
  return (
    <Pressable
      onPress={toggle}
      disabled={busy || !open || vote === undefined}
      accessibilityRole="button"
      accessibilityLabel={`${voted ? 'Remover voto' : 'Votar'}. ${suggestion.voteCount} votos`}
      accessibilityState={{ selected: voted, disabled: !open }}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.primary,
        backgroundColor: voted ? colors.primary : '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed || busy ? 0.7 : 1,
      })}>
      <Ionicons name={voted ? 'thumbs-up' : 'thumbs-up-outline'} size={large ? 26 : 22} color={voted ? '#fff' : colors.primary} />
      <Text style={{ fontSize: large ? 22 : 18, fontWeight: '800', color: voted ? '#fff' : colors.primary }}>
        {suggestion.voteCount ?? 0}
      </Text>
    </Pressable>
  );
}
