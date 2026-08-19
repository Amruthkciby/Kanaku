-- Kanakku: replace two partial unique indexes with full unique constraints.
--
-- `ON CONFLICT (col1, col2)` (what PostgREST generates for .upsert()) can only infer a unique
-- index/constraint whose definition has no WHERE predicate — a partial index like
-- `unique (...) where deleted_at is null` can't be targeted this way, and Postgres rejects it
-- with "there is no unique or exclusion constraint matching the ON CONFLICT specification".
-- Neither table has a delete path that would need the partial condition (statement_txns rows are
-- only ever marked 'ignored'/'mapped', never soft-deleted; column_mappings has no delete UI at
-- all), so a plain unique constraint is both correct and sufficient here.

drop index if exists public.statement_txns_dedupe_idx;
alter table public.statement_txns
  add constraint statement_txns_account_dedupe_key unique (account_id, dedupe_hash);

drop index if exists public.column_mappings_account_signature_idx;
alter table public.column_mappings
  add constraint column_mappings_account_signature_key unique (account_id, header_signature);
