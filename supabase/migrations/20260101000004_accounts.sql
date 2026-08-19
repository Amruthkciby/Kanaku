-- Kanakku: accounts -- the real pots of money (Axis 1). Shared between family and business use;
-- see the domain-model note in the project README before touching this file or transactions.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  kind text not null check (kind in ('bank', 'cash', 'wallet')),
  owner_member_id uuid references public.household_members (id) on delete set null,
  opening_balance bigint not null default 0,
  opened_on date not null default current_date,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- Expect exactly one primary account (father's main bank account), enforced as a partial
-- unique index rather than application logic so it can never silently drift.
create unique index accounts_one_primary
  on public.accounts (is_primary)
  where is_primary and deleted_at is null;

alter table public.accounts enable row level security;

-- Both roles can see every account -- balances are physical facts, not business-sensitive
-- (what's sensitive is the classification of transactions against them, handled separately).
create policy accounts_select_all on public.accounts
  for select to authenticated
  using (deleted_at is null);

create policy accounts_owner_write on public.accounts
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());
