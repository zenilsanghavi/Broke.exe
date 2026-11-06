import type { Bucket, Entry, Rec } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export const money = (n: number) =>
  (n < 0 ? '-' : '') + '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const currentMonth = () => todayStr().slice(0, 7);

export const monthLabel = (m: string) => {
  const [y, mm] = m.split('-').map(Number);
  return new Date(y, mm - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

export const shiftMonth = (m: string, delta: number) => {
  const [y, mm] = m.split('-').map(Number);
  const t = new Date(y, mm - 1 + delta, 1);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}`;
};

export const monthsBetween = (a: string, b: string) => {
  const [y1, m1] = a.split('-').map(Number);
  const [y2, m2] = b.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};

export const dayLabel = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
export const isMonth = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Split an amount by percentages. The last bucket takes the rounding leftover. */
export function computeAlloc(amount: number, pct: Record<string, number>, ids: string[]) {
  const out: Record<string, number> = {};
  ids.forEach((id) => (out[id] = 0));
  const live = ids.filter((id) => (pct[id] || 0) > 0);
  let used = 0;
  live.forEach((id, i) => {
    const v = i === live.length - 1 ? amount - used : Math.round((amount * pct[id]) / 100);
    out[id] = v;
    used += v;
  });
  return out;
}

export type BucketStat = { alloc: number; spent: number };

export function monthStats(month: string, buckets: Bucket[], entries: Entry[]) {
  const items = entries.filter((e) => e.entry_date.startsWith(month));
  const per: Record<string, BucketStat> = {};
  buckets.forEach((b) => (per[b.id] = { alloc: 0, spent: 0 }));
  let inc = 0;
  let out = 0;
  for (const it of items) {
    if (it.type === 'in') {
      inc += it.amount;
      for (const [bid, a] of Object.entries(it.alloc || {})) {
        (per[bid] ||= { alloc: 0, spent: 0 }).alloc += a;
      }
    } else {
      out += it.amount;
      if (it.bucket_id) (per[it.bucket_id] ||= { alloc: 0, spent: 0 }).spent += it.amount;
    }
  }
  const shown = buckets.filter(
    (b) => (!b.is_archived && !b.is_off) || (per[b.id]?.alloc ?? 0) || (per[b.id]?.spent ?? 0),
  );
  return { inc, out, per, items, shown };
}

export type Status = 'none' | 'ok' | 'warn' | 'bad';
export function bucketStatus(p: BucketStat): { kind: Status; label: string } {
  if (!p.alloc && !p.spent) return { kind: 'none', label: 'No money yet' };
  if (!p.alloc || p.spent > p.alloc) return { kind: 'bad', label: 'Over budget' };
  if (p.spent / p.alloc >= 0.8) return { kind: 'warn', label: 'Running low' };
  return { kind: 'ok', label: 'On track' };
}

export const recActive = (r: Rec, m: string) =>
  m >= r.start_month && (!r.months || monthsBetween(r.start_month, m) < r.months);

export const dueDate = (r: Rec, m: string) => {
  const [y, mm] = m.split('-').map(Number);
  const last = new Date(y, mm, 0).getDate();
  return `${m}-${pad(Math.min(r.due_day, last))}`;
};

export const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th';
};
