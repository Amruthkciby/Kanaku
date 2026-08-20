"use client";

import { useActionState, useState } from "react";
import { createJob, type ActionResult } from "@/lib/actions/jobs";

const initialState: ActionResult = { error: null };

export function NewJobForm({ eventTypes }: { eventTypes: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createJob, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-full bg-brass px-4 text-sm font-medium text-paper-raised"
      >
        + New work
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <div className="flex flex-wrap gap-3">
        <input name="title" placeholder="Title, e.g. Menon–Nair Wedding" className="min-h-11 flex-1 rounded-lg border border-border bg-paper px-3 text-sm text-ink" />
        <select name="eventType" defaultValue={eventTypes[0]} className="min-h-11 rounded-lg border border-border bg-paper px-3 text-sm text-ink">
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <input name="clientName" placeholder="Client name" className="min-h-11 flex-1 rounded-lg border border-border bg-paper px-3 text-sm text-ink" />
        <input name="clientPhone" placeholder="Client phone (optional)" className="min-h-11 rounded-lg border border-border bg-paper px-3 text-sm text-ink" />
      </div>
      <div className="flex flex-wrap gap-3">
        <input type="date" name="eventDate" className="min-h-11 rounded-lg border border-border bg-paper px-3 text-sm text-ink" />
        <input name="agreedAmount" inputMode="decimal" placeholder="Agreed amount (₹)" className="font-numeric min-h-11 w-48 rounded-lg border border-border bg-paper px-3 text-ink" />
      </div>
      <textarea name="notes" placeholder="Notes (optional)" className="min-h-20 w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink" />
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Creating…" : "Create work"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 text-sm text-slate">
          Cancel
        </button>
      </div>
    </form>
  );
}
