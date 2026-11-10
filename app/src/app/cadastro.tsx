import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { api } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { errorMessage } from '@/lib/format';
import { Body, Button, ErrorBox, Field, Screen, Title } from '@/ui/components';
import { space } from '@/ui/theme';

/** Primeiro acesso: o morador usa o código de convite gerado pela associação. */
export default function Cadastro() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cadastrar() {
    setError(null);
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setLoading(true);
    try {
      await api.register(code, email.trim(), password);
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
        <Field
          label="Código de convite"
          placeholder="CE-XXXX-XXXX"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
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
        <Button label="Criar conta" onPress={cadastrar} loading={loading} disabled={!code || !email || !password} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
