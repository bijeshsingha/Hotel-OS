"use client";

import React, { useRef } from "react";
import {
  X,
  Printer,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";

interface ReservationVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: any;
  activeProperty: any;
  onCheckInNow?: (reservation: any) => void;
}

export function ReservationVoucherModal({
  isOpen,
  onClose,
  reservation,
  activeProperty,
  onCheckInNow,
}: ReservationVoucherModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !reservation) return null;

  const guest = reservation.primaryGuest || {};
  const firstRoom = reservation.rooms?.[0] || {};
  const roomTypeName = reservation.roomTypeName || reservation.roomType?.name || "Standard Deluxe Room";
  const deposit = reservation.deposits?.[0]?.originalAmount || reservation.deposits?.[0]?.payment?.amount || 0;
  const depositMethod = reservation.deposits?.[0]?.payment?.method || "UPI";
  const totalAmount = reservation.totalSnapshot || 0;
  const balanceDue = Math.max(0, totalAmount - deposit);

  const checkInStr = reservation.arrivalDate
    ? new Date(reservation.arrivalDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  const checkOutStr = reservation.departureDate
    ? new Date(reservation.departureDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/60 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
              {reservation.confirmationNo || "RES-CONFIRMATION"}
            </span>
            <span className="text-xs font-bold text-zinc-900 dark:text-white">
              Booking Confirmation Voucher
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Slip</span>
            </button>

            {onCheckInNow && reservation.status !== "CHECKED_IN" && reservation.status !== "CANCELLED" && (
              <button
                onClick={() => {
                  onClose();
                  onCheckInNow(reservation);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Check-In Now</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-white text-zinc-900 font-sans print:p-0">
          
          {/* Hotel Header Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 uppercase">
                {activeProperty?.displayName || "Hotel Ambarish Grand Residency"}
              </h1>
              <p className="text-[11px] text-zinc-600 font-medium">
                {activeProperty?.address || "MD Shah Road, Paltan Bazar, Guwahati, Assam - 781008"}
              </p>
              <p className="text-[11px] text-zinc-600 font-mono">
                Phone: {activeProperty?.phone || "+91 9864341211"} • GSTIN: <strong>{activeProperty?.gstin || "18AACCB2447F1ZX"}</strong>
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md inline-block">
                CONFIRMED RESERVATION
              </div>
              <div className="text-xs font-mono font-bold text-zinc-900 mt-1">
                Ref: {reservation.confirmationNo}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                Date: {new Date(reservation.createdAt || Date.now()).toLocaleDateString("en-IN")}
              </div>
            </div>
          </div>

          {/* Guest & Stay Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Primary Guest Box */}
            <div className="border border-zinc-300 rounded-xl p-3.5 space-y-1.5 bg-zinc-50/50">
              <div className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Primary Guest Information
              </div>
              <div className="font-bold text-sm text-zinc-950">{guest.name || "Valued Guest"}</div>
              <div className="text-zinc-600 font-mono">Phone: {guest.phone || "N/A"}</div>
              {guest.email && <div className="text-zinc-600">Email: {guest.email}</div>}
              {guest.city && <div className="text-zinc-600">City: {guest.city}, {guest.state || "India"}</div>}
              {guest.gstin && <div className="text-zinc-800 font-mono text-[11px]">GSTIN: <strong>{guest.gstin}</strong></div>}
            </div>

            {/* Stay & Room Details Box */}
            <div className="border border-zinc-300 rounded-xl p-3.5 space-y-1.5 bg-zinc-50/50">
              <div className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Stay & Booking Summary
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Check-In Date:</span>
                <strong className="font-mono">{checkInStr} (12:00 PM)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Check-Out Date:</span>
                <strong className="font-mono">{checkOutStr} (11:00 AM)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Room Category:</span>
                <strong className="text-zinc-900">{roomTypeName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Occupancy:</span>
                <span className="font-mono">{firstRoom.adults || 2} Adults, {firstRoom.children || 0} Children</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Booking Channel:</span>
                <span className="font-mono font-bold text-zinc-800">{reservation.source || "DIRECT"}</span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-zinc-300 rounded-xl overflow-hidden text-xs">
            <div className="bg-zinc-100 px-4 py-2 font-mono font-bold text-zinc-700 uppercase tracking-wider text-[10.5px] border-b border-zinc-300">
              Tariff & Payment Summary (GST Rule 46)
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-zinc-600">
                <span>Room Tariff Total (Inclusive of Applicable GST):</span>
                <span className="font-mono font-bold text-zinc-950">{formatINR(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Advance Booking Deposit Paid ({depositMethod}):</span>
                <span className="font-mono font-bold text-emerald-700">- {formatINR(deposit)}</span>
              </div>
              <div className="pt-2 border-t border-zinc-200 flex justify-between items-center text-sm">
                <span className="font-black text-zinc-950 uppercase">Balance Payable on Check-In:</span>
                <span className="font-mono font-black text-base text-indigo-700">{formatINR(balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          {reservation.notes && (
            <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3 text-xs space-y-1 text-amber-900">
              <div className="font-bold uppercase tracking-wider text-[10px] font-mono text-amber-800">
                Special Requests / Notes
              </div>
              <div>{reservation.notes}</div>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="text-[10px] text-zinc-500 space-y-1 border-t border-zinc-200 pt-3">
            <div className="font-bold text-zinc-700 uppercase tracking-wider font-mono">
              Hotel Check-In Policies & Instructions
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Standard Check-In time is 12:00 Noon and Check-Out time is 11:00 AM.</li>
              <li>As per Government regulations, all adult occupants must produce valid Government Photo Identification (Aadhaar, Passport, Driving License, Voter ID) at the time of check-in.</li>
              <li>PAN card is not accepted as a valid proof of address.</li>
              <li>GST invoice under Rule 46 will be issued upon checkout.</li>
            </ul>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end pt-8 text-xs text-zinc-600">
            <div className="text-center">
              <div className="w-40 border-b border-zinc-400 pb-8" />
              <span className="text-[10px] font-mono mt-1 block">Guest Signature</span>
            </div>

            <div className="text-center">
              <div className="w-40 border-b border-zinc-400 pb-8" />
              <span className="text-[10px] font-mono mt-1 block">Authorized Hotel Signatory</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
