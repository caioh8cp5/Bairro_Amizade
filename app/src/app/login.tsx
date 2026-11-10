import { router } from 'expo-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { auth } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { Body, Button, ErrorBox, Field, Screen } from '@/ui/components';
import { colors, font, space } from '@/ui/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar() {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function esqueci() {
    if (!email.trim()) {
      setError('Digite seu e-mail acima para receber o link de nova senha.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Pronto', 'Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ alignItems: 'center', marginTop: space(8), marginBottom: space(4) }}>
          <Text style={{ fontSize: 64 }}>🏡</Text>
          <Text
            accessibilityRole="header"
            style={{ fontSize: font.title + 2, fontWeight: '800', color: colors.primary, textAlign: 'center' }}>
            Champs Élysées
          </Text>
          <Body muted style={{ textAlign: 'center' }}>
            Associação de Moradores · Bairro Amizade
          </Body>
        </View>

        <ErrorBox text={error} />
        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        <Button label="Entrar" onPress={entrar} loading={loading} disabled={!email || !password} />
        <Button label="Esqueci minha senha" variant="ghost" onPress={esqueci} />

        <View style={{ marginTop: space(4) }}>
          <Body muted style={{ textAlign: 'center', marginBottom: space(1) }}>
            Recebeu um código de convite da associação?
          </Body>
          <Button label="Primeiro acesso com convite" variant="secondary" onPress={() => router.push('/cadastro')} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
