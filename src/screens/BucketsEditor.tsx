import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Btn, Card, Dot, Field, Heading, T, useToast } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { Bucket } from '@/lib/types';
import { bucketColor } from './shared';

const DEFAULTS = [
  ['Savings', 30], ['Personal expense', 30], ['Travelling', 15], ['Home money', 15], ['Spare', 10],
] as const;

function Switch({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={{ width: 46, height: 26, borderRadius: 13, backgroundColor: on ? c.accent : c.line, justifyContent: 'center' }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: on ? c.accentInk : c.muted, marginLeft: on ? 23 : 3 }} />
    </Pressable>
  );
}

export default function BucketsEditor({ onSaved }: { onSaved: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const { buckets, saveBuckets } = useStore();
  const [draft, setDraft] = useState<Bucket[]>(() => buckets.filter((b) => !b.is_archived).map((b) => ({ ...b })));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const total = draft.reduce((s, b) => s + (b.is_off ? 0 : b.pct || 0), 0);
  const ok = Math.round(total * 100) === 10000;
  const patch = (i: number, p: Partial<Bucket>) => setDraft((d) => d.map((b, k) => (k === i ? { ...b, ...p } : b)));

  const toggle = (i: number) => {
    const b = draft[i];
    if (!b.is_off && draft.filter((x) => !x.is_off).length <= 1) { toast('Keep at least one bucket on.'); return; }
    patch(i, { is_off: !b.is_off });
  };
  const add = () => {
    const used = new Set(buckets.map((b) => b.color));
    let col = 0; while (used.has(col) && col < 7) col++;
    setDraft((d) => [...d, { id: `new-${Date.now()}`, name: 'New bucket', pct: 0, color: col, is_off: false, is_archived: false, sort: d.length }]);
  };
  const defaults = () => {
    setDraft((d) => DEFAULTS.map(([name, pct], i) => {
      const existing = d.find((x) => x.name === name) ?? d[i];
      return existing && !existing.id.startsWith('new-')
        ? { ...existing, name, pct, is_off: false }
        : { id: `new-${Date.now()}-${i}`, name, pct, color: i, is_off: false, is_archived: false, sort: i };
    }));
  };

  const save = async () => {
    if (draft.some((b) => !b.name.trim())) { setErr('Give every bucket a name.'); return; }
    setBusy(true); setErr('');
    try { await saveBuckets(draft); toast('Buckets saved'); onSaved(); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <View>
      <Heading>Your buckets</Heading>
      <Card>
        <T v="small">Turn a bucket off if you don&apos;t want to put money into it. It is left out of the split and the percentages. Turn it back on any time.</T>
        <T v="small">When money comes in, it is split by these percentages. You can change the split, even by exact rupee amounts, for any single income when you add it.</T>
        {draft.map((b, i) => (
          <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: b.is_off ? 0.5 : 1 }}>
            <Dot color={bucketColor(c.buckets, b)} />
            <Field value={b.name} onChangeText={(t) => patch(i, { name: t })} maxLength={28} style={{ flex: 1 }} />
            <Field
              value={String(b.pct)} onChangeText={(t) => patch(i, { pct: parseFloat(t.replace(/[^\d.]/g, '')) || 0 })}
              keyboardType="decimal-pad" suffix="%" editable={!b.is_off} style={{ width: 84 }} inputStyle={{ textAlign: 'right' }}
            />
            <Switch on={!b.is_off} onPress={() => toggle(i)} label={`${b.name} is ${b.is_off ? 'off. Turn on' : 'on. Turn off'}`} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${b.name}`} disabled={draft.length <= 1} onPress={() => setDraft((d) => d.filter((_, k) => k !== i))} style={{ width: 32, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <T v="bold" color={c.muted}>x</T>
            </Pressable>
          </View>
        ))}
        <T v="bold" color={ok ? c.good : c.bad}>{`Total ${Math.round(total * 100) / 100}%${ok ? '' : ' (must be 100%)'}`}</T>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {draft.length < 8 ? <Btn kind="ghost" small label="Add a bucket" onPress={add} /> : null}
          <Btn kind="ghost" small label="Use default split" onPress={defaults} />
        </View>
        {err ? <T v="small" color={c.bad}>{err}</T> : null}
        <Btn label={busy ? 'Saving…' : 'Save buckets'} onPress={save} disabled={!ok || busy} />
      </Card>
      <T v="small" style={{ marginTop: 14, marginLeft: 2 }}>Money already added keeps the split it had. Removing a bucket keeps its past entries.</T>
    </View>
  );
}
