-- Kanakku: soft-delete RPC functions.
--
-- Postgres RLS gotcha (this cost real debugging time, hence the long comment): our SELECT
-- policies filter out rows where deleted_at is not null (soft-deleted rows should vanish from
-- normal queries). But for UPDATE, Postgres requires the *resulting* row to still satisfy the
-- table's SELECT policy, not just the UPDATE policy's own WITH CHECK -- so a plain
-- `update transactions set deleted_at = now()` from a client, even as owner with a permissive
-- UPDATE policy, fails with 42501 ("new row violates row-level security policy"), because the
-- row you just soft-deleted immediately fails your own SELECT policy's `deleted_at is null`
-- clause. Loosening the SELECT policy isn't the fix (it would defeat soft-delete filtering
-- entirely). The standard workaround is exactly this: do the soft-delete inside a SECURITY
-- DEFINER function, which runs as the function owner and isn't subject to this RLS interaction.

create or replace function public.soft_delete_transaction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_ledger text;
  v_entered_by uuid;
begin
  select kind, ledger, entered_by into v_kind, v_ledger, v_entered_by
  from public.transactions where id = p_id and deleted_at is null;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if not (
    public.is_owner()
    or (v_ledger = 'family' and v_kind = 'household' and v_entered_by = auth.uid())
  ) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  update public.transactions set deleted_at = now() where id = p_id;
end;
$$;

grant execute on function public.soft_delete_transaction(uuid) to authenticated;

-- Removes a staff payout and its allocations together (brief section 9.2: "Deleting a payout
-- removes its allocations and restores the affected job balances").
create or replace function public.soft_delete_staff_payout(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  update public.payout_allocations set deleted_at = now()
  where transaction_id = p_transaction_id and deleted_at is null;

  update public.transactions set deleted_at = now()
  where id = p_transaction_id and kind = 'staff_payout' and deleted_at is null;
end;
$$;

grant execute on function public.soft_delete_staff_payout(uuid) to authenticated;

create or replace function public.soft_delete_job(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  update public.jobs set deleted_at = now() where id = p_id and deleted_at is null;
end;
$$;

grant execute on function public.soft_delete_job(uuid) to authenticated;

create or replace function public.soft_delete_staff(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  update public.staff set deleted_at = now() where id = p_id and deleted_at is null;
end;
$$;

grant execute on function public.soft_delete_staff(uuid) to authenticated;
