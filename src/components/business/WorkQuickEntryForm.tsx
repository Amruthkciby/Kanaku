"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { recordClientPayment, recordJobExpense } from "@/lib/actions/jobs";
import { recordStaffPayout } from "@/lib/actions/payouts";

type ForType = "client" | "staff";

interface Props {
  accounts: { id: string; label: string; isPrimary: boolean }[];
  categories: string[];
  jobs: { id: string; title: string }[];
  staff: { id: string; name: string }[];
}

// Fast, name-mapped entry for a client payment / job expense / staff payout, without opening a
// specific job first -- type a name, and an unmatched one is created on the fly (same shortcut
// the Add screen used to offer before it was narrowed to household-only entries).
export function WorkQuickEntryForm({ accounts, categories, jobs, staff }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [forType, setForType] = useState<ForType>("client");
  const [direction, setDirection] = useState<"expense" | "income">("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState(accounts.find((a) => a.isPrimary)?.id ?? accounts[0]?.id ?? "");
  const [mode, setMode] = useState("cash");
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [showBackdate, setShowBackdate] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const nameOptions = useMemo(() => (forType === "client" ? jobs.map((j) => j.title) : staff.map((s) => s.name)), [forType, jobs, staff]);
  const nameMatch =
    forType === "client"
      ? jobs.find((j) => j.title.toLowerCase() === name.trim().toLowerCase())
      : staff.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());

  function selectForType(next: ForType) {
    setForType(next);
    setError(null);
    setName("");
    if (next === "staff") setDirection("expense"); // you only ever pay staff, never receive from them
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(forType === "client" ? "Type a client name." : "Type a staff name.");
      return;
    }
    const amountPaise = Math.round(Number(amount.replace(/,/g, "")) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0 || !accountId) return;

    setPending(true);
    setError(null);
    setSavedMessage(null);

    const fd = new FormData();
    fd.set("accountId", accountId);
    fd.set("amount", amount);
    fd.set("mode", mode);
    fd.set("occurredOn", occurredOn);

    let result: { error: string | null };
    if (forType === "staff") {
      fd.set("staffId", nameMatch?.id ?? "");
      fd.set("staffName", name.trim());
      result = await recordStaffPayout({ error: null }, fd);
    } else if (direction === "income") {
      fd.set("jobId", nameMatch?.id ?? "");
      fd.set("clientName", name.trim());
      result = await recordClientPayment({ error: null }, fd);
    } else {
      fd.set("jobId", nameMatch?.id ?? "");
      fd.set("clientName", name.trim());
      fd.set("category", category ?? "");
      result = await recordJobExpense({ error: null }, fd);
    }

    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSavedMessage("Entry recorded.");
    setAmount("");
    setName("");
    setCategory(null);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block min-h-11 rounded-full border border-dashed border-brass px-4 text-left text-sm font-medium text-brass"
      >
        + Add / mark a work expense
      </button>
    );
  }

  const showCategory = forType === "client" && direction === "expense";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-dashed border-border p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectForType("client")}
          className={`min-h-11 rounded-full px-4 text-sm ${forType === "client" ? "bg-brass text-paper-raised" : "border border-border text-ink"}`}
        >
          Client
        </button>
        <button
          type="button"
          onClick={() => selectForType("staff")}
          className={`min-h-11 rounded-full px-4 text-sm ${forType === "staff" ? "bg-brass text-paper-raised" : "border border-border text-ink"}`}
        >
          Staff
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDirection("expense")}
          disabled={forType === "staff"}
          className={`min-h-11 rounded-full px-5 text-sm font-medium disabled:opacity-40 ${
            direction === "expense" ? "bg-maroon text-paper-raised" : "border border-border text-slate"
          }`}
        >
          Spent
        </button>
        <button
          type="button"
          onClick={() => setDirection("income")}
          disabled={forType === "staff"}
          className={`min-h-11 rounded-full px-5 text-sm font-medium disabled:opacity-40 ${
            direction === "income" ? "bg-forest text-paper-raised" : "border border-border text-slate"
          }`}
        >
          Received
        </button>
      </div>

      <div>
        <input
          list={forType === "client" ? "quick-client-names" : "quick-staff-names"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={forType === "client" ? "Client name" : "Staff name"}
          className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3.5 text-base text-ink"
        />
        <datalist id={forType === "client" ? "quick-client-names" : "quick-staff-names"}>
          {nameOptions.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {name.trim() && !nameMatch && <p className="mt-1 text-xs text-brass">New — added automatically.</p>}
      </div>

      {showCategory && (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`min-h-11 rounded-full px-4 text-sm ${category === c ? "bg-brass text-paper-raised" : "border border-border text-ink"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-numeric text-lg text-slate">₹</span>
        <input
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="font-numeric min-h-11 w-32 rounded-lg border border-border bg-paper-raised px-3 text-ink"
        />
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank">Bank</option>
          <option value="cheque">Cheque</option>
          <option value="card">Card</option>
        </select>
      </div>

      {showBackdate ? (
        <input
          type="date"
          value={occurredOn}
          onChange={(e) => setOccurredOn(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink"
        />
      ) : (
        <button type="button" onClick={() => setShowBackdate(true)} className="block text-sm text-slate underline">
          Backfilling an earlier day?
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-maroon">
          {error}
        </p>
      )}
      {savedMessage && (
        <p role="status" className="text-sm text-forest">
          {savedMessage}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || !amount || !accountId || !name.trim()}
          className="min-h-11 rounded-lg bg-brass px-5 text-sm font-medium text-paper-raised disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save entry"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg border border-border px-4 text-sm text-slate">
          Close
        </button>
      </div>
    </form>
  );
}
