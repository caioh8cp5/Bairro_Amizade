import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  QueryDocumentSnapshot,
  startAfter,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, TextInput, View } from 'react-native';
import { db } from '@/lib/firebase';
import { errorMessage, formatDate, normalize } from '@/lib/format';
import { CATEGORIES, Category, LostItem } from '@/lib/types';
import { Badge, Button, Card, Chip, Empty, ErrorBox, s } from '@/ui/components';
import { colors, font, space } from '@/ui/theme';

const PAGE = 10;

/**
 * Mural de Achados e Perdidos (seção 3.2 do TCC):
 * - paginação sob demanda (10 itens por vez, carregando mais ao rolar);
 * - filtro por categoria e busca textual feitos no servidor (array-contains
 *   sobre o campo "keywords" indexado pela Cloud Function).
 */
export default function Achados() {
  const [category, setCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [items, setItems] = useState<LostItem[]>([]);
  const cursor = useRef<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Debounce da busca para não disparar uma consulta a cada letra
  useEffect(() => {
    const t = setTimeout(() => {
      const word = normalize(search).split(/[^a-z0-9]+/).find((w) => w.length >= 3) ?? '';
      setTerm(word.slice(0, 20));
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (reset: boolean) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const c: QueryConstraint[] = [];
        if (category) c.push(where('category', '==', category));
        if (term) c.push(where('keywords', 'array-contains', term));
        c.push(orderBy('createdAt', 'desc'));
        if (!reset && cursor.current) c.push(startAfter(cursor.current));
        c.push(limit(PAGE));
        const snap = await getDocs(query(collection(db, 'lostFound'), ...c));
        if (id !== requestId.current) return; // resposta de uma busca antiga
        const page = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LostItem);
        setItems((prev) => (reset ? page : [...prev, ...page]));
        cursor.current = snap.docs[snap.docs.length - 1] ?? null;
        setHasMore(snap.docs.length === PAGE);
      } catch (e) {
        if (id === requestId.current) setError(errorMessage(e));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [category, term],
  );

  // Recarrega do zero quando o filtro muda ou a tela volta a ficar visível
  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[s.screen, { paddingBottom: 100 }]}
        onEndReachedThreshold={0.4}
        onEndReached={() => hasMore && !loading && items.length > 0 && load(false)}
        ListHeaderComponent={
          <>
            <TextInput
              style={[s.input, { marginBottom: space(1.5) }]}
              placeholder="🔍 Buscar (ex.: chave, carteira, gato)"
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Buscar itens"
              returnKeyType="search"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space(1) }}>
              <Chip label="Todos" selected={!category} onPress={() => setCategory(null)} />
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.key}
                  label={`${c.icon} ${c.label}`}
                  selected={category === c.key}
                  onPress={() => setCategory(c.key)}
                />
              ))}
            </ScrollView>
            <ErrorBox text={error} />
          </>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <Empty icon="🧺" text={term || category ? 'Nada encontrado com esse filtro.' : 'Nenhum item cadastrado.'} />
          )
        }
        ListFooterComponent={loading ? <ActivityIndicator color={colors.primary} style={{ margin: space(2) }} /> : undefined}
        renderItem={({ item }) => <ItemCard item={item} />}
      />
      <View style={s.fab}>
        <Button label="+ Cadastrar item" onPress={() => router.push('/achado-novo')} />
      </View>
    </View>
  );
}

function ItemCard({ item }: { item: LostItem }) {
  const cat = CATEGORIES.find((c) => c.key === item.category);
  const devolvido = item.status === 'devolvido';
  return (
    <Card
      onPress={() => router.push({ pathname: '/achado/[id]', params: { id: item.id } })}
      style={[{ flexDirection: 'row', gap: space(1.5) }, devolvido && { opacity: 0.6 }]}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={{ width: 84, height: 84, borderRadius: 10 }} contentFit="cover" />
      ) : (
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 10,
            backgroundColor: colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 36 }}>{cat?.icon}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: space(1) }}>
          {devolvido ? (
            <Badge label="DEVOLVIDO" color={colors.success} bg={colors.successLight} />
          ) : (
            <Badge
              label={item.kind === 'encontrado' ? 'ENCONTRADO' : 'PERDIDO'}
              color={item.kind === 'encontrado' ? colors.primary : colors.accent}
              bg={item.kind === 'encontrado' ? colors.primaryLight : '#FFF3E0'}
            />
          )}
        </View>
        <Text style={[s.cardTitle, { fontSize: font.body + 1 }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[s.meta, { marginTop: 0 }]}>
          {cat?.label} · {formatDate(item.createdAt, false)}
        </Text>
      </View>
    </Card>
  );
}
