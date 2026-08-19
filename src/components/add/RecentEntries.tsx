"use client";

import { useActionState, useEffect, useState } from "react";
import { updateHouseholdEntry, softDeleteEntry, type ActionResult } from "@/lib/actions/household";
import { formatPaise } from "@/lib/money";
import type { HouseholdEntry } from "@/lib/queries/household";

const initialState: ActionResult = { error: null };

export function RecentEntries({
  entries,
  categories,
  members,
}: {
  entries: HouseholdEntry[];
  categories: string[];
  members: { id: string; name: string }[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    await softDeleteEntry(id);
    setPendingDeleteId(null);
  }

  if (entries.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate sm:px-6">No entries yet — add your first one above.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.id} className="px-4 py-3 sm:px-6">
          {editingId === entry.id ? (
            <EditEntryForm
              entry={entry}
              categories={categories}
              members={members}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-numeric text-base text-ink">
                  {entry.amount < 0 ? "−" : "+"}
                  {formatPaise(Math.abs(entry.amount))}
                </p>
                <p className="text-sm text-slate">
                  {entry.category ?? "Other"} · {entry.memberName} · {entry.accountLabel} ·{" "}
                  {new Date(entry.occurredOn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(entry.id)}
                  className="min-h-11 rounded-lg px-3 text-sm text-slate hover:text-ink"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  disabled={pendingDeleteId === entry.id}
                  className="min-h-11 rounded-lg px-3 text-sm text-maroon disabled:opacity-50"
                >
                  {pendingDeleteId === entry.id ? "Removing…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function EditEntryForm({
  entry,
  categories,
  members,
  onDone,
}: {
  entry: HouseholdEntry;
  categories: string[];
  members: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateHouseholdEntry, initialState);
  const [amount, setAmount] = useState(String(Math.abs(entry.amount) / 100));
  const [category, setCategory] = useState(entry.category ?? "");
  const [memberId, setMemberId] = useState(entry.memberId);
  const [occurredOn, setOccurredOn] = useState(entry.occurredOn);

  useEffect(() => {
    if (!pending && state !== initialState && state.error === null) {
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, pending]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="direction" value={entry.amount < 0 ? "expense" : "income"} />
      <input type="hidden" name="mode" value={entry.mode} />
      <div className="flex flex-wrap gap-2">
        <input
          name="amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="font-numeric min-h-11 w-28 rounded-lg border border-border bg-paper px-3 text-ink"
        />
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-paper px-3 text-sm text-ink"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          name="memberId"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-paper px-3 text-sm text-ink"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="occurredOn"
          value={occurredOn}
          onChange={(e) => setOccurredOn(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-paper px-3 text-sm text-ink"
        />
      </div>
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-lg px-4 text-sm text-slate">
          Cancel
        </button>
      </div>
    </form>
  );
}
