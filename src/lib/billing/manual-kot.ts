import { calculateGST, round2 } from "@/lib/gst/calculator";

export const MAX_MANUAL_KOTS = 50;
export const MANUAL_CHARGE_GST_RATE = 5;

export interface ManualKotInput {
  kotNumber: string;
  description: string;
  amount: number;
}

export function normalizeManualKots(value: unknown): ManualKotInput[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_MANUAL_KOTS) throw new Error(`Add between 1 and ${MAX_MANUAL_KOTS} KOTs.`);
  const seen = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`KOT ${index + 1}: enter a valid slip and amount.`);
    const { kotNumber = "", description = "", amount: rawAmount } = item;
    if (typeof kotNumber !== "string" || typeof description !== "string") throw new Error(`KOT ${index + 1}: invalid slip number or description.`);
    const number = kotNumber.trim().toUpperCase();
    const details = description.trim() || "Kitchen Order (KOT)";
    const amount = typeof rawAmount === "number" || (typeof rawAmount === "string" && rawAmount.trim()) ? Number(rawAmount) : NaN;
    if (!Number.isFinite(amount) || amount < 0.01 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) throw new Error(`KOT ${index + 1}: enter an amount greater than ₹0 with at most two decimal places.`);
    if (number.length > 80 || details.length > 500) throw new Error(`KOT ${index + 1}: shorten the slip number or description.`);
    if (number && seen.has(number)) throw new Error(`KOT ${index + 1}: slip ${number} is already in this list.`);
    if (number) seen.add(number);
    return { kotNumber: number, description: details, amount: round2(amount) };
  });
}

export function manualKotDescription(kot: ManualKotInput): string {
  const tag = kot.kotNumber ? `KOT #${kot.kotNumber}` : "";
  return tag && !kot.description.toUpperCase().includes(tag) ? `${tag} — ${kot.description}` : kot.description;
}

export function quoteManualCharge(amount: number, sacHsn = "996331") {
  return calculateGST({ grossOrBaseAmount: Math.max(0, amount), isInclusive: true, sacHsn, customTaxRate: MANUAL_CHARGE_GST_RATE });
}
