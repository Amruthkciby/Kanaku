"use client";

import { useRouter } from "next/navigation";

export function AddLedgerToggle({ ledger }: { ledger: "family" | "business" }) {
  const router = useRouter();

  return (
    <div role="tablist" aria-label="Ledger" className="flex rounded-full border border-border bg-paper-raised p-1">
      {(["family", "business"] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={ledger === option}
          onClick={() => router.push(option === "family" ? "/add" : "/add?ledger=business")}
          className={`min-h-11 flex-1 rounded-full text-sm font-medium capitalize transition-colors ${
            ledger === option ? "bg-ink text-paper-raised" : "text-slate"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
