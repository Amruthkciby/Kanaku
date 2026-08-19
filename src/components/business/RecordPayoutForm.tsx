"use client";

import { useActionState, useState } from "react";
import { recordStaffPayout, type ActionResult } from "@/lib/actions/payouts";

const initialState: ActionResult = { error: null };

export function RecordPayoutForm({ staffId, accounts }: { staffId: string; accounts: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(recordStaffPayout, initialState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-full bg-brass px-4 text-sm font-medium text-paper-raised">
        Record payout
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <input type="hidden" name="staffId" value={staffId} />
      <p className="text-sm text-slate">
        Allocated oldest-obligation-first automatically. Anything left over shows as an advance credit.
      </p>
      <div className="flex flex-wrap gap-3">
        <input name="amount" inputMode="decimal" placeholder="Amount (₹)" className="font-numeric min-h-11 w-40 rounded-lg border border-border bg-paper-raised px-3 text-ink" />
        <select name="accountId" defaultValue={accounts[0]?.id} className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <select name="mode" defaultValue="bank" className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank">Bank</option>
          <option value="cheque">Cheque</option>
          <option value="card">Card</option>
        </select>
      </div>
      <input name="note" placeholder="Note (optional)" className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink" />
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Recording…" : "Record payout"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 text-sm text-slate">
          Cancel
        </button>
      </div>
    </form>
  );
}
