// Creates test logins in the LOCAL Supabase stack only. Mirrors what the README documents for
// creating real users by hand in the hosted dashboard — this script exists purely so local
// development doesn't require clicking through Studio every time `supabase db reset` runs.
//
// Refuses to run against anything that isn't localhost, and never touches production: the
// service-role key it uses is the well-known local demo key, gitignored via .env.local, and
// never referenced anywhere in application code (see src/lib/supabase/*).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) process.env[match[1]] ??= match[2].trim();
    }
  } catch {
    // .env.local not present — fall through to whatever is already in process.env
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;

if (!url || !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
  console.error(`Refusing to run: NEXT_PUBLIC_SUPABASE_URL (${url}) is not a localhost URL.`);
  process.exit(1);
}
if (!serviceKey) {
  console.error("Missing SUPABASE_LOCAL_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const USERS = [
  { email: "father@kanakku.local", password: "kanakku-owner", display_name: "Father", role: "owner", memberName: "Father" },
  { email: "me@kanakku.local", password: "kanakku-member", display_name: "Me", role: "member", memberName: "Me" },
];

for (const u of USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { display_name: u.display_name, role: u.role },
  });

  if (error) {
    console.error(`Failed to create ${u.email}:`, error.message);
    continue;
  }

  const { error: linkError } = await admin
    .from("household_members")
    .update({ linked_user_id: data.user.id })
    .eq("name", u.memberName);

  if (linkError) {
    console.error(`Created ${u.email} but failed to link household_members row:`, linkError.message);
  } else {
    console.log(`Created ${u.role} ${u.email} (password: ${u.password}), linked to ${u.memberName}`);
  }
}
