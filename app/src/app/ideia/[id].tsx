import { router, useLocalSearchParams } from 'expo-router';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Alert, Text, View } from 'react-native';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage, formatDate } from '@/lib/format';
import { useLiveDoc } from '@/lib/hooks';
import { Suggestion, SUGGESTION_STATUS, SuggestionStatus } from '@/lib/types';
import { Body, Button, Card, Chip, Empty, Loading, s, Screen, Title } from '@/ui/components';
import { VoteButton } from '@/ui/vote-button';
import { space } from '@/ui/theme';

export default function IdeiaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useResident();
  const item = useLiveDoc<Suggestion>(() => doc(db, 'suggestions', id), [id]);

  if (item === undefined) return <Loading />;
  if (item === null) return <Empty icon="bulb-outline"text="Sugestão removida." />;

  const isAdmin = me.role === 'admin';
  const canDelete = isAdmin || item.authorId === me.id;

  const setStatus = (status: SuggestionStatus) =>
    updateDoc(doc(db, 'suggestions', id), { status }).catch((e) => Alert.alert('Erro', errorMessage(e)));

  const excluir = () =>
    Alert.alert('Excluir sugestão?', item.title, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'suggestions', id));
            router.back();
          } catch (e) {
            Alert.alert('Erro', errorMessage(e));
          }
        },
      },
    ]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: space(2), alignItems: 'center', marginBottom: space(2) }}>
        <VoteButton suggestion={item} large />
        <View style={{ flex: 1 }}>
          <Title>{item.title}</Title>
        </View>
      </View>
      <Body muted>
        {SUGGESTION_STATUS[item.status]} · por {item.authorName} em {formatDate(item.createdAt, false)}
      </Body>
      {!!item.description && (
        <Card style={{ marginTop: space(2) }}>
          <Body>{item.description}</Body>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <Text style={s.cardTitle}>Situação (administração)</Text>
          <View style={s.row}>
            {(Object.keys(SUGGESTION_STATUS) as SuggestionStatus[]).map((st) => (
              <Chip key={st} label={SUGGESTION_STATUS[st]} selected={item.status === st} onPress={() => setStatus(st)} />
            ))}
          </View>
        </Card>
      )}
      {canDelete && <Button label="Excluir sugestão" variant="danger" onPress={excluir} />}
    </Screen>
  );
}
