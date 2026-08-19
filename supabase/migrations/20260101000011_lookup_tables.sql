-- Kanakku: editable lookup lists for categories and event types (brief section 14). Small
-- tables rather than hardcoded enums so they can be edited from the UI without a migration.

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger expense_categories_set_updated_at
  before update on public.expense_categories
  for each row execute function public.set_updated_at();

create table public.event_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger event_types_set_updated_at
  before update on public.event_types
  for each row execute function public.set_updated_at();

alter table public.expense_categories enable row level security;
alter table public.event_types enable row level security;

-- Both roles read (needed for the family entry tap-chips and the business job form); only an
-- owner edits the list.
create policy expense_categories_select_all on public.expense_categories
  for select to authenticated
  using (deleted_at is null);

create policy expense_categories_owner_write on public.expense_categories
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy event_types_select_all on public.event_types
  for select to authenticated
  using (deleted_at is null);

create policy event_types_owner_write on public.event_types
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

insert into public.expense_categories (name) values
  ('Food'), ('Fuel'), ('Groceries'), ('Medical'), ('Education'),
  ('Utilities'), ('Travel'), ('Gifts'), ('Household'), ('Other');

insert into public.event_types (name) values
  ('Wedding'), ('Engagement'), ('Reception'), ('Baptism'), ('Other');
