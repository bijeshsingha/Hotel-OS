"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import {
  Building2,
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  BedDouble,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Layers,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { switchUser } = useHotel();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Authenticate via session API
      const res = await fetch(`/api/v1/auth/session?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();

      if (!res.ok || !data?.user) {
        throw new Error(data?.error || "Invalid username or account not found.");
      }

      switchUser(username.trim());
      router.push("/pms");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userIdentifier: string) => {
    setUsername(userIdentifier);
    setPassword("••••••••");
    setLoading(true);
    setError(null);
    switchUser(userIdentifier);
    setTimeout(() => {
      router.push("/pms");
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#070709] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-950 font-black text-xl tracking-tight shadow-xl shadow-white/10 mb-2">
            H
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>Hotel OS</span>
            <span className="rounded-lg bg-zinc-800 px-2 py-0.5 text-xs font-mono font-bold text-zinc-300 border border-zinc-700">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            Cloud Hospitality Operating System • Multi-Property Edition
          </p>
        </div>

        {/* Main Login Card */}
        <div className="rounded-3xl border border-zinc-800/90 bg-[#111114]/90 backdrop-blur-xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div>
              <h2 className="text-sm font-bold text-white">Staff & Management Sign In</h2>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Access your designated hotel property terminal
              </p>
            </div>
            <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <Lock className="h-4 w-4" />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-bold block">Username or Email</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. ambarish_frontdesk"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900/90 border border-zinc-700/80 pl-9 pr-3 py-2.5 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-white transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-bold block">Password / Security PIN</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900/90 border border-zinc-700/80 pl-9 pr-3 py-2.5 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-white transition"
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0"
                />
                <span>Remember on this terminal</span>
              </label>
              <span className="text-zinc-500 text-[11px] font-mono">256-Bit SSL</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 py-3 font-black text-xs sm:text-sm shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
            >
              {loading ? "Authenticating Terminal..." : "Sign In to Hotel OS"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="pt-4 border-t border-zinc-800/80 space-y-2.5">
            <div className="text-[10px] font-mono uppercase font-bold text-zinc-500 flex items-center justify-between">
              <span>Quick Login Demo Profiles</span>
              <span className="text-zinc-600">1-Click Test</span>
            </div>

            <div className="space-y-2">
              {/* 1. Ambarish Front Desk */}
              <button
                type="button"
                onClick={() => handleQuickLogin("ambarish_frontdesk")}
                className="w-full rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-amber-900/40 hover:border-amber-600/60 p-3 text-left transition flex items-center justify-between group shadow-sm"
              >
                <div>
                  <div className="font-bold text-white text-xs group-hover:text-amber-300 transition flex items-center gap-1.5">
                    <span>Rupjyoti Sarma</span>
                    <span className="text-[10px] font-mono text-zinc-400 font-normal">(@ambarish_frontdesk)</span>
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                    ● Hotel Ambarish Grand Residency ONLY
                  </div>
                </div>
                <span className="rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[9px] font-mono font-bold">
                  AMBARISH
                </span>
              </button>

              {/* 2. Divine View Front Desk */}
              <button
                type="button"
                onClick={() => handleQuickLogin("divine_frontdesk")}
                className="w-full rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-blue-900/40 hover:border-blue-600/60 p-3 text-left transition flex items-center justify-between group shadow-sm"
              >
                <div>
                  <div className="font-bold text-white text-xs group-hover:text-blue-300 transition flex items-center gap-1.5">
                    <span>Bhaskar Bora</span>
                    <span className="text-[10px] font-mono text-zinc-400 font-normal">(@divine_frontdesk)</span>
                  </div>
                  <div className="text-[10px] text-blue-400 font-mono mt-0.5">
                    ● HOTEL DIVINE VIEW ONLY
                  </div>
                </div>
                <span className="rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[9px] font-mono font-bold">
                  DIVINE VIEW
                </span>
              </button>

              {/* 3. General Manager */}
              <button
                type="button"
                onClick={() => handleQuickLogin("general_manager")}
                className="w-full rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/60 hover:border-zinc-500 p-3 text-left transition flex items-center justify-between group shadow-sm"
              >
                <div>
                  <div className="font-bold text-white text-xs group-hover:text-emerald-300 transition flex items-center gap-1.5">
                    <span>General Manager</span>
                    <span className="text-[10px] font-mono text-zinc-400 font-normal">(@general_manager)</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                    ● Multi-Property Access (Both Hotels)
                  </div>
                </div>
                <span className="rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono font-bold">
                  ALL HOTELS
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-zinc-600 font-mono space-y-1">
          <div>GST Rule 46 Compliant • Multi-Property Isolated Tenancy</div>
          <div>© 2026 Hotel OS. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
