"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/gst/calculator";
import {
  Search,
  X,
  Calendar,
  UserPlus,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Phone,
  ArrowRight,
  TrendingUp,
  Plus,
} from "lucide-react";

interface ReservationsTabProps {
  reservations: any[];
  onCheckIn: (res: any) => void;
  onViewVoucher: (res: any) => void;
  onNewBooking?: () => void;
}

export function ReservationsTab({
  reservations,
  onCheckIn,
  onViewVoucher,
  onNewBooking,
}: ReservationsTabProps) {
  const [activeTab, setActiveTab] = useState<"ALL" | "TODAY" | "UPCOMING" | "CHECKED_IN" | "CANCELLED">("ALL");
  const [search, setSearch] = useState("");

  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);

  // Helper to extract booking details reliably
  const extractBooking = (res: any) => {
    const code = res.confirmationNo || res.reservationNo || res.code || `RES-${res.id.slice(-6).toUpperCase()}`;
    const guestName = res.primaryGuest?.name || res.guestName || res.guest?.name || "Guest";
    const guestPhone = res.primaryGuest?.phone || res.guestPhone || res.guest?.phone || "";
    const guestEmail = res.primaryGuest?.email || res.guestEmail || "";

    const arrivalStr = res.arrivalDate || res.checkInDate || "";
    const departureStr = res.departureDate || res.checkOutDate || "";

    let nights = 1;
    if (arrivalStr && departureStr) {
      const a = new Date(arrivalStr.includes("T") ? arrivalStr : `${arrivalStr}T00:00:00`);
      const d = new Date(departureStr.includes("T") ? departureStr : `${departureStr}T00:00:00`);
      if (!isNaN(a.getTime()) && !isNaN(d.getTime())) {
        nights = Math.max(1, Math.round((d.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }

    const roomCat = res.roomTypeName || res.roomType?.name || res.rooms?.[0]?.roomType?.name || (res.rooms?.length > 0 ? `${res.rooms.length} Room(s)` : "Standard Room");
    const adults = res.adults || res.rooms?.[0]?.adults || 2;
    const children = res.children || res.rooms?.[0]?.children || 0;

    const source = (res.source || "DIRECT").replace(/_/g, " ");

    const depositPaid = Array.isArray(res.deposits)
      ? res.deposits.reduce((acc: number, d: any) => acc + (Number(d.amount) || 0), 0)
      : (Number(res.advancePaymentAmount) || Number(res.paidAmount) || 0);

    const totalRate = Number(res.totalSnapshot) || 0;

    const status = (res.status || "CONFIRMED").toUpperCase();
    const isTodayArrival = arrivalStr === todayStr && status !== "CHECKED_IN" && status !== "CANCELLED";
    const isUpcoming = arrivalStr > todayStr && status !== "CHECKED_IN" && status !== "CANCELLED";
    const isCheckedIn = status === "CHECKED_IN";
    const isCancelled = status === "CANCELLED" || status === "NO_SHOW";

    return {
      raw: res,
      code,
      guestName,
      guestPhone,
      guestEmail,
      arrivalStr,
      departureStr,
      nights,
      roomCat,
      adults,
      children,
      source,
      depositPaid,
      totalRate,
      status,
      isTodayArrival,
      isUpcoming,
      isCheckedIn,
      isCancelled,
    };
  };

  const parsedList = reservations.map(extractBooking);

  // Counts
  const todayArrivalsCount = parsedList.filter((b) => b.isTodayArrival).length;
  const upcomingCount = parsedList.filter((b) => b.isUpcoming).length;
  const checkedInCount = parsedList.filter((b) => b.isCheckedIn).length;
  const cancelledCount = parsedList.filter((b) => b.isCancelled).length;
  const totalDepositHeld = parsedList
    .filter((b) => !b.isCancelled)
    .reduce((sum, b) => sum + b.depositPaid, 0);

  // Filtering
  const filtered = parsedList.filter((b) => {
    if (activeTab === "TODAY" && !b.isTodayArrival) return false;
    if (activeTab === "UPCOMING" && !b.isUpcoming) return false;
    if (activeTab === "CHECKED_IN" && !b.isCheckedIn) return false;
    if (activeTab === "CANCELLED" && !b.isCancelled) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        b.code.toLowerCase().includes(q) ||
        b.guestName.toLowerCase().includes(q) ||
        b.guestPhone.toLowerCase().includes(q) ||
        b.roomCat.toLowerCase().includes(q) ||
        b.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden space-y-4">
      {/* 1. Header & Operational KPI Bar */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                Reservations & Advance Bookings
              </h2>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              Upcoming arrivals, booking confirmations, deposit records, and 1-click desk check-in
            </p>
          </div>

          <div className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1.5 rounded-xl shrink-0 self-start sm:self-auto">
            {reservations.length} Bookings in System
          </div>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
              Expected Today
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-blue-950 dark:text-blue-100">
                {todayArrivalsCount}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Guest Arrivals</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Upcoming Future
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {upcomingCount}
              </span>
              <span className="text-xs text-zinc-500 font-medium">Confirmed</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
              Checked In
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-950 dark:text-emerald-100">
                {checkedInCount}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">In-House Stays</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Deposits Held
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatINR(totalDepositHeld)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operational Filter Tabs & Search */}
      <div className="px-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === "ALL"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            All ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab("TODAY")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "TODAY"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Today's Arrivals ({todayArrivalsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("UPCOMING")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === "UPCOMING"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Upcoming ({upcomingCount})
          </button>
          <button
            onClick={() => setActiveTab("CHECKED_IN")}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "CHECKED_IN"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
            }`}
          >
            <span>Checked In ({checkedInCount})</span>
          </button>
          {cancelledCount > 0 && (
            <button
              onClick={() => setActiveTab("CANCELLED")}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === "CANCELLED"
                  ? "bg-zinc-800 text-white"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400"
              }`}
            >
              Cancelled ({cancelledCount})
            </button>
          )}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative min-w-[240px] max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reservation #, guest, phone, channel..."
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {onNewBooking && (
            <button
              type="button"
              onClick={onNewBooking}
              className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 shrink-0"
              title="Create New Advance Reservation"
            >
              <Plus className="h-4 w-4" />
              <span>New Booking</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Booking #</th>
              <th className="px-5 py-3.5">Guest Full Name</th>
              <th className="px-4 py-3.5">Contact Phone</th>
              <th className="px-4 py-3.5">Arrival & Departure</th>
              <th className="px-4 py-3.5">Room & Channel</th>
              <th className="px-4 py-3.5">Deposit / Total</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-medium">
            {filtered.map((b) => {
              return (
                <tr key={b.raw.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  {/* Status Badge */}
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        b.isTodayArrival
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50"
                          : b.isCheckedIn
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                          : b.isCancelled
                          ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          b.isTodayArrival
                            ? "bg-blue-500 animate-pulse"
                            : b.isCheckedIn
                            ? "bg-emerald-500"
                            : b.isCancelled
                            ? "bg-zinc-400"
                            : "bg-amber-500"
                        }`}
                      />
                      {b.isTodayArrival
                        ? "Arriving Today"
                        : b.isCheckedIn
                        ? "Checked In"
                        : b.isCancelled
                        ? "Cancelled"
                        : "Confirmed"}
                    </span>
                  </td>

                  {/* Confirmation Number */}
                  <td className="px-5 py-4 font-mono font-bold text-zinc-950 dark:text-zinc-50 text-sm">
                    {b.code}
                  </td>

                  {/* Guest Full Name */}
                  <td className="px-5 py-4">
                    <div className="text-zinc-950 dark:text-zinc-50 font-semibold text-base">
                      {b.guestName}
                    </div>
                    {b.guestEmail && (
                      <div className="text-xs text-zinc-400 font-normal">{b.guestEmail}</div>
                    )}
                  </td>

                  {/* Contact Phone */}
                  <td className="px-4 py-4 font-mono text-zinc-600 dark:text-zinc-400 text-sm">
                    {b.guestPhone ? (
                      <span className="tabular-nums">{b.guestPhone}</span>
                    ) : (
                      <span className="text-zinc-400 text-xs">No phone</span>
                    )}
                  </td>

                  {/* Dates with Nights count */}
                  <td className="px-4 py-4 font-mono text-sm">
                    <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-semibold">
                      <span>{formatDateDisplay(b.arrivalStr)}</span>
                      <ArrowRight className="h-3 w-3 text-zinc-400 inline" />
                      <span>{formatDateDisplay(b.departureStr)}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-normal">
                      {b.nights} {b.nights === 1 ? "Night" : "Nights"} stay
                    </div>
                  </td>

                  {/* Room Category & Source */}
                  <td className="px-4 py-4">
                    <div className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
                      {b.roomCat}
                    </div>
                    <div className="inline-block mt-0.5 text-[11px] font-medium px-2 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 capitalize">
                      {b.source}
                    </div>
                  </td>

                  {/* Deposit Paid / Total Rate */}
                  <td className="px-4 py-4 font-mono tabular-nums text-sm">
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatINR(b.depositPaid)}
                    </div>
                    {b.totalRate > 0 && (
                      <div className="text-[11px] text-zinc-400 font-normal">
                        Total: {formatINR(b.totalRate)}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right space-x-2">
                    {/* Check In Action */}
                    {!b.isCheckedIn && !b.isCancelled ? (
                      <button
                        onClick={() => onCheckIn(b.raw)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        title="Start Check-In for this guest"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Check-In</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-xs font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{b.isCheckedIn ? "Checked In" : "Cancelled"}</span>
                      </span>
                    )}

                    {/* Voucher Action */}
                    <button
                      onClick={() => onViewVoucher(b.raw)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                      title="View Booking Confirmation Voucher"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Voucher</span>
                    </button>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-zinc-400 text-sm">
                  No reservations found matching this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
