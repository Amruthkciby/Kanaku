-- Kanakku: derived values (brief section 8), implemented as SECURITY DEFINER functions so that:
--   1. Aggregates that legitimately span both ledgers (account balances, the invariant check)
--      can be computed without needing per-row access to business transactions.
--   2. Business-only aggregates (business cash position, staff payable, job profit, ...) stay
--      gated behind an explicit is_owner() check *inside* the function, independent of table
--      RLS -- a member calling these gets a clean insufficient_privilege error, never rows.
--
-- Design note on opening balances: accounts.opening_balance is a display convenience only. The
-- authoritative figure is always a transactions row of kind='opening_balance' (inserted whenever
-- an account is created with a non-zero starting balance), because an opening balance is money
-- that must carry a ledger classification like everything else -- see brief section 7's kind
-- enum. This is why the functions below sum transactions only, with no separate "+
-- opening_balance" term: adding one on top of the opening_balance transaction row would double
-- count it, and would break the core invariant
-- (business_cash_position + family_cash_position = sum of all account balances).

-- ── account balances (both roles: a physical fact) ─────────────────────────
create or replace function public.account_balances()
returns table (account_id uuid, label text, kind text, balance bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.label,
    a.kind,
    coalesce(sum(t.amount), 0)::bigint
  from public.accounts a
  left join public.transactions t
    on t.account_id = a.id and t.deleted_at is null
  where a.deleted_at is null
  group by a.id, a.label, a.kind
  order by a.is_primary desc, a.label;
$$;

grant execute on function public.account_balances() to authenticated;

create or replace function public.total_cash_across_accounts()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(balance), 0)::bigint from public.account_balances();
$$;

grant execute on function public.total_cash_across_accounts() to authenticated;

-- ── ledger cash positions ───────────────────────────────────────────────────
create or replace function public.family_cash_position()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(amount) from public.transactions
              where ledger = 'family' and deleted_at is null), 0)
    + coalesce((select sum(amount) from public.drawings where deleted_at is null), 0)
    - coalesce((select sum(amount) from public.capital_contributions where deleted_at is null), 0);
$$;

grant execute on function public.family_cash_position() to authenticated;

create or replace function public.business_cash_position()
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return coalesce((select sum(amount) from public.transactions
                    where ledger = 'business' and deleted_at is null), 0)
    - coalesce((select sum(amount) from public.drawings where deleted_at is null), 0)
    + coalesce((select sum(amount) from public.capital_contributions where deleted_at is null), 0);
end;
$$;

grant execute on function public.business_cash_position() to authenticated;

-- "Safe to spend" is just the family cash position (brief section 8), exposed under its own
-- name so the UI call site reads like the product concept, not the accounting formula.
create or replace function public.safe_to_spend()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select public.family_cash_position();
$$;

grant execute on function public.safe_to_spend() to authenticated;

-- ── staff payable (business-only) ───────────────────────────────────────────
create or replace function public.staff_payable_total()
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- js.id is referenced inside the correlated subquery, so it must be resolved per-row before
  -- being summed -- mixing that with an ungrouped sum(js.agreed_fee) at the same query level is
  -- what Postgres rejects with "subquery uses ungrouped column" (42803). The inner subquery
  -- produces one "owed" row per job_staff; the outer query then sums those.
  return coalesce((
    select sum(o.owed) from (
      select js.agreed_fee - coalesce((
        select sum(pa.amount) from public.payout_allocations pa
        join public.transactions t on t.id = pa.transaction_id and t.deleted_at is null
        where pa.job_staff_id = js.id and pa.deleted_at is null
      ), 0) as owed
      from public.job_staff js
      where js.deleted_at is null
    ) o
  ), 0);
end;
$$;

grant execute on function public.staff_payable_total() to authenticated;

-- A boolean signal, safe for both roles: is business cash enough to cover what's owed to staff?
-- Deliberately exposes no numbers -- a member should see the warning without seeing business
-- cash position or staff payable directly (see brief section 5: business figures are owner-only).
create or replace function public.business_float_ok()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_cash bigint;
  v_staff_payable bigint;
