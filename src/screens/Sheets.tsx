import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Btn, Chip, Field, Sheet, T, useToast } from '@/components/ui';
import { computeAlloc, currentMonth, isDate, isMonth, money, monthStats, r2, todayStr } from '@/lib/money';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { PAY, SOURCES, type Entry, type Rec } from '@/lib/types';
import { bucketColor } from './shared';

const clean = (t: string) => t.replace(/[^\d.]/g, '');
const digits = (t: string) => t.replace(/\D/g, '');
const num = (t: string) => parseFloat(t) || 0;
const Row = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
);

/* ================= income / expense ================= */
export function EntrySheet(props: { visible: boolean; onClose: () => void; initial: Entry | null; startType: 'in' | 'out'; month: string }) {
  // mounted only while open, so every opening starts from fresh values
  return props.visible ? <EntryForm onClose={props.onClose} initial={props.initial} startType={props.startType} month={props.month} /> : null;
}

function EntryForm({
  onClose, initial, startType, month,
}: { onClose: () => void; initial: Entry | null; startType: 'in' | 'out'; month: string }) {
  const { c } = useTheme();
  const toast = useToast();
  const { buckets, entries, settings, addEntry, updateEntry, rememberPrefs } = useStore();
  const active = useMemo(() => buckets.filter((b) => !b.is_archived && !b.is_off), [buckets]);

  const splitIds = useMemo(() => {
    const ids = active.map((b) => b.id);
    Object.entries(initial?.alloc ?? {}).forEach(([id, a]) => { if (a > 0 && !ids.includes(id)) ids.push(id); });
    return ids;
  }, [active, initial]);

  const [init] = useState(() => {
    const today = todayStr();
    const p: Record<string, string> = {};
    const a: Record<string, string> = {};
    if (initial && initial.type === 'in') {
      splitIds.forEach((id) => {
        const v = initial.alloc?.[id] ?? 0;
        a[id] = String(v);
        p[id] = String(initial.amount ? r2((v / initial.amount) * 100) : 0);
      });
    } else {
      active.forEach((b) => (p[b.id] = String(b.pct)));
    }
    return {
      type: (initial ? initial.type : startType) as 'in' | 'out',
      amount: initial ? String(initial.amount) : '',
      date: initial ? initial.entry_date : today.startsWith(month) ? today : `${month}-01`,
      source: initial?.source ?? 'Salary',
      note: initial?.note ?? '',
      pay: initial?.pay ?? settings.last_pay ?? 'UPI',
      bucketId: initial ? initial.bucket_id : active.some((b) => b.id === settings.last_bucket) ? settings.last_bucket : null,
      pct: p,
      amts: a,
    };
  });

  const [type, setType] = useState<'in' | 'out'>(init.type);
  const [amount, setAmount] = useState(init.amount);
  const [date, setDate] = useState(init.date);
  const [source, setSource] = useState(init.source);
  const [note, setNote] = useState(init.note);
  const [pay, setPay] = useState(init.pay);
  const [bucketId, setBucketId] = useState<string | null>(init.bucketId);
  const [pct, setPct] = useState<Record<string, string>>(init.pct);
  const [amts, setAmts] = useState<Record<string, string>>(init.amts);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const recalc = (amt: number, p: Record<string, string>) => {
    const pn: Record<string, number> = {};
    splitIds.forEach((id) => (pn[id] = num(p[id] ?? '0')));
    const total = splitIds.reduce((s, id) => s + pn[id], 0);
    const out: Record<string, string> = {};
    if (Math.round(total * 100) === 10000) {
      const a = computeAlloc(amt, pn, splitIds);
      splitIds.forEach((id) => (out[id] = String(a[id])));
    } else {
      splitIds.forEach((id) => (out[id] = String(Math.round((amt * pn[id]) / 100))));
    }
    return out;
  };

  const amt = Math.round(num(amount));
  const assigned = splitIds.reduce((s, id) => s + Math.round(num(amts[id] ?? '0')), 0);
  const diff = amt - assigned;
  const splitOk = amt > 0 && diff === 0;

  const onAmount = (t: string) => {
    const v = clean(t);
    setAmount(v);
    if (type === 'in') setAmts(recalc(Math.round(num(v)), pct));
  };
  const onPct = (id: string, t: string) => {
    const p = { ...pct, [id]: clean(t) };
    setPct(p);
    setAmts(recalc(amt, p));
  };
  const onAmt = (id: string, t: string) => {
    const v = digits(t);
    setAmts({ ...amts, [id]: v });
    setPct({ ...pct, [id]: String(amt ? r2((num(v) / amt) * 100) : 0) });
  };
  const switchType = (t: 'in' | 'out') => {
    setType(t); setErr('');
    if (t === 'in') {
      const p: Record<string, string> = {};
      active.forEach((b) => (p[b.id] = String(b.pct)));
      setPct(p);
      setAmts(recalc(amt, p));
    }
  };

  const save = async () => {
    if (busy) return;
    if (!amt) return setErr('Enter an amount.');
    if (!isDate(date)) return setErr('Date must look like 2026-11-07.');
    let row: Omit<Entry, 'id'>;
    if (type === 'in') {
      if (!splitOk) return setErr(diff > 0 ? `${money(diff)} is still not assigned to a bucket.` : `The buckets add up to ${money(-diff)} more than the income.`);
      const alloc: Record<string, number> = {};
      splitIds.forEach((id) => { const v = Math.round(num(amts[id] ?? '0')); if (v > 0) alloc[id] = v; });
      row = { type: 'in', entry_date: date, amount: amt, source, note: note.trim(), bucket_id: null, pay: null, alloc, recurring_id: initial?.recurring_id ?? null };
    } else {
      if (!bucketId) return setErr('Choose which bucket this money comes from.');
      row = { type: 'out', entry_date: date, amount: amt, source: null, note: note.trim(), bucket_id: bucketId, pay, alloc: {}, recurring_id: initial?.recurring_id ?? null };
    }
    setBusy(true); setErr('');
    try {
      if (initial) await updateEntry(initial.id, row); else await addEntry(row);
      if (type === 'out') rememberPrefs(bucketId, pay);
      toast(initial ? 'Changes saved' : type === 'in' ? `Added ${money(amt)} and split it` : `Took ${money(amt)} from your bucket`);
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not save. Check your connection and try again.');
      setBusy(false);
    }
  };

  const st = monthStats(date.slice(0, 7), buckets, entries);
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const title = initial ? (type === 'in' ? 'Edit income' : 'Edit expense') : type === 'in' ? 'Money in' : 'Money out';

  return (
    <Sheet visible onClose={onClose} title={title}>
      {!initial ? (
        <Row>
          <Chip label="Money in" selected={type === 'in'} onPress={() => switchType('in')} />
          <Chip label="Money out" selected={type === 'out'} onPress={() => switchType('out')} />
        </Row>
      ) : null}

      <Field label="Amount" prefix="₹" value={amount} onChangeText={onAmount} keyboardType="decimal-pad" placeholder="0" autoFocus={!initial} inputStyle={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 26 }} />

      {type === 'in' ? (
        <>
          <View style={{ gap: 6 }}>
            <T v="label">Where it came from</T>
            <Row>{SOURCES.map((s) => <Chip key={s} label={s} selected={source === s} onPress={() => setSource(s)} />)}</Row>
          </View>
          <View style={{ gap: 8 }}>
            <T v="label">Split into buckets (edit % or ₹)</T>
            {splitIds.map((id) => {
              const b = buckets.find((x) => x.id === id);
              return (
                <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: bucketColor(c.buckets, b) }} />
                  <View style={{ flex: 1, minWidth: 0 }}><T v="bold" numberOfLines={1}>{b?.name ?? 'Bucket'}</T></View>
                  <Field value={pct[id] ?? '0'} onChangeText={(t) => onPct(id, t)} keyboardType="decimal-pad" suffix="%" style={{ width: 84 }} inputStyle={{ textAlign: 'right' }} />
                  <Field value={amts[id] ?? '0'} onChangeText={(t) => onAmt(id, t)} keyboardType="number-pad" prefix="₹" style={{ width: 104 }} inputStyle={{ textAlign: 'right' }} />
                </View>
              );
            })}
            <T v="bold" color={splitOk ? c.good : c.bad}>
              {!amt ? 'Enter the amount above first' : diff === 0 ? `${money(assigned)} assigned` : diff > 0 ? `${money(diff)} left to assign` : `${money(-diff)} too much`}
            </T>
          </View>
        </>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            <T v="label">Take it from</T>
            <Row>
              {active.map((b) => {
                const p = st.per[b.id] ?? { alloc: 0, spent: 0 };
                return <Chip key={b.id} label={b.name} dot={bucketColor(c.buckets, b)} sub={`${money(p.alloc - p.spent)} left`} selected={bucketId === b.id} onPress={() => { setBucketId(b.id); setErr(''); }} />;
              })}
            </Row>
          </View>
          <View style={{ gap: 6 }}>
            <T v="label">Paid with</T>
            <Row>{PAY.map((p) => <Chip key={p} label={p} selected={pay === p} onPress={() => setPay(p)} />)}</Row>
          </View>
        </>
      )}

      <Field label={type === 'in' ? 'Note (optional)' : 'What was it for?'} value={note} onChangeText={setNote} maxLength={60} placeholder={type === 'in' ? 'e.g. November salary' : 'e.g. Groceries'} returnKeyType="done" />
      <View style={{ gap: 6 }}>
        <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" maxLength={10} />
        <Row>
          <Chip label="Today" selected={date === todayStr()} onPress={() => setDate(todayStr())} />
          <Chip label="Yesterday" selected={date === yesterday} onPress={() => setDate(yesterday)} />
        </Row>
      </View>

      {err ? <T v="small" color={c.bad}>{err}</T> : null}
      <Btn label={busy ? 'Saving…' : initial ? 'Save changes' : type === 'in' ? 'Add income' : 'Add expense'} onPress={save} disabled={busy} />
    </Sheet>
  );
}

