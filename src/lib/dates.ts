import { appConfig } from "@/config/app";

export type PeriodPreset = "this-month" | "last-month" | "quarter" | "financial-year" | "custom";

export interface DateRange {
  from: string; // ISO date
  to: string; // ISO date
  label: string;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Indian financial year: April to March (brief section 9.4, configurable in src/config/app.ts). */
export function financialYearRange(reference = new Date()): DateRange {
  const startMonth = appConfig.financialYearStartMonth - 1; // 0-indexed
  const year = reference.getMonth() >= startMonth ? reference.getFullYear() : reference.getFullYear() - 1;
  const from = new Date(year, startMonth, 1);
  const to = new Date(year + 1, startMonth, 0);
  return { from: toISO(from), to: toISO(to), label: `FY ${year}-${String(year + 1).slice(2)}` };
}

export function resolvePeriod(preset: PeriodPreset, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();

  switch (preset) {
    case "this-month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toISO(from), to: toISO(to), label: "This month" };
    }
    case "last-month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toISO(from), to: toISO(to), label: "Last month" };
    }
    case "quarter": {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toISO(from), to: toISO(to), label: "Last 3 months" };
    }
    case "financial-year":
      return financialYearRange(now);
    case "custom":
      return {
        from: customFrom ?? toISO(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: customTo ?? toISO(now),
        label: "Custom",
      };
  }
}

export function lastNMonths(n: number): { year: number; month: number; label: string; from: string; to: string }[] {
  const now = new Date();
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      from: toISO(from),
      to: toISO(to),
    });
  }
  return result;
}
