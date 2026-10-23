import { NextResponse } from "next/server";
import { verifyPassword } from "./password";
import { findLoginUser } from "./identity";
import { accessFailure, createSession, verifyRequestOrigin } from "./session";

const attempts = new Map<string, { count: number; expiresAt: number }>();
function allowAttempt(identifier: string): boolean {
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.expiresAt <= now) attempts.delete(key);
  const key = identifier.trim().toLowerCase();
  const entry = attempts.get(key) || { count: 0, expiresAt: now + 10 * 60 * 1000 };
  if (entry.count >= 10 || (attempts.size >= 5000 && !attempts.has(key))) return false;
  entry.count++;
  attempts.set(key, entry);
  return true;
}
export async function verifyLogin(request: Request) {
  try {
    verifyRequestOrigin(request);
    const body = await request.json();
    const identifier = body.identifier || body.username;
    const password = body.password;
    if (typeof identifier !== "string" || !identifier.trim() || identifier.length > 254 || typeof password !== "string" || !password.trim() || password.length > 1024) return NextResponse.json({ error: "Username and password / PIN are required." }, { status: 400 });
    if (!allowAttempt(identifier)) return NextResponse.json({ error: "Too many sign-in attempts. Please try again in 10 minutes." }, { status: 429, headers: { "Retry-After": "600" } });
    const user = await findLoginUser(identifier);
    if (!user || user.status !== "ACTIVE" || !verifyPassword(password, user.passwordHash, user.pin)) return NextResponse.json({ error: "Invalid username or password / PIN." }, { status: 401 });
    return await createSession(request, user.id, NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email } }));
  } catch (error) { return accessFailure(error); }
}
