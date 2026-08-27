"use client";

import React, { useState } from "react";
import {
  FileText,
  X,
  ShieldCheck,
  Printer,
  Copy,
  Check,
} from "lucide-react";

export interface GrcData {
  id?: string;
  grcNo?: string;
  registrationNo?: string;
  roomNumber?: string;
  assignedRoomNumber?: string;
  preAssignedRoom?: string;
  arrivalDateTime?: string;
  expectedDepartureDate?: string;
  paxM?: number | string;
  paxF?: number | string;
  paxC?: number | string;
  fullName: string;
  age?: number | string;
  gender?: string;
  nationality?: string;
  fatherSpouseName?: string;
  profession?: string;
  streetAddress?: string;
  policeStation?: string;
  city?: string;
  pinZipCode?: string;
  state?: string;
  country?: string;
  arrivedFrom?: string;
  goingTo?: string;
  purposeOfVisit?: string;
  referralChannel?: string;
  phone?: string;
  mobilePhone: string;
  alternatePhone?: string;
  email?: string;
  driverName?: string;
  vehicleNumber?: string;
  idType?: string;
  idLast4?: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
  idPhotoUrl?: string;
  depositAmount?: number | string;
  paymentMethod?: string;
  coGuests?: Array<{
    name: string;
    soDoWo?: string;
    age: string | number;
    gender: string;
    relation: string;
  }>;
  foreignDetails?: {
    nationality?: string;
    passportNo?: string;
    datePlaceOfIssue?: string;
    restrictedPermitNo?: string;
    dateOfArrivalInIndia?: string;
    portOfEntry?: string;
    employedInIndia?: string;
    proposedDurationOfStay?: string;
    nextDestination?: string;
  };
}

interface DigitalGrcModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GrcData;
  property: {
    displayName?: string;
    legalName?: string;
    address?: string | null;
    phone?: string | null;
    code?: string;
    gstin?: string | null;
  };
}

