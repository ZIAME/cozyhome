-- Cozy Home: cloud tables for sync. Run this once in the Supabase SQL editor (or `supabase db push`).
-- Every row belongs to one person (user_id) and row-level security lets each person see only their own rows.
-- `updated` is the app's own timestamp (ms) used to pick the newer copy; `server_at` is the cloud's clock,
-- used by devices to ask "what changed since I last looked?".

create table if not exists public.items (
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  id        text not null,
  tracker   text not null default '',
  kind      text not null default '',
  date      text,
  f         jsonb not null default '{}'::jsonb,
  has_blob  boolean not null default false,
  created   bigint not null default 0,
  updated   bigint not null,
  deleted   boolean not null default false,
  server_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);
create table if not exists public.salah_days (
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  date      text not null,
  p         jsonb not null default '{}'::jsonb,
  x         jsonb not null default '{}'::jsonb,
  updated   bigint not null,
  server_at timestamptz not null default clock_timestamp(),
  primary key (user_id, date)
);
create table if not exists public.settings (
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  key       text not null,
  value     jsonb,
  updated   bigint not null,
  server_at timestamptz not null default clock_timestamp(),
  primary key (user_id, key)
);
create index if not exists items_changes on public.items (user_id, server_at);
create index if not exists salah_changes on public.salah_days (user_id, server_at);
create index if not exists settings_changes on public.settings (user_id, server_at);

-- Keep the newer copy: an older write (lower `updated`) never overwrites a newer one. Stamp the cloud clock.
create or replace function public.cozy_keep_newer() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated < old.updated then
    return old;
  end if;
  new.server_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists keep_newer on public.items;
create trigger keep_newer before insert or update on public.items for each row execute function public.cozy_keep_newer();
drop trigger if exists keep_newer on public.salah_days;
create trigger keep_newer before insert or update on public.salah_days for each row execute function public.cozy_keep_newer();
drop trigger if exists keep_newer on public.settings;
create trigger keep_newer before insert or update on public.settings for each row execute function public.cozy_keep_newer();

-- Signed-in people may use the tables at all (newer Supabase projects don't grant this automatically).
-- Row-level security below still limits each person to their own rows.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.items, public.salah_days, public.settings to authenticated;
revoke all on public.items, public.salah_days, public.settings from anon;

-- Row-level security: your rows only.
alter table public.items enable row level security;
alter table public.salah_days enable row level security;
alter table public.settings enable row level security;
drop policy if exists own_rows on public.items;
create policy own_rows on public.items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_rows on public.salah_days;
create policy own_rows on public.salah_days for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_rows on public.settings;
create policy own_rows on public.settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Photos: a private bucket; each person reads and writes only the folder named after their user id.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
drop policy if exists own_photos on storage.objects;
create policy own_photos on storage.objects for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Delete my account: removes the person's rows and their sign-in. The app deletes their photos first.
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.items where user_id = auth.uid();
  delete from public.salah_days where user_id = auth.uid();
  delete from public.settings where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
