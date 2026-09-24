"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/gst/calculator";
import { Search, X, Calendar, UserPlus, FileText } from "lucide-react";

interface ReservationsTabProps {
  reservations: any[];
  onCheckIn: (res: any) => void;
  onViewVoucher: (res: any) => void;
}

export function ReservationsTab({
  reservations,
  onCheckIn,
  onViewVoucher,
}: ReservationsTabProps) {
  const [search, setSearch] = useState("");

  const filtered = reservations.filter((r) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const code = (r.reservationNo || r.code || "").toLowerCase();
      const guest = (r.guestName || r.guest?.name || "").toLowerCase();
      const phone = (r.guestPhone || r.guest?.phone || "").toLowerCase();
      return code.includes(q) || guest.includes(q) || phone.includes(q);
    }
    return true;
  });

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden space-y-4">
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Upcoming Reservations & Advance Bookings
            </h2>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Confirmed guest bookings, arrival schedules, and pre-allocated rooms
          </p>
        </div>

        <div className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1 rounded-lg">
          {reservations.length} Bookings Total
        </div>
      </div>

      <div className="px-4 sm:px-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reservation #, guest name, or phone..."
            className="w-full h-10 pl-9.5 pr-8 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Booking #</th>
              <th className="px-5 py-3.5">Guest Full Name</th>
              <th className="px-4 py-3.5">Contact Phone</th>
              <th className="px-4 py-3.5">Arrival</th>
              <th className="px-4 py-3.5">Departure</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Deposit Paid</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-medium">
            {filtered.map((res) => {
              const code = res.reservationNo || res.code || `RES-${res.id.slice(-6).toUpperCase()}`;
              const guestName = res.guestName || res.guest?.name || "Guest";
              const guestPhone = res.guestPhone || res.guest?.phone || "N/A";
              const arrival = res.checkInDate
                ? new Date(res.checkInDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })
                : "N/A";
              const departure = res.checkOutDate
                ? new Date(res.checkOutDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })
                : "N/A";
              const roomCat = res.roomType?.name || res.rooms?.[0]?.roomType?.name || "Standard";
              const advance = res.advancePaymentAmount || res.paidAmount || 0;

              return (
                <tr key={res.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-zinc-950 dark:text-zinc-50 text-sm">
                    {code}
                  </td>
                  <td className="px-5 py-4 text-zinc-950 dark:text-zinc-50 font-semibold text-base">
                    {guestName}
                  </td>
                  <td className="px-4 py-4 font-mono text-zinc-500 text-sm">{guestPhone}</td>
                  <td className="px-4 py-4 font-mono text-zinc-500 text-sm">{arrival}</td>
                  <td className="px-4 py-4 font-mono text-zinc-500 text-sm">{departure}</td>
                  <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300 text-sm">{roomCat}</td>
                  <td className="px-4 py-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums text-sm">
                    {formatINR(advance)}
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button
                      onClick={() => onCheckIn(res)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Check-In</span>
                    </button>
                    <button
                      onClick={() => onViewVoucher(res)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                      title="View Voucher"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Voucher</span>
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-zinc-400 text-sm">
                  No upcoming reservations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
