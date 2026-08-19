"use client";

import { useActionState, useState } from "react";
import { createAccount, type ActionResult } from "@/lib/actions/accounts";

const initialState: ActionResult = { error: null };

export function AddAccountForm({ members }: { members: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createAccount, initialState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm text-brass underline">
        Add an account
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <div className="flex flex-wrap gap-3">
        <input name="label" placeholder="Label, e.g. Amruth — Federal" className="min-h-11 flex-1 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink" />
        <select name="kind" defaultValue="bank" className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
          <option value="wallet">Wallet</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <select name="ownerMemberId" className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          <option value="">Whose account?</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input name="openingBalance" inputMode="decimal" placeholder="Opening balance (₹, optional)" className="font-numeric min-h-11 w-52 rounded-lg border border-border bg-paper-raised px-3 text-ink" />
        <select name="openingLedger" defaultValue="family" className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          <option value="family">Family money</option>
          <option value="business">Business money</option>
        </select>
      </div>
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Adding…" : "Add account"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 text-sm text-slate">
          Cancel
        </button>
      </div>
    </form>
  );
}
