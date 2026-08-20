import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Plain REST endpoint (rather than a Server Action) specifically so the offline queue
// (src/lib/offline-queue.ts) can retry a queued entry with a normal fetch() once the network
// comes back — Server Actions aren't addressable that way.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You're signed out." }, { status: 401 });
  }

  const body = await request.json();
  const { accountId, amountPaise, direction, category, memberId, mode, note, occurredOn } = body;

  if (!accountId || !memberId || !Number.isFinite(amountPaise) || amountPaise <= 0) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const { error } = await supabase.from("transactions").insert({
    account_id: accountId,
    occurred_on: occurredOn ?? new Date().toISOString().slice(0, 10),
    amount: direction === "income" ? amountPaise : -amountPaise,
    ledger: "family",
    kind: "household",
    category: category || null,
    member_id: memberId,
    entered_by: user.id,
    mode: mode ?? "cash",
    note: note || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
