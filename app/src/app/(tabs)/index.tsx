import { router } from 'expo-router';
import { collection, deleteDoc, doc, limit, orderBy, query } from 'firebase/firestore';
import { Alert, FlatList, Text, View } from 'react-native';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage, formatDate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import type { Announcement } from '@/lib/types';
import { Badge, Body, Button, Card, Empty, ErrorBox, Loading, s } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function Avisos() {
  const me = useResident();
  const isAdmin = me.role === 'admin';
  const { items, loading, error } = useLiveQuery<Announcement>(
    () => query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(50)),
    [],
  );

  function apagar(a: Announcement) {
    Alert.alert('Apagar comunicado?', a.title, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => deleteDoc(doc(db, 'announcements', a.id)).catch((e) => Alert.alert('Erro', errorMessage(e))),
      },
    ]);
  }

  if (loading) return <Loading />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[s.screen, isAdmin && { paddingBottom: 100 }]}
        ListHeaderComponent={
          <>
            <ErrorBox text={error} />
            <Body muted style={{ marginBottom: space(2) }}>
              Olá, {me.name.split(' ')[0]}! Aqui ficam os avisos oficiais da associação.
            </Body>
          </>
        }
        ListEmptyComponent={<Empty icon="📭" text="Nenhum comunicado publicado ainda." />}
        renderItem={({ item }) => (
          <Card
            style={item.urgent && { borderColor: colors.danger, borderWidth: 2 }}
            onPress={isAdmin ? () => apagar(item) : undefined}>
            {item.urgent && <Badge label="⚠️ URGENTE" color={colors.danger} bg={colors.dangerLight} />}
            <Text style={s.cardTitle}>{item.title}</Text>
            <Body>{item.body}</Body>
            <Text style={s.meta}>
              {item.authorName} · {formatDate(item.createdAt)}
              {isAdmin ? ' · toque para apagar' : ''}
            </Text>
          </Card>
        )}
      />
      {isAdmin && (
        <View style={s.fab}>
          <Button label="+ Novo comunicado" onPress={() => router.push('/aviso-novo')} />
        </View>
      )}
    </View>
  );
}
