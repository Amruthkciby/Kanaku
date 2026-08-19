-- Kanakku: statement import. Files are parsed client-side (see brief section 4 deployment
-- constraints) -- the server only ever receives already-parsed rows, and the raw file itself is
-- never persisted, only these parsed rows plus raw_row JSON for traceability.

create table public.statement_uploads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete restrict,
  filename text not null,
  uploaded_by uuid not null references auth.users (id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  row_count integer not null default 0,
  mapped_count integer not null default 0,
  status text not null default 'processing' check (status in ('processing', 'reviewing', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger statement_uploads_set_updated_at
  before update on public.statement_uploads
  for each row execute function public.set_updated_at();

create table public.statement_txns (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.statement_uploads (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete restrict,
  txn_date date not null,
  narration text,
  ref_no text,
  debit_amount bigint not null default 0 check (debit_amount >= 0),
  credit_amount bigint not null default 0 check (credit_amount >= 0),
  balance_after bigint,
  raw_row jsonb not null default '{}'::jsonb,
  dedupe_hash text not null,
  status text not null default 'unreviewed' check (status in ('unreviewed', 'mapped', 'ignored')),
  mapped_transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger statement_txns_set_updated_at
  before update on public.statement_txns
  for each row execute function public.set_updated_at();

-- Dedupe key: sha256(account|date|amount|narration|ref), computed client-side on parse. Unique
-- per account so re-uploading an overlapping statement creates zero duplicate rows.
create unique index statement_txns_dedupe_idx
  on public.statement_txns (account_id, dedupe_hash)
  where deleted_at is null;

create index statement_txns_upload_idx on public.statement_txns (upload_id);
create index statement_txns_status_idx on public.statement_txns (status) where deleted_at is null;

create table public.column_mappings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  header_signature text not null,
  mapping jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger column_mappings_set_updated_at
  before update on public.column_mappings
  for each row execute function public.set_updated_at();

create unique index column_mappings_account_signature_idx
  on public.column_mappings (account_id, header_signature)
  where deleted_at is null;

create table public.mapping_rules (
  id uuid primary key default gen_random_uuid(),
  match_type text not null check (match_type in ('contains', 'regex')),
  pattern text not null,
  ledger text not null check (ledger in ('family', 'business')),
  kind text not null check (kind in (
    'household', 'client_payment', 'staff_payout', 'job_expense', 'transfer'
  )),
  default_category text,
  default_job_id uuid references public.jobs (id) on delete set null,
  default_staff_id uuid references public.staff (id) on delete set null,
  priority integer not null default 100,
  hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger mapping_rules_set_updated_at
  before update on public.mapping_rules
  for each row execute function public.set_updated_at();

create index mapping_rules_priority_idx on public.mapping_rules (priority) where deleted_at is null;

alter table public.statement_uploads enable row level security;
alter table public.statement_txns enable row level security;
alter table public.column_mappings enable row level security;
alter table public.mapping_rules enable row level security;

-- All statement_* tables are business-only: owner writes and reads, a member gets zero rows.
create policy statement_uploads_owner_all on public.statement_uploads
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy statement_txns_owner_all on public.statement_txns
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy column_mappings_owner_all on public.column_mappings
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy mapping_rules_owner_all on public.mapping_rules
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Traceability: a committed transaction back-links to the statement row it came from.
alter table public.transactions
  add constraint transactions_statement_txn_fk
  foreign key (statement_txn_id) references public.statement_txns (id) on delete set null;
