export type ParsedExpenseStatus = "CONFIRMED" | "PENDING_REVIEW" | "UNPARSED";

export interface ParsedExpense {
  rawText: string;
  amount: number | null;
  currency: "VND";
  tags: string[];
  expenseDate: Date | null;
  description: string;
  parseConfidence: number;
  status: ParsedExpenseStatus;
  detectedCategorySlug: string | null;
  wallet: string | null;
}

const amountRegex = /(\d+[.,]?\d*)\s*(k|tr|m|đ|d|vnd|vnđ)?/i;
const tagRegex = /#([a-zA-Z0-9_-]+)/g;
const isoDateRegex = /\b(\d{4}-\d{2}-\d{2})\b/;
const shortDateRegex = /\b(\d{1,2})\/(\d{1,2})\b/;
const walletStripRegex = /\$(wallet|cash|bank|momo|zalopay|card)\b/gi;
const walletDetectRegex = /\$(wallet|cash|bank|momo|zalopay|card)\b/i;

function normalize(input: string) {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[₫]/g, "đ");
}

function parseAmount(text: string): number | null {
  const match = text.match(amountRegex);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  if (Number.isNaN(value)) return null;
  const unit = (match[2] || "").toLowerCase();
  if (unit === "k") return Math.round(value * 1_000);
  if (unit === "tr" || unit === "m") return Math.round(value * 1_000_000);
  return Math.round(value);
}

function parseDate(text: string, now = new Date()): Date | null {
  const iso = text.match(isoDateRegex);
  if (iso) {
    const d = new Date(`${iso[1]}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const short = text.match(shortDateRegex);
  if (short) {
    const year = now.getFullYear();
    const d = new Date(year, Number(short[2]) - 1, Number(short[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function stripParts(text: string): string {
  return text
    .replace(tagRegex, " ")
    .replace(isoDateRegex, " ")
    .replace(shortDateRegex, " ")
    .replace(walletStripRegex, " ")
    .replace(amountRegex, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectWallet(text: string): string | null {
  const walletMatch = text.match(walletDetectRegex);
  return walletMatch ? walletMatch[1].toLowerCase() : null;
}

function detectCategory(tags: string[], description: string): string | null {
  if (tags.length > 0) return tags[0].toLowerCase();
  const lower = description.toLowerCase();
  if (/(cafe|coffee)/.test(lower)) return "cafe";
  if (/(ăn|com|trua|sang|food|bún|phở)/.test(lower)) return "food";
  if (/(grab|xe|bus|taxi)/.test(lower)) return "transport";
  return null;
}

function score(input: {
  amount: number | null;
  description: string;
  hasDate: boolean;
  tagsCount: number;
}) {
  let s = 0;
  if (input.amount) s += 0.55;
  if (input.description.length > 0) s += 0.2;
  if (input.hasDate) s += 0.1;
  if (input.tagsCount > 0) s += 0.1;
  if (input.description.length >= 4) s += 0.1;
  return Math.min(1, Number(s.toFixed(2)));
}

export function parseExpenseMessage(rawInput: string, now = new Date()): ParsedExpense {
  const rawText = rawInput ?? "";
  const text = normalize(rawText);
  const tags = [...text.matchAll(tagRegex)].map((m) => m[1]);
  const amount = parseAmount(text);
  const expenseDate = parseDate(text, now);
  const description = stripParts(text);
  const wallet = detectWallet(text);
  const detectedCategorySlug = detectCategory(tags, description);
  const parseConfidence = score({
    amount,
    description,
    hasDate: Boolean(expenseDate),
    tagsCount: tags.length
  });

  let status: ParsedExpenseStatus;
  if (!amount) status = "UNPARSED";
  else if (parseConfidence >= 0.8) status = "CONFIRMED";
  else status = "PENDING_REVIEW";

  return {
    rawText,
    amount,
    currency: "VND",
    tags,
    expenseDate,
    description,
    parseConfidence,
    status,
    detectedCategorySlug,
    wallet
  };
}
