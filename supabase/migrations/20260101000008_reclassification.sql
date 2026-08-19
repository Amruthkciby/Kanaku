-- Kanakku: drawings and capital_contributions -- classification changes with no cash movement.
-- These never touch any account balance; see brief section 2 ("the three cases that break naive
-- designs") and the invariant in section 8.

create table public.drawings (
  id uuid primary key default gen_random_uuid(),
  amount bigint not null check (amount > 0),
  occurred_on date not null default current_date,
  taken_by uuid not null references public.household_members (id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger drawings_set_updated_at
  before update on public.drawings
  for each row execute function public.set_updated_at();

create table public.capital_contributions (
  id uuid primary key default gen_random_uuid(),
  amount bigint not null check (amount > 0),
  occurred_on date not null default current_date,
  from_member_id uuid not null references public.household_members (id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger capital_contributions_set_updated_at
  before update on public.capital_contributions
  for each row execute function public.set_updated_at();

alter table public.drawings enable row level security;
alter table public.capital_contributions enable row level security;

-- Owner-only direct access: these tables sit on the business side of the ledger split. A member
-- still needs to see the *effect* of drawings on the family dashboard (money the family
-- received) without seeing the drawings table itself -- that's served by the SECURITY DEFINER
-- function public.family_drawings_feed() in the views/functions migration, which exposes only
-- (date, amount, note), never staff rates or client amounts.
create policy drawings_owner_all on public.drawings
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy capital_contributions_owner_all on public.capital_contributions
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());
