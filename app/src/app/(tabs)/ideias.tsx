import { router } from 'expo-router';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { db } from '@/lib/firebase';
import { useLiveQuery } from '@/lib/hooks';
import { Suggestion, SUGGESTION_STATUS } from '@/lib/types';
import { Body, Button, Card, Chip, Empty, ErrorBox, Loading, s } from '@/ui/components';
import { VoteButtons } from '@/ui/vote-button';
import { colors, space } from '@/ui/theme';

export default function Ideias() {
  const [sort, setSort] = useState<'voteCount' | 'createdAt'>('voteCount');
  const { items, loading, error, refreshing, refresh } = useLiveQuery<Suggestion>(
    () => query(collection(db, 'suggestions'), orderBy(sort, 'desc'), limit(100)),
    [sort],
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
        contentContainerStyle={[s.screen, { paddingBottom: 100 }]}
        ListHeaderComponent={
          <>
            <Body muted style={{ marginBottom: space(1.5) }}>
              Proponha melhorias para o bairro e vote nas ideias dos vizinhos. Cada morador tem um voto por ideia.
            </Body>
            <View style={s.row}>
              <Chip label="Mais votadas" selected={sort === 'voteCount'} onPress={() => setSort('voteCount')} />
              <Chip label="Mais recentes" selected={sort === 'createdAt'} onPress={() => setSort('createdAt')} />
            </View>
            <ErrorBox text={error} />
            {loading && <Loading />}
          </>
        }
        ListEmptyComponent={loading ? undefined : <Empty icon="bulb-outline"text="Nenhuma sugestão ainda. Seja o primeiro!" />}
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push({ pathname: '/ideia/[id]', params: { id: item.id } })}
            style={{ flexDirection: 'row', gap: space(1.5), alignItems: 'center' }}>
            <VoteButtons suggestion={item} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[s.meta, { marginTop: 0, color: item.status === 'aprovada' ? colors.success : colors.muted }]}>
                {SUGGESTION_STATUS[item.status]} · por {item.authorName}
              </Text>
            </View>
          </Card>
        )}
      />
      <View style={s.fab}>
        <Button label="Enviar sugestão" icon="add-circle-outline" onPress={() => router.push('/ideia-nova')} />
      </View>
    </View>
  );
}
