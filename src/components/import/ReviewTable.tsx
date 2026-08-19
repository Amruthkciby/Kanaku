"use client";

import { useState } from "react";
import { commitStatementRow, ignoreStatementRow, bulkIgnoreStatementRows } from "@/lib/actions/statements";
import { formatPaise } from "@/lib/money";
import type { StatementTxnRow } from "@/lib/queries/statements";

type Kind = "household" | "client_payment" | "staff_payout" | "job_expense" | "transfer";

interface RowState {
  ledger: "family" | "business";
  kind: Kind;
  category: string;
  memberId: string;
  jobId: string;
  staffId: string;
  toAccountId: string;
  saveRule: boolean;
  ruleToken: string;
}

interface RefData {
  members: { id: string; name: string }[];
  categories: string[];
  jobs: { id: string; title: string }[];
  staff: { id: string; name: string }[];
  accounts: { id: string; label: string }[];
}

function defaultRowState(row: StatementTxnRow): RowState {
  return {
    ledger: (row.suggestion?.ledger as "family" | "business") ?? "family",
    kind: (row.suggestion?.kind as Kind) ?? "household",
    category: row.suggestion?.category ?? "",
    memberId: "",
    jobId: row.suggestion?.jobId ?? "",
    staffId: row.suggestion?.staffId ?? "",
    toAccountId: "",
    saveRule: false,
    ruleToken: (row.narration ?? "").split(/\s+/).slice(0, 2).join(" "),
  };
}

