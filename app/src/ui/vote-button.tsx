import { Ionicons } from '@expo/vector-icons';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { useLiveDoc } from '@/lib/hooks';
import type { Suggestion } from '@/lib/types';
import { colors } from './theme';

type Vote = { id: string; value?: 1 | -1 };

/**
 * Voto unitário (RF04): o voto é o documento suggestions/{id}/votes/{uid}, com
 * value 1 (gostei) ou -1 (não gostei). Como o id é o próprio uid, cada morador
 * tem um único voto por ideia; tocar de novo no mesmo botão retira o voto.
 * Os totais são atualizados no servidor pela Cloud Function onVoteWritten.
 */
export function VoteButtons({
  suggestion,
  large,
  direction = 'column',
}: {
  suggestion: Suggestion;
  large?: boolean;
  direction?: 'row' | 'column';
}) {
  const me = useResident();
  const vote = useLiveDoc<Vote>(() => doc(db, 'suggestions', suggestion.id, 'votes', me.id), [suggestion.id, me.id]);
  const [busy, setBusy] = useState(false);
  const current = vote ? (vote.value === -1 ? -1 : 1) : 0;
  const open = suggestion.status === 'aberta' || suggestion.status === 'em_analise';

  async function votar(value: 1 | -1) {
    if (!open) return;
    setBusy(true);
    try {
      const ref = doc(db, 'suggestions', suggestion.id, 'votes', me.id);
      if (current === value) await deleteDoc(ref);
      else await setDoc(ref, { value, createdAt: serverTimestamp() });
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const size = large ? 72 : 58;
  const button = (value: 1 | -1) => {
    const selected = current === value;
    const count = value === 1 ? (suggestion.voteCount ?? 0) : (suggestion.downCount ?? 0);
    const icon = value === 1 ? 'thumbs-up' : 'thumbs-down';
    return (
      <Pressable
        onPress={() => votar(value)}
        disabled={busy || !open || vote === undefined}
        accessibilityRole="button"
        accessibilityLabel={`${value === 1 ? 'Gostei' : 'Não gostei'}: ${count} votos${selected ? ', seu voto' : ''}`}
        accessibilityState={{ selected, disabled: !open }}
        style={({ pressed }) => ({
          width: size,
          height: size,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: colors.primary,
          backgroundColor: selected ? colors.primary : '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: !open ? 0.5 : pressed || busy ? 0.7 : 1,
        })}>
        <Ionicons
          name={selected ? icon : `${icon}-outline`}
          size={large ? 24 : 20}
          color={selected ? '#fff' : colors.primary}
        />
        <Text style={{ fontSize: large ? 20 : 16, fontWeight: '800', color: selected ? '#fff' : colors.primary }}>
          {count}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flexDirection: direction, gap: 8 }}>
      {button(1)}
      {button(-1)}
    </View>
  );
}
