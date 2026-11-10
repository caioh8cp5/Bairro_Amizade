import { router } from 'expo-router';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { Button, ErrorBox, Field, Screen } from '@/ui/components';
import { DateTimeField } from '@/ui/date-time-field';

/** Próximo dia às 19h30 como sugestão inicial. */
function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 30, 0, 0);
  return d;
}

export default function NovaReuniao() {
  const me = useResident();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [when, setWhen] = useState(defaultDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function salvar() {
    if (when.getTime() < Date.now()) return setError('Escolha uma data e horário no futuro.');
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
      <DateTimeField label="Data e horário" value={when} onChange={setWhen} />
      <Field label="Local" placeholder="Salão da associação" value={location} onChangeText={setLocation} maxLength={120} />
      <Field label="Pauta / descrição" value={description} onChangeText={setDescription} multiline maxLength={3000} />
      <Button
        label="Marcar reunião"
        icon="calendar-outline"
        onPress={salvar}
        loading={loading}
        disabled={title.trim().length < 3}
      />
    </Screen>
  );
}
