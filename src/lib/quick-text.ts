// Deterministic parser for Kanakku's own entry shorthand (brief section 9.1): "500 fuel",
// "1200 groceries amma". We control the grammar, so no LLM — a fixed grammar means the same text
// always parses the same way, which matters when someone is typing fast and not looking closely.
//
// Grammar: <amount> [category words...] [member name]
//   - amount: leading number, optionally with a decimal part (rupees, not paise)
//   - the trailing word is treated as a member name if it matches a known household member
//   - everything else becomes the category, matched case-insensitively against known categories
//     when possible, otherwise used as free text with the first letter capitalised

export interface QuickTextMatch {
  amountPaise: number;
  category: string | null;
  memberName: string | null;
}

export interface QuickTextError {
  error: string;
}

export function parseQuickText(
  input: string,
  knownCategories: string[],
  knownMembers: string[],
): QuickTextMatch | QuickTextError {
  const trimmed = input.trim();
  if (!trimmed) return { error: "Type an amount to start." };

  const tokens = trimmed.split(/\s+/);
  const amountToken = tokens[0].replace(/,/g, "");
  const amount = Number(amountToken);

  if (!/^\d+(\.\d+)?$/.test(amountToken) || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Start with an amount, e.g. \"500 fuel\"." };
  }

  const rest = tokens.slice(1);
  let memberName: string | null = null;

  if (rest.length > 0) {
    const last = rest[rest.length - 1];
    const memberMatch = knownMembers.find((m) => m.toLowerCase() === last.toLowerCase());
    if (memberMatch) {
      memberName = memberMatch;
      rest.pop();
    }
  }

  let category: string | null = null;
  if (rest.length > 0) {
    const text = rest.join(" ");
    const categoryMatch = knownCategories.find((c) => c.toLowerCase() === text.toLowerCase());
    category = categoryMatch ?? text.charAt(0).toUpperCase() + text.slice(1);
  }

  return {
    amountPaise: Math.round(amount * 100),
    category,
    memberName,
  };
}

export function isQuickTextError(result: QuickTextMatch | QuickTextError): result is QuickTextError {
  return "error" in result;
}