/* ================= EMI / bill ================= */
export function RecSheet({ visible, onClose, initial }: { visible: boolean; onClose: () => void; initial: Rec | null }) {
  return visible ? <RecForm onClose={onClose} initial={initial} /> : null;
}

function RecForm({ onClose, initial }: { onClose: () => void; initial: Rec | null }) {
  const { c } = useTheme();
  const toast = useToast();
  const { buckets, addRec, updateRec } = useStore();
  const active = buckets.filter((b) => !b.is_archived && !b.is_off);
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [bucketId, setBucketId] = useState<string | null>(initial?.bucket_id ?? null);
  const [day, setDay] = useState(initial ? String(initial.due_day) : '1');
  const [months, setMonths] = useState(initial?.months ? String(initial.months) : '');
  const [start, setStart] = useState(initial?.start_month ?? currentMonth());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    const amt = Math.round(num(amount));
    const d = parseInt(day, 10);
    const m = months ? parseInt(months, 10) : null;
    if (!name.trim()) return setErr('Give it a name.');
    if (!amt) return setErr('Enter an amount.');
    if (!bucketId) return setErr('Choose which bucket pays for it.');
    if (!(d >= 1 && d <= 31)) return setErr('Due day must be between 1 and 31.');
    if (months && !(m && m >= 1)) return setErr('Number of months must be 1 or more, or leave it empty.');
    if (!isMonth(start)) return setErr('First payment month must look like 2026-11.');
    const row = { name: name.trim(), amount: amt, bucket_id: bucketId, due_day: d, months: m, start_month: start };
    setBusy(true); setErr('');
    try {
      if (initial) await updateRec(initial.id, row); else await addRec(row);
      toast(initial ? 'EMI updated' : 'EMI added');
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not save.');
      setBusy(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} title={initial ? 'Edit EMI or bill' : 'New EMI or bill'}>
      <Field label="Amount" prefix="₹" value={amount} onChangeText={(t) => setAmount(clean(t))} keyboardType="decimal-pad" placeholder="0" inputStyle={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 26 }} />
      <Field label="Name" value={name} onChangeText={setName} maxLength={40} placeholder="e.g. Bike EMI, Rent, Netflix" />
      <View style={{ gap: 6 }}>
        <T v="label">Paid from bucket</T>
        <Row>{active.map((b) => <Chip key={b.id} label={b.name} dot={bucketColor(c.buckets, b)} selected={bucketId === b.id} onPress={() => setBucketId(b.id)} />)}</Row>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Due day of month" value={day} onChangeText={(t) => setDay(digits(t).slice(0, 2))} keyboardType="number-pad" style={{ flex: 1 }} />
        <Field label="Number of months" value={months} onChangeText={(t) => setMonths(digits(t).slice(0, 3))} keyboardType="number-pad" placeholder="empty = ongoing" style={{ flex: 1 }} />
      </View>
      <Field label="First payment month (YYYY-MM)" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" maxLength={7} />
      {err ? <T v="small" color={c.bad}>{err}</T> : null}
      <Btn label={busy ? 'Saving…' : initial ? 'Save changes' : 'Add EMI or bill'} onPress={save} disabled={busy} />
    </Sheet>
  );
}

/* ================= minimum bank balance ================= */
export function ReserveSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return visible ? <ReserveForm onClose={onClose} /> : null;
}

function ReserveForm({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const { settings, setReserve } = useStore();
  const [amount, setAmount] = useState(settings.reserve ? String(settings.reserve) : '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      await setReserve(Math.round(num(amount)));
      toast('Minimum bank balance saved');
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not save.');
      setBusy(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} title="Minimum bank balance">
      <View style={{ backgroundColor: c.goodBg, borderRadius: 10, padding: 10 }}>
        <T v="small" color={c.ink}>
          The money you want to always keep in your bank. It is not counted as income, not split into buckets, and spending never touches it.
        </T>
      </View>
      <Field label="Amount" prefix="₹" value={amount} onChangeText={(t) => setAmount(clean(t))} keyboardType="decimal-pad" placeholder="0" autoFocus inputStyle={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 26 }} />
      {err ? <T v="small" color={c.bad}>{err}</T> : null}
      <Btn label={busy ? 'Saving…' : 'Save balance'} onPress={save} disabled={busy} />
    </Sheet>
  );
}
