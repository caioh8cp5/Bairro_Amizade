import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';
import { formatDate } from '@/lib/format';
import { s } from './components';
import { colors, font, space } from './theme';

const pad = (n: number) => String(n).padStart(2, '0');

/** Escolha de data e horário com o seletor nativo do celular. */
export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
}) {
  if (Platform.OS !== 'android') {
    return (
      <View style={{ marginBottom: space(2) }}>
        <Text style={s.label}>{label}</Text>
        <DateTimePicker
          value={value}
          mode="datetime"
          display="inline"
          locale="pt-BR"
          minimumDate={new Date()}
          onChange={(_, d) => d && onChange(d)}
        />
      </View>
    );
  }

  function abrir(mode: 'date' | 'time') {
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: true,
      minimumDate: mode === 'date' ? new Date() : undefined,
      onChange: (event, d) => {
        if (event.type !== 'set' || !d) return;
        const next = new Date(value);
        if (mode === 'date') next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
        else next.setHours(d.getHours(), d.getMinutes(), 0, 0);
        onChange(next);
      },
    });
  }

  const box = (icon: 'calendar-outline' | 'time-outline', text: string, onPress: () => void, flex: number) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${text}. Toque para alterar`}
      style={({ pressed }) => [
        s.input,
        { flex, flexDirection: 'row', alignItems: 'center', gap: space(1), opacity: pressed ? 0.7 : 1 },
      ]}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={{ fontSize: font.body, color: colors.text, fontWeight: '600' }}>{text}</Text>
    </Pressable>
  );

  return (
    <View style={{ marginBottom: space(2) }}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: space(1.5) }}>
        {box('calendar-outline', formatDate(value, false), () => abrir('date'), 3)}
        {box('time-outline', `${pad(value.getHours())}:${pad(value.getMinutes())}`, () => abrir('time'), 2)}
      </View>
    </View>
  );
}
