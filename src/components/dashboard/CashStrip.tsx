import { createClient } from "@/lib/supabase/server";
import { getCashStrip } from "@/lib/queries/derived";
import { formatPaise } from "@/lib/money";

export async function CashStrip() {
  const supabase = await createClient();
  const data = await getCashStrip(supabase);

  return (
    <div className="border-b border-border bg-paper-raised px-4 py-4 sm:px-6">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {data.accounts.map((account) => (
            <div key={account.accountId}>
              <p className="text-xs text-slate">{account.label}</p>
              <p className="font-numeric text-lg text-ink">{formatPaise(account.balance)}</p>
            </div>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-end gap-x-6 gap-y-2">
          {data.businessCashPosition !== null && (
            <div>
              <p className="text-xs text-slate">Business cash</p>
              <p className="font-numeric text-lg text-ink">{formatPaise(data.businessCashPosition)}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-slate">Safe to spend</p>
            <p
              className={`font-numeric text-xl font-medium ${
                data.safeToSpend < 0 ? "text-maroon" : "text-forest"
              }`}
            >
              {formatPaise(data.safeToSpend)}
            </p>
          </div>
        </div>
      </div>

      {data.safeToSpend < 0 && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-maroon-soft px-3 py-2 text-sm font-medium text-maroon">
          <span aria-hidden="true">⚠</span>
          The family is spending more than it has — safe to spend is negative.
        </p>
      )}

      {!data.businessFloatOk && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-maroon-soft px-3 py-2 text-sm font-medium text-maroon">
          <span aria-hidden="true">⚠</span>
          Business cash is below what&apos;s owed to staff — check before spending.
        </p>
      )}

      {process.env.NODE_ENV !== "production" && data.businessCashPosition !== null && (
        <p className="mt-3 font-numeric text-xs text-slate">
          dev: business({formatPaise(data.businessCashPosition)}) + family(
          {formatPaise(data.familyCashPosition)}) {data.invariantHolds ? "=" : "≠"} total(
          {formatPaise(data.totalCash)}) — invariant {data.invariantHolds ? "holds ✓" : "BROKEN ✗"}
        </p>
      )}
    </div>
  );
}
