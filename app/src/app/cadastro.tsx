import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { maskInviteCode } from '@/lib/share';
import { Body, Button, ErrorBox, Field, s, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

/** Primeiro acesso: o morador usa o código de convite e preenche os próprios dados. */
export default function Cadastro() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeComplete = code.length === 9; // XXXX-XXXX

  async function cadastrar() {
    setError(null);
    if (!codeComplete) return setError('O código de convite tem 8 letras/números.');
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setLoading(true);
    try {
      await api.register({
        code: `CE-${code}`,
        name: name.trim(),
        unit: unit.trim(),
        email: email.trim(),
        password,
        acceptedTerms: accepted,
      });
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // O AuthProvider detecta o login e abre o app automaticamente
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Title>Criar minha conta</Title>
        <Body muted style={{ marginBottom: space(3) }}>
          Digite o código de convite que você recebeu da diretoria da associação. Cada código só pode ser usado uma vez.
        </Body>
        <ErrorBox text={error} />

        <Text style={s.label}>Código de convite</Text>
        <View style={[s.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, marginBottom: space(2) }]}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.muted, letterSpacing: 2 }}>CE-</Text>
          <TextInput
            accessibilityLabel="Código de convite"
            value={code}
            onChangeText={(t) => setCode(maskInviteCode(t))}
            placeholder="XXXX-XXXX"
            placeholderTextColor={colors.border}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={12}
            style={{ flex: 1, fontSize: 22, fontWeight: '700', letterSpacing: 2, color: colors.text, paddingVertical: space(1.5) }}
          />
        </View>

        <Field label="Seu nome" value={name} onChangeText={setName} autoComplete="name" maxLength={80} />
        <Field
          label="Endereço (rua e número)"
          placeholder="Ex.: Rua das Flores, 120"
          value={unit}
          onChangeText={setUnit}
          autoComplete="street-address"
          maxLength={80}
        />
        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field label="Crie uma senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <Field label="Repita a senha" value={confirm} onChangeText={setConfirm} secureTextEntry />

        <Pressable
          onPress={() => setAccepted((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space(1.5), marginBottom: space(2) }}>
          <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={30} color={colors.primary} />
          <Body style={{ flex: 1 }}>
            Li e aceito a{' '}
            <Text
              style={{ color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }}
              onPress={() => router.push('/privacidade')}>
              Política de Privacidade
            </Text>
            . Meu nome será visível para os moradores, e meu endereço e e-mail, para a diretoria.
          </Body>
        </Pressable>

        <Button
          label="Criar conta"
          icon="person-add-outline"
          onPress={cadastrar}
          loading={loading}
          disabled={
            !accepted || !codeComplete || name.trim().length < 2 || unit.trim().length < 2 || !email || !password
          }
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
