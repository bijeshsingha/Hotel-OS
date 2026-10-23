"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useHotel } from "@/lib/context/hotel-context";
import { authRequest } from "@/lib/auth/client-request";
import { APP_VERSION } from "@/lib/app-version";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { switchUser } = useHotel();
  const usernameInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const errorMessage = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<"username" | "password" | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!username.trim() || !password.trim()) {
      const missingUsername = !username.trim();
      setInvalidField(missingUsername ? "username" : "password");
      setError(missingUsername ? "Enter your username or email to continue." : "Enter your password or staff PIN to continue.");
      (missingUsername ? usernameInput : passwordInput).current?.focus();
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError(null);
    setInvalidField(null);
    try {
      const { response, data } = await authRequest("/api/v1/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: username.trim(), password: password.trim() }),
      });
      if (!response.ok) throw new Error(data?.error || "Invalid username or password / PIN.");
      // Confirm the authenticated session before opening the workspace.
      await switchUser(username.trim());
      router.push("/pms");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "We couldn't sign you in. Please try again.");
      // The alert remains available to keyboard users after a failed request.
      requestAnimationFrame(() => errorMessage.current?.focus());
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#login-username-input">Skip to sign in</a>
      <header className={styles.brand}>
        <img src="/brand/rovesta-app-icon.png" alt="" width="36" height="36" />
        <span>ROVESTA <span className={styles.brandOs}>OS</span></span>
      </header>
      <section className={styles.card} aria-labelledby="login-heading">
        <div className={styles.heading}><h1 id="login-heading">Sign in</h1><p>Use your hotel staff account.</p></div>
        <form onSubmit={handleLoginSubmit} noValidate aria-busy={loading} className={styles.form}>
          {error && <div id="login-error" ref={errorMessage} tabIndex={-1} role="alert" className={styles.error}><AlertCircle size={18} aria-hidden="true" /><span>{error}</span></div>}
          <div className={styles.field}>
            <label htmlFor="login-username-input">Username or email</label>
            <input ref={usernameInput} id="login-username-input" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required readOnly={loading} placeholder="Enter your username or email" value={username} aria-invalid={invalidField === "username"} aria-describedby={invalidField === "username" ? "login-error" : undefined} onChange={(event) => { setUsername(event.target.value); if (invalidField === "username") { setInvalidField(null); setError(null); } }} />
          </div>
          <div className={styles.field}>
            <label htmlFor="login-password-input">Password or staff PIN</label>
            <div className={styles.inputWrap}>
              <input ref={passwordInput} id="login-password-input" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required readOnly={loading} placeholder="Enter your password or PIN" value={password} aria-invalid={invalidField === "password"} aria-describedby={`password-hint${invalidField === "password" ? " login-error" : ""}`} onChange={(event) => { setPassword(event.target.value); if (invalidField === "password") { setInvalidField(null); setError(null); } }} />
              <button type="button" className={styles.reveal} onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"} aria-controls="login-password-input">{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
            </div>
            <p id="password-hint" className={styles.hint}>Use your individual password or assigned PIN.</p>
          </div>
          <button type="submit" disabled={loading} className={styles.submit}>{loading ? <><LoaderCircle size={18} className={styles.spinner} aria-hidden="true" />Signing in…</> : "Sign in"}</button>
          <span role="status" className={styles.srOnly}>{loading ? "Signing in. Please wait." : ""}</span>
        </form>
        <details className={styles.help}><summary>Need help signing in?</summary><p>Ask your hotel owner to check your username or reset your password in <strong>Staff & Roles → Change login</strong>. Your account must be active and have access to a hotel.</p></details>
        <p className={styles.sessionNote}>Sessions last up to 8 hours. Sign out after using a shared device.</p>
      </section>
      <footer className={styles.footer}>ROVESTA OS <span>Version {APP_VERSION}</span></footer>
    </div>
  );
}
