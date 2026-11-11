import { router } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { Body, Button, ErrorBox, Field, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

export default function NovaIdeia() {
  const me = useResident();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, 'suggestions'), {
        title: title.trim(),
        description: description.trim(),
        status: 'aberta',
        voteCount: 0,
        downCount: 0,
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
      <Body muted style={{ marginBottom: space(2) }}>
        Ex.: instalar lixeiras na praça, trocar lâmpadas da rua, mutirão de limpeza...
      </Body>
      <ErrorBox text={error} />
      <Field label="Sua ideia (resumo)" value={title} onChangeText={setTitle} maxLength={120} />
      <Field label="Explique melhor (opcional)" value={description} onChangeText={setDescription} multiline maxLength={2000} />
      <Button label="Enviar sugestão" onPress={enviar} loading={loading} disabled={title.trim().length < 3} />
    </Screen>
  );
}