export function ReviewTable({ rows: initialRows, refData }: { rows: StatementTxnRow[]; refData: RefData }) {
  const [rows, setRows] = useState(initialRows);
  const [states, setStates] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(initialRows.map((r) => [r.id, defaultRowState(r)])),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const reviewedCount = initialRows.length - rows.length;

  function updateState(id: string, patch: Partial<RowState>) {
    setStates((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  }

  function removeRow(id: string) {
    setRows((r) => r.filter((row) => row.id !== id));
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  async function handleCommit(row: StatementTxnRow) {
    const s = states[row.id];
    setPendingId(row.id);
    setErrorById((e) => ({ ...e, [row.id]: "" }));

    const result = await commitStatementRow({
      statementTxnId: row.id,
      ledger: s.ledger,
      kind: s.kind,
      category: s.kind === "household" || s.kind === "job_expense" ? s.category || null : null,
      memberId: s.kind === "household" ? s.memberId || null : null,
      jobId: s.kind === "client_payment" || s.kind === "job_expense" ? s.jobId || null : null,
      staffId: s.kind === "staff_payout" ? s.staffId || null : null,
      toAccountId: s.kind === "transfer" ? s.toAccountId || null : null,
      saveRule: s.saveRule,
      ruleToken: s.saveRule ? s.ruleToken : null,
    });

    setPendingId(null);
    if (result.error) {
      setErrorById((e) => ({ ...e, [row.id]: result.error! }));
      return;
    }
    removeRow(row.id);
  }

  async function handleIgnore(id: string) {
    setPendingId(id);
    await ignoreStatementRow(id);
    setPendingId(null);
    removeRow(id);
  }

  async function handleBulkIgnore() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await bulkIgnoreStatementRows(ids);
    ids.forEach(removeRow);
  }

  if (rows.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-8 text-center text-slate">All rows reviewed.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate">
          {reviewedCount} of {initialRows.length} reviewed
        </p>
        {selected.size > 0 && (
          <button type="button" onClick={handleBulkIgnore} className="min-h-11 rounded-lg border border-border px-3 text-sm text-slate">
            Ignore {selected.size} selected
          </button>
        )}
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const s = states[row.id];
          const amount = row.creditAmount > 0 ? row.creditAmount : -row.debitAmount;
          return (
            <div key={row.id} className="rounded-xl border border-border bg-paper-raised p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={(e) =>
                    setSelected((sel) => {
                      const next = new Set(sel);
                      if (e.target.checked) next.add(row.id);
                      else next.delete(row.id);
                      return next;
                    })
                  }
                  className="mt-1.5 h-5 w-5"
                  aria-label="Select row"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm text-ink">
                      {row.narration || "(no narration)"}
                      {row.refNo ? <span className="text-slate"> · {row.refNo}</span> : null}
                    </p>
                    <p className={`font-numeric text-lg ${amount < 0 ? "text-maroon" : "text-forest"}`}>
                      {formatPaise(Math.abs(amount))}
                    </p>
                  </div>
                  <p className="mb-3 text-xs text-slate">
                    {new Date(row.txnDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {row.suggestion && <span className="ml-2 text-brass">Suggested from a rule</span>}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex rounded-full border border-border p-0.5">
                      {(["family", "business"] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => updateState(row.id, { ledger: l })}
                          className={`min-h-9 rounded-full px-3 text-xs font-medium capitalize ${
                            s.ledger === l ? "bg-ink text-paper-raised" : "text-slate"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>

                    <select
                      value={s.kind}
                      onChange={(e) => updateState(row.id, { kind: e.target.value as Kind })}
                      className="min-h-9 rounded-lg border border-border bg-paper px-2 text-xs text-ink"
                    >
                      <option value="household">Household</option>
                      <option value="client_payment">Client payment</option>
                      <option value="staff_payout">Staff payout</option>
                      <option value="job_expense">Job expense</option>
                      <option value="transfer">Transfer</option>
                    </select>

                    {s.kind === "household" && (
                      <>
                        <select value={s.category} onChange={(e) => updateState(row.id, { category: e.target.value })} className="min-h-9 rounded-lg border border-border bg-paper px-2 text-xs text-ink">
                          <option value="">Category</option>
                          {refData.categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <select value={s.memberId} onChange={(e) => updateState(row.id, { memberId: e.target.value })} className="min-h-9 rounded-lg border border-border bg-paper px-2 text-xs text-ink">
                          <option value="">Who</option>
                          {refData.members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    {(s.kind === "client_payment" || s.kind === "job_expense") && (
                      <select value={s.jobId} onChange={(e) => updateState(row.id, { jobId: e.target.value })} className="min-h-9 rounded-lg border border-border bg-paper px-2 text-xs text-ink">
                        <option value="">Job</option>
                        {refData.jobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.title}
                          </option>
                        ))}
                      </select>
                    )}
                    {s.kind === "job_expense" && (
                      <select value={s.category} onChange={(e) => updateState(row.id, { category: e.target.value })} className="min-h-9 rounded-lg border border-border bg-paper px-2 text-xs text-ink">
                        <option value="">Category</option>
                        {refData.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}

                    {s.kind === "staff_payout" && (
                      <select value={s.staffId} onChange={(e) => updateState(row.id, { staffId: e.target.value })} className="min-h-9 rounded-lg border border-border bg-paper px-2 text-xs text-ink">
                        <option value="">Staff</option>
                        {refData.staff.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {s.kind === "transfer" && (
                      <select value={s.toAccountId} onChange={(e) => updateState(row.id, { toAccountId: e.target.value })} className="min-h-9 rounded-lg border border-border bg-paper px-2 text-xs text-ink">
                        <option value="">To account</option>
                        {refData.accounts.filter((a) => a.id !== row.accountId).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {s.kind !== "transfer" && (
                    <label className="mt-2 flex items-center gap-2 text-xs text-slate">
                      <input
                        type="checkbox"
                        checked={s.saveRule}
                        onChange={(e) => updateState(row.id, { saveRule: e.target.checked })}
                      />
                      Always treat narrations containing
                      <input
                        value={s.ruleToken}
                        onChange={(e) => updateState(row.id, { ruleToken: e.target.value })}
                        className="min-h-7 w-32 rounded border border-border bg-paper px-1.5 text-xs text-ink"
                      />
                      this way
                    </label>
                  )}

                  {errorById[row.id] && <p className="mt-2 text-sm text-maroon">{errorById[row.id]}</p>}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCommit(row)}
                      disabled={pendingId === row.id}
                      className="min-h-9 rounded-lg bg-brass px-3 text-xs font-medium text-paper-raised disabled:opacity-50"
                    >
                      {pendingId === row.id ? "Saving…" : "Commit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIgnore(row.id)}
                      disabled={pendingId === row.id}
                      className="min-h-9 rounded-lg border border-border px-3 text-xs text-slate"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
