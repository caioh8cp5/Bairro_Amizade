import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useResident } from '@/lib/auth';
import { api } from '@/lib/api';
import { auth, db, storage } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { CATEGORIES, Category } from '@/lib/types';
import { Button, Chip, ErrorBox, Field, s, Screen } from '@/ui/components';
import { colors, space } from '@/ui/theme';

/**
 * Lê a foto do aparelho como Blob. No React Native, fetch(uri).blob() pode gerar
 * um arquivo vazio no envio ao Firebase; o XMLHttpRequest é o método recomendado pelo Expo.
 */
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('Não foi possível ler a foto.'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export default function NovoAchado() {
  const me = useResident();
  const [kind, setKind] = useState<'perdido' | 'encontrado'>('encontrado');
  const [category, setCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function escolherFoto(camera: boolean) {
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.5, // fotos leves para economizar dados dos moradores
      allowsEditing: true,
      aspect: [1, 1],
    };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Permissão da câmera negada.');
    }
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled) setPhoto(res.assets[0].uri);
  }

  async function salvar() {
    if (!category) return setError('Escolha uma categoria.');
    setLoading(true);
    setError(null);
    try {
      let photoUrl: string | null = null;
      let photoPath: string | null = null;
      if (photo) {
        // O Storage confere a marca "resident" do token; contas antigas podem não ter
        const token = await auth.currentUser!.getIdTokenResult();
        if (token.claims.resident !== true) {
          await api.syncClaims();
          await auth.currentUser!.getIdToken(true);
        }
        // A foto vai para o Cloud Storage; no Firestore fica só a URL
        photoPath = `lostFound/${me.id}/${Date.now()}.jpg`;
        const blob = await uriToBlob(photo);
        if (!blob.size) throw new Error('Não foi possível ler a foto. Tente escolher de novo.');
        const r = ref(storage, photoPath);
        await uploadBytes(r, blob, { contentType: 'image/jpeg' });
        photoUrl = await getDownloadURL(r);
      }
      await addDoc(collection(db, 'lostFound'), {
        title: title.trim(),
        description: description.trim(),
        category,
        kind,
        status: 'aberto',
        photoUrl,
        photoPath,
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
      <Text style={s.label}>O que aconteceu?</Text>
      <View style={[s.row, { marginBottom: space(2) }]}>
        <Chip
          label="Encontrei um objeto"
          icon="hand-left-outline"
          selected={kind === 'encontrado'}
          onPress={() => setKind('encontrado')}
        />
        <Chip label="Perdi um objeto" icon="help-circle-outline" selected={kind === 'perdido'} onPress={() => setKind('perdido')} />
      </View>

      <Text style={s.label}>Categoria</Text>
      <View style={[s.row, { marginBottom: space(2) }]}>
        {CATEGORIES.map((c) => (
          <Chip key={c.key} label={c.label} icon={c.icon} selected={category === c.key} onPress={() => setCategory(c.key)} />
        ))}
      </View>

      <Field label="Título" placeholder="Ex.: Molho de chaves com chaveiro azul" value={title} onChangeText={setTitle} maxLength={80} />
      <Field
        label="Descrição"
        placeholder="Onde e quando foi encontrado/perdido, detalhes..."
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={500}
      />

      <Text style={s.label}>Foto (opcional)</Text>
      {photo ? (
        <Pressable onPress={() => setPhoto(null)} accessibilityLabel="Remover foto">
          <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }} />
          <Text style={[s.meta, { textAlign: 'center' }]}>Toque na foto para remover</Text>
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', gap: space(1) }}>
          <Button label="Câmera" icon="camera-outline" variant="secondary" onPress={() => escolherFoto(true)} style={{ flex: 1 }} />
          <Button label="Galeria" icon="images-outline" variant="secondary" onPress={() => escolherFoto(false)} style={{ flex: 1 }} />
        </View>
      )}

      <View style={{ height: space(2) }} />
      <Button label="Publicar no mural" icon="send-outline" onPress={salvar} loading={loading} disabled={title.trim().length < 3} />
      <Text style={[s.meta, { color: colors.muted, textAlign: 'center' }]}>
        Visível apenas para moradores cadastrados.
      </Text>
    </Screen>
  );
}
