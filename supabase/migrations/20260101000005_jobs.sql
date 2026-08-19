-- Kanakku: jobs and the staff engaged on them. Business-only.

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text not null,
  client_phone text,
  event_date date not null,
  event_type text not null default 'Other',
  agreed_amount bigint not null check (agreed_amount >= 0),
  status text not null default 'open' check (status in ('open', 'settled', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

create index jobs_event_date_idx on public.jobs (event_date);
create index jobs_status_idx on public.jobs (status) where deleted_at is null;

create table public.job_staff (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete restrict,
  role_label text,
  agreed_fee bigint not null check (agreed_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger job_staff_set_updated_at
  before update on public.job_staff
  for each row execute function public.set_updated_at();

create index job_staff_job_idx on public.job_staff (job_id);
create index job_staff_staff_idx on public.job_staff (staff_id);

alter table public.jobs enable row level security;
alter table public.job_staff enable row level security;

-- Business-only: client names and agreed amounts are sensitive. A member gets zero rows.
create policy jobs_owner_all on public.jobs
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy job_staff_owner_all on public.job_staff
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());
