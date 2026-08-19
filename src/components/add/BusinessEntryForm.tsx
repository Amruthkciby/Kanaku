"use client";

import { useActionState, useState } from "react";
import { recordClientPayment, recordJobExpense } from "@/lib/actions/jobs";
import { recordStaffPayout } from "@/lib/actions/payouts";
import type { ActionResult } from "@/lib/actions/jobs";

const initialState: ActionResult = { error: null };

interface Props {
  accounts: { id: string; label: string }[];
  jobs: { id: string; title: string }[];
  staff: { id: string; name: string }[];
  categories: string[];
}

type Kind = "client_payment" | "staff_payout" | "job_expense";

export function BusinessEntryForm({ accounts, jobs, staff, categories }: Props) {
  const [kind, setKind] = useState<Kind>("client_payment");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["client_payment", "Client payment"],
            ["staff_payout", "Staff payout"],
            ["job_expense", "Job expense"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`min-h-11 rounded-full px-4 text-sm font-medium ${
              kind === value ? "bg-ink text-paper-raised" : "border border-border text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === "client_payment" && <ClientPaymentFields accounts={accounts} jobs={jobs} />}
      {kind === "staff_payout" && <StaffPayoutFields accounts={accounts} staff={staff} />}
      {kind === "job_expense" && <JobExpenseFields accounts={accounts} jobs={jobs} categories={categories} />}
    </div>
  );
}

function AmountAccountRow({ accounts }: { accounts: { id: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      <input
        name="amount"
        inputMode="decimal"
        autoFocus
        placeholder="Amount (₹)"
        className="font-numeric min-h-12 w-40 rounded-lg border border-border bg-paper-raised px-3 text-lg text-ink"
      />
      <select name="accountId" defaultValue={accounts[0]?.id} className="min-h-12 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ClientPaymentFields({ accounts, jobs }: { accounts: { id: string; label: string }[]; jobs: { id: string; title: string }[] }) {
  const [state, formAction, pending] = useActionState(recordClientPayment, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <select name="jobId" defaultValue={jobs[0]?.id} className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
        {jobs.length === 0 && <option value="">No jobs yet</option>}
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title}
          </option>
        ))}
      </select>
      <AmountAccountRow accounts={accounts} />
      <input name="note" placeholder="Note (optional)" className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink" />
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <button type="submit" disabled={pending || jobs.length === 0} className="min-h-12 w-full rounded-lg bg-brass text-base font-medium text-paper-raised disabled:opacity-50">
        {pending ? "Saving…" : "Record payment"}
      </button>
    </form>
  );
}

function StaffPayoutFields({ accounts, staff }: { accounts: { id: string; label: string }[]; staff: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(recordStaffPayout, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <select name="staffId" defaultValue={staff[0]?.id} className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
        {staff.length === 0 && <option value="">No staff yet</option>}
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <AmountAccountRow accounts={accounts} />
      <p className="text-xs text-slate">Allocated oldest-obligation-first automatically.</p>
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <button type="submit" disabled={pending || staff.length === 0} className="min-h-12 w-full rounded-lg bg-brass text-base font-medium text-paper-raised disabled:opacity-50">
        {pending ? "Saving…" : "Record payout"}
      </button>
    </form>
  );
}

function JobExpenseFields({
  accounts,
  jobs,
  categories,
}: {
  accounts: { id: string; label: string }[];
  jobs: { id: string; title: string }[];
  categories: string[];
}) {
  const [state, formAction, pending] = useActionState(recordJobExpense, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <select name="jobId" defaultValue={jobs[0]?.id} className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
        {jobs.length === 0 && <option value="">No jobs yet</option>}
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title}
          </option>
        ))}
      </select>
      <AmountAccountRow accounts={accounts} />
      <select name="category" defaultValue={categories[0]} className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input name="note" placeholder="Note (optional)" className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink" />
      {state.error && <p className="text-sm text-maroon">{state.error}</p>}
      <button type="submit" disabled={pending || jobs.length === 0} className="min-h-12 w-full rounded-lg bg-brass text-base font-medium text-paper-raised disabled:opacity-50">
        {pending ? "Saving…" : "Add expense"}
      </button>
    </form>
  );
}
