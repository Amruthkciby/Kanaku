"use client";

import { useActionState, useState } from "react";
import { createDrawing, createCapitalContribution, type ActionResult } from "@/lib/actions/drawings";

const initialState: ActionResult = { error: null };

export function DrawingForm({ members }: { members: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createDrawing, initialState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="block min-h-11 text-left text-sm text-brass underline">
        Record a drawing (business → family)
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <div className="flex flex-wrap gap-3">
        <input name="amount" inputMode="decimal" placeholder="Amount (₹)" className="font-numeric min-h-11 w-40 rounded-lg border border-border bg-paper-raised px-3 text-ink" />
        <select name="takenBy" defaultValue={members[0]?.id} className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <input name="note" placeholder="Note (optional)" className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink" />
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Recording…" : "Record drawing"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 text-sm text-slate">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function CapitalContributionForm({ members }: { members: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createCapitalContribution, initialState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="block min-h-11 text-left text-sm text-brass underline">
        Record a capital contribution (family → business)
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <div className="flex flex-wrap gap-3">
        <input name="amount" inputMode="decimal" placeholder="Amount (₹)" className="font-numeric min-h-11 w-40 rounded-lg border border-border bg-paper-raised px-3 text-ink" />
        <select name="fromMemberId" defaultValue={members[0]?.id} className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <input name="note" placeholder="Note (optional)" className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink" />
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Recording…" : "Record contribution"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 text-sm text-slate">
          Cancel
        </button>
      </div>
    </form>
  );
}
