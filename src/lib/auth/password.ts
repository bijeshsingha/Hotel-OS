import crypto from "node:crypto";
const HASH_PATTERN = /^[a-f0-9]{32}:[a-f0-9]{128}$/i;
export function isPasswordHash(value?: string | null): value is string {
  return typeof value === "string" && HASH_PATTERN.test(value);
}
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password.trim(), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
/** Passwords and PINs are salted hashes; no shared or plaintext bypass exists. */
export function verifyPassword(password: string, storedHash?: string | null, storedPin?: string | null): boolean {
  if (typeof password !== "string" || !password.trim() || password.length > 1024) return false;
  return [storedHash, storedPin].some((credential) => {
    if (!isPasswordHash(credential)) return false;
    const [salt, key] = credential.split(":");
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), crypto.scryptSync(password.trim(), salt, 64));
  });
}
