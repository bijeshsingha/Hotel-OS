/**
 * India GST Calculation Engine (Hotel OS V1 - Section 11)
 *
 * Rules:
 * - SAC 996311: Room Accommodation
 *   - Up to ₹7,500/night/room: 12% (6% CGST + 6% SGST, or 12% IGST)
 *   - Above ₹7,500/night/room: 18% (9% CGST + 9% SGST, or 18% IGST)
 * - SAC 996331: Restaurant Service
 *   - Standalone / without ITC: 5% (2.5% CGST + 2.5% SGST, or 5% IGST)
 *   - At specified premises / with ITC: 18% (9% CGST + 9% SGST, or 18% IGST)
 * - State code comparison:
 *   - Same state (supplierState === recipientState or Intra-state): CGST + SGST
 *   - Different state (Inter-state): IGST
 */

export interface TaxComponentBreakdown {
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  effectiveTaxRate: number;
}

export interface GSTCalculationResult {
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  components: TaxComponentBreakdown;
  isInterState: boolean;
  sacHsn: string;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateGST({
  grossOrBaseAmount,
  isInclusive = false,
  sacHsn = "996311",
  supplierStateCode = "18", // Default Assam
  recipientStateCode,
  customTaxRate,
  premisesTreatment,
}: {
  grossOrBaseAmount: number;
  isInclusive?: boolean;
  sacHsn?: string;
  supplierStateCode?: string;
  recipientStateCode?: string;
  customTaxRate?: number;
  premisesTreatment?: string;
}): GSTCalculationResult {
  const isInterState =
    Boolean(recipientStateCode) &&
    recipientStateCode !== supplierStateCode &&
    recipientStateCode !== "99"; // 99 indicates unregistered / unassigned

  // Determine total applicable GST rate
  let totalRate = 12; // default accommodation 12%

  if (customTaxRate !== undefined) {
    totalRate = customTaxRate;
  } else if (sacHsn === "996311") {
    // Accommodation rule: ₹7,500 threshold
    // If inclusive, check approx base: gross / 1.12 or gross / 1.18
    const baseValueEst = isInclusive ? grossOrBaseAmount / 1.12 : grossOrBaseAmount;
    if (baseValueEst > 7500) {
      totalRate = 18;
    } else {
      totalRate = 12;
    }
  } else if (sacHsn === "996331") {
    // Restaurant rule
    if (premisesTreatment === "specified_premises_opt_in") {
      totalRate = 18;
    } else {
      totalRate = 5;
    }
  } else if (sacHsn === "996332") {
    totalRate = 18; // Banquet / Event
  }

  let taxableAmount: number;
  let taxAmount: number;
  let totalAmount: number;

  if (isInclusive) {
    totalAmount = round2(grossOrBaseAmount);
    taxableAmount = round2(totalAmount / (1 + totalRate / 100));
    taxAmount = round2(totalAmount - taxableAmount);
  } else {
    taxableAmount = round2(grossOrBaseAmount);
    taxAmount = round2(taxableAmount * (totalRate / 100));
    totalAmount = round2(taxableAmount + taxAmount);
  }

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstRate = totalRate;
    igstAmount = taxAmount;
  } else {
    cgstRate = round2(totalRate / 2);
    sgstRate = round2(totalRate / 2);
    cgstAmount = round2(taxAmount / 2);
    sgstAmount = round2(taxAmount - cgstAmount); // avoids 1-paise rounding discrepancies
  }

  return {
    taxableAmount,
    taxAmount,
    totalAmount,
    components: {
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTax: taxAmount,
      effectiveTaxRate: totalRate,
    },
    isInterState,
    sacHsn,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
