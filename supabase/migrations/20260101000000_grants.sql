-- Kanakku: baseline schema/table/function privileges.
--
-- RLS policies only ever narrow access that a GRANT already permits — Postgres checks table-
-- level privileges before row-level policies, so without this file every policy in every later
-- migration would be silently unreachable ("permission denied for table ..." regardless of what
-- the policy allows). This must be the first migration so every table/function/sequence created
-- afterward inherits these grants automatically via ALTER DEFAULT PRIVILEGES.
--
-- anon gets schema USAGE only, no table/function grants: Kanakku has no unauthenticated data
-- access (the only public route is /login, handled entirely by GoTrue, not PostgREST) and every
-- RLS policy in this project is scoped `to authenticated`, so anon would see zero rows even if
-- granted table privileges. Leaving the grant out is defense in depth, not just tidiness.

grant usage on schema public to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant all on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
