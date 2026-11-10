import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { AuthProvider, logout, useAuth } from '@/lib/auth';
import { firebaseConfigured } from '@/lib/firebase';
import { Body, Button, Loading, s, Title } from '@/ui/components';
import { colors, font } from '@/ui/theme';

function Gate() {
  const state = useAuth();

  if (!firebaseConfigured) {
    return (
      <View style={s.center}>
        <Title>Firebase não configurado</Title>
        <Body muted>Copie o arquivo .env.example para .env e preencha os dados do seu projeto Firebase.</Body>
      </View>
    );
  }
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'blocked') {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <Text style={{ fontSize: 56 }}>🔒</Text>
        <Title>Acesso não liberado</Title>
        <Body muted style={{ textAlign: 'center', marginBottom: 24 }}>
          Sua conta não está na lista de moradores autorizados ou foi bloqueada. Procure a diretoria da Associação de
          Moradores do Champs Élysées.
        </Body>
        <Button label="Sair" onPress={logout} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  const ready = state.status === 'ready';
  const isAdmin = ready && state.resident.role === 'admin';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontSize: font.large, fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Protected guard={!ready}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="cadastro" options={{ title: 'Primeiro acesso' }} />
      </Stack.Protected>

      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="reuniao/[id]" options={{ title: 'Reunião' }} />
        <Stack.Screen name="achado/[id]" options={{ title: 'Achados e Perdidos' }} />
        <Stack.Screen name="achado-novo" options={{ title: 'Novo item', presentation: 'modal' }} />
        <Stack.Screen name="ideia/[id]" options={{ title: 'Sugestão' }} />
        <Stack.Screen name="ideia-nova" options={{ title: 'Nova sugestão', presentation: 'modal' }} />

        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="aviso-novo" options={{ title: 'Novo comunicado', presentation: 'modal' }} />
          <Stack.Screen name="reuniao-nova" options={{ title: 'Nova reunião', presentation: 'modal' }} />
          <Stack.Screen name="admin/index" options={{ title: 'Administração' }} />
          <Stack.Screen name="admin/convite-novo" options={{ title: 'Novo convite', presentation: 'modal' }} />
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Gate />
    </AuthProvider>
  );
}
