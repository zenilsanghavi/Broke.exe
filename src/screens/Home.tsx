import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Btn, Card, Dot, Heading, Pill, T, useToast } from '@/components/ui';
import { bucketStatus, dayLabel, dueDate, money, monthLabel, monthStats, monthsBetween, recActive, todayStr } from '@/lib/money';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { MonthBar, TextBtn, bucketColor } from './shared';

export default function Home({
  month, setMonth, onAdd, onReserve, onOpenBucket, onGoBuckets,
}: {
  month: string; setMonth: (m: string) => void; onAdd: (t: 'in' | 'out') => void; onReserve: () => void;
  onOpenBucket: (id: string) => void; onGoBuckets: () => void;
}) {
  const { c } = useTheme();
  const toast = useToast();
  const { buckets, entries, recs, settings, addEntry } = useStore();
  const st = monthStats(month, buckets, entries);
  const left = st.inc - st.out;
  const anyData = entries.length > 0;
  const dueList = recs.filter((r) => recActive(r, month)).sort((a, b) => a.due_day - b.due_day);
  const dueTotal = dueList.reduce((s, r) => s + r.amount, 0);
  const paidTotal = dueList.reduce((s, r) => s + (entries.find((e) => e.recurring_id === r.id && e.entry_date.startsWith(month))?.amount ?? 0), 0);
  const bucketName = (id: string | null) => buckets.find((b) => b.id === id)?.name ?? 'Bucket';

  const markPaid = async (id: string) => {
    const r = recs.find((x) => x.id === id);
    if (!r) return;
    const t = todayStr();
    try {
      await addEntry({
        type: 'out', entry_date: t.startsWith(month) ? t : dueDate(r, month), amount: r.amount, source: null, note: r.name,
        bucket_id: r.bucket_id, pay: settings.last_pay, alloc: {}, recurring_id: r.id,
      });
      toast(`${r.name} marked paid`);
    } catch (ex) {
      toast(ex instanceof Error ? ex.message : 'Could not save that.');
    }
  };

  return (
    <View>
      <MonthBar month={month} onChange={setMonth} />

      <View style={[s.hero, { backgroundColor: c.surface, borderColor: c.line }]}>
        <T v="label">Left this month</T>
        <T v="big" color={left < 0 ? c.bad : c.accent}>{money(left)}</T>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <View style={{ flex: 1 }}><T v="label">Money in</T><T v="bold" style={{ fontSize: 17 }}>{money(st.inc)}</T></View>
          <View style={{ flex: 1 }}><T v="label">Spent</T><T v="bold" style={{ fontSize: 17 }}>{money(st.out)}</T></View>
        </View>
        {st.inc > 0 ? (
          <>
            <View style={[s.stack, { backgroundColor: c.surface2 }]}>
              {st.shown.filter((b) => (st.per[b.id]?.alloc ?? 0) > 0).map((b) => (
                <View key={b.id} style={{ flex: st.per[b.id].alloc, backgroundColor: bucketColor(c.buckets, b) }} />
              ))}
            </View>
            <T v="small">How this month&apos;s income was split into your buckets</T>
          </>
        ) : null}
      </View>

      <Card style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="label">Minimum bank balance</T>
          <T v="display" style={{ marginTop: 4 }}>{settings.reserve ? money(settings.reserve) : 'Not set'}</T>
          <T v="small" style={{ marginTop: 4 }}>Stays in your bank. Not part of income or buckets.</T>
        </View>
        <TextBtn label={settings.reserve ? 'Edit' : 'Set'} onPress={onReserve} />
      </Card>

      {!st.items.length ? (
        <Card style={{ marginTop: 14, borderStyle: 'dashed' }}>
          <T v="title">{anyData ? `nothing added for ${monthLabel(month).split(' ')[0].toLowerCase()} yet` : 'start with your income'}</T>
          <T v="small">
            {anyData
              ? 'Add the money you received and it will be split across your buckets.'
              : 'Add the money you got, like your salary. Broke.exe splits it into your buckets, then tracks what you spend from each. You can change every amount before saving.'}
          </T>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Btn label="Add income" onPress={() => onAdd('in')} />
            {!settings.reserve ? <Btn kind="ghost" label="Set minimum bank balance" onPress={onReserve} /> : null}
          </View>
        </Card>
      ) : null}

      {dueList.length ? (
        <>
          <Heading right={<T v="small">{money(dueTotal - paidTotal)} still to pay</T>}>EMIs and bills</Heading>
          <Card style={{ padding: 0, gap: 0 }}>
            {dueList.map((r, i) => {
              const pe = entries.find((e) => e.recurring_id === r.id && e.entry_date.startsWith(month));
              const prog = r.months ? ` Â· EMI ${Math.min(monthsBetween(r.start_month, month) + 1, r.months)} of ${r.months}` : '';
              return (
                <View key={r.id} style={[s.due, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T v="bold">{r.name}</T>
                    <T v="small">{`Due ${dayLabel(dueDate(r, month))} Â· ${bucketName(r.bucket_id)}${prog}`}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <T v="bold">{money(r.amount)}</T>
                    {pe ? <Pill kind="done" label="Paid" /> : <Btn small label="Mark paid" onPress={() => markPaid(r.id)} />}
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      <Heading right={<TextBtn label="Change split" onPress={onGoBuckets} />}>Your buckets</Heading>
      <View style={{ gap: 10 }}>
        {st.shown.map((b) => {
          const p = st.per[b.id] ?? { alloc: 0, spent: 0 };
          const status = bucketStatus(p);
          const empty = status.kind === 'none';
          const rem = p.alloc - p.spent;
          const used = p.alloc ? Math.min(p.spent / p.alloc, 1) : p.spent ? 1 : 0;
          const color = bucketColor(c.buckets, b);
          return (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`${b.name}: ${money(rem)} left. ${empty ? 'Add money' : 'Show activity'}`}
              onPress={() => (empty ? onAdd('in') : onOpenBucket(b.id))}
              style={({ pressed }) => [s.bucket, { backgroundColor: c.surface, borderColor: pressed ? c.accent : c.line }]}
            >
              <View style={s.row}>
                <Dot color={color} />
                <View style={{ flex: 1, minWidth: 0 }}><T v="bold" numberOfLines={1}>{b.name + (b.is_archived ? ' (removed)' : b.is_off ? ' (off)' : '')}</T></View>
                {!b.is_archived && !b.is_off ? <T v="small">{`${b.pct}% of income`}</T> : null}
              </View>
              <View style={[s.row, { alignItems: 'flex-end', justifyContent: 'space-between' }]}>
                <View>
                  <T v="display" style={{ fontSize: 15 }}>{money(rem)}</T>
                  <T v="small">{`left of ${money(p.alloc)}`}</T>
                </View>
                {empty ? <Pill kind="cta" label="+ Add money" /> : <Pill kind={status.kind as 'ok' | 'warn' | 'bad'} label={status.label} />}
              </View>
              <View style={[s.bar, { backgroundColor: c.surface2 }]}>
                <View style={{ width: `${used * 100}%`, height: '100%', borderRadius: 5, backgroundColor: status.kind === 'bad' ? c.bad : color }} />
              </View>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <T v="small">{`Spent ${money(p.spent)}`}</T>
                <T v="small">{p.alloc ? `${Math.round((p.spent / p.alloc) * 100)}% used` : ''}</T>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 8 },
  stack: { flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2, marginTop: 6 },
  due: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  bucket: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { height: 8, borderRadius: 5, overflow: 'hidden' },
});
