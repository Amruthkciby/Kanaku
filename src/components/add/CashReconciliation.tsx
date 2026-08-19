"use client";

import { useActionState, useState } from "react";
import { reconcileCash, type ActionResult } from "@/lib/actions/household";

const initialState: ActionResult = { error: null };

export function CashReconciliation({
  cashAccounts,
  members,
  defaultMemberId,
}: {
  cashAccounts: { id: string; label: string }[];
  members: { id: string; name: string }[];
  defaultMemberId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(reconcileCash, initialState);

  if (cashAccounts.length === 0) return null;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm text-slate underline">
        Reconcile cash in hand
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <p className="text-sm text-slate">
        Count what&apos;s actually in the wallet — the difference is written as a single
        &quot;Cash — unaccounted&quot; entry.
      </p>
      <div className="flex flex-wrap gap-3">
        <select name="accountId" defaultValue={cashAccounts[0].id} className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          {cashAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <select name="memberId" defaultValue={defaultMemberId} className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          name="actual"
          inputMode="decimal"
          placeholder="Counted amount (₹)"
          className="font-numeric min-h-11 w-40 rounded-lg border border-border bg-paper-raised px-3 text-ink"
        />
      </div>
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Reconciling…" : "Reconcile"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 text-sm text-slate">
          Cancel
        </button>
      </div>
    </form>
  );
}
