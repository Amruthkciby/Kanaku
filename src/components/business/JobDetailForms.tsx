"use client";

import { useActionState, useState } from "react";
import { recordClientPayment, recordJobExpense, addJobStaff, type ActionResult } from "@/lib/actions/jobs";

const initialState: ActionResult = { error: null };

function CollapsibleForm({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-full border border-border px-4 text-sm font-medium text-ink">
        {label}
      </button>
    );
  }
  return <div className="rounded-xl border border-dashed border-border p-4">{children}</div>;
}

export function RecordClientPaymentForm({ jobId, accounts }: { jobId: string; accounts: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(recordClientPayment, initialState);
  return (
    <CollapsibleForm label="Record payment">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="jobId" value={jobId} />
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
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Recording…" : "Record payment"}
        </button>
      </form>
    </CollapsibleForm>
  );
}

export function RecordJobExpenseForm({
  jobId,
  accounts,
  categories,
}: {
  jobId: string;
  accounts: { id: string; label: string }[];
  categories: string[];
}) {
  const [state, formAction, pending] = useActionState(recordJobExpense, initialState);
  return (
    <CollapsibleForm label="Add expense">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="jobId" value={jobId} />
        <div className="flex flex-wrap gap-3">
          <input name="amount" inputMode="decimal" placeholder="Amount (₹)" className="font-numeric min-h-11 w-40 rounded-lg border border-border bg-paper-raised px-3 text-ink" />
          <select name="accountId" defaultValue={accounts[0]?.id} className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={categories[0]} className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink">
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <input name="note" placeholder="Note (optional)" className="min-h-11 w-full rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink" />
        {state.error && <p className="text-sm text-maroon">{state.error}</p>}
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Adding…" : "Add expense"}
        </button>
      </form>
    </CollapsibleForm>
  );
}

export function AddJobStaffForm({ jobId, staff }: { jobId: string; staff: { id: string; name: string; defaultFee: number | null }[] }) {
  const [state, formAction, pending] = useActionState(addJobStaff, initialState);
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const selected = staff.find((s) => s.id === staffId);

  return (
    <CollapsibleForm label="Assign staff">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="jobId" value={jobId} />
        <div className="flex flex-wrap gap-3">
          <select
            name="staffId"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="roleLabel" placeholder="Role (optional)" className="min-h-11 rounded-lg border border-border bg-paper-raised px-3 text-sm text-ink" />
          <input
            name="agreedFee"
            inputMode="decimal"
            placeholder="Agreed fee (₹)"
            defaultValue={selected?.defaultFee ? (selected.defaultFee / 100).toString() : ""}
            className="font-numeric min-h-11 w-36 rounded-lg border border-border bg-paper-raised px-3 text-ink"
          />
        </div>
        {state.error && <p className="text-sm text-maroon">{state.error}</p>}
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brass px-4 text-sm font-medium text-paper-raised">
          {pending ? "Assigning…" : "Assign"}
        </button>
      </form>
    </CollapsibleForm>
  );
}
