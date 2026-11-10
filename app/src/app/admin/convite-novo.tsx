import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import { Body, Button, Card, Chip, ErrorBox, Field, s, Screen } from '@/ui/components';
import { space } from '@/ui/theme';
import { shareInvite } from '@/lib/share';

export default function NovoConvite() {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [role, setRole] = useState<'resident' | 'admin'>('resident');
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gerar() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createInvite(name.trim(), unit.trim(), role);
      setCode(res.code);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (code) {
    return (
      <Screen>
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 48 }}>🎟️</Text>
          <Body>Convite criado para {name}</Body>
          <Text selectable style={{ fontSize: 30, fontWeight: '800', letterSpacing: 2, marginVertical: space(2) }}>
            {code}
          </Text>
          <Body muted style={{ textAlign: 'center' }}>
            Envie este código ao morador. Ele só pode ser usado uma vez.
          </Body>
        </Card>
        <Button label="Compartilhar (WhatsApp, SMS...)" onPress={() => shareInvite(code, name)} />
        <Button label="Concluir" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ErrorBox text={error} />
      <Field label="Nome do morador" value={name} onChangeText={setName} maxLength={80} />
      <Field label="Endereço / lote" placeholder="Rua X, 123" value={unit} onChangeText={setUnit} maxLength={80} />
      <Text style={s.label}>Tipo de acesso</Text>
      <View style={[s.row, { marginBottom: space(2) }]}>
        <Chip label="Morador" selected={role === 'resident'} onPress={() => setRole('resident')} />
        <Chip label="Administrador" selected={role === 'admin'} onPress={() => setRole('admin')} />
      </View>
      <Button label="Gerar código de convite" onPress={gerar} loading={loading} disabled={name.trim().length < 2 || !unit.trim()} />
    </Screen>
  );
}