begin
  v_business_cash := coalesce((select sum(amount) from public.transactions
                    where ledger = 'business' and deleted_at is null), 0)
    - coalesce((select sum(amount) from public.drawings where deleted_at is null), 0)
    + coalesce((select sum(amount) from public.capital_contributions where deleted_at is null), 0);

  v_staff_payable := coalesce((
    select sum(o.owed) from (
      select js.agreed_fee - coalesce((
        select sum(pa.amount) from public.payout_allocations pa
        join public.transactions t on t.id = pa.transaction_id and t.deleted_at is null
        where pa.job_staff_id = js.id and pa.deleted_at is null
      ), 0) as owed
      from public.job_staff js
      where js.deleted_at is null
    ) o
  ), 0);

  return v_business_cash >= v_staff_payable;
end;
$$;

grant execute on function public.business_float_ok() to authenticated;

-- ── drawings, narrow feed for the family dashboard (both roles) ────────────
-- Exposes only what the family dashboard needs (brief section 9.4: "Drawings received from the
-- business, clearly labelled as transfers rather than income") -- never staff rates or client
-- amounts, and never the drawings table itself (a member still gets zero rows from a direct
-- query against public.drawings, satisfying brief section 13's security test).
create or replace function public.family_drawings_feed(p_from date, p_to date)
returns table (occurred_on date, amount bigint, note text)
language sql
stable
security definer
set search_path = public
as $$
  select d.occurred_on, d.amount, d.note
  from public.drawings d
  where d.deleted_at is null
    and d.occurred_on between p_from and p_to
  order by d.occurred_on desc;
$$;

grant execute on function public.family_drawings_feed(date, date) to authenticated;

-- ── job financials (business-only) ──────────────────────────────────────────
create or replace function public.job_financials(p_job_id uuid)
returns table (
  collected bigint,
  still_to_collect bigint,
  paid_to_staff bigint,
  job_expenses bigint,
  profit bigint,
  settled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_agreed bigint;
  v_collected bigint;
  v_paid_to_staff bigint;
  v_expenses bigint;
  v_open_obligations integer;
begin
  if not public.is_owner() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select j.agreed_amount into v_agreed from public.jobs j where j.id = p_job_id;

  v_collected := coalesce((
    select sum(t.amount) from public.transactions t
    where t.job_id = p_job_id and t.kind = 'client_payment' and t.deleted_at is null
  ), 0);

  v_paid_to_staff := coalesce((
    select sum(pa.amount) from public.payout_allocations pa
    join public.job_staff js on js.id = pa.job_staff_id
    join public.transactions t on t.id = pa.transaction_id and t.deleted_at is null
    where js.job_id = p_job_id and pa.deleted_at is null
  ), 0);

  v_expenses := coalesce((
    select sum(-t.amount) from public.transactions t
    where t.job_id = p_job_id and t.kind = 'job_expense' and t.deleted_at is null
  ), 0);

  select count(*) into v_open_obligations
  from public.job_staff js
  where js.job_id = p_job_id
    and js.deleted_at is null
    and js.agreed_fee > coalesce((
      select sum(pa.amount) from public.payout_allocations pa
      join public.transactions t on t.id = pa.transaction_id and t.deleted_at is null
      where pa.job_staff_id = js.id and pa.deleted_at is null
    ), 0);

  return query select
    v_collected,
    v_agreed - v_collected,
    v_paid_to_staff,
    v_expenses,
    v_collected - v_paid_to_staff - v_expenses,
    (v_agreed - v_collected = 0 and v_open_obligations = 0);
end;
$$;

grant execute on function public.job_financials(uuid) to authenticated;

-- ── job_staff still-to-pay (business-only) ──────────────────────────────────
create or replace function public.job_staff_still_to_pay(p_job_staff_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fee bigint;
  v_paid bigint;
begin
  if not public.is_owner() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select agreed_fee into v_fee from public.job_staff where id = p_job_staff_id;

  v_paid := coalesce((
    select sum(pa.amount) from public.payout_allocations pa
    join public.transactions t on t.id = pa.transaction_id and t.deleted_at is null
    where pa.job_staff_id = p_job_staff_id and pa.deleted_at is null
  ), 0);

  return v_fee - v_paid;
end;
$$;

grant execute on function public.job_staff_still_to_pay(uuid) to authenticated;
