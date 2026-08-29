"use client";

import React, { useRef } from "react";
import { Printer, X } from "lucide-react";
import { formatGuestDisplayName } from "@/lib/domain/name-utils";

export interface InvoiceLineItem {
  id?: string;
  serviceDate?: string;
  description: string;
  sacHsn?: string;
  qty?: number;
  rate?: number;
  totalAmount: number;
  taxableAmount: number;
  taxAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  discountAmount?: number;
}

export interface InvoicePaymentItem {
  id?: string;
  receivedAt?: string;
  method: string;
  receiptNo?: string;
  reference?: string;
  amount: number;
}

export interface PrintableTaxInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  isLiveTaxBillView?: boolean;
  property: {
    displayName?: string;
    legalName?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
    stateCode?: string;
  };
  stay: any;
  roomNumber: string;
  allRooms?: string[];
  isMultiRoomGroup?: boolean;
  groupBillingMode?: "YES" | "NO";
  invoiceData?: {
    invoiceNo?: string;
    issuedAt?: string;
    lines?: InvoiceLineItem[];
    recipientSnapshot?: any;
    taxSnapshot?: any;
  } | null;
  ledgerEntries?: InvoiceLineItem[];
  payments?: InvoicePaymentItem[];
  cashierName?: string;
  receptionistName?: string;
}

// Convert numbers into Indian Rupees currency in words
export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount <= 0) return "Zero Rupees Only";

  const num = Math.round(amount);
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertSection(n: number): string {
    let str = "";
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + " ";
    }
    return str.trim();
  }

  let words = "";
  let remainder = num;

  const crores = Math.floor(remainder / 10000000);
  remainder %= 10000000;
  if (crores > 0) words += convertSection(crores) + " Crore ";

  const lakhs = Math.floor(remainder / 100000);
  remainder %= 100000;
  if (lakhs > 0) words += convertSection(lakhs) + " Lakh ";

  const thousands = Math.floor(remainder / 1000);
  remainder %= 1000;
  if (thousands > 0) words += convertSection(thousands) + " Thousand ";

  const hundreds = remainder;
  if (hundreds > 0) words += convertSection(hundreds) + " ";

  return "Rs " + words.trim() + " and Zero Only";
}

