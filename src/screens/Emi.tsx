import React from 'react';
import { View } from 'react-native';

import { Btn, Card, Heading, T, useToast } from '@/components/ui';
import { money, monthLabel, monthsBetween, ordinal, recActive } from '@/lib/money';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { Rec } from '@/lib/types';
import { DeleteBtn, MonthBar, TextBtn, bucketColor } from './shared';

export default function Emi({
  month, setMonth, onAdd, onEdit,
}: { month: string; setMonth: (m: string) => void; onAdd: () => void; onEdit: (r: Rec) => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const { buckets, entries, recs, deleteRec } = useStore();
  const monthly = recs.filter((r) => recActive(r, month)).reduce((s, r) => s + r.amount, 0);

  const del = async (id: string) => {
    try { await deleteRec(id); toast('EMI deleted. Past payments stay in Activity.'); }
    catch (ex) { toast(ex instanceof Error ? ex.message : 'Could not delete.'); }
  };

  return (
    <View>
      <MonthBar month={month} onChange={setMonth} />
      <Heading right={<TextBtn label="Add new" onPress={onAdd} />}>EMIs and bills</Heading>
      {!recs.length ? (
        <Card style={{ borderStyle: 'dashed' }}>
          <T v="title">no emis or bills yet</T>
          <T v="small">Add things that go out every month, like a loan EMI, rent, Wi-Fi or a subscription. They show up on Home each month with a Mark paid button, and paying one takes the money from the bucket you choose.</T>
          <Btn label="Add an EMI or bill" onPress={onAdd} />
        </Card>
      ) : (
        <>
          <T v="small" style={{ marginBottom: 10 }}>{`Going out in ${monthLabel(month)}: ${money(monthly)}`}</T>
          <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            {recs.map((r, i) => {
              const b = buckets.find((x) => x.id === r.bucket_id);
              const paid = entries.filter((e) => e.recurring_id === r.id).length;
              const ended = !!r.months && monthsBetween(r.start_month, month) >= r.months;
              return (
                <View key={r.id} style={{ flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.line }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface2 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: bucketColor(c.buckets, b) }} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T v="bold">{r.name}</T>
                    <T v="small">{`Every month on the ${r.due_day}${ordinal(r.due_day)} · ${b?.name ?? 'Bucket'} · ${r.months ? `${paid} of ${r.months} paid` : 'Ongoing'}${ended ? ' · finished' : ''}`}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T v="bold">{money(r.amount)}</T>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextBtn label="Edit" onPress={() => onEdit(r)} />
                      <DeleteBtn onConfirm={() => del(r.id)} />
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </View>
  );
}
