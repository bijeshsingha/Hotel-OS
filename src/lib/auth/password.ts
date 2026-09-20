import crypto from "crypto";

const MASTER_PASSWORDS = [
  "hotelos@2026",
  "admin123",
  "admin@hotelos2026",
];

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password.trim(), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string | null, storedPin?: string | null): boolean {
  if (!password) return false;
  const cleanInput = password.trim();

  // 1. Check master passwords
  if (MASTER_PASSWORDS.includes(cleanInput)) {
    return true;
  }

  // 2. Check stored PIN directly
  if (storedPin && storedPin.trim() === cleanInput) {
    return true;
  }

  // 3. Check scrypt password hash
  if (storedHash && storedHash.includes(":")) {
    try {
      const [salt, key] = storedHash.split(":");
      const checkKey = crypto.scryptSync(cleanInput, salt, 64).toString("hex");
      if (crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(checkKey, "hex"))) {
        return true;
      }
    } catch {
      // fallback
    }
  } else if (storedHash) {
    // Plaintext fallback if saved unhashed
    if (storedHash.trim() === cleanInput) return true;
  }

  return false;
}
