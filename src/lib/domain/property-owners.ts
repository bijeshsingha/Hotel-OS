/** Owner/partner names belong to the selected property, never a different hotel's fallback. */
export function parsePropertyOwners(value: unknown): string[] {
  if (value == null || value === "") return [];
  let parsed: unknown = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { throw new Error("The saved owner list is invalid. Review Hotel & Property settings."); }
  }
  if (!Array.isArray(parsed) || parsed.some(name => typeof name !== "string")) throw new Error("The saved owner list is invalid. Review Hotel & Property settings.");
  const seen = new Set<string>();
  return parsed.map(name => name.trim()).filter(name => {
    const key = name.toLocaleLowerCase("en-IN");
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
