export function reservationAdvancePreview(deposits: { originalAmount?: number; availableAmount?: number; status?: string; folioId?: string | null; payment?: { status?: string; receiptNo?: string } | null }[] = []) {
  const available = deposits.filter(d => d.status === "AVAILABLE" && !d.folioId && (!d.payment || d.payment.status === "SUCCEEDED"));
  return { amount: Math.round(available.reduce((sum, d) => sum + Math.max(0, d.availableAmount ?? d.originalAmount ?? 0), 0) * 100) / 100,
    receiptNos: available.flatMap(d => d.payment?.receiptNo ? [d.payment.receiptNo] : []) };
}

export function additionalCheckinCollection(legacyTotal: number, alreadyCollected: number, explicitAdditional?: number) {
  for (const amount of [legacyTotal, alreadyCollected, ...(explicitAdditional === undefined ? [] : [explicitAdditional])]) {
    if (!Number.isFinite(amount) || amount < 0) throw new Error("Advance amounts must be valid non-negative numbers.");
  }
  // Older clients sent the prefilled total. Only the amount above the recorded advance is new money.
  return Math.round((explicitAdditional ?? Math.max(0, legacyTotal - alreadyCollected)) * 100) / 100;
}
