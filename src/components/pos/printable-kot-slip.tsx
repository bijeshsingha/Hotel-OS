"use client";

import React from "react";
import { Printer, X, ChefHat } from "lucide-react";

export interface KotPrintData {
  kotNo: string;
  orderNo?: string;
  outletName?: string;
  stationName?: string;
  mode: "DINE_IN" | "ROOM_SERVICE" | "TAKEAWAY" | "BAR" | string;
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

  // Destination Text
  let destinationText = "";
  if (kot.mode === "ROOM_SERVICE" || kot.roomNumber) {
    destinationText = `ROOM: ${kot.roomNumber || "IN-ROOM"}${kot.guestName ? ` (${kot.guestName})` : ""}`;
  } else if (kot.mode === "BAR" || kot.tableName?.toLowerCase().includes("bar")) {
    destinationText = `BAR: ${kot.tableName || "BAR COUNTER"}${kot.guestName ? ` (${kot.guestName})` : ""}`;
  } else if (kot.mode === "TAKEAWAY" || kot.tableName?.toLowerCase().includes("takeaway") || kot.tableName?.toLowerCase().includes("parcel")) {
    destinationText = `PARCEL: ${kot.tableName || "TAKEAWAY"}${kot.guestName ? ` (${kot.guestName})` : ""}`;
  } else {
    destinationText = `TABLE: ${kot.tableName || "DINE-IN"}${kot.guestName ? ` (${kot.guestName})` : ""}`;
  }

  // Bulletproof Thermal Print Handler (Dedicated Popup Window for 80mm/58mm Thermal Printers)
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>KOT - ${kot.kotNo}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace, sans-serif;
              width: 76mm;
              margin: 0 auto;
              padding: 6px 4px;
              color: #000;
              background: #fff;
              font-size: 12px;
              line-height: 1.25;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .hotel-name {
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              text-align: center;
              margin-bottom: 2px;
            }
            .kot-banner {
              font-size: 11px;
              font-weight: 900;
              text-align: center;
              border: 1.5px solid #000;
              padding: 2px 4px;
              margin: 3px 0;
              display: inline-block;
              width: 100%;
            }
            .dashed-line {
              border-top: 1.5px dashed #000;
              margin: 5px 0;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
              font-size: 11px;
            }
            .dest-box {
              border: 1.5px solid #000;
              background-color: #f4f4f4;
              padding: 4px 6px;
              margin: 4px 0;
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .items-header {
              display: flex;
              justify-content: space-between;
              font-weight: 900;
              border-bottom: 1.5px solid #000;
              padding-bottom: 2px;
              margin-top: 4px;
              font-size: 11px;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin: 5px 0;
              font-size: 12px;
            }
            .item-name {
              font-weight: bold;
              padding-right: 8px;
              text-transform: uppercase;
              flex: 1;
            }
            .item-qty {
              font-size: 14px;
              font-weight: 900;
              white-space: nowrap;
            }
            .item-notes {
              font-size: 10px;
              font-style: italic;
              font-weight: bold;
              padding-left: 6px;
              border-left: 2px solid #000;
              margin-top: 1px;
            }
            .footer-note {
              font-size: 10px;
              text-align: center;
              margin-top: 6px;
              font-weight: bold;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="hotel-name">${hotelName}</div>
          <div class="kot-banner">*** KITCHEN ORDER TICKET (KOT) ***</div>

          <div class="dashed-line"></div>

          <div class="meta-row">
            <div><span class="bold">KOT NO:</span> <strong style="font-size: 14px;">${kot.kotNo}</strong></div>
            <div><span class="bold">TIME:</span> ${formattedTime}</div>
          </div>
          <div class="meta-row">
            <div><span class="bold">ORDER NO:</span> <strong>${kot.orderNo || "N/A"}</strong></div>
            <div><span class="bold">DATE:</span> ${formattedDate}</div>
          </div>

          <div class="dest-box">${destinationText}</div>

          <div class="dashed-line"></div>

          <div class="items-header">
            <span>ITEM PARTICULARS</span>
            <span>QTY</span>
          </div>

          ${kot.lines
            .map(
              (line) => `
            <div class="item-row">
              <div class="item-name">${line.name}</div>
              <div class="item-qty">×${line.qty}</div>
            </div>
            ${line.notes ? `<div class="item-notes">* NOTE: ${line.notes}</div>` : ""}
          `
            )
            .join("")}

          <div class="dashed-line"></div>

          <div class="footer-note">PLEASE PREPARE & SERVE FRESH</div>
          <div style="font-size: 9px; text-align: center; color: #444; margin-top: 2px;">
            Date: ${formattedDate} • Generated by ROVESTA POS
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 150);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 p-6 shadow-2xl space-y-4 print:max-w-none print:border-none print:shadow-none print:bg-white print:text-black print:p-0">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 print:hidden">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-orange-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Kitchen Order Ticket (KOT)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print KOT Slip</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3-Inch / 80mm Thermal Receipt Slip Screen Preview */}
        <div className="bg-white text-black font-mono p-5 rounded-xl border border-zinc-300 shadow-inner max-w-[340px] mx-auto text-xs space-y-3 print:border-none print:shadow-none print:p-2 print:max-w-[300px]">
          
          {/* Header */}
          <div className="text-center space-y-0.5 border-b border-dashed border-black pb-2">
            <div className="text-sm font-black tracking-tight uppercase">{hotelName}</div>
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
              <span className="text-zinc-600">TIME: </span>
              <strong className="font-bold">{formattedTime}</strong>
            </div>

            <div>
              <span className="text-zinc-600">ORDER NO: </span>
              <strong className="font-bold">{kot.orderNo || "N/A"}</strong>
            </div>
            <div className="text-right">
              <span className="text-zinc-600">DATE: </span>
              <strong className="font-bold">{formattedDate}</strong>
            </div>

            <div className="col-span-2 pt-1">
              <div className="bg-zinc-100 p-1.5 rounded border border-black font-black text-xs uppercase">
                {destinationText}
              </div>
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
                  <span className="pr-2 leading-tight uppercase">{line.name}</span>
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
            <div>Date: {formattedDate} • Generated by ROVESTA POS</div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between pt-2 print:hidden">
          <span className="text-xs text-zinc-500 font-mono">Standard 80mm Thermal Printer Ready</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-white transition cursor-pointer"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
}
