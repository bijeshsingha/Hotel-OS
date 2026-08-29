/**
 * Name Normalization Utility for Ingestion Boundaries
 * 
 * Invariant:
 * Stored database records (Guest.name, GuestRegistration.fullName) must ALWAYS be pure names
 * (e.g. "BIJESH SINGHA") without honorific titles ("Mr.", "Mrs.", "Dr.") baked in.
 * Titles are decoupled and managed independently.
 */

const HONORIFIC_REGEX = /^(Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.|Shri|Smt\.|Master|Mr|Ms|Mrs|Dr|Prof|Shri|Smt)\s+/i;

export interface NormalizedName {
  title: string;
  pureName: string;
}

export function normalizeGuestName(rawName: string, explicitTitle?: string): NormalizedName {
  if (!rawName) {
    return { title: explicitTitle || "Mr.", pureName: "" };
  }

  let cleaned = rawName.trim();
  let detectedTitle = explicitTitle;

  // If the user typed an honorific title inside the name field, extract and remove it
  const match = cleaned.match(HONORIFIC_REGEX);
  if (match) {
    if (!detectedTitle || detectedTitle === "Mr.") {
      const t = match[1].trim();
      detectedTitle = t.endsWith(".") ? t : `${t}.`;
    }
    // Remove all leading honorifics repeatedly in case multiple were typed
    while (HONORIFIC_REGEX.test(cleaned)) {
      cleaned = cleaned.replace(HONORIFIC_REGEX, "").trim();
    }
  }

  return {
    title: detectedTitle || "Mr.",
    pureName: cleaned,
  };
}

/**
 * Formats a guest's presentation/display name with exactly ONE honorific title.
 * Example outputs: "Mr. BIJESH SINGHA", "Dr. A. K. Sharma", "Ms. Priya Roy"
 * Invariant: Always has exactly one single honorific prefix.
 */
export function formatGuestDisplayName(name: string | null | undefined, title?: string | null): string {
  if (!name) return "";
  const raw = name.trim();
  if (!raw) return "";

  const normalized = normalizeGuestName(raw, title || undefined);
  if (!normalized.pureName) return "";

  const cleanTitle = normalized.title ? (normalized.title.endsWith(".") ? normalized.title : `${normalized.title}.`) : "Mr.";
  return `${cleanTitle} ${normalized.pureName}`;
}
