// Ad hoc RLS sanity check against the local stack, mirroring brief section 13's security
// acceptance tests. Signs in as the member REST client (anon key + password grant, not the
// service role) and confirms business tables are invisible. Run after seed-local-users.mjs.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) process.env[match[1]] ??= match[2].trim();
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function clientAs(email, password) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in failed for ${email}: ${error.message}`);
  return client;
}

let failures = 0;
function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) failures++;
}

const member = await clientAs("me@kanakku.local", "kanakku-member");
const owner = await clientAs("father@kanakku.local", "kanakku-owner");

const businessTables = [
  "jobs",
  "staff",
  "job_staff",
  "payout_allocations",
  "drawings",
  "capital_contributions",
  "statement_uploads",
  "statement_txns",
  "column_mappings",
  "mapping_rules",
];

for (const table of businessTables) {
  const { data, error } = await member.from(table).select("*");
  check(`member sees zero rows from ${table}`, !error && (data?.length ?? 0) === 0);
}

{
  const { data, error } = await member.from("transactions").select("*").eq("ledger", "business");
  check("member sees zero business-ledger transactions", !error && (data?.length ?? 0) === 0);
}

{
  const { data, error } = await member.from("transactions").select("*");
  const allFamily = (data ?? []).every((t) => t.ledger === "family");
  check("member's unfiltered transactions query returns only family rows", !error && allFamily && (data?.length ?? 0) > 0);
}

{
  const { data, error } = await member.from("accounts").select("*");
  check("member can select accounts", !error && (data?.length ?? 0) > 0);
}

{
  const { data, error } = await member.from("household_members").select("*");
  check("member can select household_members", !error && (data?.length ?? 0) > 0);
}

{
  const { data: acct } = await owner.from("accounts").select("id").eq("is_primary", true).single();
  const { data: me } = await member.from("household_members").select("id").eq("name", "Me").single();
  const { error } = await member.from("transactions").insert({
    account_id: acct.id,
    amount: -12300,
    ledger: "family",
    kind: "household",
    category: "Food",
    member_id: me.id,
  });
  check("member can insert a household transaction", !error);
}

{
  const { error } = await member.from("jobs").insert({
    title: "Sneaky job",
    client_name: "x",
    event_date: "2026-01-01",
    agreed_amount: 100,
  });
  check("member cannot insert into jobs", !!error);
}

{
  const { data, error } = await owner.rpc("job_financials", { p_job_id: "00000000-0000-0000-0000-000000000000" });
  check("owner can call job_financials (business-only RPC)", !error || error.code !== "42501");
  void data;
}

{
  const { error } = await member.rpc("business_cash_position");
  check("member is refused business_cash_position", !!error && error.code === "42501");
}

{
  const { data: total } = await owner.rpc("total_cash_across_accounts");
  const { data: fam } = await owner.rpc("family_cash_position");
  const { data: biz } = await owner.rpc("business_cash_position");
  check(
    `invariant holds: business(${biz}) + family(${fam}) = total(${total})`,
    Number(biz) + Number(fam) === Number(total),
  );
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
