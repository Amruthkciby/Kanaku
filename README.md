# Kanakku

A family and business ledger for a household where essentially all money — client payments,
staff pay, groceries — moves through one shared bank account. See the build brief for the full
domain model; the short version:

- **Account** — where money physically sits (a bank account, cash-in-hand).
- **Ledger** — whose money it morally is: `family` or `business`, never summed together.
- **Movement type** — earned/spent vs. a transfer between accounts vs. a drawing (business money
  reclassified as family money with no cash movement at all).

The invariant that ties it together, asserted in `scripts/check-rls.mjs` and shown as a dev-mode
badge on the cash strip:

```
business_cash_position + family_cash_position = sum of all account balances
```

## Stack

Next.js (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth, RLS) + Recharts + SheetJS,
deployed on Netlify.

## Local development

Requires Docker (for the local Supabase stack) and Node 24 (`.nvmrc`; `nvm use` if you have
nvm-windows or nvm installed — the app itself only needs Node ≥ 20, but the Supabase JS client's
realtime module requires native `WebSocket`, which needs Node ≥ 22).

```bash
npm install
npx supabase start        # first run pulls several GB of Docker images
node scripts/seed-local-users.mjs   # creates two local test logins, see below
npm run dev
```

`supabase start` prints an `ANON_KEY` and `SERVICE_ROLE_KEY` — `.env.local` already has the
standard local-stack values checked in (they're the same well-known demo keys on every machine
running `supabase start` locally, not a secret). If you ever run `supabase db reset` (replays all
migrations from scratch), rerun `seed-local-users.mjs` afterwards since it wipes `auth.users` too.

Test logins created by that script:

| Email | Password | Role |
|---|---|---|
| father@kanakku.local | kanakku-owner | owner |
| me@kanakku.local | kanakku-member | member |

### Verifying RLS and the invariant

`scripts/check-rls.mjs` signs in as both test users and hits the REST API directly (not through
the UI) to confirm a `member` gets zero rows from every business table, and that the accounting
invariant holds against the seeded demo data:

```bash
node scripts/check-rls.mjs
```

This is the actual acceptance test from the brief's security section — "verify this by signing in
as a member and querying the Supabase REST API directly, not through the UI" — automated.

### Visual smoke test

`scripts/verify-app.mjs` drives the app with Playwright (mobile + desktop viewports, both roles)
and screenshots the result to `.verify-shots/`. Needs the dev server running first.

## Creating real users (no self-signup)

There is no sign-up page anywhere in the app — `supabase/config.toml` has
`[auth] enable_signup = false`, so the public signup endpoint is disabled. `[auth.email]
enable_signup` must stay `true` though: that flag is the master switch for the email/password
*provider* (including sign-in), not just self-signup — a gotcha worth knowing before touching
that file again.

To create a real user, in the Supabase dashboard (Authentication → Users → Add user):

1. Set their email and a password (or send an invite).
2. Under **User Metadata**, add:
   ```json
   { "display_name": "Father", "role": "owner" }
   ```
   `role` is `"owner"` or `"member"` (defaults to `"member"` if omitted). A trigger
   (`handle_new_auth_user`) creates the matching `profiles` row automatically from this metadata.
3. In the `household_members` table, set that member's `linked_user_id` to the new user's id, so
   the household member and the login are connected.

Role changes after creation must be made directly in the dashboard's SQL editor (`update profiles
set role = 'owner' where user_id = '...'`) — a trigger blocks any client-authenticated session
from changing a `profiles.role`, including its own, so this can't be done through the app and
can't be done by a compromised session either.

## Deployment

- **Netlify**, via `@netlify/plugin-nextjs` (`netlify.toml`). Production branch is `main`; work
  happens on `dev`. Branch deploys and Deploy Previews are disabled — production deploys draw from
  a limited monthly credit pool on the free plan, so keep pushes to `main` deliberate. Add `[skip
  netlify]` (or `[skip ci]`) to a commit message to skip a build; the next unskipped commit ships
  everything that accumulated.
- **Netlify Functions time out at 10s** on the free plan. This is why statement files are parsed
  entirely client-side (`src/lib/statements`, milestone 7) — the server only ever receives
  already-parsed rows, never the raw file.
- **No Netlify scheduled functions.** The only scheduled job is a GitHub Actions workflow
  (`.github/workflows/keep-supabase-alive.yml`) that runs every three days and issues one trivial
  query, to stop Supabase's free tier pausing the project after seven days of inactivity.
- **Never use the Supabase service-role key** in anything that ships — not a route handler, not a
  build step. `scripts/seed-local-users.mjs` and `scripts/check-rls.mjs` are local-only dev tools;
  they refuse to run against anything but a `localhost`/`127.0.0.1` Supabase URL.

## Design direction

Not the default AI-dashboard look (cream background, high-contrast serif hero, terracotta accent)
— grounded instead in a South Indian family photography studio whose current tools are a paper
khata book and a WhatsApp thread. Palette and type pairing are defined in
`src/app/globals.css` with the reasoning inline; summary:

- **Paper** `#F1F0EA` / **Ink** `#16213A` / **Brass** `#B8862B` / **Maroon** `#8C2F39` / **Forest**
  `#2F5233` / **Slate** `#5B6472`.
- **Display** Bitter (slab serif — a stamped ledger header, not a high-contrast hero serif).
  **Body** IBM Plex Sans. **Numeric** IBM Plex Mono, tabular figures, used for every money figure
  in the app (`.font-numeric` / `font-numeric` utility).

Currency always renders via `src/lib/money.ts` (`formatPaise`), which uses `Intl.NumberFormat('en-IN')`
for Indian digit grouping (`₹1,25,000`, not `₹125,000`) — never format a raw paise integer
anywhere else.

## Known accepted risk

`xlsx` (SheetJS) has an unpatched high-severity advisory on the npm registry (no fix published
there). The brief mandates SheetJS specifically and requires it to run client-side only, which
this project does — it only ever parses a bank statement file the account owner chooses to
upload, never untrusted server input.

## Config defaults

`src/config/app.ts` holds the swappable defaults from the brief (app name, currency, locale,
financial year start). Household members, accounts, expense categories and event types are
seeded by migration (`supabase/migrations/20260101000011_lookup_tables.sql` and
`20260101000012_default_household_and_accounts.sql`) and editable afterwards in the UI.
`20260101000099_demo_seed.sql` is a separate, droppable seed of realistic demo data (two jobs,
three staff, a partially-allocated payout, a transfer, a drawing, ~24 household entries) — skip
applying it for a real household's project.
