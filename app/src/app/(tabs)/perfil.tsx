import Constants from 'expo-constants';
import { router } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { logout, useResident } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { Badge, Body, Button, Card, Field, s, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function Perfil() {
  const me = useResident();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone ?? '');

  async function salvar() {
    try {
      await updateDoc(doc(db, 'residents', me.id), { name: name.trim(), phone: phone.trim() });
      setEditing(false);
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    }
  }

  return (
    <Screen>
      <Card>
        {me.role === 'admin' && <Badge label="ADMINISTRAÇÃO" color={colors.primary} bg={colors.primaryLight} />}
        {editing ? (
          <>
            <Field label="Nome" value={name} onChangeText={setName} maxLength={80} />
            <Field label="Telefone (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Button label="Salvar" onPress={salvar} disabled={name.trim().length < 2} />
            <Button label="Cancelar" variant="ghost" onPress={() => setEditing(false)} />
          </>
        ) : (
          <>
            <Title>{me.name}</Title>
            <Body>🏠 {me.unit}</Body>
            <Body>✉️ {me.email}</Body>
            {!!me.phone && <Body>📞 {me.phone}</Body>}
            <Button label="Editar meus dados" variant="secondary" onPress={() => setEditing(true)} style={{ marginTop: space(2) }} />
          </>
        )}
      </Card>

      {me.role === 'admin' && (
        <Button label="⚙️ Administração (convites e moradores)" onPress={() => router.push('/admin')} />
      )}
      <Button label="Sair do aplicativo" variant="ghost" onPress={logout} />

      <Text style={[s.meta, { textAlign: 'center', marginTop: space(4) }]}>
        Associação de Moradores do Champs Élysées · Bairro Amizade, Jaraguá do Sul/SC{'\n'}
        Versão {Constants.expoConfig?.version}
      </Text>
    </Screen>
  );
}
