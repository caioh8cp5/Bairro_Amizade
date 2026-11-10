import { Text } from 'react-native';
import { PRIVACY_SECTIONS } from '@/lib/privacy';
import { Body, Card, s, Screen, Title } from '@/ui/components';

export default function Privacidade() {
  return (
    <Screen>
      <Title>Política de Privacidade</Title>
      {PRIVACY_SECTIONS.map((sec) => (
        <Card key={sec.title}>
          <Text style={s.cardTitle} accessibilityRole="header">
            {sec.title}
          </Text>
          <Body>{sec.body}</Body>
        </Card>
      ))}
    </Screen>
  );
}
