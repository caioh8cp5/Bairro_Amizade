import { router } from 'expo-router';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import { View } from 'react-native';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage, parseDateTime } from '@/lib/format';
import { Button, ErrorBox, Field, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

export default function NovaReuniao() {
  const me = useResident();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function salvar() {
    const when = parseDateTime(date, time);
    if (!when) return setError('Data ou horário inválidos. Use DD/MM/AAAA e HH:MM.');
    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, 'meetings'), {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        date: Timestamp.fromDate(when),
        minutes: '',
        goingCount: 0,
        authorId: me.id,
        authorName: me.name,
        createdAt: serverTimestamp(),
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ErrorBox text={error} />
      <Field label="Assunto" placeholder="Assembleia geral" value={title} onChangeText={setTitle} maxLength={120} />
      <View style={{ flexDirection: 'row', gap: space(1.5) }}>
        <View style={{ flex: 3 }}>
          <Field label="Data" placeholder="DD/MM/AAAA" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 2 }}>
          <Field label="Horário" placeholder="19:30" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />
        </View>
      </View>
      <Field label="Local" placeholder="Salão da associação" value={location} onChangeText={setLocation} maxLength={120} />
      <Field label="Pauta / descrição" value={description} onChangeText={setDescription} multiline maxLength={3000} />
      <Button label="Marcar reunião" onPress={salvar} loading={loading} disabled={title.trim().length < 3 || !date} />
    </Screen>
  );
}