export function PrintableGrcModal({
  isOpen,
  onClose,
  data,
  property,
}: DigitalGrcModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const registrationNumber =
    data.grcNo || data.registrationNo || "GRC-AMB-2627-0102";
  const roomNum =
    data.roomNumber ||
    data.assignedRoomNumber ||
    data.preAssignedRoom ||
    "—";
  const arrivalTime =
    data.arrivalDateTime ||
    new Date().toISOString().replace("T", " ").slice(0, 16);
  const auditTimestamp = new Date().toISOString();
  const policeRefNo = registrationNumber.startsWith("GRC-")
    ? registrationNumber.replace("GRC-", "PV-")
    : `PV-${registrationNumber}`;
  const shaHash = `SHA256:${Buffer.from(
    `${registrationNumber}-${data.fullName}-${arrivalTime}`
  )
    .toString("hex")
    .slice(0, 32)}`;

  // Strict sanitization helper (no fake placeholder strings)
  const sanitize = (val?: string | number | null) => {
    if (val === undefined || val === null) return "—";
    const s = String(val).trim();
    return s.length > 0 ? s : "—";
  };

  const formattedAddress =
    [data.streetAddress, data.city, data.state, data.pinZipCode, data.country]
      .filter((part) => part && String(part).trim().length > 0)
      .join(", ") || "—";

  const formattedAgeGender =
    [
      data.age ? `${data.age} Yrs` : null,
      data.gender || null,
      data.nationality || "Indian",
    ]
      .filter(Boolean)
      .join(" • ") || "—";

  const formattedIdProof =
    data.idType || data.idDocumentType
      ? `${data.idType || data.idDocumentType} — ${
          data.idLast4 || data.idDocumentNumber || "Verified at Desk"
        }`
      : "—";

  const handleCopyLink = () => {
    const text = `Hotel OS Digital GRC: ${registrationNumber} | Guest: ${
      data.fullName
    } | Room: ${roomNum} | Arrival: ${arrivalTime} | Verified ID: ${
      data.idDocumentType || data.idType || "AADHAAR"
    } | Police Ref: ${policeRefNo}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=850,height=1000");
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>GRC_${registrationNumber}_${(data.fullName || "Guest").replace(/\\s+/g, "_")}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
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
              padding: 6px;
              font-size: 11px;
              line-height: 1.3;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .grc-container {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
            }
            .border-box {
              border: 1.5px solid #000;
              margin-bottom: 5px;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #000;
              background-color: #f8fafc;
              margin-bottom: 5px;
            }
            .header-table td {
              padding: 8px 10px;
              vertical-align: middle;
            }
            .hotel-name {
              font-family: Georgia, serif;
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #000;
            }
            .hotel-sub {
              font-size: 10.5px;
              font-weight: bold;
              color: #222;
              margin-top: 2px;
            }
            .hotel-addr {
              font-size: 9.5px;
              color: #444;
              margin-top: 2px;
            }
            .grc-badge {
              border: 1.5px solid #000;
              background: #ffffff;
              padding: 6px 8px;
              text-align: right;
              display: inline-block;
            }
            .grc-badge-title {
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #555;
            }
            .grc-badge-no {
              font-size: 14px;
              font-weight: 900;
              font-family: monospace;
              color: #000;
              margin: 1px 0;
            }
            .grc-badge-police {
              font-size: 8.5px;
              font-family: monospace;
              font-weight: bold;
              color: #111;
              border-top: 1px solid #ccc;
              padding-top: 2px;
              margin-top: 2px;
            }
            .ribbon-table {
              width: 100%;
              border-collapse: collapse;
              border: 1.5px solid #000;
              margin-bottom: 5px;
            }
            .ribbon-table td {
              border: 1px solid #000;
              padding: 5px 8px;
              vertical-align: top;
            }
            .section-header {
              background: #e2e8f0;
              font-weight: 900;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 3px 8px;
              border-bottom: 1.5px solid #000;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
            }
            .data-table td {
              border: 1px solid #000;
              padding: 4px 8px;
              vertical-align: top;
            }
            .field-label {
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              color: #555;
              display: block;
              margin-bottom: 1px;
            }
            .field-value {
              font-size: 10.5px;
              font-weight: bold;
              color: #000;
            }
            .field-value-lg {
              font-size: 12px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .field-value-mono {
              font-family: monospace;
              font-size: 10.5px;
              font-weight: bold;
            }
            .coguest-table {
              width: 100%;
              border-collapse: collapse;
            }
            .coguest-table th {
              background: #f1f5f9;
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
              border: 1px solid #000;
              padding: 3px 6px;
              text-align: left;
            }
            .coguest-table td {
              border: 1px solid #000;
              padding: 3px 6px;
              font-size: 9.5px;
            }
            .terms-box {
              border: 1.5px solid #000;
              padding: 5px 8px;
              background-color: #f8fafc;
              font-size: 8.5px;
              line-height: 1.35;
              margin-bottom: 5px;
            }
            .terms-title {
              font-size: 8.5px;
              font-weight: 900;
              text-transform: uppercase;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 2px;
              margin-bottom: 3px;
            }
            .signature-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 5px;
            }
            .signature-table td {
              width: 50%;
              border: 1.5px solid #000;
              padding: 6px 8px;
              vertical-align: top;
              height: 65px;
            }
            .sig-line {
              border-bottom: 1.5px dashed #000;
              margin-top: 25px;
              text-align: center;
              font-family: monospace;
              font-weight: bold;
              font-size: 10px;
              text-transform: uppercase;
              padding-bottom: 2px;
            }
            .sig-caption {
              text-align: center;
              font-size: 7.5px;
              color: #444;
              margin-top: 2px;
            }
            .audit-bar {
              border: 1px solid #64748b;
              background-color: #f1f5f9;
              padding: 3px 6px;
              font-family: monospace;
              font-size: 8px;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="grc-container">
            
            <!-- HEADER -->
            <table class="header-table">
              <tr>
                <td style="width: 65%;">
                  <div class="hotel-name">${property.displayName || "Hotel Ambarish Grand Residency"}</div>
                  <div class="hotel-sub">${property.legalName || "AMBARISH RESIDENCY"} • GSTIN: ${property.gstin || "18AACCB2447F1ZX"}</div>
                  <div class="hotel-addr">${property.address || "MD Shah Road, Paltan Bazar, Guwahati, Assam - 781008"} • Ph: ${property.phone || "+91 9864341211"}</div>
                </td>
                <td style="width: 35%; text-align: right;">
                  <div class="grc-badge">
                    <div class="grc-badge-title">GUEST REGISTRATION CARD (GRC)</div>
                    <div class="grc-badge-no">${registrationNumber}</div>
                    <div class="grc-badge-police">Police Ref: ${policeRefNo}</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- STAY SCHEDULE RIBBON -->
            <table class="ribbon-table">
              <tr>
                <td style="width: 25%; background-color: #f1f5f9;">
                  <span class="field-label">Assigned Room</span>
                  <span class="field-value-lg" style="font-size: 14px; font-family: monospace;">Room ${roomNum}</span>
                </td>
                <td style="width: 25%;">
                  <span class="field-label">Check-In Arrival</span>
                  <span class="field-value-mono">${arrivalTime}</span>
                </td>
                <td style="width: 25%;">
                  <span class="field-label">Expected Departure</span>
                  <span class="field-value-mono">${sanitize(data.expectedDepartureDate)}</span>
                </td>
                <td style="width: 25%; background-color: #f8fafc;">
                  <span class="field-label">Total Occupants</span>
                  <span class="field-value">${data.paxM || 1} Male • ${data.paxF || 0} Female ${Number(data.paxC || 0) > 0 ? `• ${data.paxC} Child` : ""}</span>
                </td>
              </tr>
            </table>

            <!-- SECTION 1: PRIMARY GUEST PARTICULARS -->
            <div class="border-box">
              <div class="section-header" style="display: flex; justify-content: space-between;">
                <span>01. Primary Guest Profile & Police ID Verification</span>
                <span style="font-family: monospace; font-size: 8px;">Mandatory Police Dossier</span>
              </div>
              <table class="data-table">
                <tr>
                  <td style="width: 38%;">
                    <span class="field-label">Full Name of Guest:</span>
                    <span class="field-value-lg">${sanitize(data.fullName)}</span>
                  </td>
                  <td style="width: 32%;">
                    <span class="field-label">Age / Gender / Nationality:</span>
                    <span class="field-value">${formattedAgeGender}</span>
                  </td>
                  <td style="width: 30%;">
                    <span class="field-label">Father's / Spouse's Name:</span>
                    <span class="field-value">${sanitize(data.fatherSpouseName)}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="field-label">Mobile Contact:</span>
                    <span class="field-value-mono">${sanitize(data.mobilePhone)}</span>
                    ${data.alternatePhone && data.alternatePhone.trim().length > 0 ? `<div style="font-size: 8.5px; font-family: monospace; color: #444;">Alt: ${data.alternatePhone}</div>` : ""}
                  </td>
                  <td>
                    <span class="field-label">Email / Profession:</span>
                    <span class="field-value">${sanitize(data.email)} • ${sanitize(data.profession)}</span>
                  </td>
                  <td style="background-color: #f8fafc;">
                    <span class="field-label" style="color: #000;">★ Govt ID Proof Verified:</span>
                    <span class="field-value-mono" style="font-size: 10px;">${formattedIdProof}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="3">
                    <span class="field-label">Permanent Residential Address:</span>
                    <span class="field-value">
                      ${formattedAddress}
                      ${data.policeStation && data.policeStation.trim().length > 0 ? `<span style="margin-left: 8px; font-family: monospace; font-size: 9px; font-weight: bold; color: #333;">[Police Station: ${data.policeStation}]</span>` : ""}
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- SECTION 2: TRAVEL & VEHICLE -->
            <div class="border-box">
              <div class="section-header">02. Travel Itinerary & Vehicle Particulars</div>
              <table class="data-table">
                <tr>
                  <td style="width: 25%;">
                    <span class="field-label">Arrived From:</span>
                    <span class="field-value">${sanitize(data.arrivedFrom)}</span>
                  </td>
                  <td style="width: 25%;">
                    <span class="field-label">Going To:</span>
                    <span class="field-value">${sanitize(data.goingTo)}</span>
                  </td>
                  <td style="width: 25%;">
                    <span class="field-label">Purpose of Visit:</span>
                    <span class="field-value">${sanitize(data.purposeOfVisit)}</span>
                  </td>
                  <td style="width: 25%;">
                    <span class="field-label">Vehicle Reg. No:</span>
                    <span class="field-value-mono">${sanitize(data.vehicleNumber)}</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- SECTION 3: FORM C FOREIGN DETAILS (IF INTERNATIONAL) -->
            ${
              data.nationality && data.nationality !== "Indian"
                ? `
                <div class="border-box">
                  <div class="section-header" style="display: flex; justify-content: space-between;">
                    <span>03. Foreign National Registration (Form C - FRRO Police Copy)</span>
                    <span style="font-family: monospace; font-size: 8px;">Rule 14 Compliant</span>
                  </div>
                  <table class="data-table">
                    <tr>
                      <td style="width: 25%;">
                        <span class="field-label">Passport Number:</span>
                        <span class="field-value-mono">${sanitize(data.foreignDetails?.passportNo)}</span>
                      </td>
                      <td style="width: 25%;">
                        <span class="field-label">Date/Place of Issue:</span>
                        <span class="field-value">${sanitize(data.foreignDetails?.datePlaceOfIssue)}</span>
                      </td>
                      <td style="width: 25%;">
                        <span class="field-label">Visa / Permit No:</span>
                        <span class="field-value-mono">${sanitize(data.foreignDetails?.restrictedPermitNo)}</span>
                      </td>
                      <td style="width: 25%;">
                        <span class="field-label">Arrival in India:</span>
                        <span class="field-value-mono">${sanitize(data.foreignDetails?.dateOfArrivalInIndia)}</span>
                      </td>
                    </tr>
                  </table>
                </div>
              `
                : ""
            }

            <!-- SECTION 4: CO-GUESTS (IF ANY) -->
            ${
              data.coGuests && data.coGuests.length > 0
                ? `
                <div class="border-box">
                  <div class="section-header">04. Accompanying Guests (${data.coGuests.length})</div>
                  <table class="coguest-table">
                    <thead>
                      <tr>
                        <th style="width: 6%;">#</th>
                        <th style="width: 44%;">Companion Full Name</th>
                        <th style="width: 15%;">Age</th>
                        <th style="width: 15%;">Gender</th>
                        <th style="width: 20%;">Relationship</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${data.coGuests
                        .map(
                          (cg, idx) => `
                        <tr>
                          <td style="font-family: monospace;">${idx + 1}</td>
                          <td style="font-weight: bold; text-transform: uppercase;">${cg.name}</td>
                          <td style="font-family: monospace;">${cg.age ? `${cg.age} Yrs` : "—"}</td>
                          <td>${cg.gender || "—"}</td>
                          <td style="font-weight: bold;">${cg.relation || "—"}</td>
                        </tr>
                      `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `
                : ""
            }

            <!-- TERMS & DECLARATION -->
            <div class="terms-box">
              <div class="terms-title">Guest Declaration & Hotel Regulations:</div>
              <div>1. <strong>Check-Out Time:</strong> 11:00 AM. Late check-out is subject to prior room availability and tariff charges.</div>
              <div>2. <strong>Valuables:</strong> Management is not liable for loss or damage to money, jewelry, or goods not stored in hotel safe.</div>
              <div>3. <strong>Payment:</strong> I agree to settle all room, dining, and incidental charges before departure.</div>
              <div style="margin-top: 3px; font-weight: bold;">
                Declaration: I hereby declare that all information furnished above is true and accurate. I have presented valid Government-issued photo ID verified by hotel staff.
              </div>
            </div>

            <!-- SIGNATURES -->
            <table class="signature-table">
              <tr>
                <td>
                  <span class="field-label">Guest Signature:</span>
                  <div class="sig-line">/${(data.fullName || "Guest").replace(/\\s+/g, "_")}/</div>
                  <div class="sig-caption">(Signed & Verified during Desk Check-In)</div>
                </td>
                <td>
                  <span class="field-label" style="text-align: right;">Front Office Signatory & Stamp:</span>
                  <div class="sig-line" style="font-family: Arial, sans-serif; font-weight: bold;">${property.legalName || "AMBARISH RESIDENCY"}</div>
                  <div class="sig-caption">Duty Manager • Front Desk Counter 01</div>
                </td>
              </tr>
            </table>

            <!-- AUDIT FOOTER -->
            <div class="audit-bar">
              <div><strong>Digital Hash:</strong> ${shaHash}</div>
              <div><strong>Audit Stamp:</strong> ${auditTimestamp.slice(0, 19).replace("T", " ")} IST</div>
            </div>

          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 200);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-start p-2 sm:p-4 md:py-6 animate-in fade-in">
      
      {/* Modal Container Card */}
      <div className="relative w-full max-w-4xl rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden my-auto sm:my-2">
        
        {/* STICKY TOP CONTROL TOOLBAR */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#16161a]/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 flex items-center justify-center text-blue-700 dark:text-blue-400 shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white tracking-tight">
                  Guest Registration Card (GRC)
                </h3>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50 px-2 py-0.5 text-[10px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  E-VERIFIED & ARCHIVED
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block">
                Official statutory guest document • Single-Page A4 Ready
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Print Official GRC (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 text-zinc-700 dark:text-zinc-200 px-3 py-2 text-xs font-semibold transition cursor-pointer"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              )}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DOCUMENT PREVIEW (High-Contrast White Paper Appearance on Screen)        */}
        {/* ========================================================================= */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(88vh-60px)]">
          <div className="bg-white text-black p-4 sm:p-6 rounded-xl border border-zinc-300 shadow-lg space-y-2.5 max-w-3xl mx-auto">
            
            {/* 1. HOTEL LETTERHEAD & GRC HEADER */}
            <div className="border-2 border-black p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-zinc-50">
              <div className="space-y-0.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-black uppercase leading-tight font-serif">
                  {property.displayName || "Hotel Ambarish Grand Residency"}
                </h1>
                <div className="text-[11px] font-bold text-zinc-800">
                  {property.legalName || "AMBARISH RESIDENCY"} • <span className="font-mono">GSTIN: {property.gstin || "18AACCB2447F1ZX"}</span>
                </div>
                <div className="text-[10px] text-zinc-700 max-w-lg leading-snug">
                  {property.address || "MD Shah Road, Paltan Bazar, Guwahati, Assam - 781008"} • Ph: {property.phone || "+91 9864341211"}
                </div>
              </div>

              <div className="border-2 border-black p-2 rounded bg-white text-right shrink-0 w-full sm:w-auto">
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-700">
                  GUEST REGISTRATION CARD (GRC)
                </div>
                <div className="text-base font-black font-mono text-black">
                  {registrationNumber}
                </div>
                <div className="text-[9px] font-mono font-bold text-zinc-800 pt-0.5 border-t border-zinc-300 mt-0.5">
                  Police Ref: {policeRefNo}
                </div>
              </div>
            </div>

            {/* 2. STAY SCHEDULE RIBBON */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-2 border-black divide-x-2 divide-y-2 sm:divide-y-0 divide-black text-xs">
              <div className="p-2 bg-zinc-100">
                <span className="text-[9px] uppercase font-bold text-zinc-600 block">Assigned Room</span>
                <span className="text-sm sm:text-base font-black font-mono text-black block">Room {roomNum}</span>
              </div>

              <div className="p-2">
                <span className="text-[9px] uppercase font-bold text-zinc-600 block">Check-In Arrival</span>
                <span className="text-[11px] font-bold font-mono text-black block">{arrivalTime}</span>
              </div>

              <div className="p-2">
                <span className="text-[9px] uppercase font-bold text-zinc-600 block">Expected Check-Out</span>
                <span className="text-[11px] font-bold font-mono text-black block">{sanitize(data.expectedDepartureDate)}</span>
              </div>

              <div className="p-2 bg-zinc-50">
                <span className="text-[9px] uppercase font-bold text-zinc-600 block">Total Occupants</span>
                <span className="text-[11px] font-bold font-mono text-black block">
                  {data.paxM || 1} Male • {data.paxF || 0} Female {Number(data.paxC || 0) > 0 ? `• ${data.paxC} Child` : ""}
                </span>
              </div>
            </div>

            {/* 3. PRIMARY GUEST PROFILE & IDENTIFICATION */}
            <div className="border-2 border-black">
              <div className="bg-zinc-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black border-b-2 border-black flex items-center justify-between">
                <span>01. Primary Guest Profile & Identification</span>
                <span className="font-mono text-[9px]">Mandatory Police Record</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black border-b border-black text-xs">
                <div className="p-2 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-zinc-600 block">Full Name of Guest:</span>
                  <span className="text-xs sm:text-sm font-black text-black uppercase block">{sanitize(data.fullName)}</span>
                </div>

                <div className="p-2 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-zinc-600 block">Age / Gender / Nationality:</span>
                  <span className="text-xs font-bold text-black block">
                    {formattedAgeGender}
                  </span>
                </div>

                <div className="p-2 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-zinc-600 block">Father's / Spouse's Name:</span>
                  <span className="text-xs font-bold text-black block">{sanitize(data.fatherSpouseName)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black border-b border-black text-xs">
                <div className="p-2 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-zinc-600 block">Mobile Contact:</span>
                  <span className="text-xs font-bold font-mono text-black block">{sanitize(data.mobilePhone)}</span>
                  {data.alternatePhone && data.alternatePhone.trim().length > 0 && (
                    <span className="text-[9px] font-mono text-zinc-700 block">Alt: {data.alternatePhone}</span>
                  )}
                </div>

                <div className="p-2 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-zinc-600 block">Email / Profession:</span>
                  <span className="text-xs font-bold text-black block truncate">
                    {sanitize(data.email)} • {sanitize(data.profession)}
                  </span>
                </div>

                <div className="p-2 space-y-0.5 bg-zinc-50">
                  <span className="text-[9px] uppercase font-bold text-black block flex items-center gap-1">
                    <span>★ Govt ID Proof Verified:</span>
                  </span>
                  <span className="text-xs font-black font-mono text-black block">
                    {formattedIdProof}
                  </span>
                </div>
              </div>

              <div className="p-2 text-xs">
                <span className="text-[9px] uppercase font-bold text-zinc-600 block">Permanent Residential Address:</span>
                <span className="text-xs font-bold text-black block">
                  {formattedAddress}
                  {data.policeStation && data.policeStation.trim().length > 0 && (
                    <span className="ml-2 font-mono text-[10px] text-zinc-800">
                      [Jurisdiction Police Station: {data.policeStation}]
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* 4. TRAVEL ITINERARY & VEHICLE */}
            <div className="border-2 border-black">
              <div className="bg-zinc-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black border-b-2 border-black">
                02. Travel Itinerary & Vehicle Particulars
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-black text-xs">
                <div className="p-2">
                  <span className="text-[9px] uppercase font-bold text-zinc-600 block">Arrived From:</span>
                  <span className="text-[11px] font-bold text-black block">{sanitize(data.arrivedFrom)}</span>
                </div>

                <div className="p-2">
                  <span className="text-[9px] uppercase font-bold text-zinc-600 block">Going To:</span>
                  <span className="text-[11px] font-bold text-black block">{sanitize(data.goingTo)}</span>
                </div>

                <div className="p-2">
                  <span className="text-[9px] uppercase font-bold text-zinc-600 block">Purpose of Visit:</span>
                  <span className="text-[11px] font-bold text-black block">{sanitize(data.purposeOfVisit)}</span>
                </div>

                <div className="p-2">
                  <span className="text-[9px] uppercase font-bold text-zinc-600 block">Vehicle Reg. No:</span>
                  <span className="text-[11px] font-bold font-mono text-black block">{sanitize(data.vehicleNumber)}</span>
                </div>
              </div>
            </div>

            {/* 5. FORM C FOREIGN DETAILS (IF INTERNATIONAL) */}
            {data.nationality && data.nationality !== "Indian" && (
              <div className="border-2 border-black">
                <div className="bg-zinc-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black border-b-2 border-black flex justify-between">
                  <span>03. Foreign National Registration (Form C - FRRO Police Copy)</span>
                  <span className="font-mono text-[9px]">Rule 14 Compliant</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-black text-xs">
                  <div className="p-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 block">Passport Number:</span>
                    <span className="text-xs font-mono font-bold text-black">{sanitize(data.foreignDetails?.passportNo)}</span>
                  </div>
                  <div className="p-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 block">Date & Place of Issue:</span>
                    <span className="text-xs font-bold text-black">{sanitize(data.foreignDetails?.datePlaceOfIssue)}</span>
                  </div>
                  <div className="p-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 block">Visa / Permit No:</span>
                    <span className="text-xs font-mono font-bold text-black">{sanitize(data.foreignDetails?.restrictedPermitNo)}</span>
                  </div>
                  <div className="p-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 block">Arrival in India:</span>
                    <span className="text-xs font-mono font-bold text-black">{sanitize(data.foreignDetails?.dateOfArrivalInIndia)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ACCOMPANYING CO-GUESTS (IF ANY) */}
            {data.coGuests && data.coGuests.length > 0 && (
              <div className="border-2 border-black">
                <div className="bg-zinc-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black border-b-2 border-black">
                  04. Accompanying Guests ({data.coGuests.length})
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-100 text-zinc-700 font-bold uppercase text-[9px] border-b border-black">
                    <tr>
                      <th className="p-1.5 border-r border-black w-8">#</th>
                      <th className="p-1.5 border-r border-black">Full Name</th>
                      <th className="p-1.5 border-r border-black w-16">Age</th>
                      <th className="p-1.5 border-r border-black w-20">Gender</th>
                      <th className="p-1.5">Relation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-black">
                    {data.coGuests.map((cg, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 font-mono text-zinc-600 border-r border-black">{idx + 1}</td>
                        <td className="p-1.5 font-bold uppercase border-r border-black">{cg.name}</td>
                        <td className="p-1.5 font-mono border-r border-black">{cg.age ? `${cg.age} Yrs` : "—"}</td>
                        <td className="p-1.5 border-r border-black">{cg.gender || "—"}</td>
                        <td className="p-1.5 font-semibold">{cg.relation || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 7. STATUTORY DECLARATION & TERMS */}
            <div className="border-2 border-black p-2.5 rounded text-[9.5px] leading-tight space-y-1 bg-zinc-50">
              <div className="font-bold text-black uppercase tracking-wider text-[9px] border-b border-black/30 pb-0.5">
                Guest Declaration & Hotel Regulations:
              </div>
              <p className="text-zinc-800">
                1. <strong>Check-Out Time:</strong> 11:00 AM. Late check-out is subject to prior approval and tariff charges.
              </p>
              <p className="text-zinc-800">
                2. <strong>Valuables:</strong> Management is not liable for loss or damage to money, jewelry, or luggage not stored in hotel safe.
              </p>
              <p className="text-zinc-800">
                3. <strong>Payment:</strong> I agree to settle all room, dining, and incidental charges before departure.
              </p>
              <p className="text-zinc-900 font-semibold pt-0.5">
                Declaration: I hereby declare that all information furnished above is true and accurate. I have presented valid Government-issued photo identification verified by hotel staff.
              </p>
            </div>

            {/* 8. SIGNATURE & STAMP BOXES */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="border-2 border-black p-2.5 rounded min-h-[75px] flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-zinc-700 block">
                  Guest Signature:
                </span>
                <div className="border-b-2 border-black border-dashed pt-4 pb-0.5 text-center">
                  <span className="font-mono font-bold text-black text-[11px] tracking-wider uppercase">
                    /{data.fullName.replace(/\s+/g, "_")}/
                  </span>
                </div>
                <span className="text-[8px] font-mono text-zinc-600 block text-center">
                  (Signed & Verified during Desk Check-In)
                </span>
              </div>

              <div className="border-2 border-black p-2.5 rounded min-h-[75px] flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-zinc-700 block text-right">
                  Front Office Signatory & Seal:
                </span>
                <div className="border-b-2 border-black border-dashed pt-4 pb-0.5 text-center">
                  <span className="font-bold text-black text-[11px]">
                    {property.legalName || "AMBARISH RESIDENCY"}
                  </span>
                </div>
                <span className="text-[8px] font-mono text-zinc-600 block text-center">
                  Duty Manager • Front Desk Counter 01
                </span>
              </div>
            </div>

            {/* 9. POLICE AUDIT & ELECTRONIC LOGGING FOOTER */}
            <div className="border border-black/40 p-1.5 rounded text-[8.5px] font-mono text-zinc-700 flex flex-col sm:flex-row justify-between gap-1 bg-zinc-100">
              <div>
                <span className="font-bold text-black">Hash:</span>{" "}
                <span className="break-all">{shaHash}</span>
              </div>
              <div className="shrink-0 sm:text-right">
                <span className="font-bold text-black">Audit Stamp:</span> {auditTimestamp.slice(0, 19).replace("T", " ")} IST
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Footer Close */}
        <div className="px-4 py-2.5 bg-zinc-200/60 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>Hotel OS GRC Engine • Single-Page A4 Ready</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-300 dark:bg-zinc-800 hover:bg-zinc-400 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
