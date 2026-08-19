-- Kanakku: payout_allocations -- splits a single staff_payout transaction across the job_staff
-- obligations it settles. A staff member is paid in lumps across several jobs, not per job; see
-- brief section 9.2.

create table public.payout_allocations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  job_staff_id uuid not null references public.job_staff (id) on delete restrict,
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger payout_allocations_set_updated_at
  before update on public.payout_allocations
  for each row execute function public.set_updated_at();

create index payout_allocations_transaction_idx on public.payout_allocations (transaction_id);
create index payout_allocations_job_staff_idx on public.payout_allocations (job_staff_id);

alter table public.payout_allocations enable row level security;

create policy payout_allocations_owner_all on public.payout_allocations
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());
