/**
 * Property Branding & Dynamic Logo Resolver
 * Dynamically resolves property logo assets and monogram crests for
 * GRC forms, Tax Invoices, Folios, and Reservation Vouchers.
 */

export interface PropertyBrandingSource {
  displayName?: string | null;
  legalName?: string | null;
  code?: string | null;
  logoUrl?: string | null;
}

/**
 * Returns the URL of the property's logo image, or null if no graphic asset exists.
 */
export function getPropertyLogoUrl(property?: PropertyBrandingSource | null): string | null {
  if (!property) return null;

  // 1. Explicit custom logo URL
  if (property.logoUrl && property.logoUrl.trim().length > 0) {
    return property.logoUrl.trim();
  }

  const name = (property.displayName || property.legalName || "").toLowerCase();
  const code = (property.code || "").toLowerCase();

  // 2. Hotel Ambarish brand asset match
  if (name.includes("ambarish") || code.includes("amb")) {
    return "/images/ambarish-logo.png";
  }

  // Other properties without a dedicated raster logo return null to render the luxury monogram seal
  return null;
}

/**
 * Returns a 2-character monogram string for property identity badge fallback.
 * Examples:
 *   "Hotel Divine View" -> "DV"
 *   "Hotel Ambarish Grand Residency" -> "AG"
 *   "Grand Heritage" -> "GH"
 */
export function getPropertyInitials(property?: PropertyBrandingSource | null): string {
  if (!property) return "HO";

  const rawName = property.displayName || property.legalName || "";
  const words = rawName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "HO";

  // Filter out leading "Hotel", "The" if subsequent words exist
  const meaningfulWords = words.filter(
    (w, i) => !(i === 0 && (w.toLowerCase() === "hotel" || w.toLowerCase() === "the"))
  );

  const targetWords = meaningfulWords.length >= 2 ? meaningfulWords : words;

  if (targetWords.length >= 2) {
    return (targetWords[0][0] + targetWords[1][0]).toUpperCase();
  }

  return targetWords[0].slice(0, 2).toUpperCase();
}
