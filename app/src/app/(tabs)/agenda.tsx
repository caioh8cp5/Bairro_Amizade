import { router } from 'expo-router';
import { collection, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { formatDate, weekday } from '@/lib/format';
import { useLiveQuery } from '@/lib/hooks';
import type { Meeting } from '@/lib/types';
import { Button, Card, Chip, Empty, ErrorBox, IconText, Loading, s } from '@/ui/components';
import { colors } from '@/ui/theme';

export default function Agenda() {
  const me = useResident();
  const [past, setPast] = useState(false);

  const { items, loading, error, refreshing, refresh } = useLiveQuery<Meeting>(() => {
    const now = Timestamp.fromDate(new Date(Date.now() - 3 * 3600 * 1000));
    return past
      ? query(collection(db, 'meetings'), where('date', '<', now), orderBy('date', 'desc'), limit(30))
      : query(collection(db, 'meetings'), where('date', '>=', now), orderBy('date', 'asc'), limit(30));
  }, [past]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
        contentContainerStyle={[s.screen, me.role === 'admin' && { paddingBottom: 100 }]}
        ListHeaderComponent={
          <>
            <View style={s.row}>
              <Chip label="Próximas" selected={!past} onPress={() => setPast(false)} />
              <Chip label="Anteriores e atas" selected={past} onPress={() => setPast(true)} />
            </View>
            <ErrorBox text={error} />
            {loading && <Loading />}
          </>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <Empty icon="calendar-outline" text={past ? 'Nenhuma reunião anterior.' : 'Nenhuma reunião marcada.'} />
          )
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push({ pathname: '/reuniao/[id]', params: { id: item.id } })}>
            <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16, textTransform: 'capitalize' }}>
              {weekday(item.date)}, {formatDate(item.date)}
            </Text>
            <Text style={s.cardTitle}>{item.title}</Text>
            {!!item.location && <IconText icon="location-outline">{item.location}</IconText>}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              <IconText icon="people-outline">{`${item.goingCount ?? 0} confirmado(s)`}</IconText>
              {!!item.minutes && <IconText icon="document-text-outline">Ata</IconText>}
            </View>
          </Card>
        )}
      />
      {me.role === 'admin' && (
        <View style={s.fab}>
          <Button label="Marcar reunião" icon="add-circle-outline" onPress={() => router.push('/reuniao-nova')} />
        </View>
      )}
    </View>
  );
}
