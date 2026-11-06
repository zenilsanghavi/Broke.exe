import React from 'react';
import { ScrollView, View } from 'react-native';

import { Card, Chip, T, useToast } from '@/components/ui';
import { dayLabel, money, monthLabel, monthStats } from '@/lib/money';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { Entry } from '@/lib/types';
import { DeleteBtn, MonthBar, TextBtn, bucketColor } from './shared';

export default function Activity({
  month, setMonth, filter, setFilter, onEdit,
}: { month: string; setMonth: (m: string) => void; filter: string; setFilter: (f: string) => void; onEdit: (e: Entry) => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const { buckets, entries, deleteEntry } = useStore();
  const st = monthStats(month, buckets, entries);
  const bucket = (id: string | null) => buckets.find((b) => b.id === id);

  let items = st.items.slice();
  if (filter === 'in') items = items.filter((i) => i.type === 'in');
  else if (filter !== 'all') items = items.filter((i) => i.type === 'out' && i.bucket_id === filter);

  const groups: { date: string; rows: Entry[] }[] = [];
  items.forEach((it) => {
    const g = groups[groups.length - 1];
    if (g && g.date === it.entry_date) g.rows.push(it);
    else groups.push({ date: it.entry_date, rows: [it] });
  });

  const del = async (id: string) => {
    try { await deleteEntry(id); toast('Entry deleted'); }
    catch (ex) { toast(ex instanceof Error ? ex.message : 'Could not delete.'); }
  };

  const filters: { key: string; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'in', label: 'Money in' }, ...st.shown.map((b) => ({ key: b.id, label: b.name })),
  ];
  const p = filter !== 'all' && filter !== 'in' ? st.per[filter] : null;

  return (
    <View>
      <MonthBar month={month} onChange={setMonth} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {filters.map((f) => <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />)}
      </ScrollView>
      {p ? <T v="small" style={{ marginTop: 8 }}>{`${bucket(filter)?.name ?? 'Bucket'}: ${money(p.alloc)} put in, ${money(p.spent)} spent, ${money(p.alloc - p.spent)} left.`}</T> : null}

      {!groups.length ? (
        <Card style={{ marginTop: 14, borderStyle: 'dashed' }}>
          <T v="title">no entries here</T>
          <T v="small">{`Nothing recorded in ${monthLabel(month)}. Tap Add at the bottom to record money in or out.`}</T>
        </Card>
      ) : null}

      {groups.map((g) => (
        <View key={g.date}>
          <T v="label" style={{ marginTop: 18, marginBottom: 6, marginLeft: 2 }}>{dayLabel(g.date)}</T>
          <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            {g.rows.map((it, i) => {
              const b = bucket(it.bucket_id);
              const isIn = it.type === 'in';
              const parts = Object.entries(it.alloc || {}).filter(([, a]) => a).map(([id, a]) => `${bucket(id)?.name ?? 'Bucket'} ${money(a)}`).join(' · ');
              return (
                <View key={it.id} style={{ flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.line }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: isIn ? c.goodBg : c.surface2 }}>
                    {isIn ? <T v="bold" color={c.good}>+</T> : <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: bucketColor(c.buckets, b) }} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T v="bold">{isIn ? `${it.source || 'Income'}${it.note ? ' · ' + it.note : ''}` : it.note || 'Expense'}</T>
                    <T v="small">{isIn ? parts : `${b?.name ?? 'Removed bucket'}${it.pay ? ' · ' + it.pay : ''}${it.recurring_id ? ' · EMI/bill' : ''}`}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T v="bold" color={isIn ? c.good : c.ink}>{(isIn ? '+' : '-') + money(it.amount)}</T>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextBtn label="Edit" onPress={() => onEdit(it)} />
                      <DeleteBtn onConfirm={() => del(it.id)} />
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </View>
  );
}
