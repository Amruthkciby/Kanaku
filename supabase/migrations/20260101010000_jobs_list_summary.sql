-- Kanakku (milestone 4): a single aggregate query for the jobs list, rather than N+1 calls to
-- job_financials per job. Owner-only, like every other business aggregate.

create or replace function public.jobs_list_summary()
returns table (
  job_id uuid,
  title text,
  client_name text,
  event_date date,
  status text,
  agreed_amount bigint,
  collected bigint,
  staff_agreed_total bigint,
  staff_paid_total bigint,
  job_expenses bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  select
    j.id,
    j.title,
    j.client_name,
    j.event_date,
    j.status,
    j.agreed_amount,
    coalesce(cp.collected, 0)::bigint,
    coalesce(js.staff_agreed_total, 0)::bigint,
    coalesce(pa.staff_paid_total, 0)::bigint,
    coalesce(je.job_expenses, 0)::bigint
  from public.jobs j
  left join lateral (
    select sum(t.amount) as collected
    from public.transactions t
    where t.job_id = j.id and t.kind = 'client_payment' and t.deleted_at is null
  ) cp on true
  left join lateral (
    select sum(x.agreed_fee) as staff_agreed_total
    from public.job_staff x
    where x.job_id = j.id and x.deleted_at is null
  ) js on true
  left join lateral (
    select sum(pa.amount) as staff_paid_total
    from public.payout_allocations pa
    join public.job_staff x on x.id = pa.job_staff_id
    join public.transactions t on t.id = pa.transaction_id and t.deleted_at is null
    where x.job_id = j.id and pa.deleted_at is null
  ) pa on true
  left join lateral (
    select sum(-t.amount) as job_expenses
    from public.transactions t
    where t.job_id = j.id and t.kind = 'job_expense' and t.deleted_at is null
  ) je on true
  where j.deleted_at is null
  order by j.event_date desc;
end;
$$;

grant execute on function public.jobs_list_summary() to authenticated;
