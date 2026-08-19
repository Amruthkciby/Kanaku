-- Kanakku: demo seed data -- a small realistic scenario so every screen, chart and invariant
-- test can be exercised before real data exists (brief section 14). This migration is trivial
-- to drop: `delete from public.transactions where note like 'DEMO:%' or ...` won't work cleanly
-- since most demo rows have no distinguishing note, so instead just don't apply this file (or
-- roll it back) on a real household's project -- everything it inserts is self-contained and
-- nothing else in the schema depends on it.
--
-- entered_by is left null throughout: no real auth user exists yet when this seed typically
-- runs, and demo rows are not real financial records anyone needs attribution for.

do $$
declare
  v_bank uuid;
  v_cash uuid;
  v_me uuid;
  v_father uuid;
  v_mother uuid;
  v_sister uuid;

  v_ravi uuid;
  v_anu uuid;
  v_vishnu uuid;

  v_job_a uuid;
  v_job_b uuid;
  v_js_a_ravi uuid;
  v_js_a_anu uuid;
  v_js_b_ravi uuid;
  v_js_b_vishnu uuid;

  v_payout_txn uuid;
  v_transfer_group uuid := gen_random_uuid();

  v_categories text[] := array['Food','Fuel','Groceries','Medical','Education','Utilities','Travel','Gifts','Household','Other'];
  v_members uuid[];
  i integer;
begin
  select id into v_bank from public.accounts where label = 'Father — bank';
  select id into v_cash from public.accounts where label = 'Father — cash';
  select id into v_me from public.household_members where name = 'Me';
  select id into v_father from public.household_members where name = 'Father';
  select id into v_mother from public.household_members where name = 'Mother';
  select id into v_sister from public.household_members where name = 'Sister';
  v_members := array[v_me, v_father, v_mother, v_sister];

  -- ── staff ──────────────────────────────────────────────────────────────
  insert into public.staff (name, phone, default_fee) values
    ('Ravi', '9847000001', 800000) returning id into v_ravi;
  insert into public.staff (name, phone, default_fee) values
    ('Anu', '9847000002', 400000) returning id into v_anu;
  insert into public.staff (name, phone, default_fee) values
    ('Vishnu', '9847000003', 600000) returning id into v_vishnu;

  -- ── jobs ───────────────────────────────────────────────────────────────
  insert into public.jobs (title, client_name, client_phone, event_date, event_type, agreed_amount, status)
  values ('Menon–Nair Wedding', 'Menon family', '9946000001', current_date - interval '45 days', 'Wedding', 15000000, 'open')
  returning id into v_job_a;

  insert into public.jobs (title, client_name, client_phone, event_date, event_type, agreed_amount, status)
  values ('Thomas Reception', 'Thomas family', '9946000002', current_date - interval '20 days', 'Reception', 8000000, 'open')
  returning id into v_job_b;

  insert into public.job_staff (job_id, staff_id, role_label, agreed_fee)
  values (v_job_a, v_ravi, 'Lead photographer', 800000) returning id into v_js_a_ravi;
  insert into public.job_staff (job_id, staff_id, role_label, agreed_fee)
  values (v_job_a, v_anu, 'Assistant', 400000) returning id into v_js_a_anu;
  insert into public.job_staff (job_id, staff_id, role_label, agreed_fee)
  values (v_job_b, v_ravi, 'Lead photographer', 800000) returning id into v_js_b_ravi;
  insert into public.job_staff (job_id, staff_id, role_label, agreed_fee)
  values (v_job_b, v_vishnu, 'Drone operator', 600000) returning id into v_js_b_vishnu;

  -- ── client payments (business) ────────────────────────────────────────
  insert into public.transactions (account_id, occurred_on, amount, ledger, kind, job_id, mode, note)
  values (v_bank, current_date - interval '44 days', 10000000, 'business', 'client_payment', v_job_a, 'bank', 'Advance — Menon–Nair Wedding');

  insert into public.transactions (account_id, occurred_on, amount, ledger, kind, job_id, mode, note)
  values (v_bank, current_date - interval '19 days', 8000000, 'business', 'client_payment', v_job_b, 'upi', 'Full payment — Thomas Reception');

  -- ── job expense (business) ──────────────────────────────────────────────
  insert into public.transactions (account_id, occurred_on, amount, ledger, kind, job_id, mode, category, note)
  values (v_bank, current_date - interval '43 days', -200000, 'business', 'job_expense', v_job_a, 'cash', 'Travel', 'Props and travel — Menon–Nair Wedding');

  -- ── staff payout, partially allocated FIFO across Job A then Job B ──────
  -- Ravi is owed 800000 (Job A) + 800000 (Job B) = 1,600,000. Paid 1,000,000: Job A settles in
  -- full (800,000), Job B gets the remaining 200,000, leaving 600,000 still owed there. This is
  -- the exact "collected in full, staff still owed → not settled" scenario from brief section 13.
  insert into public.transactions (account_id, occurred_on, amount, ledger, kind, staff_id, mode, note)
  values (v_bank, current_date - interval '10 days', -1000000, 'business', 'staff_payout', v_ravi, 'upi', 'Payout to Ravi')
  returning id into v_payout_txn;

  insert into public.payout_allocations (transaction_id, job_staff_id, amount)
  values (v_payout_txn, v_js_a_ravi, 800000);
  insert into public.payout_allocations (transaction_id, job_staff_id, amount)
  values (v_payout_txn, v_js_b_ravi, 200000);

  -- ── a transfer between father's two accounts (not income/expense) ──────
  insert into public.transactions (account_id, occurred_on, amount, ledger, kind, transfer_group_id, mode, note)
  values (v_bank, current_date - interval '15 days', -5000000, 'family', 'transfer', v_transfer_group, 'bank', 'To cash for the week');
  insert into public.transactions (account_id, occurred_on, amount, ledger, kind, transfer_group_id, mode, note)
  values (v_cash, current_date - interval '15 days', 5000000, 'family', 'transfer', v_transfer_group, 'cash', 'From bank for the week');

  -- ── a drawing: business money becomes family money ──────────────────────
  insert into public.drawings (amount, occurred_on, taken_by, note)
  values (500000, current_date - interval '12 days', v_father, 'Groceries and household spending');

  -- ── ~24 household entries across members, categories, both accounts ────
  for i in 0..23 loop
    insert into public.transactions (account_id, occurred_on, amount, ledger, kind, category, member_id, mode, note)
    values (
      case when i % 4 = 0 then v_cash else v_bank end,
      current_date - ((i * 3) || ' days')::interval,
      -1 * (15000 + (i % 6) * 7000)::bigint,
      'family',
      'household',
      v_categories[1 + (i % array_length(v_categories, 1))],
      v_members[1 + (i % 4)],
      (array['cash','upi','bank','card'])[1 + (i % 4)],
      null
    );
  end loop;
end $$;
