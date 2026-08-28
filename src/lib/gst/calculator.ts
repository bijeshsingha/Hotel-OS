/**
 * India GST Calculation Engine (Hotel OS V1)
 *
 * Centralized Tax Rate Configuration:
 * - All rates are configured via constants & dynamic variables.
 * - Defaults are set uniformly to 5% as per hotel configuration.
 */

export interface TaxRatesConfig {
  DEFAULT_TAX_RATE: number; // 5%
  ROOM_ACCOMMODATION_RATE: number; // 5%
  ROOM_ACCOMMODATION_LUXURY_RATE: number; // 5%
  RESTAURANT_FOOD_RATE: number; // 5%
  SERVICES_LAUNDRY_RATE: number; // 5%
  BANQUET_EVENT_RATE: number; // 5%
  TRANSPORT_RATE: number; // 5%
  MISC_SERVICES_RATE: number; // 5%
}

export const DEFAULT_TAX_RATES: TaxRatesConfig = {
  DEFAULT_TAX_RATE: 5,
  ROOM_ACCOMMODATION_RATE: 5,
  ROOM_ACCOMMODATION_LUXURY_RATE: 5,
  RESTAURANT_FOOD_RATE: 5,
  SERVICES_LAUNDRY_RATE: 5,
  BANQUET_EVENT_RATE: 5,
  TRANSPORT_RATE: 5,
  MISC_SERVICES_RATE: 5,
};

// Active mutable tax rate settings that can be dynamically queried or adjusted
export let ACTIVE_TAX_RATES: TaxRatesConfig = { ...DEFAULT_TAX_RATES };

export function setTaxRates(newRates: Partial<TaxRatesConfig>) {
  ACTIVE_TAX_RATES = { ...ACTIVE_TAX_RATES, ...newRates };
}

export function getTaxRateForSac(sacHsn?: string, grossOrBaseAmount = 0): number {
  if (!sacHsn) return ACTIVE_TAX_RATES.DEFAULT_TAX_RATE;
  if (sacHsn === "996311") {
    return grossOrBaseAmount > 7500
      ? ACTIVE_TAX_RATES.ROOM_ACCOMMODATION_LUXURY_RATE
      : ACTIVE_TAX_RATES.ROOM_ACCOMMODATION_RATE;
  }
  if (sacHsn === "996331") return ACTIVE_TAX_RATES.RESTAURANT_FOOD_RATE;
  if (sacHsn === "996332") return ACTIVE_TAX_RATES.BANQUET_EVENT_RATE;
  if (sacHsn === "9997") return ACTIVE_TAX_RATES.SERVICES_LAUNDRY_RATE;
  if (sacHsn === "9964") return ACTIVE_TAX_RATES.TRANSPORT_RATE;
  if (sacHsn === "9999") return ACTIVE_TAX_RATES.MISC_SERVICES_RATE;
  return ACTIVE_TAX_RATES.DEFAULT_TAX_RATE;
}

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

  // Determine total applicable GST rate from centralized constant / dynamic variables
  let totalRate = ACTIVE_TAX_RATES.DEFAULT_TAX_RATE;

  if (customTaxRate !== undefined) {
    totalRate = customTaxRate;
  } else {
    totalRate = getTaxRateForSac(sacHsn, grossOrBaseAmount);
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
