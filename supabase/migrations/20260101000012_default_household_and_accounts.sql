-- Kanakku: default household members and accounts (brief section 14). These are real defaults,
-- not demo data -- unlike the scenario in the seed migration, this one should NOT be dropped.
-- linked_user_id is left null; link each member to their login from the dashboard once the
-- corresponding auth user has been created (see README).

insert into public.household_members (name) values
  ('Me'), ('Father'), ('Mother'), ('Sister');

insert into public.accounts (label, kind, opening_balance, is_primary, owner_member_id)
select 'Father — bank', 'bank', 0, true, hm.id
from public.household_members hm where hm.name = 'Father';

insert into public.accounts (label, kind, opening_balance, is_primary, owner_member_id)
select 'Father — cash', 'cash', 0, false, hm.id
from public.household_members hm where hm.name = 'Father';
