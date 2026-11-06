import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './auth';
import { supabase } from './supabase';
import type { Bucket, Entry, Rec, Settings } from './types';

export type NewEntry = Omit<Entry, 'id'>;
export type NewRec = Omit<Rec, 'id'>;

type Store = {
  loading: boolean;
  error: string | null;
  buckets: Bucket[];
  entries: Entry[];
  recs: Rec[];
  settings: Settings;
  reload: () => Promise<void>;
  addEntry: (e: NewEntry) => Promise<void>;
  updateEntry: (id: string, e: NewEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  addRec: (r: NewRec) => Promise<void>;
  updateRec: (id: string, r: NewRec) => Promise<void>;
  deleteRec: (id: string) => Promise<void>;
  saveBuckets: (draft: Bucket[]) => Promise<void>;
  setReserve: (n: number) => Promise<void>;
  rememberPrefs: (bucketId: string | null, pay: string) => void;
};

const defaults: Settings = { reserve: 0, last_bucket: null, last_pay: 'UPI' };

const Ctx = createContext<Store | null>(null);

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [settings, setSettings] = useState<Settings>(defaults);
  const [owner, setOwner] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const [b, e, r, s] = await Promise.all([
        supabase.from('buckets').select('*').order('sort').order('created_at'),
        supabase.from('entries').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('recurring').select('*').order('created_at'),
        supabase.from('settings').select('*').maybeSingle(),
      ]);
      fail(b.error); fail(e.error); fail(r.error); fail(s.error);
      setBuckets((b.data ?? []) as Bucket[]);
      setEntries((e.data ?? []) as Entry[]);
      setRecs((r.data ?? []) as Rec[]);
      setOwner(uid);
      setSettings(s.data ? { reserve: Number(s.data.reserve) || 0, last_bucket: s.data.last_bucket, last_pay: s.data.last_pay } : defaults);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'Could not load your data.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    // start the first load after the effect body, not inside it
    if (uid) void Promise.resolve().then(reload);
  }, [uid, reload]);

  // never show one account's data to another
  const mine = owner !== null && owner === uid;

  const addEntry = useCallback(async (e: NewEntry) => {
    const { data, error: err } = await supabase.from('entries').insert(e).select().single();
    fail(err);
    setEntries((p) => [data as Entry, ...p]);
  }, []);

  const updateEntry = useCallback(async (id: string, e: NewEntry) => {
    const { data, error: err } = await supabase.from('entries').update(e).eq('id', id).select().single();
    fail(err);
    setEntries((p) => p.map((x) => (x.id === id ? (data as Entry) : x)));
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('entries').delete().eq('id', id);
    fail(err);
    setEntries((p) => p.filter((x) => x.id !== id));
  }, []);

  const addRec = useCallback(async (r: NewRec) => {
    const { data, error: err } = await supabase.from('recurring').insert(r).select().single();
    fail(err);
    setRecs((p) => [...p, data as Rec]);
  }, []);

  const updateRec = useCallback(async (id: string, r: NewRec) => {
    const { data, error: err } = await supabase.from('recurring').update(r).eq('id', id).select().single();
    fail(err);
    setRecs((p) => p.map((x) => (x.id === id ? (data as Rec) : x)));
  }, []);

  const deleteRec = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('recurring').delete().eq('id', id);
    fail(err);
    setRecs((p) => p.filter((x) => x.id !== id));
  }, []);

  const saveBuckets = useCallback(async (draft: Bucket[]) => {
    const keep = new Set(draft.map((b) => b.id));
    for (const old of buckets) {
      if (!old.is_archived && !keep.has(old.id)) {
        const { error: err } = await supabase.from('buckets').update({ is_archived: true }).eq('id', old.id);
        fail(err);
      }
    }
    let order = 0;
    for (const b of draft) {
      const row = { name: b.name.trim(), pct: b.pct, color: b.color, is_off: b.is_off, sort: order++ };
      if (b.id.startsWith('new-')) {
        const { error: err } = await supabase.from('buckets').insert(row);
        fail(err);
      } else {
        const { error: err } = await supabase.from('buckets').update(row).eq('id', b.id);
        fail(err);
      }
    }
    await reload();
  }, [buckets, reload]);

  const setReserve = useCallback(async (n: number) => {
    if (!uid) return;
    const { error: err } = await supabase.from('settings').upsert({ user_id: uid, reserve: n, updated_at: new Date().toISOString() });
    fail(err);
    setSettings((p) => ({ ...p, reserve: n }));
  }, [uid]);

  const rememberPrefs = useCallback((bucketId: string | null, pay: string) => {
    if (!uid) return;
    setSettings((p) => ({ ...p, last_bucket: bucketId, last_pay: pay }));
    // best effort: a failed save here never blocks the user
    supabase.from('settings').upsert({ user_id: uid, last_bucket: bucketId, last_pay: pay, updated_at: new Date().toISOString() }).then(() => {});
  }, [uid]);

  const value = useMemo<Store>(() => ({
    loading, error, buckets: mine ? buckets : [], entries: mine ? entries : [], recs: mine ? recs : [], settings: mine ? settings : defaults, reload,
    addEntry, updateEntry, deleteEntry, addRec, updateRec, deleteRec, saveBuckets, setReserve, rememberPrefs,
  }), [loading, error, mine, buckets, entries, recs, settings, reload, addEntry, updateEntry, deleteEntry, addRec, updateRec, deleteRec, saveBuckets, setReserve, rememberPrefs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
