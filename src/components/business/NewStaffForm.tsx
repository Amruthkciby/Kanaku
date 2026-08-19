"use client";

import { useActionState, useState } from "react";
import { createStaff, type ActionResult } from "@/lib/actions/staff";

const initialState: ActionResult = { error: null };

export function NewStaffForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createStaff, initialState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-full bg-brass px-4 text-sm font-medium text-paper-raised">
        + New staff
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <div className="flex flex-wrap gap-3">
        <input name="name" placeholder="Name" className="min-h-11 flex-1 rounded-lg border border-border bg-paper px-3 text-sm text-ink" />
        <input name="phone" placeholder="Phone (optional)" className="min-h-11 rounded-lg border border-border bg-paper px-3 text-sm text-ink" />
        <input name="defaultFee" inputMode="decimal" placeholder="Default fee (₹, optional)" className="font-numeric min-h-11 w-52 rounded-lg border border-border bg-paper px-3 text-ink" />
      </div>
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Adding…" : "Add staff"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 text-sm text-slate">
          Cancel
        </button>
      </div>
    </form>
  );
}
