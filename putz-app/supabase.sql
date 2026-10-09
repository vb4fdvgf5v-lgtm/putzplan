-- Einmalig im Supabase SQL Editor ausführen (README, Schritt 1).
-- Eine Tabelle für alles. Zugriff nur mit passendem Haushaltscode im Header "x-household".

create table if not exists public.items (
  household  text        not null,
  id         text        not null,
  kind       text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (household, id)
);

create index if not exists items_household_updated on public.items (household, updated_at);

create or replace function public.request_household() returns text
language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-household', '')
$$;

create or replace function public.items_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists items_touch on public.items;
create trigger items_touch before insert or update on public.items
  for each row execute function public.items_touch();

alter table public.items enable row level security;

drop policy if exists items_select on public.items;
drop policy if exists items_insert on public.items;
drop policy if exists items_update on public.items;

create policy items_select on public.items for select to anon
  using (household = public.request_household() and length(household) >= 20);
create policy items_insert on public.items for insert to anon
  with check (household = public.request_household() and length(household) >= 20);
create policy items_update on public.items for update to anon
  using (household = public.request_household())
  with check (household = public.request_household());

grant select, insert, update on public.items to anon;
