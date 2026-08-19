import { appConfig } from "@/config/app";

// All money in Kanakku is stored as integer paise (bigint in Postgres). Postgres bigint comes
// back from supabase-js as a string (JS numbers lose precision above 2^53), so every amount
// crossing the DB boundary is a string here. Family/business finances never approach
// Number.MAX_SAFE_INTEGER (~9e15 paise = ~9,000,000 crore rupees), so it's safe to convert to a
// JS number for arithmetic and display — never do currency math in floating point rupees though;
// always convert paise as whole integers.

export type Paise = number | string | bigint;

function toNumber(paise: Paise): number {
  return typeof paise === "number" ? paise : Number(paise);
}

const formatter = new Intl.NumberFormat(appConfig.locale, {
  style: "currency",
  currency: appConfig.currency,
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const formatterWithDecimals = new Intl.NumberFormat(appConfig.locale, {
  style: "currency",
  currency: appConfig.currency,
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/** Formats integer paise as Indian-grouped rupees, e.g. 12500000 -> "₹1,25,000". */
export function formatPaise(paise: Paise, { showPaise = false }: { showPaise?: boolean } = {}): string {
  const rupees = toNumber(paise) / 100;
  return showPaise ? formatterWithDecimals.format(rupees) : formatter.format(rupees);
}

/** Same as formatPaise but without the currency symbol, e.g. "1,25,000". */
export function formatPaiseBare(paise: Paise): string {
  const rupees = toNumber(paise) / 100;
  return new Intl.NumberFormat(appConfig.locale, { maximumFractionDigits: 0 }).format(rupees);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: Paise): number {
  return toNumber(paise) / 100;
}
