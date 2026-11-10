import { router } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { Body, Button, ErrorBox, Field, Screen } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function NovoAviso() {
  const me = useResident();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publicar() {
    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        body: body.trim(),
        urgent,
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
      <Field label="Título" value={title} onChangeText={setTitle} maxLength={120} />
      <Field label="Mensagem" value={body} onChangeText={setBody} multiline maxLength={5000} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space(3) }}>
        <Switch
          value={urgent}
          onValueChange={setUrgent}
          trackColor={{ true: colors.danger }}
          accessibilityLabel="Marcar como urgente"
        />
        <Body style={{ marginLeft: space(1.5) }}>Marcar como urgente</Body>
      </View>
      <Button label="Publicar" onPress={publicar} loading={loading} disabled={title.trim().length < 3 || !body.trim()} />
    </Screen>
  );
}
