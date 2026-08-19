-- Kanakku: extensions and shared helper functions/triggers.

create extension if not exists "pgcrypto";

-- Shared updated_at maintenance, used by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Stamps updated_at := now() on every UPDATE. Attached per-table.';
