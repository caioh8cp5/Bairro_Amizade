import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors, font } from '@/ui/theme';

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontSize: font.large, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: { height: 68, paddingTop: 6 },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Avisos', headerTitle: 'Mural de Comunicados', tabBarIcon: icon('📢') }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', headerTitle: 'Agenda de Reuniões', tabBarIcon: icon('📅') }} />
      <Tabs.Screen name="achados" options={{ title: 'Achados', headerTitle: 'Achados e Perdidos', tabBarIcon: icon('🔎') }} />
      <Tabs.Screen name="ideias" options={{ title: 'Ideias', headerTitle: 'Sugestões e Ideias', tabBarIcon: icon('💡') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', headerTitle: 'Meu perfil', tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
