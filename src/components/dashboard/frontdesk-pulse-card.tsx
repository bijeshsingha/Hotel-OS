"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  LogOut,
  LogIn,
  AlertCircle,
  UtensilsCrossed,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";

interface FrontDeskPulseCardProps {
  arrivalsToday: number;
  departuresToday: number;
  inHouseStays: number;
  totalRooms: number;
  openKots: number;
  arrivalsList?: Array<{
    id: string;
    confirmationNo: string;
    primaryGuestName: string;
    status: string;
    roomCount?: number;
  }>;
  todayDepartures?: Array<{
    id: string;
    guestName: string;
    roomNumbers: string;
    balance: number;
  }>;
  urgentFolios?: Array<{
    id: string;
    stayId: string;
    guestName: string;
    roomNumbers: string;
    balance: number;
  }>;
}

export function FrontDeskPulseCard({
  arrivalsToday,
  departuresToday,
  inHouseStays,
  totalRooms,
  openKots,
  arrivalsList = [],
  todayDepartures = [],
  urgentFolios = [],
}: FrontDeskPulseCardProps) {
  const [activeTab, setActiveTab] = React.useState<"ARRIVALS" | "DEPARTURES" | "FOLIO_DUES">("ARRIVALS");

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
      
      {/* HEADER WITH TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Front Desk Pulse & Guest Movements
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Operational activity queue for check-ins, departures & open dues
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("ARRIVALS")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === "ARRIVALS"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Arrivals ({arrivalsToday})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DEPARTURES")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === "DEPARTURES"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Departures ({departuresToday})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FOLIO_DUES")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === "FOLIO_DUES"
                ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-2xs font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>High Dues ({urgentFolios.length})</span>
          </button>
        </div>
      </div>

      {/* QUICK STATUS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">In-House Stays</span>
          <div className="text-base font-extrabold text-blue-950 dark:text-blue-200 mt-0.5">
            {inHouseStays} / {totalRooms}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Today Arrivals</span>
          <div className="text-base font-extrabold text-emerald-950 dark:text-emerald-200 mt-0.5">
            {arrivalsToday} Confirmed
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Today Departures</span>
          <div className="text-base font-extrabold text-amber-950 dark:text-amber-200 mt-0.5">
            {departuresToday} Scheduled
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">Active Kitchen KOTs</span>
          <div className="text-base font-extrabold text-purple-950 dark:text-purple-200 mt-0.5">
            {openKots} In Prep
          </div>
        </div>
      </div>

      {/* TAB 1: ARRIVALS QUEUE */}
      {activeTab === "ARRIVALS" && (
        <div className="space-y-2">
          {arrivalsList.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400">
              No pending guest check-ins scheduled for today
            </div>
          ) : (
            arrivalsList.map((arr) => (
              <div
                key={arr.id}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>{arr.primaryGuestName}</span>
                    <span className="font-mono text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                      {arr.confirmationNo}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {arr.roomCount || 1} Room(s) &bull; {arr.status}
                  </div>
                </div>

                <Link
                  href="/pms"
                  className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition"
                >
                  <span>Check In</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: DEPARTURES QUEUE */}
      {activeTab === "DEPARTURES" && (
        <div className="space-y-2">
          {todayDepartures.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400">
              No scheduled departures remaining for today
            </div>
          ) : (
            todayDepartures.map((dep) => (
              <div
                key={dep.id}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">
                    {dep.guestName}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Room {dep.roomNumbers}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block">Folio Balance</span>
                    <span
                      className={`font-mono font-bold ${
                        dep.balance > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {formatINR(dep.balance)}
                    </span>
                  </div>
                  <Link
                    href={`/billing?stayId=${dep.id}`}
                    className="h-8 px-3 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs flex items-center gap-1 transition"
                  >
                    <span>Settle & Checkout</span>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: HIGH FOLIO DUES */}
      {activeTab === "FOLIO_DUES" && (
        <div className="space-y-2">
          {urgentFolios.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400">
              All in-house folios are balanced or prepaid
            </div>
          ) : (
            urgentFolios.map((folio) => (
              <div
                key={folio.id}
                className="p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">
                    {folio.guestName}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Room {folio.roomNumbers}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-rose-500 uppercase font-bold block">Unpaid Due</span>
                    <span className="font-mono font-black text-rose-700 dark:text-rose-400 text-sm">
                      {formatINR(folio.balance)}
                    </span>
                  </div>
                  <Link
                    href={`/billing?stayId=${folio.stayId}`}
                    className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 transition shadow-xs"
                  >
                    <span>Collect</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
