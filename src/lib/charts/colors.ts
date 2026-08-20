// Fixed-order categorical assignment (dataviz skill rule: color follows the entity, never its
// rank — a filter that changes which categories are present must not repaint the survivors).
// Categories are assigned a slot the first time they're seen, in a stable, predetermined order
// (alphabetical) rather than "whatever appears first in this particular query result" — so the
// same category always gets the same color across every chart and every period.

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

const OTHER_COLOR = "var(--chart-other)";

/** Assigns stable colors to up to 6 categories (alphabetical order); the rest fold into "Other". */
export function assignCategoryColors(allKnownCategories: string[]): Map<string, string> {
  const sorted = [...allKnownCategories].sort((a, b) => a.localeCompare(b));
  const map = new Map<string, string>();
  sorted.forEach((cat, i) => {
    map.set(cat, i < PALETTE.length ? PALETTE[i] : OTHER_COLOR);
  });
  return map;
}

export function colorForCategory(colorMap: Map<string, string>, category: string): string {
  return colorMap.get(category) ?? OTHER_COLOR;
}

export { OTHER_COLOR };
