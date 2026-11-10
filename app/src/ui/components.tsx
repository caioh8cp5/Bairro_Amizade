import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, font, space } from './theme';

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text style={s.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[s.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = {
    primary: colors.primary,
    secondary: colors.primaryLight,
    danger: colors.danger,
    ghost: 'transparent',
  }[variant];
  const fg = variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'ghost' && { borderWidth: 2, borderColor: colors.primary },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: space(2) }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[s.input, props.multiline && { minHeight: 120, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.primary,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={[s.chip, { borderColor: color, backgroundColor: selected ? color : '#fff' }]}>
      <Text style={[s.chipText, { color: selected ? '#fff' : color }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={s.screen}>{children}</View>;
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Loading() {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={[s.center, { paddingVertical: space(6) }]}>
      <Text style={{ fontSize: 48 }}>{icon}</Text>
      <Body muted style={{ textAlign: 'center', marginTop: space(1) }}>
        {text}
      </Body>
    </View>
  );
}

export function ErrorBox({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View style={s.error} accessibilityLiveRegion="polite">
      <Text style={{ color: colors.danger, fontSize: font.body }}>{text}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { padding: space(2), paddingBottom: space(6), backgroundColor: colors.bg, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(3) },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text, marginBottom: space(2) },
  body: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.4 },
  label: { fontSize: font.body, fontWeight: '600', color: colors.text, marginBottom: space(0.75) },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: space(1.5),
    paddingVertical: space(1.5),
    fontSize: font.body,
    color: colors.text,
  },
  button: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(2),
    marginVertical: space(0.75),
  },
  buttonText: { fontSize: font.body, fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: space(2),
    marginBottom: space(1.5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: font.large, fontWeight: '700', color: colors.text, marginBottom: space(0.5) },
  meta: { fontSize: font.small, color: colors.muted, marginTop: space(1) },
  chip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: space(1.75),
    paddingVertical: space(1),
    marginRight: space(1),
    marginBottom: space(1),
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: { fontSize: font.small + 1, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: space(1), paddingVertical: 3, marginBottom: space(1) },
  badgeText: { fontSize: font.small, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  error: { backgroundColor: colors.dangerLight, padding: space(1.5), borderRadius: 10, marginBottom: space(2) },
  fab: { position: 'absolute', right: space(2), bottom: space(2), left: space(2) },
});
