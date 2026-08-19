"use client";

import { useState } from "react";
import { deleteStaffPayout } from "@/lib/actions/payouts";
import { formatPaise } from "@/lib/money";
import type { StaffLedgerEntry } from "@/lib/queries/staff";

export function StaffLedger({ entries }: { entries: StaffLedgerEntry[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setPendingId(id);
    await deleteStaffPayout(id);
    setPendingId(null);
  }

  if (entries.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate sm:px-6">No obligations or payouts yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((e) => (
        <li key={`${e.kind}-${e.id}`} className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <p className="text-ink">{e.label}</p>
            <p className="text-sm text-slate">
              {e.kind === "obligation" ? "Owed for" : "Paid on"}{" "}
              {e.date && new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-numeric text-sm ${e.kind === "obligation" ? "text-brass" : "text-forest"}`}>
              {e.kind === "obligation" ? formatPaise(e.amount) : formatPaise(Math.abs(e.amount))}
            </span>
            {e.kind === "payout" && (
              <button
                type="button"
                onClick={() => handleDelete(e.id)}
                disabled={pendingId === e.id}
                className="min-h-11 text-sm text-maroon disabled:opacity-50"
              >
                {pendingId === e.id ? "Removing…" : "Delete"}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
