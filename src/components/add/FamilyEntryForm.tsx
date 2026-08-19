"use client";

import { useActionState, useMemo, useState } from "react";
import { createHouseholdEntry, type ActionResult } from "@/lib/actions/household";
import { parseQuickText, isQuickTextError } from "@/lib/quick-text";
import type { EntryPreset } from "@/lib/queries/household";
import { formatPaise } from "@/lib/money";

const initialState: ActionResult = { error: null };

interface Props {
  accounts: { id: string; label: string; isPrimary: boolean }[];
  members: { id: string; name: string }[];
  categories: string[];
  defaultMemberId: string;
  presets: EntryPreset[];
  backfillDefaultDate: string;
}

export function FamilyEntryForm({
  accounts,
  members,
  categories,
  defaultMemberId,
  presets,
  backfillDefaultDate,
}: Props) {
  const [state, formAction, pending] = useActionState(createHouseholdEntry, initialState);
  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [memberId, setMemberId] = useState(defaultMemberId);
  const [accountId, setAccountId] = useState(accounts.find((a) => a.isPrimary)?.id ?? accounts[0]?.id ?? "");
  const [mode, setMode] = useState("cash");
  const [occurredOn, setOccurredOn] = useState(backfillDefaultDate);
  const [showBackdate, setShowBackdate] = useState(backfillDefaultDate !== new Date().toISOString().slice(0, 10));

  const [quickText, setQuickText] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const memberNames = useMemo(() => members.map((m) => m.name), [members]);

  function applyPreset(preset: EntryPreset) {
    setAmount((preset.amount / 100).toString());
    setCategory(preset.category);
    setMemberId(preset.memberId);
  }

  function handleQuickTextSubmit(formData: FormData) {
    const parsed = parseQuickText(String(formData.get("quick") ?? ""), categories, memberNames);
    if (isQuickTextError(parsed)) {
      setQuickError(parsed.error);
      return;
    }
    setQuickError(null);
    setAmount((parsed.amountPaise / 100).toString());
    setCategory(parsed.category);
    if (parsed.memberName) {
      const match = members.find((m) => m.name === parsed.memberName);
      if (match) setMemberId(match.id);
    }
    setQuickText("");
  }

  return (
    <div className="space-y-6">
      <form action={handleQuickTextSubmit} className="flex gap-2">
        <input
          name="quick"
          value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          placeholder='Quick add: "500 fuel"'
          className="min-h-11 flex-1 rounded-lg border border-border bg-paper-raised px-3.5 text-base text-ink focus-visible:outline-2 focus-visible:outline-brass"
        />
        <button type="submit" className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium text-ink">
          Fill
        </button>
      </form>
      {quickError && <p className="text-sm text-maroon">{quickError}</p>}

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyPreset(preset)}
              className="min-h-11 rounded-full border border-border bg-paper-raised px-3.5 text-sm text-ink"
            >
              {formatPaise(preset.amount)} · {preset.category ?? "Other"}
            </button>
          ))}
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="direction" value={direction} />
        <input type="hidden" name="accountId" value={accountId} />
        <input type="hidden" name="memberId" value={memberId} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="occurredOn" value={occurredOn} />
        <input type="hidden" name="category" value={category ?? ""} />

        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setDirection("expense")}
            className={`min-h-11 rounded-full px-5 text-sm font-medium ${
              direction === "expense" ? "bg-maroon text-paper-raised" : "border border-border text-slate"
            }`}
          >
            Spent
          </button>
          <button
            type="button"
            onClick={() => setDirection("income")}
            className={`min-h-11 rounded-full px-5 text-sm font-medium ${
              direction === "income" ? "bg-forest text-paper-raised" : "border border-border text-slate"
            }`}
          >
            Received
          </button>
        </div>

        <div className="text-center">
          <label htmlFor="amount" className="mb-1 block text-xs text-slate">
            Amount
          </label>
          <div className="flex items-center justify-center gap-1">
            <span className="font-numeric text-3xl text-slate">₹</span>
            <input
              id="amount"
              name="amount"
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-numeric w-40 border-b-2 border-border bg-transparent text-center text-4xl text-ink focus-visible:outline-none focus-visible:border-brass"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-slate">Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`min-h-11 rounded-full px-4 text-sm ${
                  category === c ? "bg-brass text-paper-raised" : "border border-border text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-slate">Who</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMemberId(m.id)}
                className={`min-h-11 rounded-full px-4 text-sm ${
                  memberId === m.id ? "bg-ink text-paper-raised" : "border border-border text-ink"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="mb-1 text-xs text-slate">Account</p>
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
          </div>
          <div>
            <p className="mb-1 text-xs text-slate">Mode</p>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
            </select>
          </div>
        </div>

        {showBackdate ? (
          <div>
            <p className="mb-1 text-xs text-slate">Date</p>
            <input
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowBackdate(true)}
            className="text-sm text-slate underline"
          >
            Backfilling an earlier day?
          </button>
        )}

        {state.error && (
          <p role="alert" className="text-sm text-maroon">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !amount || !memberId || !accountId}
          className="min-h-12 w-full rounded-lg bg-brass text-base font-medium text-paper-raised disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save entry"}
        </button>
      </form>
    </div>
  );
}
