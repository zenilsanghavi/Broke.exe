import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, Field, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useKeyboardHeight } from '@/lib/keyboard';
import { useTheme } from '@/lib/theme';

export default function Login() {
  const { c } = useTheme();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) { setErr('Enter your email and password.'); return; }
    setBusy(true); setErr(null);
    const e = await signIn(email, password);
    if (e) { setErr(e); setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingTop: 16 + insets.top, paddingBottom: 24 + insets.bottom + kb, gap: 14, maxWidth: 480, width: '100%', alignSelf: 'center' }}
      >
        <Image source={require('../../assets/images/logo.png')} accessibilityLabel="Broke.exe" style={{ width: 160, height: 160, borderRadius: 24, alignSelf: 'center' }} />
        <T v="title" style={{ marginTop: 6 }}>{'> sign in to continue'}</T>
        <Field
          label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com"
          autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email"
          textContentType="username"
        />
        <Field
          label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"
          autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit}
        />
        {err ? <T v="small" color={c.bad}>{err}</T> : null}
        <Btn label={busy ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={busy} />
        <View />
        <T v="small">Your money data is private to your account and syncs between your phones.</T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
