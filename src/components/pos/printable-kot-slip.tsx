"use client";

import React from "react";
import { Printer, X, ChefHat, CheckCircle2, Clock, BedDouble, UtensilsCrossed } from "lucide-react";

export interface KotPrintData {
  kotNo: string;
  orderNo?: string;
  outletName?: string;
  stationName?: string;
  mode: "DINE_IN" | "ROOM_SERVICE" | "TAKEAWAY";
  roomNumber?: string;
  tableName?: string;
  guestName?: string;
  waiterName?: string;
  firedAt: string | Date;
  lines: Array<{
    name: string;
    qty: number;
    notes?: string;
  }>;
}

interface PrintableKotSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  kot: KotPrintData | null;
  hotelName?: string;
}

export function PrintableKotSlipModal({
  isOpen,
  onClose,
  kot,
  hotelName = "Hotel Ambarish Grand Residency",
}: PrintableKotSlipModalProps) {
  if (!isOpen || !kot) return null;

  const firedDate = new Date(kot.firedAt);
  const formattedTime = firedDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const formattedDate = firedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121215] text-zinc-100 p-6 shadow-2xl space-y-4 print:max-w-none print:border-none print:shadow-none print:bg-white print:text-black print:p-0">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 print:hidden">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-zinc-400" />
            <h3 className="text-sm font-bold text-white">Kitchen Order Ticket (KOT) Preview</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition shadow"
            >
              <Printer className="h-4 w-4" />
              <span>Print KOT Slip</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3-Inch / 80mm Thermal Receipt Slip Layout */}
        <div className="bg-white text-black font-mono p-5 rounded-xl border border-zinc-300 shadow-inner max-w-[340px] mx-auto text-xs space-y-3 print:border-none print:shadow-none print:p-2 print:max-w-[300px]">
          
          {/* Header */}
          <div className="text-center space-y-0.5 border-b border-dashed border-black pb-2">
            <div className="text-sm font-black tracking-tight uppercase">{hotelName}</div>
            <div className="text-[11px] font-bold">{kot.outletName || "Restaurant & In-Room Dining"}</div>
            <div className="text-xs font-black tracking-wider bg-black text-white px-2 py-0.5 mt-1 inline-block">
              *** KITCHEN ORDER TICKET (KOT) ***
            </div>
          </div>

          {/* Ticket Metadata */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] border-b border-dashed border-black pb-2">
            <div>
              <span className="text-zinc-600">KOT NO: </span>
              <strong className="font-black text-sm">{kot.kotNo}</strong>
            </div>
            <div className="text-right">
              <span className="text-zinc-600">STATION: </span>
              <strong className="font-bold">{kot.stationName || "HOT KITCHEN"}</strong>
            </div>

            <div>
              <span className="text-zinc-600">ORDER NO: </span>
              <strong className="font-bold">{kot.orderNo || "N/A"}</strong>
            </div>
            <div className="text-right">
              <span className="text-zinc-600">TIME: </span>
              <strong className="font-bold">{formattedTime}</strong>
            </div>

            <div className="col-span-2 pt-1">
              {kot.mode === "ROOM_SERVICE" ? (
                <div className="bg-zinc-100 p-1.5 rounded border border-black flex items-center justify-between">
                  <span className="font-black text-sm">ROOM: {kot.roomNumber || "IN-ROOM"}</span>
                  <span className="text-[10px] font-bold text-zinc-700 truncate max-w-[140px]">{kot.guestName || "In-House Guest"}</span>
                </div>
              ) : (
                <div className="bg-zinc-100 p-1.5 rounded border border-black flex items-center justify-between">
                  <span className="font-black text-sm">{kot.tableName || "TABLE #"}</span>
                  <span className="text-[10px] font-bold text-zinc-700">DINE-IN</span>
                </div>
              )}
            </div>
          </div>

          {/* Ordered Item Lines */}
          <div className="space-y-1.5 border-b border-dashed border-black pb-2">
            <div className="flex justify-between font-bold border-b border-black pb-0.5 text-[11px]">
              <span>ITEM PARTICULARS</span>
              <span>QTY</span>
            </div>

            {kot.lines.map((line, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between items-start font-bold text-xs">
                  <span className="pr-2 leading-tight">{line.name}</span>
                  <span className="font-black text-sm shrink-0">×{line.qty}</span>
                </div>
                {line.notes && (
                  <div className="text-[10px] italic font-semibold text-zinc-800 pl-2 border-l-2 border-black">
                    * NOTE: {line.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] space-y-0.5 text-zinc-700 pt-1">
            <div className="font-bold uppercase tracking-wider">PLEASE PREPARE & SERVE FRESH</div>
            <div>Date: {formattedDate} • Generated by Hotel OS POS</div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between pt-2 print:hidden">
          <span className="text-xs text-zinc-500 font-mono">Standard 80mm Thermal Printer Ready</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
}
