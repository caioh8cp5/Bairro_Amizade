import Constants from 'expo-constants';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { api } from '@/lib/api';
import { logout, useResident } from '@/lib/auth';
import { auth, db } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { pushSupported } from '@/lib/notifications';
import { Badge, Button, Card, Field, IconText, s, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function Perfil() {
  const me = useResident();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.name);
  const [unit, setUnit] = useState(me.unit);
  const [phone, setPhone] = useState(me.phone ?? '');
  const [deleting, setDeleting] = useState(false);

  async function salvar() {
    try {
      await updateDoc(doc(db, 'residents', me.id), { name: name.trim(), unit: unit.trim(), phone: phone.trim() });
      setEditing(false);
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    }
  }

  function excluirConta() {
    Alert.alert(
      'Excluir minha conta?',
      'Seu cadastro, login, itens do mural (com fotos), votos e presenças serão apagados para sempre. ' +
        'Para voltar a usar o app, você precisará de um novo convite.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir para sempre',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteMyAccount();
              await signOut(auth).catch(() => null);
            } catch (e) {
              setDeleting(false);
              Alert.alert('Não foi possível excluir', errorMessage(e));
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <Card>
        {me.role === 'admin' && (
          <Badge label="ADMINISTRAÇÃO" icon="shield-checkmark" color={colors.primary} bg={colors.primaryLight} />
        )}
        {editing ? (
          <>
            <Field label="Nome" value={name} onChangeText={setName} maxLength={80} />
            <Field label="Endereço (rua e número)" value={unit} onChangeText={setUnit} maxLength={80} />
            <Field label="Telefone (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Button
              label="Salvar"
              icon="checkmark"
              onPress={salvar}
              disabled={name.trim().length < 2 || unit.trim().length < 2}
            />
            <Button label="Cancelar" variant="ghost" onPress={() => setEditing(false)} />
          </>
        ) : (
          <>
            <Title>{me.name}</Title>
            <IconText icon="home-outline" color={colors.text}>
              {me.unit}
            </IconText>
            <IconText icon="mail-outline" color={colors.text}>
              {me.email}
            </IconText>
            {!!me.phone && (
              <IconText icon="call-outline" color={colors.text}>
                {me.phone}
              </IconText>
            )}
            <Button
              label="Editar meus dados"
              icon="create-outline"
              variant="secondary"
              onPress={() => setEditing(true)}
              style={{ marginTop: space(2) }}
            />
          </>
        )}
      </Card>

      {me.role === 'admin' && (
        <Button label="Administração" icon="settings-outline" onPress={() => router.push('/admin')} />
      )}
      <Button
        label="Política de Privacidade"
        icon="shield-outline"
        variant="secondary"
        onPress={() => router.push('/privacidade')}
      />
      <Button label="Sair do aplicativo" icon="log-out-outline" variant="ghost" onPress={logout} />

      {!pushSupported && (
        <Text style={[s.meta, { textAlign: 'center' }]}>
          As notificações funcionam apenas no app instalado pela Play Store.
        </Text>
      )}

      <Button
        label="Excluir minha conta"
        icon="trash-outline"
        variant="danger"
        onPress={excluirConta}
        loading={deleting}
        style={{ marginTop: space(4) }}
      />

      <Text style={[s.meta, { textAlign: 'center', marginTop: space(3) }]}>
        Associação de Moradores do Champs Élysées · Bairro Amizade, Jaraguá do Sul/SC{'\n'}
        Versão {Constants.expoConfig?.version}
      </Text>
    </Screen>
  );
}
