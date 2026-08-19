-- Kanakku: profiles (1:1 with auth.users) and role-check helpers.
--
-- There is no self-signup (see supabase/config.toml). Users are created directly in the
-- Supabase dashboard; the trigger below creates a matching profile row automatically.

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role escalation guard: a client-side session (auth.uid() is not null) can never change its
-- own role or another profile's role. Only the Supabase dashboard (running as postgres, where
-- auth.uid() is null) can promote/demote a user. This is enforced independently of RLS so that
-- even a permissive UPDATE policy on profiles cannot be used to self-promote to 'owner'.
create or replace function public.profiles_prevent_role_self_change()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.profiles_prevent_role_self_change();

-- Creates a profile row whenever a user is created in auth.users. Runs as SECURITY DEFINER so
-- it can write to public.profiles regardless of the (not-yet-existing) caller's RLS grants.
-- Display name and role are read from auth.users.raw_user_meta_data, set when the user is
-- created in the dashboard, e.g. {"display_name": "Father", "role": "owner"}.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'member')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Role-check helpers, used throughout RLS policies. SECURITY DEFINER so they can read
-- public.profiles even though profiles itself has RLS enabled (below) that would otherwise
-- block a member from reading another member's row.
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid() and is_active and deleted_at is null;
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'owner', false);
$$;

alter table public.profiles enable row level security;

-- Every signed-in user can see every profile's display name (small trusted household), but can
-- only edit their own display name -- role changes are blocked by the trigger above regardless.
create policy profiles_select_all on public.profiles
  for select to authenticated
  using (deleted_at is null);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
