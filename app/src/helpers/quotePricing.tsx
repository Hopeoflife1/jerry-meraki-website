import { formatNaira } from "./formatNaira";

// Pure, shared by frontend and backend. Business rule: every quote carries at least 3% markup
// over total vendor cost. Hard floor for everyone, including the owner. No overrides.
const MIN_MARKUP_PERCENT = 3;

const subtotal = (lines: { amount: number | string }[]) => lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

// Integer math avoids float drift (50000 * 1.03 = 51500.000000000004).
const priceAtMarkup = (cost: number, markupPercent: number) => Math.round((cost * (100 + markupPercent)) / 100);

const minimumPrice = (cost: number) => Math.ceil(Math.round(cost * (100 + MIN_MARKUP_PERCENT)) / 100);

// Returns a team-facing error message, or null when the quote is valid.
const validate = ({ cost, markupPercent, finalPrice }: { cost: number; markupPercent: number; finalPrice: number }): string | null => {
  if (!(cost > 0)) return "Enter the production costs before sending a quote";
  if (!(markupPercent >= MIN_MARKUP_PERCENT)) return `Markup must be at least ${MIN_MARKUP_PERCENT}%`;
  const min = minimumPrice(cost);
  if (!(finalPrice >= min)) {
    return `Final price must be at least ${formatNaira(min)} (${MIN_MARKUP_PERCENT}% above the ${formatNaira(cost)} cost)`;
  }
  return null;
};

export const quotePricing = { MIN_MARKUP_PERCENT, subtotal, priceAtMarkup, minimumPrice, validate };