import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import { shareInvite } from '@/lib/share';
import { Body, Button, Card, Chip, ErrorBox, Field, s, Screen } from '@/ui/components';
import { colors, space } from '@/ui/theme';

/** Gera um código de convite. Nome e endereço quem preenche é o morador. */
export default function NovoConvite() {
  const [role, setRole] = useState<'resident' | 'admin'>('resident');
  const [note, setNote] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gerar() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createInvite(role, note);
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
          <Ionicons name="ticket" size={52} color={colors.primary} />
          <Text selectable style={{ fontSize: 30, fontWeight: '800', letterSpacing: 2, marginVertical: space(2) }}>
            {code}
          </Text>
          <Body muted style={{ textAlign: 'center' }}>
            Envie este código ao morador. Ele mesmo preenche nome e endereço no primeiro acesso. O código só pode ser usado
            uma vez.
          </Body>
        </Card>
        <Button label="Compartilhar (WhatsApp, SMS...)" icon="share-social-outline" onPress={() => shareInvite(code)} />
        <Button
          label={copied ? 'Código copiado!' : 'Copiar só o código'}
          icon={copied ? 'checkmark' : 'copy-outline'}
          variant="secondary"
          onPress={async () => {
            await Clipboard.setStringAsync(code);
            setCopied(true);
          }}
        />
        <Button
          label="Gerar outro"
          icon="add"
          variant="secondary"
          onPress={() => {
            setCode(null);
            setNote('');
            setCopied(false);
          }}
        />
        <Button label="Concluir" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ErrorBox text={error} />
      <Text style={s.label}>Tipo de acesso</Text>
      <View style={[s.row, { marginBottom: space(2) }]}>
        <Chip label="Morador" icon="person-outline" selected={role === 'resident'} onPress={() => setRole('resident')} />
        <Chip
          label="Administrador"
          icon="shield-checkmark-outline"
          selected={role === 'admin'}
          onPress={() => setRole('admin')}
        />
      </View>
      <Field
        label="Observação (opcional)"
        placeholder="Só para você lembrar. Ex.: vizinho da casa 12"
        value={note}
        onChangeText={setNote}
        maxLength={80}
      />
      <Button label="Gerar código de convite" icon="ticket-outline" onPress={gerar} loading={loading} />
    </Screen>
  );
}
