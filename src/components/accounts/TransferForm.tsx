"use client";

import { useActionState, useState } from "react";
import { createTransfer, type ActionResult } from "@/lib/actions/transfers";

const initialState: ActionResult = { error: null };

export function TransferForm({ accounts }: { accounts: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTransfer, initialState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm text-brass underline">
        Record a transfer between accounts
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <div className="flex flex-wrap gap-3">
        <select name="fromAccountId" defaultValue={accounts[0]?.id} className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              From: {a.label}
            </option>
          ))}
        </select>
        <select name="toAccountId" defaultValue={accounts[1]?.id ?? accounts[0]?.id} className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              To: {a.label}
            </option>
          ))}
        </select>
        <select name="ledger" defaultValue="family" className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          <option value="family">Family</option>
          <option value="business">Business</option>
        </select>
        <input name="amount" inputMode="decimal" placeholder="Amount (₹)" className="font-numeric min-h-11 w-36 rounded-lg border border-border bg-paper-raised px-3 text-ink" />
      </div>
      <input name="note" placeholder="Note (optional)" className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink" />
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Recording…" : "Record transfer"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 text-sm text-slate">
          Cancel
        </button>
      </div>
    </form>
  );
}
