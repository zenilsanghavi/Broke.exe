-- Broke.exe database schema
-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Safe to run again: it only creates things that don't exist yet.

-- ============ TABLES ============

create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  reserve numeric not null default 0 check (reserve >= 0),   -- minimum bank balance (never touched)
  last_bucket uuid,
  last_pay text not null default 'UPI',
  updated_at timestamptz not null default now()
);

create table if not exists public.buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 28),
  pct numeric not null default 0 check (pct >= 0 and pct <= 100),
  color int not null default 0 check (color between 0 and 7),
  is_off boolean not null default false,        -- bucket switched off
  is_archived boolean not null default false,   -- removed, but past entries keep it
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('in','out')),
  entry_date date not null,
  amount numeric not null check (amount > 0),
  source text,                                   -- income only: Salary, Freelance...
  note text not null default '',
  bucket_id uuid references public.buckets(id) on delete set null,  -- expense only
  pay text,                                      -- expense only: UPI, Cash, Card, Bank
  alloc jsonb not null default '{}'::jsonb,      -- income only: { "<bucket id>": rupees }
  recurring_id uuid,                             -- set when it paid an EMI/bill
  created_at timestamptz not null default now()
);
create index if not exists entries_user_date_idx on public.entries (user_id, entry_date desc);

create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  amount numeric not null check (amount > 0),
  bucket_id uuid references public.buckets(id) on delete set null,
  due_day int not null check (due_day between 1 and 31),
  months int check (months is null or months >= 1),   -- null = ongoing
  start_month text not null check (start_month ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now()
);

-- ============ PRIVACY: each person only ever sees their own rows ============

alter table public.settings  enable row level security;
alter table public.buckets   enable row level security;
alter table public.entries   enable row level security;
alter table public.recurring enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings','buckets','entries','recurring'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='own rows') then
      execute format(
        'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    end if;
  end loop;
end $$;

-- ============ NEW ACCOUNTS GET THE DEFAULT BUCKETS ============

create or replace function public.seed_new_user(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.settings (user_id) values (uid) on conflict do nothing;
  if not exists (select 1 from public.buckets where user_id = uid) then
    insert into public.buckets (user_id, name, pct, color, sort) values
      (uid, 'Savings',          30, 0, 0),
      (uid, 'Personal expense', 30, 1, 1),
      (uid, 'Travelling',       15, 2, 2),
      (uid, 'Home money',       15, 3, 3),
      (uid, 'Spare',            10, 4, 4);
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_new_user(new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that already exist (like the first one) get their defaults now.
do $$
declare u record;
begin
  for u in select id from auth.users loop
    perform public.seed_new_user(u.id);
  end loop;
end $$;

-- Nobody can call the seeding helpers directly from the app.
revoke all on function public.seed_new_user(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
