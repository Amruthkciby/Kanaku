-- Kanakku: transactions -- one table for every rupee that moves.
--
-- amount is SIGNED: negative = left the account, positive = arrived. See the domain-model
-- section of the README before changing this table: ledger, kind and transfer_group_id encode
-- three genuinely independent axes and are routinely confused with each other.

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete restrict,
  occurred_on date not null default current_date,
  amount bigint not null check (amount <> 0),

  ledger text not null check (ledger in ('family', 'business')),
  kind text not null check (kind in (
    'household', 'client_payment', 'staff_payout', 'job_expense', 'transfer', 'opening_balance'
  )),

  category text,
  member_id uuid references public.household_members (id) on delete restrict,
  -- Null only for system-seeded rows (e.g. an account's opening balance, inserted by migration
  -- before any user exists). Every human-entered transaction must carry entered_by.
  entered_by uuid references auth.users (id) on delete restrict,

  job_id uuid references public.jobs (id) on delete restrict,
  staff_id uuid references public.staff (id) on delete restrict,
  transfer_group_id uuid,

  mode text not null default 'bank' check (mode in ('cash', 'upi', 'bank', 'cheque', 'card')),
  reference text,
  note text,
  statement_txn_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- Shape enforced by kind, not by convention -- see brief section 7.
  constraint transactions_kind_shape check (
    (kind = 'client_payment' and job_id is not null and ledger = 'business' and amount > 0)
    or (kind = 'staff_payout' and staff_id is not null and ledger = 'business' and amount < 0)
    or (kind = 'job_expense' and job_id is not null and ledger = 'business' and amount < 0)
    or (kind = 'household' and member_id is not null and ledger = 'family')
    or (kind = 'transfer' and transfer_group_id is not null)
    or (kind = 'opening_balance')
  )
);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create index transactions_account_idx on public.transactions (account_id) where deleted_at is null;
create index transactions_ledger_idx on public.transactions (ledger) where deleted_at is null;
create index transactions_occurred_on_idx on public.transactions (occurred_on) where deleted_at is null;
create index transactions_job_idx on public.transactions (job_id) where job_id is not null;
create index transactions_staff_idx on public.transactions (staff_id) where staff_id is not null;
create index transactions_transfer_group_idx on public.transactions (transfer_group_id) where transfer_group_id is not null;
create index transactions_member_idx on public.transactions (member_id) where member_id is not null;

alter table public.transactions enable row level security;

-- A member sees only family-ledger rows, and may only insert household entries against the
-- family ledger. Everything business-ledger is invisible to a member at the row-security layer
-- (not just hidden in the UI) -- verify this with a direct REST query, not through the app.
create policy transactions_owner_select_all on public.transactions
  for select to authenticated
  using (public.is_owner() and deleted_at is null);

create policy transactions_member_select_family on public.transactions
  for select to authenticated
  using (not public.is_owner() and ledger = 'family' and deleted_at is null);

create policy transactions_owner_write_all on public.transactions
  for insert to authenticated
  with check (public.is_owner());

create policy transactions_member_insert_household on public.transactions
  for insert to authenticated
  with check (not public.is_owner() and ledger = 'family' and kind = 'household');

create policy transactions_owner_update_all on public.transactions
  for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy transactions_member_update_own_household on public.transactions
  for update to authenticated
  using (not public.is_owner() and ledger = 'family' and kind = 'household' and entered_by = auth.uid())
  with check (not public.is_owner() and ledger = 'family' and kind = 'household' and entered_by = auth.uid());
