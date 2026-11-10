import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '@/lib/firebase';
import { useLiveQuery } from '@/lib/hooks';
import type { Announcement } from '@/lib/types';
import { isNew, useLastSeen } from '@/lib/unread';
import { colors, font } from '@/ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const icon = (on: IconName, off: IconName) =>
  function TabIcon({ focused, color }: { focused: boolean; color: string | object | null | number }) {
    return <Ionicons name={focused ? on : off} size={26} color={typeof color === 'string' ? color : colors.primary} />;
  };

export default function TabsLayout() {
  // Respeita a área dos botões de navegação do Android (voltar, início, abas)
  const insets = useSafeAreaInsets();

  // Contador de comunicados não lidos na aba "Avisos"
  const lastSeen = useLastSeen();
  const { items } = useLiveQuery<Announcement>(
    () => query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(20)),
    [],
  );
  const unread = items.filter((a) => isNew(a.createdAt?.toMillis(), lastSeen)).length;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontSize: font.large, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: { height: 64 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6 },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Avisos',
          headerTitle: 'Mural de Comunicados',
          tabBarIcon: icon('megaphone', 'megaphone-outline'),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Agenda', headerTitle: 'Agenda de Reuniões', tabBarIcon: icon('calendar', 'calendar-outline') }}
      />
      <Tabs.Screen
        name="achados"
        options={{ title: 'Achados', headerTitle: 'Achados e Perdidos', tabBarIcon: icon('search', 'search-outline') }}
      />
      <Tabs.Screen
        name="ideias"
        options={{ title: 'Ideias', headerTitle: 'Sugestões e Ideias', tabBarIcon: icon('bulb', 'bulb-outline') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', headerTitle: 'Meu perfil', tabBarIcon: icon('person-circle', 'person-circle-outline') }}
      />
    </Tabs>
  );
}