export function PrintableTaxInvoiceModal({
  isOpen,
  onClose,
  isLiveTaxBillView = false,
  property,
  stay,
  roomNumber,
  allRooms = [],
  isMultiRoomGroup = false,
  groupBillingMode = "NO",
  invoiceData,
  ledgerEntries = [],
  payments = [],
  cashierName = "Front Desk Cashier",
  receptionistName = "Gobin Tamang",
}: PrintableTaxInvoiceProps) {
  const printSheetRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Primary Guest Details
  const primaryGuest = stay?.primaryGuest || {};
  const guestFullName = formatGuestDisplayName(primaryGuest.name || "Walk-In Guest");

  // Company / Bill To details
  const btcPayment = payments.find((p) => p.method === "DIRECT_BILL");
  let btcSnapshot: any = null;
  if ((btcPayment as any)?.payerSnapshot) {
    try {
      btcSnapshot = JSON.parse((btcPayment as any).payerSnapshot);
    } catch (e) {}
  }

  const companyName = primaryGuest.companyName || btcSnapshot?.companyName || null;
  const guestGstin = primaryGuest.gstin || btcSnapshot?.gstin || null;

  // Address
  let addressText = "MD Shah Road, Paltan Bazar, Guwahati, Assam - 781008";
  if (primaryGuest.addressJson) {
    try {
      const addr = JSON.parse(primaryGuest.addressJson);
      addressText = [addr.street, addr.city, addr.state, addr.postalCode, addr.country || "India"]
        .filter(Boolean)
        .join(", ");
    } catch (e) {
      if (primaryGuest.city) {
        addressText = `${primaryGuest.city}, ${primaryGuest.state || "Assam"}, India`;
      }
    }
  } else if (primaryGuest.city) {
    addressText = `${primaryGuest.city}, ${primaryGuest.state || "Assam"}, India`;
  }

  // Invoice Numbers & Dates
  const billNo = invoiceData?.invoiceNo || `HRP/25-26/${roomNumber}327`;
  const grcNo = (stay?.reservationRoom?.reservation?.confirmationNo) || `59${roomNumber.slice(-2)}` || `5976`;
  
  const invoiceDateStr = invoiceData?.issuedAt
    ? new Date(invoiceData.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  const arrivalDateStr = stay?.arrivalAt
    ? new Date(stay.arrivalAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " " +
      new Date(stay.arrivalAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "—";

  const departureDateStr = stay?.actualDepartureAt
    ? new Date(stay.actualDepartureAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    : stay?.expectedDepartureAt
    ? new Date(stay.expectedDepartureAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Compute Nights
  const arrDate = stay?.arrivalAt ? new Date(stay.arrivalAt) : new Date();
  const depDate = stay?.actualDepartureAt ? new Date(stay.actualDepartureAt) : stay?.expectedDepartureAt ? new Date(stay.expectedDepartureAt) : new Date();
  const diffTime = Math.abs(depDate.getTime() - arrDate.getTime());
  const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Room String
  const displayRoomNo = groupBillingMode === "YES" && isMultiRoomGroup && allRooms.length > 0
    ? allRooms.join(", ")
    : roomNumber;

  // Line items
  const lines: InvoiceLineItem[] = (invoiceData?.lines && invoiceData.lines.length > 0)
    ? invoiceData.lines
    : ledgerEntries.length > 0
    ? ledgerEntries
    : [
        {
          description: "Room Rent",
          sacHsn: "996311",
          qty: nightsCount,
          rate: 1800,
          totalAmount: 1800 * nightsCount * 1.05,
          taxableAmount: 1800 * nightsCount,
          taxAmount: 1800 * nightsCount * 0.05,
          cgstAmount: (1800 * nightsCount * 0.05) / 2,
          sgstAmount: (1800 * nightsCount * 0.05) / 2,
          igstAmount: 0,
          cgstRate: 2.5,
          sgstRate: 2.5,
          igstRate: 0,
          discountAmount: 0,
        },
      ];

  // Totals calculations
  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let totalGross = 0;
  let totalDiscount = 0;

  lines.forEach((l) => {
    const taxable = Number(l.taxableAmount || 0);
    const total = Number(l.totalAmount || 0);
    const tax = total - taxable;
    const cgst = Number(l.cgstAmount !== undefined ? l.cgstAmount : tax / 2);
    const sgst = Number(l.sgstAmount !== undefined ? l.sgstAmount : tax / 2);
    const igst = Number(l.igstAmount || 0);

    totalTaxable += taxable;
    totalCGST += cgst;
    totalSGST += sgst;
    totalIGST += igst;
    totalGross += total;
    totalDiscount += Number(l.discountAmount || 0);
  });

  const totalTaxes = totalCGST + totalSGST + totalIGST;
  const totalPayable = totalGross;

  // Payments calculations
  const totalPayments = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const balanceDue = Math.max(0, totalPayable - totalPayments);
  const isPaidSettled = balanceDue <= 0.5;
  const wordsAmount = numberToWordsINR(totalPayable);

  // Dedicated Print Function that guarantees 100% isolated print output
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      window.print();
      return;
    }

    const linesHtml = lines.map((item, idx) => {
      const taxable = Number(item.taxableAmount || 0);
      const total = Number(item.totalAmount || 0);
      const taxHalf = (total - taxable) / 2;
      const discount = Number(item.discountAmount || 0);
      const rateVal = item.rate || (item.qty ? taxable / item.qty : taxable);

      return `
        <tr>
          <td style="text-align: center; font-weight: bold; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${idx + 1}</td>
          <td style="font-weight: 600; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${item.description}</td>
          <td style="text-align: center; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${item.sacHsn || "996311"}</td>
          <td style="text-align: center; font-weight: bold; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${item.qty || 1}</td>
          <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${rateVal.toFixed(2)}</td>
          <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${taxable.toFixed(2)}</td>
          <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${discount.toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${taxable.toFixed(2)}</td>
          <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">
            <div>${taxHalf.toFixed(2)}</div>
            <div style="font-size: 8px; color: #555;">2.50%</div>
          </td>
          <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">
            <div>${taxHalf.toFixed(2)}</div>
            <div style="font-size: 8px; color: #555;">2.50%</div>
          </td>
          <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">0.00</td>
          <td style="text-align: right; padding: 4px 5px; border-bottom: 1px solid #111;">0.00</td>
        </tr>
      `;
    }).join("");

    const paymentsHtml = payments.length > 0
      ? payments.map((p) => {
          const pDate = p.receivedAt
            ? new Date(p.receivedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
            : invoiceDateStr;
          const isBTC = p.method === "DIRECT_BILL";
          const desc = isBTC ? "BILL TO COMPANY (BTC)" : `${p.method} ${p.receiptNo ? `(Rec: ${p.receiptNo})` : ""}`;
          return `
            <tr>
              <td style="padding: 3px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${pDate}</td>
              <td style="padding: 3px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111; font-weight: 500;">${desc}</td>
              <td style="padding: 3px 5px; text-align: right; font-weight: bold; border-bottom: 1px solid #111;">${(p.amount || 0).toFixed(2)}</td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="3" style="padding: 6px; text-align: center; color: #666; font-style: italic; border-bottom: 1px solid #111;">No advance payments recorded (Direct Billing)</td></tr>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Tax_Invoice_${billNo.replace(/[^a-zA-Z0-9_-]/g, "_")}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            *, *:before, *:after {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #000000;
              background: #ffffff;
              padding: 4px;
              font-size: 10px;
              line-height: 1.25;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .invoice-wrap {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
              position: relative;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            .border-all {
              border: 1.2px solid #111;
            }
            .header-flex {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
              margin-bottom: 6px;
            }
            .hotel-title {
              font-size: 15px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              color: #000;
            }
            .hotel-info {
              font-size: 9.5px;
              color: #222;
              margin-top: 1.5px;
              line-height: 1.25;
            }
            .inv-title {
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              border-bottom: 1.5px solid #000;
              padding-bottom: 1px;
              display: inline-block;
            }
            .logo-img {
              height: 48px;
              max-height: 48px;
              object-contain: contain;
              margin-top: 2px;
            }
            .meta-table {
              width: 100%;
              border: 1.2px solid #111;
              border-collapse: collapse;
              margin-bottom: 6px;
              font-size: 9.5px;
              font-family: monospace, Courier, sans-serif;
            }
            .meta-table td {
              padding: 3px 6px;
              vertical-align: top;
            }
            .grid-tbl {
              width: 100%;
              border: 1.2px solid #111;
              border-collapse: collapse;
              margin-bottom: 6px;
              font-size: 9px;
              font-family: monospace, Courier, sans-serif;
            }
            .grid-tbl th {
              background-color: #f3f4f6;
              padding: 4px 5px;
              border-right: 1px solid #111;
              border-bottom: 1.2px solid #111;
              font-weight: bold;
            }
            .grid-tbl th:last-child {
              border-right: none;
            }
            .summary-tbl {
              width: 100%;
              border: 1.2px solid #111;
              border-collapse: collapse;
              margin-bottom: 6px;
              font-size: 9.5px;
              font-family: monospace, Courier, sans-serif;
            }
            .summary-tbl td {
              padding: 4px 6px;
              vertical-align: top;
            }
            .paid-stamp {
              position: absolute;
              top: 50%;
              left: 40%;
              transform: translate(-50%, -50%) rotate(-12deg);
              border: 3.5px solid #dc2626;
              border-radius: 12px;
              padding: 4px 20px;
              color: #dc2626;
              font-size: 32px;
              font-weight: 900;
              letter-spacing: 4px;
              text-transform: uppercase;
              opacity: 0.85;
              pointer-events: none;
            }
            .footer-banner {
              background-color: #fef3c7 !important;
              border: 1px solid #f59e0b;
              border-radius: 6px;
              padding: 5px 8px;
              text-align: center;
              font-size: 8.5px;
              margin-top: 6px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrap">
            
            <!-- HEADER -->
            <div class="header-flex">
              <div style="max-width: 58%;">
                <div class="hotel-title">${property.displayName || "HOTEL AMBARISH GRAND RESIDENCY"}</div>
                <div class="hotel-info">
                  <strong>GSTIN:</strong> ${property.gstin || "18AACCB2447F1ZX"} &bull; <strong>State:</strong> Assam (18)<br/>
                  ${property.address || "MD Shah Road, Paltan Bazar, Guwahati, Assam, 781008, India"}<br/>
                  <strong>Phone:</strong> ${property.phone || "9864341211, 0361 2547102"} &bull; <strong>Email:</strong> ${property.email || "reservation.ambarish@gmail.com"}<br/>
                  <strong>URL:</strong> ${property.website || "www.hotelambarish.com"}
                </div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                <div>
                  <div class="inv-title">Tax Invoice</div>
                  <div style="font-size: 8px; font-weight: bold; color: #555; text-transform: uppercase; margin-top: 1px;">Original For Recipient</div>
                </div>
                <img src="/images/ambarish-logo.png" alt="Ambarish Logo" class="logo-img" />
              </div>
            </div>

            <!-- METADATA 2-COL BOX -->
            <table class="meta-table">
              <tr>
                <td style="width: 50%; border-right: 1.2px solid #111;">
                  <div><strong>Bill No.</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>${billNo}</strong></div>
                  <div><strong>Guest Name</strong> &nbsp;&nbsp;&nbsp;&nbsp;: <span style="text-transform: uppercase; font-weight: bold;">${guestFullName}</span></div>
                  <div><strong>Bill To</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>${companyName ? companyName.toUpperCase() : guestFullName}</strong></div>
                  <div><strong>Address</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span style="text-transform: uppercase; font-size: 9px;">${addressText}</span></div>
                  <div><strong>State</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: Assam (State Code: 18)</div>
                  <div><strong>GSTIN</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>${guestGstin || "Unregistered / Consumer"}</strong></div>
                  <div><strong>Source of Supply</strong> : Guwahati, Assam (18)</div>
                </td>
                <td style="width: 50%;">
                  <div><strong>Date of Invoice</strong> &nbsp;&nbsp;&nbsp;&nbsp;: ${invoiceDateStr}</div>
                  <div><strong>G.R. Card No</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>${grcNo}</strong></div>
                  <div><strong>Room No.</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong style="font-size: 11px;">${displayRoomNo}</strong></div>
                  <div><strong>No. of Person</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${stay?.adults || 2} (A) / ${stay?.children || 0} (C)</div>
                  <div><strong>No. of Nights</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${nightsCount} Night${nightsCount > 1 ? "s" : ""}</div>
                  <div><strong>Date of Arrival</strong> &nbsp;&nbsp;&nbsp;&nbsp;: ${arrivalDateStr}</div>
                  <div><strong>Date of Departure</strong> : ${departureDateStr}</div>
                  <div><strong>Source</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span style="text-transform: uppercase;">${stay?.reservationRoom?.reservation?.source || stay?.referralChannel || "DIRECT WALK-IN"}</span></div>
                </td>
              </tr>
            </table>

            <!-- ITEMIZED CHARGES TABLE -->
            <table class="grid-tbl">
              <thead>
                <tr>
                  <th style="width: 26px;">Sr No</th>
                  <th style="text-align: left;">Description</th>
                  <th style="width: 48px;">HSN/SAC</th>
                  <th style="width: 30px;">Qty</th>
                  <th style="width: 55px; text-align: right;">Rate</th>
                  <th style="width: 58px; text-align: right;">Total</th>
                  <th style="width: 45px; text-align: right;">Discount</th>
                  <th style="width: 58px; text-align: right;">Taxable</th>
                  <th style="width: 48px; text-align: right;">SGST</th>
                  <th style="width: 48px; text-align: right;">CGST</th>
                  <th style="width: 36px; text-align: right;">CESS</th>
                  <th style="width: 36px; text-align: right;">IGST</th>
                </tr>
              </thead>
              <tbody>
                ${linesHtml}
                <tr style="background-color: #f3f4f6; font-weight: bold; border-top: 1.5px solid #111;">
                  <td colspan="5" style="text-align: center; padding: 4px 5px; border-right: 1px solid #111;">Total</td>
                  <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111;">${totalTaxable.toFixed(2)}</td>
                  <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111;">${totalDiscount.toFixed(2)}</td>
                  <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111;">${totalTaxable.toFixed(2)}</td>
                  <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111;">${totalSGST.toFixed(2)}</td>
                  <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111;">${totalCGST.toFixed(2)}</td>
                  <td style="text-align: right; padding: 4px 5px; border-right: 1px solid #111;">0.00</td>
                  <td style="text-align: right; padding: 4px 5px;">0.00</td>
                </tr>
              </tbody>
            </table>

            <!-- SPLIT SUMMARY (WORDS + PAYMENTS vs TOTALS) -->
            <table class="summary-tbl">
              <tr>
                <td style="width: 58%; border-right: 1.2px solid #111;">
                  <div style="font-weight: bold; text-transform: uppercase; font-size: 8.5px;">Total Payable Amount:</div>
                  <div style="font-weight: 900; text-transform: uppercase; font-size: 10px; border-left: 2px solid #000; padding-left: 4px; margin: 2px 0 6px 0;">
                    ${wordsAmount}
                  </div>
                  
                  <table style="width: 100%; border: 1px solid #111; font-size: 8.5px; border-collapse: collapse;">
                    <tr style="background-color: #f3f4f6; font-weight: bold;">
                      <th style="padding: 2px 4px; border-right: 1px solid #111; border-bottom: 1px solid #111; text-align: left;">Payment Date</th>
                      <th style="padding: 2px 4px; border-right: 1px solid #111; border-bottom: 1px solid #111; text-align: left;">Description / Mode</th>
                      <th style="padding: 2px 4px; border-bottom: 1px solid #111; text-align: right;">Amount (₹)</th>
                    </tr>
                    ${paymentsHtml}
                    <tr style="background-color: #f9fafb; font-weight: bold; border-top: 1px solid #111;">
                      <td colspan="2" style="padding: 2px 4px; border-right: 1px solid #111;">Total Payment Received</td>
                      <td style="padding: 2px 4px; text-align: right; font-weight: 900;">${totalPayments.toFixed(2)}</td>
                    </tr>
                  </table>
                </td>

                <td style="width: 42%; background-color: #fbfbfb;">
                  <table style="width: 100%; font-size: 9.5px; line-height: 1.35;">
                    <tr><td>Total Charge</td><td style="text-align: right; font-weight: bold;">${totalTaxable.toFixed(2)}</td></tr>
                    <tr><td>SGST</td><td style="text-align: right;">${totalSGST.toFixed(2)}</td></tr>
                    <tr><td>CGST</td><td style="text-align: right;">${totalCGST.toFixed(2)}</td></tr>
                    <tr style="border-top: 1px solid #ccc; font-weight: bold;"><td>Grand Total Charge</td><td style="text-align: right; font-weight: 900;">${totalGross.toFixed(2)}</td></tr>
                    <tr style="color: #555;"><td>Flat Discount</td><td style="text-align: right;">${totalDiscount.toFixed(2)}</td></tr>
                    <tr style="color: #555;"><td>Adjustment</td><td style="text-align: right;">0.00</td></tr>
                    <tr style="border-top: 1.2px solid #000; font-weight: bold; font-size: 10.5px;"><td>Total Payable</td><td style="text-align: right; font-weight: 900;">${totalPayable.toFixed(2)}</td></tr>
                    <tr style="font-weight: bold;"><td>Total Payment</td><td style="text-align: right; font-weight: 900; color: #166534;">${totalPayments.toFixed(2)}</td></tr>
                    <tr style="border-top: 1.5px solid #000; font-weight: 900; font-size: 12px;">
                      <td>Balance</td>
                      <td style="text-align: right; color: ${balanceDue > 0.5 ? '#b91c1c' : '#166534'};">${balanceDue.toFixed(2)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- PAID WATERMARK -->
            ${isPaidSettled ? '<div class="paid-stamp">PAID</div>' : ''}

            <!-- GST SLAB TABLE -->
            <table class="grid-tbl" style="font-size: 8.5px; margin-bottom: 6px;">
              <thead>
                <tr>
                  <th rowspan="2" style="padding: 3px;">Taxable</th>
                  <th colspan="2" style="padding: 3px;">Central Tax</th>
                  <th colspan="2" style="padding: 3px;">State Tax</th>
                  <th colspan="2" style="padding: 3px;">Integrated Tax</th>
                  <th rowspan="2" style="padding: 3px;">Total Tax Amount</th>
                </tr>
                <tr style="border-top: 1px solid #111;">
                  <th style="padding: 2px;">Rate</th><th style="padding: 2px;">Amount</th>
                  <th style="padding: 2px;">Rate</th><th style="padding: 2px;">Amount</th>
                  <th style="padding: 2px;">Rate</th><th style="padding: 2px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style="text-align: center;">
                  <td style="padding: 3px; font-weight: bold; border-right: 1px solid #111; border-bottom: 1px solid #111;">${totalTaxable.toFixed(2)}</td>
                  <td style="padding: 3px; border-right: 1px solid #111; border-bottom: 1px solid #111;">2.5%</td>
                  <td style="padding: 3px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${totalCGST.toFixed(2)}</td>
                  <td style="padding: 3px; border-right: 1px solid #111; border-bottom: 1px solid #111;">2.5%</td>
                  <td style="padding: 3px; border-right: 1px solid #111; border-bottom: 1px solid #111;">${totalSGST.toFixed(2)}</td>
                  <td style="padding: 3px; border-right: 1px solid #111; border-bottom: 1px solid #111;">0.0%</td>
                  <td style="padding: 3px; border-right: 1px solid #111; border-bottom: 1px solid #111;">0.00</td>
                  <td style="padding: 3px; font-weight: bold; border-bottom: 1px solid #111;">${totalTaxes.toFixed(2)}</td>
                </tr>
                <tr style="background-color: #f3f4f6; font-weight: bold; text-align: center;">
                  <td style="padding: 3px; border-right: 1px solid #111;">Total: ${totalTaxable.toFixed(2)}</td>
                  <td colspan="2" style="padding: 3px; border-right: 1px solid #111;">${totalCGST.toFixed(2)}</td>
                  <td colspan="2" style="padding: 3px; border-right: 1px solid #111;">${totalSGST.toFixed(2)}</td>
                  <td colspan="2" style="padding: 3px; border-right: 1px solid #111;">0.00</td>
                  <td style="padding: 3px;">${totalTaxes.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <!-- SIGNATURES & NOTICE -->
            <table style="width: 100%; font-size: 8.5px; font-family: monospace, Courier, sans-serif; margin-bottom: 4px;">
              <tr>
                <td style="width: 42%; vertical-align: top; padding-right: 8px;">
                  <div><strong>This Folio is in:</strong> Rs (INR)</div>
                  <div style="margin-top: 1px;"><strong>Reception (C/I):</strong> ${receptionistName}</div>
                  <div style="margin-top: 1px;"><strong>Cashier (C/O):</strong> ${cashierName}</div>
                  <div style="margin-top: 1px;"><strong>Date & Time:</strong> ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                  <div style="margin-top: 24px; border-top: 1px solid #000; padding-top: 2px; text-align: center; font-weight: bold; width: 140px;">
                    ( Guest Signature )
                  </div>
                </td>
                <td style="width: 58%; vertical-align: top; border-left: 1px solid #ccc; padding-left: 8px; font-size: 8px; color: #333; line-height: 1.25;">
                  <div><strong>NOTICE TO GUESTS:</strong> This property is privately owned and management reserves the right to refuse service to anyone. Management will not be responsible for accidents or injury to guests or for loss of money, jewellery, or valuables of any kind.</div>
                  <div style="margin-top: 2px;"><strong>CHECKOUT TIME: 11:00 AM &bull; SELF REGISTRATION ONLY</strong></div>
                  <div style="margin-top: 2px; opacity: 0.85;">I AGREE that my liability for this bill is not waived and agree to be held personally liable in the event that the indicated person or company failed to pay for any part or full amount of these charges.</div>
                </td>
              </tr>
            </table>

            <!-- GOLDEN FOOTER BANNER -->
            <div class="footer-banner">
              <strong style="text-transform: uppercase; font-size: 9.5px; color: #78350f;">HOTEL AMBARISH GRAND RESIDENCY</strong><br/>
              MD Shah Road, Paltan Bazar, Guwahati - 781008 (Assam) &bull; Phone: +91 98643 41211, 0361 2547102 &bull; Email: reservation.ambarish@gmail.com &bull; Website: www.hotelambarish.com
            </div>

          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  return (
    <div className="print-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible animate-in fade-in">
      
      {/* Outer Card Container */}
      <div className="print-invoice-sheet w-full max-w-4xl rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white text-zinc-950 p-4 sm:p-7 shadow-2xl space-y-3 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none print:space-y-2 max-h-[96vh] overflow-y-auto print:max-h-none print:overflow-visible relative font-sans">
        
        {/* Top Control Bar (Screen Only) */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 print:hidden no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase font-mono tracking-wider text-zinc-700">
              {isLiveTaxBillView ? "Live Folio Tax Invoice (GST Rule 46)" : "Official GST Tax Invoice"}
            </span>
            <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[11px] font-mono font-bold">
              ✓ Rule 46 Compliant
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print Tax Invoice (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 📄 TAX INVOICE PRINT DOCUMENT CONTENT (A4 OPTIMIZED ON SCREEN)             */}
        {/* ========================================================================= */}
        <div ref={printSheetRef} className="space-y-2.5 text-[11px] text-zinc-900 print:text-black leading-snug">

          {/* 1. TOP HEADER SECTION (Prominent Hotel Identity + Logo + Title) */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b-2 border-zinc-950">
            
            {/* Left: Hotel Legal & Contact Details */}
            <div className="space-y-0.5 max-w-[55%]">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-950 uppercase leading-none">
                {property.displayName || property.legalName || "HOTEL AMBARISH GRAND RESIDENCY"}
              </h1>
              <div className="text-[10px] font-bold font-mono text-zinc-700 uppercase">
                GSTIN: <span className="text-zinc-950 font-black">{property.gstin || "18AACCB2447F1ZX"}</span>
                {property.stateCode && ` • State Code: ${property.stateCode} (Assam)`}
              </div>
              <div className="text-[10px] text-zinc-700 leading-tight">
                {property.address || "MD Shah Road, Paltan Bazar, Guwahati, Assam, 781008, India"}
              </div>
              <div className="text-[9.5px] text-zinc-600 font-mono flex items-center gap-2 flex-wrap">
                <span>Phone: <strong>{property.phone || "9864341211, 0361 2547102"}</strong></span>
                <span>• Email: <strong>{property.email || "reservation.ambarish@gmail.com"}</strong></span>
                <span>• URL: <strong>{property.website || "www.hotelambarish.com"}</strong></span>
              </div>
            </div>

            {/* Center / Right: Tax Invoice Title & 3-Star Ambarish Logo */}
            <div className="flex flex-col items-end shrink-0 text-right space-y-1">
              <div className="text-center sm:text-right">
                <span className="text-base sm:text-lg font-black uppercase tracking-wider text-zinc-950 border-b border-zinc-950 pb-0.5 block">
                  Tax Invoice
                </span>
                <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block mt-0.5">
                  Original For Recipient
                </span>
              </div>

              {/* Logo Embed */}
              <div className="pt-0.5">
                <img
                  src="/images/ambarish-logo.png"
                  alt="Hotel Ambarish Grand Residency Logo"
                  className="h-10 sm:h-12 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. METADATA GRID (2-Column Key Value Grid matching reference format) */}
          <div className="border border-zinc-900 grid grid-cols-2 divide-x divide-zinc-900 text-[10.5px] font-mono">
            
            {/* Left Box: Bill No, Guest, Bill To, Address, GSTIN */}
            <div className="p-2 space-y-1">
              <div className="flex">
                <span className="w-28 font-bold text-zinc-800 shrink-0">Bill No.</span>
                <span className="font-bold text-zinc-950">: {billNo}</span>
              </div>

              <div className="flex">
                <span className="w-28 font-bold text-zinc-800 shrink-0">Guest Name</span>
                <span className="font-bold uppercase text-zinc-950">: {guestFullName}</span>
              </div>

              <div className="flex items-start">
                <span className="w-28 font-bold text-zinc-800 shrink-0">Bill To</span>
                <span className="font-bold text-zinc-950">: {companyName ? companyName.toUpperCase() : guestFullName}</span>
              </div>

              <div className="flex items-start">
                <span className="w-28 font-bold text-zinc-800 shrink-0">Address</span>
                <span className="uppercase text-[10px] leading-tight">: {addressText}</span>
              </div>

              <div className="flex">
                <span className="w-28 font-bold text-zinc-800 shrink-0">State</span>
                <span>: Assam (State Code: 18)</span>
              </div>

              <div className="flex">
                <span className="w-28 font-bold text-zinc-800 shrink-0">GSTIN</span>
                <span className="font-bold">: {guestGstin || "Unregistered / Consumer"}</span>
              </div>

              <div className="flex">
                <span className="w-28 font-bold text-zinc-800 shrink-0">Source of Supply</span>
                <span>: Guwahati, Assam (18)</span>
              </div>
            </div>

            {/* Right Box: Invoice Date, GRC, Room, Pax, Dates, Nights, Source */}
            <div className="p-2 space-y-1">
              <div className="flex">
                <span className="w-32 font-bold text-zinc-800 shrink-0">Date of Invoice</span>
                <span className="font-bold">: {invoiceDateStr}</span>
              </div>

              <div className="flex">
                <span className="w-32 font-bold text-zinc-800 shrink-0">G.R. Card No</span>
                <span className="font-bold">: {grcNo}</span>
              </div>

              <div className="flex">
                <span className="w-32 font-bold text-zinc-800 shrink-0">
                  {groupBillingMode === "YES" && isMultiRoomGroup ? "Rooms Included" : "Room No."}
                </span>
                <span className="font-bold text-xs">: {displayRoomNo}</span>
              </div>

              <div className="flex">
                <span className="w-32 font-bold text-zinc-800 shrink-0">No. of Person</span>
                <span>: {stay?.adults || 2} (A) / {stay?.children || 0} (C)</span>
              </div>

              <div className="flex">
                <span className="w-32 font-bold text-zinc-800 shrink-0">No. of Nights</span>
                <span>: {nightsCount} Night{nightsCount > 1 ? "s" : ""}</span>
              </div>

              <div className="flex">
                <span className="w-32 font-bold text-zinc-800 shrink-0">Date of Arrival</span>
                <span>: {arrivalDateStr}</span>
              </div>

              <div className="flex">
                <span className="w-32 font-bold text-zinc-800 shrink-0">Date of Departure</span>
                <span>: {departureDateStr}</span>
              </div>

              <div className="flex">
                <span className="w-32 font-bold text-zinc-800 shrink-0">Source</span>
                <span className="uppercase">: {stay?.reservationRoom?.reservation?.source || stay?.referralChannel || "DIRECT WALK-IN"}</span>
              </div>
            </div>

          </div>

          {/* 3. ITEMIZED CHARGES TABLE */}
          <div className="border border-zinc-900 overflow-hidden">
            <table className="w-full text-left font-mono text-[10px] border-collapse">
              <thead className="border-b border-zinc-900 bg-zinc-100 font-bold">
                <tr className="text-zinc-950 divide-x divide-zinc-400">
                  <th className="p-1.5 w-8 text-center">Sr No</th>
                  <th className="p-1.5">Description</th>
                  <th className="p-1.5 w-16 text-center">HSN/SAC</th>
                  <th className="p-1.5 w-10 text-center">Qty</th>
                  <th className="p-1.5 w-20 text-right">Rate</th>
                  <th className="p-1.5 w-20 text-right">Total</th>
                  <th className="p-1.5 w-16 text-right">Discount</th>
                  <th className="p-1.5 w-20 text-right">Taxable</th>
                  <th className="p-1.5 w-16 text-right">SGST</th>
                  <th className="p-1.5 w-16 text-right">CGST</th>
                  <th className="p-1.5 w-12 text-right">CESS</th>
                  <th className="p-1.5 w-12 text-right">IGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-300">
                {lines.map((item, idx) => {
                  const taxable = Number(item.taxableAmount || 0);
                  const total = Number(item.totalAmount || 0);
                  const taxHalf = (total - taxable) / 2;
                  const discount = Number(item.discountAmount || 0);
                  const rateVal = item.rate || (item.qty ? taxable / item.qty : taxable);

                  return (
                    <tr key={idx} className="divide-x divide-zinc-300 hover:bg-zinc-50/50">
                      <td className="p-1.5 text-center font-bold">{idx + 1}</td>
                      <td className="p-1.5 font-medium text-zinc-950">{item.description}</td>
                      <td className="p-1.5 text-center">{item.sacHsn || "996311"}</td>
                      <td className="p-1.5 text-center font-bold">{item.qty || 1}</td>
                      <td className="p-1.5 text-right tabular-nums">{rateVal.toFixed(2)}</td>
                      <td className="p-1.5 text-right tabular-nums">{taxable.toFixed(2)}</td>
                      <td className="p-1.5 text-right tabular-nums">{discount.toFixed(2)}</td>
                      <td className="p-1.5 text-right font-bold tabular-nums">{taxable.toFixed(2)}</td>
                      <td className="p-1.5 text-right tabular-nums">
                        <div>{taxHalf.toFixed(2)}</div>
                        <div className="text-[8.5px] text-zinc-500">2.50%</div>
                      </td>
                      <td className="p-1.5 text-right tabular-nums">
                        <div>{taxHalf.toFixed(2)}</div>
                        <div className="text-[8.5px] text-zinc-500">2.50%</div>
                      </td>
                      <td className="p-1.5 text-right tabular-nums">0.00</td>
                      <td className="p-1.5 text-right tabular-nums">0.00</td>
                    </tr>
                  );
                })}

                {/* Total Summary Row */}
                <tr className="bg-zinc-100 border-t-2 border-zinc-900 font-bold divide-x divide-zinc-400">
                  <td className="p-1.5 text-center" colSpan={5}>Total</td>
                  <td className="p-1.5 text-right tabular-nums">{totalTaxable.toFixed(2)}</td>
                  <td className="p-1.5 text-right tabular-nums">{totalDiscount.toFixed(2)}</td>
                  <td className="p-1.5 text-right font-bold tabular-nums">{totalTaxable.toFixed(2)}</td>
                  <td className="p-1.5 text-right tabular-nums">{totalSGST.toFixed(2)}</td>
                  <td className="p-1.5 text-right tabular-nums">{totalCGST.toFixed(2)}</td>
                  <td className="p-1.5 text-right tabular-nums">0.00</td>
                  <td className="p-1.5 text-right tabular-nums">0.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. SPLIT SUMMARY SECTION: Left Words & Receipts | Right Totals Calculation */}
          <div className="grid grid-cols-12 border border-zinc-900 divide-x divide-zinc-900 text-[10.5px] font-mono page-break-avoid relative">
            
            {/* Left Block (7 Cols): Amount in words & Payments table */}
            <div className="col-span-7 p-2 flex flex-col justify-between space-y-2">
              
              <div className="space-y-1">
                <div className="font-bold text-zinc-950 uppercase text-[10px]">
                  Total Payable Amount:
                </div>
                <div className="font-extrabold text-zinc-950 text-xs leading-snug uppercase pl-1 border-l-2 border-zinc-900">
                  {wordsAmount}
                </div>
              </div>

              {/* Payment Receipts Ledger Table */}
              <div className="border border-zinc-900 overflow-hidden mt-1">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-zinc-100 border-b border-zinc-900 font-bold divide-x divide-zinc-400">
                    <tr>
                      <th className="p-1 w-24">Payment Date</th>
                      <th className="p-1">Description / Mode</th>
                      <th className="p-1 text-right w-24">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-300">
                    {payments.map((p, idx) => {
                      const pDate = p.receivedAt
                        ? new Date(p.receivedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : invoiceDateStr;
                      const isBTC = p.method === "DIRECT_BILL";
                      const desc = isBTC ? "BILL TO COMPANY (BTC)" : `${p.method} ${p.receiptNo ? `(Rec: ${p.receiptNo})` : ""}`;

                      return (
                        <tr key={idx} className="divide-x divide-zinc-300">
                          <td className="p-1 whitespace-nowrap">{pDate}</td>
                          <td className="p-1 font-medium">{desc}</td>
                          <td className="p-1 text-right font-bold tabular-nums">{(p.amount || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}

                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-1.5 text-center text-zinc-500 italic">
                          No advance payments recorded (Direct Billing / Post-Stay Settle)
                        </td>
                      </tr>
                    )}

                    <tr className="bg-zinc-50 font-bold border-t border-zinc-900 divide-x divide-zinc-400">
                      <td className="p-1" colSpan={2}>Total Payment Received</td>
                      <td className="p-1 text-right font-black tabular-nums">{totalPayments.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            {/* Right Block (5 Cols): Structured Totals Breakdown */}
            <div className="col-span-5 p-2 space-y-1 bg-zinc-50/50">
              <div className="flex justify-between font-bold">
                <span>Total Charge</span>
                <span className="tabular-nums">{totalTaxable.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST</span>
                <span className="tabular-nums">{totalSGST.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST</span>
                <span className="tabular-nums">{totalCGST.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold pt-0.5 border-t border-zinc-300">
                <span>Grand Total Charge</span>
                <span className="tabular-nums font-extrabold">{totalGross.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Flat Discount</span>
                <span className="tabular-nums">{totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Adjustment</span>
                <span className="tabular-nums">0.00</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-zinc-900 text-xs">
                <span>Total Payable</span>
                <span className="tabular-nums font-black">{totalPayable.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-zinc-800">
                <span>Total Payment</span>
                <span className="tabular-nums text-emerald-800 font-bold">{totalPayments.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 border-t-2 border-zinc-950">
                <span>Balance</span>
                <span className={`tabular-nums ${balanceDue > 0.5 ? "text-rose-700" : "text-emerald-800"}`}>
                  {balanceDue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* PAID STAMP WATERMARK (Overlay if settled) */}
            {isPaidSettled && (
              <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] pointer-events-none select-none z-20">
                <div className="border-4 border-rose-600 dark:border-rose-500 rounded-2xl px-6 py-1 text-rose-600 dark:text-rose-500 font-black text-3xl tracking-widest uppercase opacity-85 shadow-sm">
                  PAID
                </div>
              </div>
            )}

          </div>

          {/* 5. GST TAX MATRIX SLAB SUMMARY */}
          <div className="border border-zinc-900 overflow-hidden font-mono text-[9.5px]">
            <table className="w-full text-center border-collapse">
              <thead className="bg-zinc-100 border-b border-zinc-900 font-bold divide-x divide-zinc-400">
                <tr>
                  <th className="p-1" rowSpan={2}>Taxable</th>
                  <th className="p-1" colSpan={2}>Central Tax</th>
                  <th className="p-1" colSpan={2}>State Tax</th>
                  <th className="p-1" colSpan={2}>Integrated Tax</th>
                  <th className="p-1" rowSpan={2}>Total Tax Amount</th>
                </tr>
                <tr className="border-t border-zinc-300 divide-x divide-zinc-400">
                  <th className="p-0.5 w-12">Rate</th>
                  <th className="p-0.5 w-16">Amount</th>
                  <th className="p-0.5 w-12">Rate</th>
                  <th className="p-0.5 w-16">Amount</th>
                  <th className="p-0.5 w-12">Rate</th>
                  <th className="p-0.5 w-16">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-300">
                <tr className="divide-x divide-zinc-300 font-medium">
                  <td className="p-1 font-bold">{totalTaxable.toFixed(2)}</td>
                  <td className="p-1">2.5%</td>
                  <td className="p-1">{totalCGST.toFixed(2)}</td>
                  <td className="p-1">2.5%</td>
                  <td className="p-1">{totalSGST.toFixed(2)}</td>
                  <td className="p-1">0.0%</td>
                  <td className="p-1">{totalIGST.toFixed(2)}</td>
                  <td className="p-1 font-bold">{totalTaxes.toFixed(2)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-900 divide-x divide-zinc-400">
                  <td className="p-1">Total: {totalTaxable.toFixed(2)}</td>
                  <td className="p-1" colSpan={2}>{totalCGST.toFixed(2)}</td>
                  <td className="p-1" colSpan={2}>{totalSGST.toFixed(2)}</td>
                  <td className="p-1" colSpan={2}>{totalIGST.toFixed(2)}</td>
                  <td className="p-1 font-black">{totalTaxes.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6. SIGNATURES & NOTICE TO GUESTS */}
          <div className="grid grid-cols-12 gap-3 pt-2 items-start font-mono text-[9px] page-break-avoid">
            
            {/* Left Signatures */}
            <div className="col-span-5 space-y-2 text-[9.5px]">
              <div>
                <strong>This Folio is in:</strong> Rs (INR)
              </div>
              <div>
                <strong>Reception (C/I):</strong> {receptionistName}
              </div>
              <div>
                <strong>Cashier (C/O):</strong> {cashierName}
              </div>
              <div>
                <strong>Date & Time:</strong> {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="pt-6">
                <div className="border-t border-zinc-900 pt-1 font-bold text-center w-48">
                  ( Guest Signature )
                </div>
              </div>
            </div>

            {/* Right Legal Terms & Rules */}
            <div className="col-span-7 text-[8.5px] leading-tight text-zinc-700 space-y-1 pl-2 border-l border-zinc-300">
              <div>
                <strong>NOTICE TO GUESTS:</strong> This property is privately owned and management reserves the right to refuse service to anyone. Management will not be responsible for accidents or injury to guests or for loss of money, jewellery, or valuables of any kind.
              </div>
              <div>
                <strong>CHECKOUT TIME: 11:00 AM • SELF REGISTRATION ONLY</strong>
              </div>
              <div className="text-[8px] opacity-80 leading-snug">
                I AGREE that my liability for this bill is not waived and agree to be held personally liable in the event that the indicated person or company failed to pay for any part or full amount of these charges.
              </div>
            </div>

          </div>

          {/* 7. GOLDEN FOOTER BANNER (Exact Style of Hotel Palace Reference) */}
          <div className="mt-2 p-2 rounded-lg bg-amber-100/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-center font-bold text-amber-950 dark:text-amber-200 text-[10px] space-y-0.5 page-break-avoid">
            <div className="uppercase tracking-wide font-black text-[11px] text-amber-900 dark:text-amber-100">
              HOTEL AMBARISH GRAND RESIDENCY
            </div>
            <div className="text-[9px] font-mono font-medium">
              MD Shah Road, Paltan Bazar, Guwahati - 781008 (Assam) • Phone: +91 98643 41211, 0361 2547102 • Email: reservation.ambarish@gmail.com • Website: www.hotelambarish.com
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
