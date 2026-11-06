import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { T } from '@/components/ui';
import { monthLabel, shiftMonth } from '@/lib/money';
import { fonts, useTheme } from '@/lib/theme';
import type { Bucket } from '@/lib/types';

export function MonthBar({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const { c } = useTheme();
  const arrow = (label: string, glyph: string, delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onChange(shiftMonth(month, delta))}
      style={[s.arrow, { backgroundColor: c.surface, borderColor: c.line }]}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: c.ink }}>{glyph}</Text>
    </Pressable>
  );
  return (
    <View style={s.month}>
      {arrow('Previous month', '<', -1)}
      <T v="title">{monthLabel(month)}</T>
      {arrow('Next month', '>', 1)}
    </View>
  );
}

/** Two-tap delete so nothing disappears by accident. */
export function DeleteBtn({ onConfirm }: { onConfirm: () => void }) {
  const { c } = useTheme();
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={armed ? 'Tap again to delete' : 'Delete'}
      onPress={() => {
        if (armed) { onConfirm(); return; }
        setArmed(true);
        timer.current = setTimeout(() => setArmed(false), 3000);
      }}
      style={s.small}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: armed ? c.bad : c.muted }}>
        {armed ? 'Tap again to delete' : 'Delete'}
      </Text>
    </Pressable>
  );
}

export function TextBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.small}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: c.accent }}>{label}</Text>
    </Pressable>
  );
}

export const bucketColor = (palette: string[], b: Pick<Bucket, 'color'> | undefined) =>
  palette[(b?.color ?? 7) % 8];

const s = StyleSheet.create({
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  arrow: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  small: { minHeight: 36, paddingHorizontal: 4, justifyContent: 'center' },
});
