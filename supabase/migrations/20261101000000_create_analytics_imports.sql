create table if not exists public.analytics_imports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  row_count integer not null check (row_count between 1 and 10000),
  records jsonb not null check (
    case
      when jsonb_typeof(records) = 'array' then jsonb_array_length(records) = row_count
      else false
    end
  ),
  created_at timestamptz not null default now()
);

create index if not exists analytics_imports_owner_created_at_idx
  on public.analytics_imports (owner_id, created_at desc);

alter table public.analytics_imports enable row level security;

revoke all on public.analytics_imports from anon, authenticated;
grant select, insert, update on public.analytics_imports to authenticated;

drop policy if exists "Owners can read their imports" on public.analytics_imports;
create policy "Owners can read their imports"
  on public.analytics_imports for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Owners can create their imports" on public.analytics_imports;
create policy "Owners can create their imports"
  on public.analytics_imports for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can replace their import" on public.analytics_imports;
create policy "Owners can replace their import"
  on public.analytics_imports for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
