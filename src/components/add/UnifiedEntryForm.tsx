"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitOrQueue } from "@/lib/offline-queue";
import { recordClientPayment, recordJobExpense } from "@/lib/actions/jobs";
import { recordStaffPayout } from "@/lib/actions/payouts";
import { parseQuickText, isQuickTextError } from "@/lib/quick-text";
import type { EntryPreset } from "@/lib/queries/household";
import { formatPaise } from "@/lib/money";

type ForType = "family" | "client" | "staff";

interface Props {
  accounts: { id: string; label: string; isPrimary: boolean }[];
  members: { id: string; name: string }[];
  categories: string[];
  defaultMemberId: string;
  presets: EntryPreset[];
  backfillDefaultDate: string;
  isOwner: boolean;
  jobs: { id: string; title: string }[];
  staff: { id: string; name: string }[];
}

// One continuous entry screen for everyone — no separate "Business mode" to switch into. A
// member only ever sees the household fields (Client/Staff aren't rendered for them at all,
// matching what RLS already enforces). For the owner, tapping "Client" or "Staff" just swaps
// what "Who" means; the family/business tagging still happens underneath so reporting and
// safe-to-spend stay accurate, it's just no longer a visible fork in the screen.
export function UnifiedEntryForm({
  accounts,
  members,
  categories,
  defaultMemberId,
  presets,
  backfillDefaultDate,
  isOwner,
  jobs,
  staff,
}: Props) {
  const router = useRouter();
  const [forType, setForType] = useState<ForType>("family");
  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [memberId, setMemberId] = useState(defaultMemberId);
  const [name, setName] = useState(""); // client or staff name text
  const [accountId, setAccountId] = useState(accounts.find((a) => a.isPrimary)?.id ?? accounts[0]?.id ?? "");
  const [mode, setMode] = useState("cash");
  const [occurredOn, setOccurredOn] = useState(backfillDefaultDate);
  const [showBackdate, setShowBackdate] = useState(backfillDefaultDate !== new Date().toISOString().slice(0, 10));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [quickText, setQuickText] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const memberNames = useMemo(() => members.map((m) => m.name), [members]);

  const nameOptions = forType === "client" ? jobs.map((j) => j.title) : forType === "staff" ? staff.map((s) => s.name) : [];
  const nameMatch =
    forType === "client"
      ? jobs.find((j) => j.title.toLowerCase() === name.trim().toLowerCase())
      : forType === "staff"
        ? staff.find((s) => s.name.toLowerCase() === name.trim().toLowerCase())
        : null;

  function selectForType(next: ForType) {
    setForType(next);
    setError(null);
    setName("");
    if (next === "staff") setDirection("expense"); // you only ever pay staff, never receive from them
  }

  function applyPreset(preset: EntryPreset) {
    setForType("family");
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
    setForType("family");
    setAmount((parsed.amountPaise / 100).toString());
    setCategory(parsed.category);
    if (parsed.memberName) {
      const match = members.find((m) => m.name === parsed.memberName);
      if (match) setMemberId(match.id);
    }
    setQuickText("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountPaise = Math.round(Number(amount.replace(/,/g, "")) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0 || !accountId) return;

    setPending(true);
    setError(null);
    setSavedMessage(null);

    if (forType === "family") {
      if (!memberId) {
        setPending(false);
        return;
      }
      const result = await submitOrQueue({
        accountId,
        amountPaise,
        direction,
        category,
        memberId,
        mode,
        note: null,
        occurredOn,
      });
      setPending(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedMessage(result.queued ? "Saved offline — will sync automatically." : "Entry recorded.");
      setAmount("");
      setCategory(null);
      if (!result.queued) router.refresh();
      return;
    }

    if (!name.trim()) {
      setPending(false);
      setError(forType === "client" ? "Type a client name." : "Type a staff name.");
      return;
    }

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

  const showCategory = forType === "family" || (forType === "client" && direction === "expense");

  return (
    <div className="space-y-6">
      {forType === "family" && (
        <>
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
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex justify-center gap-2">
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

        <div className="text-center">
          <label htmlFor="amount" className="mb-1 block text-xs text-slate">
            Amount
          </label>
          <div className="flex items-center justify-center gap-1">
            <span className="font-numeric text-3xl text-slate">₹</span>
            <input
              id="amount"
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
          <p className="mb-2 text-xs text-slate">For</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  selectForType("family");
                  setMemberId(m.id);
                }}
                className={`min-h-11 rounded-full px-4 text-sm ${
                  forType === "family" && memberId === m.id ? "bg-ink text-paper-raised" : "border border-border text-ink"
                }`}
              >
                {m.name}
              </button>
            ))}
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => selectForType("client")}
                  className={`min-h-11 rounded-full px-4 text-sm ${
                    forType === "client" ? "bg-brass text-paper-raised" : "border border-dashed border-brass text-brass"
                  }`}
                >
                  + Client
                </button>
                <button
                  type="button"
                  onClick={() => selectForType("staff")}
                  className={`min-h-11 rounded-full px-4 text-sm ${
                    forType === "staff" ? "bg-brass text-paper-raised" : "border border-dashed border-brass text-brass"
                  }`}
                >
                  + Staff
                </button>
              </>
            )}
          </div>

          {forType !== "family" && (
            <div className="mt-3">
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
          )}
        </div>

        {showCategory && (
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
        )}

        {forType === "staff" && <p className="text-xs text-slate">Allocated oldest-obligation-first automatically.</p>}

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

        <button
          type="submit"
          disabled={pending || !amount || !accountId || (forType === "family" ? !memberId : !name.trim())}
          className="min-h-12 w-full rounded-lg bg-brass text-base font-medium text-paper-raised disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save entry"}
        </button>
      </form>
    </div>
  );
}
