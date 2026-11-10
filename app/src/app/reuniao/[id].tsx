import { router, useLocalSearchParams } from 'expo-router';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage, formatDate, weekday } from '@/lib/format';
import { useLiveDoc } from '@/lib/hooks';
import type { Meeting } from '@/lib/types';
import { Body, Button, Card, Empty, Field, Loading, s, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function ReuniaoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useResident();
  const isAdmin = me.role === 'admin';
  const meeting = useLiveDoc<Meeting>(() => doc(db, 'meetings', id), [id]);
  const rsvp = useLiveDoc<{ id: string }>(() => doc(db, 'meetings', id, 'rsvps', me.id), [id, me.id]);
  const [busy, setBusy] = useState(false);
  const [minutes, setMinutes] = useState<string | null>(null);
  const [openedAt] = useState(() => Date.now());

  if (meeting === undefined) return <Loading />;
  if (meeting === null) return <Empty icon="🗓️" text="Reunião não encontrada." />;

  const isPast = meeting.date.toDate().getTime() < openedAt - 3 * 3600 * 1000;
  const going = !!rsvp;

  async function togglePresenca() {
    setBusy(true);
    try {
      const ref = doc(db, 'meetings', id, 'rsvps', me.id);
      if (going) await deleteDoc(ref);
      else await setDoc(ref, { name: me.name, createdAt: serverTimestamp() });
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function salvarAta() {
    try {
      await updateDoc(doc(db, 'meetings', id), { minutes: (minutes ?? '').trim() });
      setMinutes(null);
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    }
  }

  function excluir() {
    Alert.alert('Excluir reunião?', meeting!.title, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'meetings', id)).catch((e) => Alert.alert('Erro', errorMessage(e)));
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 18, textTransform: 'capitalize' }}>
        {weekday(meeting.date)}, {formatDate(meeting.date)}
      </Text>
      <Title>{meeting.title}</Title>
      {!!meeting.location && <Body>📍 {meeting.location}</Body>}
      {!!meeting.description && (
        <Card style={{ marginTop: space(2) }}>
          <Text style={s.cardTitle}>Pauta</Text>
          <Body>{meeting.description}</Body>
        </Card>
      )}

      <Card>
        <Body>
          ✅ <Text style={{ fontWeight: '700' }}>{meeting.goingCount ?? 0}</Text> morador(es) confirmaram presença
        </Body>
        {!isPast && (
          <Button
            label={going ? 'Cancelar minha presença' : 'Confirmar presença'}
            variant={going ? 'ghost' : 'primary'}
            onPress={togglePresenca}
            loading={busy}
            style={{ marginTop: space(1.5) }}
          />
        )}
      </Card>

      <Card>
        <Text style={s.cardTitle}>📄 Ata da reunião</Text>
        {minutes === null ? (
          <>
            <Body muted={!meeting.minutes}>{meeting.minutes || 'A ata ainda não foi publicada.'}</Body>
            {isAdmin && (
              <Button
                label={meeting.minutes ? 'Editar ata' : 'Escrever ata'}
                variant="secondary"
                onPress={() => setMinutes(meeting.minutes ?? '')}
                style={{ marginTop: space(1.5) }}
              />
            )}
          </>
        ) : (
          <>
            <Field label="Texto da ata" value={minutes} onChangeText={setMinutes} multiline />
            <Button label="Salvar ata" onPress={salvarAta} />
            <Button label="Cancelar" variant="ghost" onPress={() => setMinutes(null)} />
          </>
        )}
      </Card>

      {isAdmin && <Button label="Excluir reunião" variant="danger" onPress={excluir} />}
    </Screen>
  );
}
