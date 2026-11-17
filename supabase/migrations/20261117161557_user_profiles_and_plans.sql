-- Signed-in users (v2): one profile row and one saved plan per user.
--
-- Sign-in is Clerk, connected to Supabase as a third-party auth provider, so the
-- user id is Clerk's (text like "user_2abc..."), read from the session token's
-- "sub" claim. Every row is locked to its owner by RLS.
--
-- profiles: who the user is and their money rules (the settings the engine reads).
-- plans:    their financial picture as one JSON document (accounts entered by hand,
--           income, bills, one-off plans, goals, tax and retirement settings), in the
--           same shape the forecast engine uses. Money inside is integer cents. When
--           bank sync arrives, the parts that come from banks move to real tables
--           (see docs/data-model.html).

create table public.profiles (
  user_id text primary key default (auth.jwt() ->> 'sub'),
  display_name text not null default '',
  occupation text not null default '',
  city text not null default '',
  state text not null default '',
  birth_year int check (birth_year between 1900 and 2100),
  profile_type text not null default 'freelance' check (profile_type in ('freelance', 'steady', 'student')),
  timezone text not null default 'America/Chicago',
  runway_target_weeks int not null default 17 check (runway_target_weeks between 1 and 104),
  range_confidence int not null default 80 check (range_confidence in (80, 90)),
  savings_style text not null default 'balanced' check (savings_style in ('safe', 'balanced', 'push')),
  predictability text not null default 'lumpy' check (predictability in ('very_steady', 'mostly_steady', 'lumpy', 'feast_famine')),
  clients_pay text not null default 'on_time' check (clients_pay in ('on_time', '1_2_weeks_late', '3_plus_weeks_late')),
  cushion_weeks numeric(3, 1) not null default 1 check (cushion_weeks in (0.5, 1, 2)),
  min_weekly_spend_cents bigint not null default 0 check (min_weekly_spend_cents >= 0),
  dismissed_gaps text[] not null default '{}',
  onboarded_at timestamptz,
  tour_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plans (
  user_id text primary key default (auth.jwt() ->> 'sub') references public.profiles (user_id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  schema_version int not null default 1,
  updated_at timestamptz not null default now()
);

-- Keep updated_at current.
create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger plans_touch before update on public.plans
  for each row execute function public.touch_updated_at();

-- Row-level security: a signed-in user sees and changes only their own rows.
alter table public.profiles enable row level security;
alter table public.plans enable row level security;

create policy "Own profile: read" on public.profiles for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);
create policy "Own profile: create" on public.profiles for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "Own profile: change" on public.profiles for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "Own profile: delete" on public.profiles for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "Own plan: read" on public.plans for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);
create policy "Own plan: create" on public.plans for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "Own plan: change" on public.plans for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "Own plan: delete" on public.plans for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);
