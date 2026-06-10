-- GharKhata Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

create table if not exists households (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  join_code  text unique not null default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  household_id uuid references households(id) on delete set null,
  display_name text not null,
  color        text not null default '#534AB7',
  created_at   timestamptz not null default now()
);

create table if not exists categories (
  id             uuid primary key default uuid_generate_v4(),
  household_id   uuid not null references households(id) on delete cascade,
  name           text not null,
  icon           text not null default '🏠',
  type           text not null check (type in ('fixed', 'variable', 'irregular')),
  monthly_budget numeric(12, 2),
  sort_order     int not null default 0,
  is_default     boolean not null default false
);

create table if not exists expenses (
  id           uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  amount       numeric(12, 2) not null check (amount > 0),
  category_id  uuid references categories(id) on delete set null,
  paid_by      uuid not null references profiles(id) on delete cascade,
  split_type   text not null default 'equal' check (split_type in ('equal', 'custom', 'mine', 'theirs')),
  split_ratio  numeric(5, 2) check (split_ratio between 0 and 100),
  note         text,
  spent_on     date not null default current_date,
  created_at   timestamptz not null default now()
);

create table if not exists recurring (
  id           uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  amount       numeric(12, 2) not null check (amount > 0),
  category_id  uuid references categories(id) on delete set null,
  due_type     text not null check (due_type in ('fixed_date', 'cycle')),
  due_day      int check (due_day between 1 and 31),
  cycle_days   int check (cycle_days > 0),
  last_paid_on date,
  end_date     date,
  active       boolean not null default true
);

create table if not exists settlements (
  id           uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  amount       numeric(12, 2) not null check (amount > 0),
  from_profile uuid not null references profiles(id) on delete cascade,
  to_profile   uuid not null references profiles(id) on delete cascade,
  settled_on   date not null default current_date,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────

create index if not exists expenses_household_spent_on on expenses(household_id, spent_on desc);
create index if not exists expenses_category on expenses(category_id);
create index if not exists recurring_household on recurring(household_id);
create index if not exists settlements_household on settlements(household_id, settled_on desc);
create index if not exists profiles_household on profiles(household_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

alter table households   enable row level security;
alter table profiles     enable row level security;
alter table categories   enable row level security;
alter table expenses     enable row level security;
alter table recurring    enable row level security;
alter table settlements  enable row level security;

-- Helper function: returns the household_id for the current user
create or replace function my_household_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select household_id from profiles where id = auth.uid() limit 1;
$$;

-- Households: members can read their own household
create policy "household_read" on households
  for select using (id = my_household_id());

create policy "household_insert" on households
  for insert to authenticated with check (true);

create policy "household_update" on households
  for update using (id = my_household_id());

-- Profiles: own row + same household
create policy "profile_read" on profiles
  for select using (household_id = my_household_id() or id = auth.uid());

create policy "profile_insert" on profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profile_update" on profiles
  for update using (id = auth.uid());

-- Categories: same household
create policy "categories_read" on categories
  for select using (household_id = my_household_id());

create policy "categories_insert" on categories
  for insert with check (household_id = my_household_id());

create policy "categories_update" on categories
  for update using (household_id = my_household_id());

create policy "categories_delete" on categories
  for delete using (household_id = my_household_id());

-- Expenses: same household
create policy "expenses_read" on expenses
  for select using (household_id = my_household_id());

create policy "expenses_insert" on expenses
  for insert with check (household_id = my_household_id());

create policy "expenses_update" on expenses
  for update using (household_id = my_household_id());

create policy "expenses_delete" on expenses
  for delete using (household_id = my_household_id());

-- Recurring: same household
create policy "recurring_read" on recurring
  for select using (household_id = my_household_id());

create policy "recurring_insert" on recurring
  for insert with check (household_id = my_household_id());

create policy "recurring_update" on recurring
  for update using (household_id = my_household_id());

create policy "recurring_delete" on recurring
  for delete using (household_id = my_household_id());

-- Settlements: same household
create policy "settlements_read" on settlements
  for select using (household_id = my_household_id());

create policy "settlements_insert" on settlements
  for insert with check (household_id = my_household_id());

create policy "settlements_delete" on settlements
  for delete using (household_id = my_household_id());

-- ─────────────────────────────────────────────
-- Onboarding helper functions (security definer → bypass RLS)
-- ─────────────────────────────────────────────

-- Create a new household and return its id + join_code
create or replace function create_household_for_user(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_code text;
begin
  insert into households (name) values (p_name) returning id, join_code into v_id, v_code;
  return jsonb_build_object('id', v_id, 'join_code', v_code);
end;
$$;
grant execute on function create_household_for_user(text) to authenticated;

-- Upsert the calling user's profile
create or replace function upsert_my_profile(
  p_household_id uuid,
  p_display_name text,
  p_color        text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, household_id, display_name, color)
  values (auth.uid(), p_household_id, p_display_name, p_color)
  on conflict (id) do update set
    household_id = p_household_id,
    display_name = p_display_name,
    color        = p_color;
end;
$$;
grant execute on function upsert_my_profile(uuid, text, text) to authenticated;

-- Join an existing household by join code
create or replace function join_household_by_code(
  p_code         text,
  p_display_name text,
  p_color        text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_count        int;
begin
  select id into v_household_id
  from households
  where join_code = upper(trim(p_code))
  limit 1;

  if v_household_id is null then
    return jsonb_build_object('error', 'Invalid code. Ask your partner for the 6-char code.');
  end if;

  select count(*) into v_count from profiles where household_id = v_household_id;
  if v_count >= 2 then
    return jsonb_build_object('error', 'This household already has 2 members.');
  end if;

  insert into profiles (id, household_id, display_name, color)
  values (auth.uid(), v_household_id, p_display_name, p_color)
  on conflict (id) do update set
    household_id = v_household_id,
    display_name = p_display_name,
    color        = p_color;

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function join_household_by_code(text, text, text) to authenticated;

-- ─────────────────────────────────────────────
-- Realtime publication
-- ─────────────────────────────────────────────

-- Make sure the tables are in the realtime publication
do $$
begin
  begin
    alter publication supabase_realtime add table expenses;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table recurring;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table settlements;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table categories;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table profiles;
  exception when duplicate_object then null;
  end;
end;
$$;
