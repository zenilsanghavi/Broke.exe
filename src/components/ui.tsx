import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, useTheme } from '@/lib/theme';

/* ---------- text ---------- */
type Variant = 'body' | 'bold' | 'small' | 'label' | 'display' | 'title' | 'big';
export function T({
  v = 'body', color, style, children, numberOfLines,
}: { v?: Variant; color?: string; style?: StyleProp<TextStyle>; children: React.ReactNode; numberOfLines?: number }) {
  const { c } = useTheme();
  const base: Record<Variant, TextStyle> = {
    body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
    bold: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
    small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
    label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, letterSpacing: 0.9, textTransform: 'uppercase' },
    display: { fontFamily: fonts.display, fontSize: 15, lineHeight: 22 },
    title: { fontFamily: fonts.display, fontSize: 12, lineHeight: 19 },
    big: { fontFamily: fonts.display, fontSize: 24, lineHeight: 34 },
  };
  const defaultColor = v === 'label' || v === 'small' ? c.muted : c.ink;
  return (
    <Text numberOfLines={numberOfLines} style={[base[v], { color: color ?? defaultColor }, style]}>
      {children}
    </Text>
  );
}

/* ---------- section heading, terminal-prompt style ---------- */
export function Heading({ children, right }: { children: string; right?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={s.heading}>
      <Text style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 19, color: c.ink, flexShrink: 1 }}>
        <Text style={{ color: c.accent }}>{'> '}</Text>
        {children.toLowerCase()}
      </Text>
      {right}
    </View>
  );
}

/* ---------- buttons ---------- */
export function Btn({
  label, onPress, kind = 'primary', disabled, style, small,
}: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'link'; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.accent : kind === 'ghost' ? c.surface2 : 'transparent';
  const fg = kind === 'primary' ? c.accentInk : kind === 'ghost' ? c.ink : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1, minHeight: small ? 40 : 48 },
        kind === 'ghost' && { borderWidth: 1, borderColor: c.line },
        kind === 'link' && { paddingHorizontal: 4 },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: small ? 13 : 14, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label, selected, onPress, dot, sub,
}: { label: string; selected?: boolean; onPress: () => void; dot?: string; sub?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[s.chip, { backgroundColor: selected ? c.accent : c.surface, borderColor: selected ? c.accent : c.line }]}
    >
      {dot ? <View style={[s.dot, { backgroundColor: dot }]} /> : null}
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: selected ? c.accentInk : c.ink }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: fonts.body, fontSize: 11, color: selected ? c.accentInk : c.muted }}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Pill({ kind, label }: { kind: 'none' | 'ok' | 'warn' | 'bad' | 'cta' | 'done'; label: string }) {
  const { c } = useTheme();
  const map = {
    none: [c.surface2, c.muted], ok: [c.goodBg, c.good], warn: [c.warnBg, c.warn], bad: [c.badBg, c.bad],
    cta: [c.accent, c.accentInk], done: [c.goodBg, c.good],
  } as const;
  const [bg, fg] = map[kind];
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: fg }}>{label}</Text>
    </View>
  );
}

export function Dot({ color, size = 12 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: 4, backgroundColor: color }} />;
}

/* ---------- inputs ---------- */
export function Field({
  label, value, onChangeText, suffix, prefix, style, inputStyle, ...rest
}: { label?: string; value: string; onChangeText: (t: string) => void; suffix?: string; prefix?: string; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle> } & Omit<TextInputProps, 'style' | 'value' | 'onChangeText'>) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ flexShrink: 1 }, style]}>
      {label ? <T v="label" style={{ marginBottom: 6 }}>{label}</T> : null}
      <View style={[s.field, { backgroundColor: c.bg, borderColor: focus ? c.accent : c.line }]}>
        {prefix ? <Text style={{ fontFamily: fonts.body, color: c.muted, fontSize: 14 }}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholderTextColor={c.muted}
          selectionColor={c.accent}
          accessibilityLabel={label ?? rest.placeholder}
          style={[{ flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 15, color: c.ink, paddingVertical: 10 }, inputStyle]}
          {...rest}
        />
        {suffix ? <Text style={{ fontFamily: fonts.body, color: c.muted, fontSize: 14 }}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

/* ---------- card ---------- */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[s.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

/* ---------- bottom sheet ---------- */
export function Sheet({
  visible, onClose, title, children,
}: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: c.surface, paddingBottom: 16 + insets.bottom }]}>
          <View style={[s.grab, { backgroundColor: c.line }]} />
          <View style={s.sheetHead}>
            <T v="title" style={{ flexShrink: 1 }}>{title.toLowerCase()}</T>
            <Btn kind="link" small label="Cancel" onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 4 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------- toast ---------- */
const ToastCtx = createContext<(m: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={[s.toastWrap, { bottom: 92 + insets.bottom }]}>
          <View accessibilityLiveRegion="polite" style={[s.toast, { backgroundColor: c.accent }]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: c.accentInk }}>{msg}</Text>
          </View>
        </View>
      ) : null}
    </ToastCtx.Provider>
  );
}

const s = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 22, marginBottom: 10 },
  btn: { borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, minHeight: 40 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10, maxHeight: '90%' },
  grab: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
});
