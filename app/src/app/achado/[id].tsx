import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage, formatDate } from '@/lib/format';
import { useLiveDoc } from '@/lib/hooks';
import { CATEGORIES, LostItem } from '@/lib/types';
import { Badge, Body, Button, Card, Empty, IconText, Loading, s, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function AchadoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useResident();
  const item = useLiveDoc<LostItem>(() => doc(db, 'lostFound', id), [id]);
  const [photoFailed, setPhotoFailed] = useState(false);

  if (item === undefined) return <Loading />;
  if (item === null) return <Empty icon="file-tray-outline" text="Este item foi removido." />;

  const canEdit = item.authorId === me.id || me.role === 'admin';
  const cat = CATEGORIES.find((c) => c.key === item.category);
  const devolvido = item.status === 'devolvido';

  const toggleStatus = () =>
    updateDoc(doc(db, 'lostFound', id), { status: devolvido ? 'aberto' : 'devolvido' }).catch((e) =>
      Alert.alert('Erro', errorMessage(e)),
    );

  const excluir = () =>
    Alert.alert('Excluir item?', item.title, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'lostFound', id)); // a foto é apagada pela Cloud Function
            router.back();
          } catch (e) {
            Alert.alert('Erro', errorMessage(e));
          }
        },
      },
    ]);

  return (
    <Screen>
      {item.photoUrl && !photoFailed && (
        <Image
          source={{ uri: item.photoUrl }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 14, marginBottom: space(2) }}
          contentFit="cover"
          onError={() => setPhotoFailed(true)}
          accessibilityLabel={`Foto: ${item.title}`}
        />
      )}
      {devolvido ? (
        <Badge label="JÁ DEVOLVIDO" icon="checkmark-circle" color={colors.success} bg={colors.successLight} />
      ) : (
        <Badge
          label={item.kind === 'encontrado' ? 'OBJETO ENCONTRADO' : 'OBJETO PERDIDO'}
          color={item.kind === 'encontrado' ? colors.primary : colors.accent}
          bg={item.kind === 'encontrado' ? colors.primaryLight : '#FFF3E0'}
        />
      )}
      <Title>{item.title}</Title>
      <IconText icon={cat?.icon ?? 'cube-outline'}>{`${cat?.label} · publicado em ${formatDate(item.createdAt)}`}</IconText>
      {!!item.description && (
        <Card style={{ marginTop: space(2) }}>
          <Body>{item.description}</Body>
        </Card>
      )}
      <Card>
        <Text style={s.cardTitle}>Quem publicou</Text>
        <Body>{item.authorName}</Body>
        <Text style={s.meta}>Procure essa pessoa pelo grupo da associação ou na diretoria.</Text>
      </Card>
      {canEdit && (
        <>
          <Button
            label={devolvido ? 'Marcar como ainda não devolvido' : 'Marcar como devolvido'}
            variant={devolvido ? 'ghost' : 'primary'}
            onPress={toggleStatus}
          />
          <Button label="Excluir" variant="danger" onPress={excluir} />
        </>
      )}
    </Screen>
  );
}
