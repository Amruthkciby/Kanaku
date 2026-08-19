-- Kanakku: household_members and staff.

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  linked_user_id uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger household_members_set_updated_at
  before update on public.household_members
  for each row execute function public.set_updated_at();

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  default_fee bigint,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger staff_set_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

alter table public.household_members enable row level security;
alter table public.staff enable row level security;

-- household_members: every signed-in user can see the household (needed to attribute "who
-- spent this" on a family entry); only an owner may add/edit members.
create policy household_members_select_all on public.household_members
  for select to authenticated
  using (deleted_at is null);

create policy household_members_owner_write on public.household_members
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- staff: business-only. A member gets zero rows (staff pay rates are sensitive business info).
create policy staff_owner_all on public.staff
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());
