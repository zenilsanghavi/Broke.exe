import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Btn, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useKeyboardHeight } from '@/lib/keyboard';
import { currentMonth } from '@/lib/money';
import { useStore } from '@/lib/store';
import { fonts, useTheme } from '@/lib/theme';
import type { Entry, Rec } from '@/lib/types';
import Activity from '@/screens/Activity';
import BucketsEditor from '@/screens/BucketsEditor';
import Emi from '@/screens/Emi';
import Home from '@/screens/Home';
import Login from '@/screens/Login';
import { EntrySheet, RecSheet, ReserveSheet } from '@/screens/Sheets';

type Tab = 'home' | 'activity' | 'emi' | 'buckets';

function Shell() {
  const { c, mode, toggle } = useTheme();
  const { session, signOut } = useAuth();
  const { loading, error, reload, buckets } = useStore();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();

  const [tab, setTab] = useState<Tab>('home');
  const [month, setMonth] = useState(currentMonth());
  const [filter, setFilter] = useState('all');
  const [entrySheet, setEntrySheet] = useState<{ open: boolean; initial: Entry | null; type: 'in' | 'out' }>({ open: false, initial: null, type: 'out' });
  const [recSheet, setRecSheet] = useState<{ open: boolean; initial: Rec | null }>({ open: false, initial: null });
  const [reserveOpen, setReserveOpen] = useState(false);

  const openAdd = (type: 'in' | 'out' = 'out', initial: Entry | null = null) => setEntrySheet({ open: true, initial, type });
  const first = loading && buckets.length === 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'home', label: 'Home' }, { key: 'activity', label: 'Log' }, { key: 'emi', label: 'EMIs' }, { key: 'buckets', label: 'Buckets' },
  ];
  const tabBtn = (t: { key: Tab; label: string }) => (
    <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }} onPress={() => setTab(t.key)} style={s.tab}>
      <Text style={{ fontFamily: tab === t.key ? fonts.bold : fonts.medium, fontSize: 12, color: tab === t.key ? c.accent : c.muted }}>{t.label}</Text>
      <View style={{ height: 2, width: 18, borderRadius: 1, marginTop: 4, backgroundColor: tab === t.key ? c.accent : 'transparent' }} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={[s.header, { paddingTop: 8 + insets.top }]}>
        <Image source={require('../../assets/images/logo.png')} accessibilityLabel="Broke.exe" style={{ width: 64, height: 64, borderRadius: 14 }} />
        <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />
            <T v="small" color={c.ink} numberOfLines={1}>{session?.user.email ?? ''}</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Btn kind="link" small label={mode === 'dark' ? 'Light' : 'Dark'} onPress={toggle} />
            <Btn kind="link" small label="Sign out" onPress={() => { signOut(); }} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 + insets.bottom + kb, maxWidth: 520, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={loading && !first} onRefresh={reload} tintColor={c.accent} colors={[c.accent]} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {error ? (
          <View style={[s.banner, { backgroundColor: c.badBg }]}>
            <T v="small" color={c.ink} style={{ flex: 1 }}>{`Could not load your data. ${error}`}</T>
            <Btn kind="link" small label="Retry" onPress={reload} />
          </View>
        ) : null}
        {first ? <T v="small" style={{ textAlign: 'center', marginTop: 40 }}>Loading your money…</T> : null}
        {!first && tab === 'home' ? (
          <Home month={month} setMonth={setMonth} onAdd={(t) => openAdd(t)} onReserve={() => setReserveOpen(true)}
            onOpenBucket={(id) => { setFilter(id); setTab('activity'); }} onGoBuckets={() => setTab('buckets')} />
        ) : null}
        {!first && tab === 'activity' ? (
          <Activity month={month} setMonth={setMonth} filter={filter} setFilter={setFilter} onEdit={(e) => openAdd(e.type, e)} />
        ) : null}
        {!first && tab === 'emi' ? (
          <Emi month={month} setMonth={setMonth} onAdd={() => setRecSheet({ open: true, initial: null })} onEdit={(r) => setRecSheet({ open: true, initial: r })} />
        ) : null}
        {!first && tab === 'buckets' ? <BucketsEditor onSaved={() => setTab('home')} /> : null}
      </ScrollView>

      <View style={[s.bar, { backgroundColor: c.surface, borderTopColor: c.line, paddingBottom: 6 + insets.bottom }]}>
        <View style={s.barIn}>
          {tabBtn(tabs[0])}
          {tabBtn(tabs[1])}
          <Pressable accessibilityRole="button" accessibilityLabel="Add money in or out" onPress={() => openAdd('out')} style={s.tab}>
            <View style={[s.plus, { backgroundColor: c.accent }]}><Text style={{ fontFamily: fonts.bold, fontSize: 24, color: c.accentInk, marginTop: -2 }}>+</Text></View>
          </Pressable>
          {tabBtn(tabs[2])}
          {tabBtn(tabs[3])}
        </View>
      </View>

      <EntrySheet visible={entrySheet.open} initial={entrySheet.initial} startType={entrySheet.type} month={month} onClose={() => setEntrySheet((p) => ({ ...p, open: false }))} />
      <RecSheet visible={recSheet.open} initial={recSheet.initial} onClose={() => setRecSheet((p) => ({ ...p, open: false }))} />
      <ReserveSheet visible={reserveOpen} onClose={() => setReserveOpen(false)} />
    </View>
  );
}

export default function Index() {
  const { session } = useAuth();
  const { c, mode } = useTheme();
  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Login />
      </View>
    );
  }
  return <Shell />;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10, marginBottom: 12 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingTop: 6 },
  barIn: { flexDirection: 'row', alignItems: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  plus: { width: 52, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
