create table if not exists public.pumpboyz_state (
  key text primary key,
  value jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_pumpboyz_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pumpboyz_state_updated_at on public.pumpboyz_state;
create trigger trg_pumpboyz_state_updated_at
before update on public.pumpboyz_state
for each row
execute function public.set_pumpboyz_state_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pumpboyz_state'
  ) then
    alter publication supabase_realtime add table public.pumpboyz_state;
  end if;
end;
$$;

alter table public.pumpboyz_state enable row level security;

drop policy if exists "Public read pumpboyz state" on public.pumpboyz_state;
create policy "Public read pumpboyz state"
on public.pumpboyz_state
for select
using (true);

drop policy if exists "Public write pumpboyz state" on public.pumpboyz_state;
create policy "Public write pumpboyz state"
on public.pumpboyz_state
for insert
with check (true);

drop policy if exists "Public update pumpboyz state" on public.pumpboyz_state;
create policy "Public update pumpboyz state"
on public.pumpboyz_state
for update
using (true)
with check (true);
