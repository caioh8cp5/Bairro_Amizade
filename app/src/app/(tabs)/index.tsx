import { router, useFocusEffect } from 'expo-router';
import { collection, deleteDoc, doc, limit, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage, formatDate } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import type { Announcement } from '@/lib/types';
import { isNew, markAnnouncementsSeen, useLastSeen } from '@/lib/unread';
import { Badge, Body, Button, Card, Empty, ErrorBox, Loading, s } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function Avisos() {
  const me = useResident();
  const isAdmin = me.role === 'admin';
  const { items, loading, error, refreshing, refresh } = useLiveQuery<Announcement>(
    () => query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(50)),
    [],
  );

  // Guarda a última visita ANTES de marcar como lido, para destacar o que é novo nesta abertura
  const lastSeen = useLastSeen();
  const lastSeenRef = useRef(lastSeen);
  useEffect(() => {
    lastSeenRef.current = lastSeen;
  }, [lastSeen]);
  const [seenBefore, setSeenBefore] = useState<number | null | undefined>(undefined);
  const loaded = lastSeen !== undefined;
  useFocusEffect(
    useCallback(() => {
      if (!loaded) return;
      setSeenBefore(lastSeenRef.current);
      markAnnouncementsSeen();
    }, [loaded]),
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
        ListHeaderComponent={
          <>
            <ErrorBox text={error} />
            <Body muted style={{ marginBottom: space(2) }}>
              Olá, {me.name.split(' ')[0]}! Aqui ficam os avisos oficiais da associação.
            </Body>
          </>
        }
        ListEmptyComponent={<Empty icon="mail-open-outline" text="Nenhum comunicado publicado ainda." />}
        renderItem={({ item }) => {
          const novo = isNew(item.createdAt?.toMillis(), seenBefore);
          return (
            <Card
              style={[
                item.urgent && { borderColor: colors.danger, borderWidth: 2 },
                novo && !item.urgent && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={isAdmin ? () => apagar(item) : undefined}>
              <View style={{ flexDirection: 'row', gap: space(1) }}>
                {novo && <Badge label="NOVO" icon="sparkles" color="#fff" bg={colors.primary} />}
                {item.urgent && <Badge label="URGENTE" icon="warning" color={colors.danger} bg={colors.dangerLight} />}
              </View>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Body>{item.body}</Body>
              <Text style={s.meta}>
                {item.authorName} · {formatDate(item.createdAt)}
                {isAdmin ? ' · toque para apagar' : ''}
              </Text>
            </Card>
          );
        }}
      />
      {isAdmin && (
        <View style={s.fab}>
          <Button label="Novo comunicado" icon="add-circle-outline" onPress={() => router.push('/aviso-novo')} />
        </View>
      )}
    </View>
  );
}
