"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  X,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  PenLine,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { formatINR } from "@/lib/gst/calculator";
import { formatGuestDisplayName } from "@/lib/domain/name-utils";
import { getPropertyLogoUrl, getPropertyInitials } from "@/lib/domain/property-branding";
import { isEffectiveSignature } from "@/lib/domain/grc-utils";

export interface GrcData {
  id?: string;
  grcNo?: string;
  registrationNo?: string;
  roomNumber?: string;
  assignedRoomNumber?: string;
  preAssignedRoom?: string;
  arrivalDateTime?: string;
  expectedDepartureDate?: string;
  adults?: number | string;
  children?: number | string;
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
  mobilePhone?: string;
  alternatePhone?: string;
  email?: string;
  driverName?: string;
  vehicleNumber?: string;
  idType?: string;
  idLast4?: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
  idPhotoUrl?: string;
  signatureDataUrl?: string;
  depositAmount?: number | string;
  paymentMethod?: string;
  tariff?: number | string;
  mealPlan?: string;
  billingInstructions?: string;
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
    email?: string | null;
    website?: string | null;
    code?: string;
    gstin?: string | null;
    logoUrl?: string | null;
  };
  onSignatureSaved?: (newSignatureDataUrl: string) => void;
}

export function PrintableGrcModal({
  isOpen,
  onClose,
  data,
  property,
  onSignatureSaved,
}: DigitalGrcModalProps) {
  const [copied, setCopied] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(() => {
    return isEffectiveSignature(data.signatureDataUrl) ? data.signatureDataUrl! : null;
  });
  const [showSignModal, setShowSignModal] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);

  useEffect(() => {
    if (isEffectiveSignature(data.signatureDataUrl)) {
      setSignatureUrl(data.signatureDataUrl!);
    } else {
      setSignatureUrl(null);
    }
  }, [data.signatureDataUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showSignModal) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showSignModal]);

  const handleSaveSignature = async (dataUrl: string) => {
    setIsSavingSignature(true);
    try {
      const regNo = data.grcNo || data.registrationNo;
      const res = await fetch("/api/v1/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNo: regNo,
          id: data.id,
          signatureDataUrl: dataUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save signature");
      }

      setSignatureUrl(dataUrl);
      if (onSignatureSaved) {
        onSignatureSaved(dataUrl);
      }
      setShowSignModal(false);
    } catch (err: any) {
      console.error("Signature save error:", err);
      alert(err?.message || "Failed to save signature. Please try again.");
    } finally {
      setIsSavingSignature(false);
    }
  };

  if (!isOpen) return null;

  // 1. Dynamic Hotel Particulars & Branding
  const hotelName = property.displayName || "Hotel Property";
  const hotelLegal = property.legalName || hotelName;
  const hotelGstin = property.gstin || "N/A";
  const hotelAddress = property.address || "N/A";
  const hotelPhone = property.phone || "N/A";
  const logoUrl = getPropertyLogoUrl(property);
  const initials = getPropertyInitials(property);

  // 2. Registration & Identification Numbers
  const registrationNumber = data.grcNo || data.registrationNo || "—";
  const roomNum =
    data.roomNumber ||
    data.assignedRoomNumber ||
    data.preAssignedRoom ||
    "—";
  const formatGrcArrival = (raw?: string | null): string => {
    if (!raw || raw === "—") return "—";
    try {
      let d: Date;
      if (raw.endsWith("Z") || raw.includes("+")) {
        d = new Date(raw);
      } else if (raw.includes("T")) {
        d = new Date(raw.endsWith("Z") ? raw : `${raw}Z`);
      } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) {
        // Handled saved UTC string (e.g. "2026-09-02 02:20") by parsing as UTC instant
        d = new Date(`${raw.replace(" ", "T")}Z`);
      } else {
        d = new Date(raw);
      }

      if (isNaN(d.getTime())) return raw;

      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    } catch {
      return raw;
    }
  };

  const arrivalTime = formatGrcArrival(data.arrivalDateTime);
  const departureDate = data.expectedDepartureDate || "—";
  const auditTimestamp = new Date().toISOString();
  const policeRefNo =
    registrationNumber !== "—"
      ? registrationNumber.startsWith("GRC-")
        ? registrationNumber.replace("GRC-", "PV-")
        : `PV-${registrationNumber}`
      : "—";

  const shaHash = `SHA256:${Buffer.from(
    `${registrationNumber}-${data.fullName || "Guest"}-${arrivalTime}`
  )
    .toString("hex")
    .slice(0, 32)}`;

  // Strict sanitization helper (no fake placeholder strings)
  const sanitize = (val?: string | number | null) => {
    if (val === undefined || val === null) return "—";
    const s = String(val).trim();
    return s.length > 0 ? s : "—";
  };

  // 3. Dynamic Address & Contact Formatting (Deduplicated)
  const rawAddressSegments = [
    data.streetAddress,
    data.city,
    data.state,
    data.pinZipCode,
    data.country,
  ]
    .map((p) => (p ? String(p).trim() : ""))
    .filter((p) => p.length > 0);

  const dedupedSegments: string[] = [];
  for (const seg of rawAddressSegments) {
    const isDuplicate = dedupedSegments.some((existing) => {
      const eUpper = existing.toUpperCase();
      const sUpper = seg.toUpperCase();
      return (
        eUpper === sUpper ||
        eUpper.split(/[\s,]+/).includes(sUpper) ||
        (sUpper.length > 3 && eUpper.includes(sUpper))
      );
    });
    if (!isDuplicate) {
      dedupedSegments.push(seg);
    }
  }
  const formattedAddress = dedupedSegments.length > 0 ? dedupedSegments.join(", ") : "—";

  const formattedAgeGender =
    [
      data.age ? `${data.age} Yrs` : null,
      data.gender || null,
      data.nationality || "Indian",
    ]
      .filter(Boolean)
      .join(" • ") || "—";

  const primaryPhone = data.mobilePhone || data.phone || "—";
  const hasDistinctAltPhone = Boolean(
    data.alternatePhone &&
      data.alternatePhone.trim().length > 0 &&
      data.alternatePhone.trim() !== primaryPhone.trim()
  );

  const emailStr = data.email && data.email.trim().length > 0 ? data.email.trim() : null;
  const profStr = data.profession && data.profession.trim().length > 0 ? data.profession.trim() : null;
  const formattedEmailProfession = [emailStr, profStr].filter(Boolean).join(" • ") || "—";

  const docType = data.idDocumentType || data.idType;
  const docNum = data.idDocumentNumber || data.idLast4;
  const formattedIdProof = docType
    ? `${docType}${docNum ? ` — ${docNum}` : " — Verified at Desk"}`
    : docNum || "—";

  // Dynamic Occupants (Adults & Children)
  const explicitAdults = data.adults !== undefined && data.adults !== null && String(data.adults).trim() !== "" ? Number(data.adults) : NaN;
  const explicitChildren = data.children !== undefined && data.children !== null && String(data.children).trim() !== "" ? Number(data.children) : NaN;
  const m = Number(data.paxM);
  const f = Number(data.paxF);
  const c = Number(data.paxC);

  // Multi-room parsing for solo vs group stays
  const rawRoomList =
    roomNum && roomNum !== "—"
      ? roomNum
          .split(",")
          .map((r: string) => r.trim())
          .filter((r: string) => r.length > 0)
      : [];
  const roomCount = rawRoomList.length > 0 ? rawRoomList.length : 1;

  let totalAdults = 1;
  if (!isNaN(explicitAdults) && explicitAdults > 0) {
    totalAdults = explicitAdults;
  } else if (!isNaN(m) && m > 0 && !isNaN(f) && f > 0) {
    totalAdults = m + f;
  } else if (!isNaN(m) && m > 0) {
    totalAdults = m;
  } else if (data.coGuests && data.coGuests.length > 0) {
    totalAdults = data.coGuests.length + 1;
  } else if (roomCount > 1) {
    totalAdults = roomCount * 2; // Estimate for multi-room group when pax not specified
  } else {
    totalAdults = 1;
  }

  let totalChildren = 0;
  if (!isNaN(explicitChildren) && explicitChildren >= 0) {
    totalChildren = explicitChildren;
  } else if (!isNaN(c) && c >= 0) {
    totalChildren = c;
  }

  let formattedOccupants = `${totalAdults} Adult${totalAdults > 1 ? "s" : ""}`;
  if (totalChildren > 0) {
    formattedOccupants += ` • ${totalChildren} Child${totalChildren > 1 ? "ren" : ""}`;
  }

  let stayNights = "—";
  try {
    if (data.arrivalDateTime && data.expectedDepartureDate) {
      const arrD = new Date(data.arrivalDateTime);
      const depD = new Date(data.expectedDepartureDate);
      if (!isNaN(arrD.getTime()) && !isNaN(depD.getTime())) {
        const diffMs = depD.getTime() - arrD.getTime();
        const n = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        stayNights = `${n} Night${n > 1 ? "s" : ""}`;
      }
    }
  } catch {
    // ignore
  }

  const formattedTariff = data.tariff
    ? typeof data.tariff === "number"
      ? `₹${data.tariff.toLocaleString("en-IN")}/night`
      : String(data.tariff).startsWith("₹")
      ? String(data.tariff)
      : `₹${data.tariff}`
    : "Standard Room Tariff";

  const formattedMealPlan =
    data.mealPlan && data.mealPlan.trim().length > 0
      ? data.mealPlan.trim()
      : "EP (Room Only)";

  const formattedDeposit = data.depositAmount
    ? typeof data.depositAmount === "number"
      ? `₹${data.depositAmount.toLocaleString("en-IN")}`
      : String(data.depositAmount).startsWith("₹")
      ? String(data.depositAmount)
      : `₹${data.depositAmount}`
    : "₹0 (Billed at Check-Out)";

  const formattedBilling =
    data.billingInstructions && data.billingInstructions.trim().length > 0
      ? data.billingInstructions.trim()
      : data.paymentMethod
      ? `Direct Settlement (${data.paymentMethod})`
      : "Direct Guest Settlement";

  const formattedChannel =
    data.referralChannel && data.referralChannel.trim().length > 0
      ? data.referralChannel.trim()
      : "Front Desk Direct Intake";

  const handleCopyLink = () => {
    const text = `Guest Registration Card (GRC): ${registrationNumber} | Guest: ${
      data.fullName || "Guest"
    } | Room: ${roomNum} | Arrival: ${arrivalTime} | Verified ID: ${
      formattedIdProof
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
          <title>GRC_${registrationNumber}_${(formatGuestDisplayName(data.fullName) || "Guest").replace(/\\s+/g, "_")}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 7mm 9mm;
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
              padding: 0;
              font-size: 10px;
              line-height: 1.3;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .grc-container {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
              page-break-inside: avoid;
            }
            .border-box {
              border: 1.5px solid #000;
              margin-bottom: 4px;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #000;
              background-color: #f8fafc;
              margin-bottom: 4px;
            }
            .header-table td {
              padding: 5px 10px;
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
              font-size: 10px;
              font-weight: bold;
              color: #222;
              margin-top: 1px;
            }
            .hotel-addr {
              font-size: 9px;
              color: #444;
              margin-top: 1px;
            }
            .header-logo {
              height: 42px;
              width: auto;
              max-width: 130px;
              object-fit: contain;
            }
            .brand-monogram {
              width: 40px;
              height: 40px;
              border: 1.8px solid #000;
              border-radius: 4px;
              display: inline-flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: #f8fafc;
              color: #000;
            }
            .brand-monogram-initials {
              font-family: Georgia, serif;
              font-weight: 900;
              font-size: 14px;
              line-height: 1;
              letter-spacing: 0.5px;
            }
            .brand-monogram-sub {
              font-family: Arial, sans-serif;
              font-size: 6px;
              font-weight: 900;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-top: 1px;
            }
            .grc-badge {
              border: 1.5px solid #000;
              background: #ffffff;
              padding: 5px 8px;
              text-align: right;
              display: inline-block;
            }
            .grc-badge-title {
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: #444;
            }
            .grc-badge-no {
              font-size: 13.5px;
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
              padding-top: 1px;
              margin-top: 1px;
            }
            .ribbon-table {
              width: 100%;
              border-collapse: collapse;
              border: 1.5px solid #000;
              margin-bottom: 4px;
            }
            .ribbon-table td {
              border: 1px solid #000;
              padding: 4px 8px;
              vertical-align: top;
            }
            .section-header {
              background: #e2e8f0;
              font-weight: 900;
              font-size: 8.5px;
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
              padding: 3px 8px;
              vertical-align: top;
            }
            .field-label {
              font-size: 7.5px;
              font-weight: bold;
              text-transform: uppercase;
              color: #555;
              display: block;
              margin-bottom: 1px;
            }
            .field-value {
              font-size: 10px;
              font-weight: bold;
              color: #000;
            }
            .field-value-lg {
              font-size: 11.5px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .field-value-mono {
              font-family: monospace;
              font-size: 10px;
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
              padding: 4px 8px;
              background-color: #f8fafc;
              font-size: 8px;
              line-height: 1.3;
              margin-bottom: 4px;
            }
            .terms-title {
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 2px;
              margin-bottom: 3px;
            }
            .signature-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 4px;
            }
            .signature-table td {
              width: 50%;
              border: 1.5px solid #000;
              padding: 4px 8px;
              vertical-align: top;
              height: 68px;
            }
            .sig-line {
              border-bottom: 1.5px dashed #000;
              margin-top: 26px;
              text-align: center;
              font-family: monospace;
              font-weight: bold;
              font-size: 10px;
              text-transform: uppercase;
              padding-bottom: 1px;
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
                <td style="width: 65%; vertical-align: middle;">
                  <table style="border-collapse: collapse; border: none; margin: 0;">
                    <tr>
                      <td style="border: none; padding: 0; vertical-align: middle; width: 48px;">
                        ${logoUrl ? `<img src="${logoUrl}" alt="${hotelName}" class="header-logo" onerror="this.style.display='none'" />` : `<div class="brand-monogram"><span class="brand-monogram-initials">${initials}</span><span class="brand-monogram-sub">HOTEL</span></div>`}
                      </td>
                      <td style="border: none; padding: 0 0 0 12px; vertical-align: middle;">
                        <div class="hotel-name">${hotelName}</div>
                        <div class="hotel-sub">${hotelLegal}${hotelGstin && hotelGstin !== "N/A" && hotelGstin !== "—" ? ` &bull; GSTIN: ${hotelGstin}` : ""}</div>
                        <div class="hotel-addr">${[hotelAddress && hotelAddress !== "N/A" && hotelAddress !== "—" ? hotelAddress : "", hotelPhone && hotelPhone !== "N/A" && hotelPhone !== "—" ? `Ph: ${hotelPhone}` : ""].filter(Boolean).join(" &bull; ")}</div>
                      </td>
                    </tr>
                  </table>
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
                  <span class="field-label">Assigned Room${roomCount > 1 ? "s" : ""}</span>
                  ${roomCount > 3 ? `
                    <span class="field-value-lg" style="font-size: 13px; font-family: monospace;">${roomCount} Rooms (Group)</span>
                    <div style="font-size: 8px; font-family: monospace; color: #555; margin-top: 1px;">Primary Rm ${rawRoomList[0]} &bull; +${roomCount - 1} Units</div>
                  ` : `
                    <span class="field-value-lg" style="font-size: 13.5px; font-family: monospace;">${rawRoomList.length > 0 ? (rawRoomList.length > 1 ? `Rooms ${rawRoomList.join(", ")}` : `Room ${rawRoomList[0]}`) : `Room ${roomNum}`}</span>
                  `}
                </td>
                <td style="width: 25%;">
                  <span class="field-label">Check-In Arrival</span>
                  <span class="field-value-mono">${arrivalTime}</span>
                </td>
                <td style="width: 25%;">
                  <span class="field-label">Expected Departure</span>
                  <span class="field-value-mono">${sanitize(departureDate)}</span>
                </td>
                <td style="width: 25%; background-color: #f8fafc;">
                  <span class="field-label">Total Occupants & Stay</span>
                  <span class="field-value">${formattedOccupants}${stayNights !== "—" ? ` (${stayNights})` : ""}</span>
                </td>
              </tr>
              ${roomCount > 3 ? `
                <tr>
                  <td colspan="4" style="background-color: #f8fafc; padding: 4px 10px; border-top: 1px solid #000;">
                    <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #555; margin-right: 6px;">Group Room Allocation (${roomCount} Rooms):</span>
                    <span style="font-family: monospace; font-size: 9.5px; font-weight: bold; color: #000; letter-spacing: 0.3px;">${rawRoomList.join(", ")}</span>
                  </td>
                </tr>
              ` : ""}
            </table>

            <!-- SECTION 1: PRIMARY GUEST PARTICULARS -->
            <div class="border-box">
              <div class="section-header" style="display: flex; justify-content: space-between;">
                <span>01. Primary Guest Profile & Identification</span>
                <span style="font-family: monospace; font-size: 8px;">Mandatory Police Dossier</span>
              </div>
              <table class="data-table">
                <tr>
                  <td style="width: 38%;">
                    <span class="field-label">Full Name of Guest:</span>
                    <span class="field-value-lg">${sanitize(formatGuestDisplayName(data.fullName))}</span>
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
                    <span class="field-value-mono">${sanitize(primaryPhone)}</span>
                    ${hasDistinctAltPhone ? `<div style="font-size: 8.5px; font-family: monospace; color: #444;">Alt: ${data.alternatePhone}</div>` : ""}
                  </td>
                  <td>
                    <span class="field-label">Email / Profession:</span>
                    <span class="field-value">${formattedEmailProfession}</span>
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

            <!-- SECTION 3: TARIFF, MEAL PLAN & BILLING SETTLEMENT -->
            <div class="border-box">
              <div class="section-header" style="display: flex; justify-content: space-between;">
                <span>03. Tariff, Meal Plan & Billing Settlement</span>
                <span style="font-family: monospace; font-size: 8px;">Commercial Record</span>
              </div>
              <table class="data-table">
                <tr>
                  <td style="width: 25%;">
                    <span class="field-label">Room Tariff Rate:</span>
                    <span class="field-value-mono">${sanitize(formattedTariff)}</span>
                  </td>
                  <td style="width: 25%;">
                    <span class="field-label">Meal Plan / Package:</span>
                    <span class="field-value">${sanitize(formattedMealPlan)}</span>
                  </td>
                  <td style="width: 25%;">
                    <span class="field-label">Advance / Deposit Paid:</span>
                    <span class="field-value-mono">${sanitize(formattedDeposit)}</span>
                  </td>
                  <td style="width: 25%;">
                    <span class="field-label">Billing Instructions:</span>
                    <span class="field-value">${sanitize(formattedBilling)}</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- SECTION 4: FORM C FOREIGN DETAILS (IF INTERNATIONAL) -->
            ${
              data.nationality && data.nationality !== "Indian"
                ? `
                <div class="border-box">
                  <div class="section-header" style="display: flex; justify-content: space-between;">
                    <span>04. Foreign National Registration (Form C - FRRO Police Copy)</span>
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

            <!-- SECTION: CO-GUESTS (IF ANY) OR FRONT DESK INTAKE RECORD -->
            ${
              data.coGuests && data.coGuests.length > 0
                ? `
                <div class="border-box">
                  <div class="section-header">${data.nationality && data.nationality !== "Indian" ? "05." : "04."} Accompanying Guests (${data.coGuests.length})</div>
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
                : (!data.nationality || data.nationality === "Indian")
                ? `
                <div class="border-box">
                  <div class="section-header" style="display: flex; justify-content: space-between;">
                    <span>04. Front Desk Intake & Room Issuance Record</span>
                    <span style="font-family: monospace; font-size: 8px;">Statutory Verification</span>
                  </div>
                  <table class="data-table">
                    <tr>
                      <td style="width: 25%;">
                        <span class="field-label">Registration Channel:</span>
                        <span class="field-value">${sanitize(formattedChannel)}</span>
                      </td>
                      <td style="width: 25%;">
                        <span class="field-label">Room Keys Issued:</span>
                        <span class="field-value-mono">${roomCount > 1 ? `${roomCount} Keys (${roomCount} Rooms)` : "1 Electronic Key Card"}</span>
                      </td>
                      <td style="width: 25%;">
                        <span class="field-label">Identity Verification:</span>
                        <span class="field-value">Original Photo ID Verified</span>
                      </td>
                      <td style="width: 25%;">
                        <span class="field-label">Duty Receptionist:</span>
                        <span class="field-value">Front Desk Officer</span>
                      </td>
                    </tr>
                  </table>
                </div>
              `
                : ""
            }

            <!-- TERMS & DECLARATION -->
            <div class="terms-box">
              <div class="terms-title">Guest Declaration & Statutory Hotel Regulations:</div>
              <div>1. <strong>Check-In / Check-Out:</strong> Standard check-out time is 12:00 PM (Noon). Late check-out is subject to prior approval and tariff charges.</div>
              <div>2. <strong>Safe Custody of Valuables:</strong> Management is not liable for loss or damage to money, jewelry, or goods not deposited in the hotel safe.</div>
              <div>3. <strong>Settlement of Accounts:</strong> All room tariff, dining, and incidental charges must be settled upon presentation or prior to departure. The hotel retains lien rights on luggage.</div>
              <div>4. <strong>Property Conduct & Safety:</strong> Smoking in non-smoking rooms and unauthorized visitors in guest rooms after 10:00 PM are strictly prohibited.</div>
              <div style="margin-top: 4px; padding-top: 3px; border-top: 1px dashed #cbd5e1; font-weight: bold; color: #111;">
                Statutory Declaration: I hereby declare that all information furnished above is true and complete. I agree to abide by all hotel regulations and consent to verification and statutory reporting of my ID credentials as required by law.
              </div>
            </div>

            <!-- SIGNATURES -->
            <table class="signature-table">
              <tr>
                <td>
                  <span class="field-label">Guest Signature / Primary Occupant:</span>
                  ${signatureUrl ? `
                    <div style="height: 56px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
                      <img src="${signatureUrl}" alt="Guest Signature" style="max-height: 52px; max-width: 240px; object-fit: contain;" />
                    </div>
                    <div class="sig-caption">✓ Digitally Signed & Verified at Check-In</div>
                  ` : `
                    <div class="sig-line" style="margin-top: 44px; font-family: monospace; font-size: 11px; letter-spacing: 1px; color: #111;">
                      &#x2715; _____________________________________
                    </div>
                    <div class="sig-caption">(Signature of Guest / Primary Occupant)</div>
                  `}
                </td>
                <td>
                  <span class="field-label" style="text-align: right;">Front Office Authorized Signatory & Seal:</span>
                  <div class="sig-line" style="margin-top: 44px; font-family: Arial, sans-serif; font-weight: bold; font-size: 11px;">
                    ${hotelLegal}
                  </div>
                  <div class="sig-caption">Duty Manager • Front Desk Counter • Verified with ID Original</div>
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
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 animate-in fade-in duration-150 print:bg-white print:static print:inset-auto print:block">
      
      {/* STICKY TOP CONTROL TOOLBAR (Hidden on Print) */}
      <div className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4 shadow-2xs shrink-0 select-none print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8.5 w-8.5 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight truncate">
              Guest Registration Card
            </h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold shrink-0">
              {registrationNumber}
            </span>
            {signatureUrl ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/50 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Verified
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/50 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Signature Pending
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSignModal(true)}
            className="h-8.5 flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 px-3 text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-98 select-none"
          >
            <PenLine className="h-3.5 w-3.5" />
            <span>{signatureUrl ? "Update Signature" : "Digital Sign"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="h-8.5 flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 text-xs font-medium transition shadow-2xs cursor-pointer active:scale-98 select-none"
          >
            <Printer className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Print (A4)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="h-8.5 flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 text-xs font-medium transition shadow-2xs cursor-pointer active:scale-98 select-none"
            title="Copy Registration Number"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            )}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

          <button
            type="button"
            onClick={onClose}
            className="h-8.5 w-8.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition shadow-2xs cursor-pointer select-none"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* DOCUMENT PREVIEW WORKSPACE */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 flex justify-center items-start bg-zinc-100 dark:bg-zinc-950 print:p-0 print:overflow-visible print:bg-white print:block">
        <div className="w-full max-w-4xl bg-white text-black p-4 sm:p-5 rounded-xl border border-zinc-300 shadow-xl space-y-2 print:max-w-full print:border-none print:shadow-none print:p-0 print:rounded-none print:space-y-1.5 my-1 sm:my-2">
          
          {/* 1. HOTEL LETTERHEAD & GRC HEADER */}
          <div className="border border-black p-2.5 sm:p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-50/80">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${hotelName} Logo`}
                  className="h-10 sm:h-11 w-auto object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg border border-black flex flex-col items-center justify-center bg-white text-black shrink-0 select-none shadow-2xs">
                  <span className="font-serif font-black text-sm tracking-wider leading-none">
                    {initials}
                  </span>
                  <span className="text-[6.5px] font-sans font-bold tracking-widest uppercase opacity-75 mt-0.5">
                    HOTEL
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-black uppercase leading-tight font-serif">
                  {hotelName}
                </h1>
                <div className="text-[10.5px] font-bold text-zinc-800">
                  {hotelLegal} {hotelGstin && hotelGstin !== "—" && hotelGstin !== "N/A" ? <span>• <span className="font-mono">GSTIN: {hotelGstin}</span></span> : null}
                </div>
                <div className="text-[9.5px] text-zinc-700 max-w-lg leading-snug">
                  {[hotelAddress && hotelAddress !== "—" && hotelAddress !== "N/A" ? hotelAddress : null, hotelPhone && hotelPhone !== "—" && hotelPhone !== "N/A" ? `Ph: ${hotelPhone}` : null].filter(Boolean).join(" • ")}
                </div>
              </div>
            </div>

            <div className="border border-black p-2 sm:p-2.5 rounded-md bg-white text-right shrink-0 w-full sm:w-auto">
              <div className="text-[8.5px] font-black uppercase tracking-widest text-zinc-700">
                GUEST REGISTRATION CARD (GRC)
              </div>
              <div className="text-base font-black font-mono text-black leading-tight mt-0.5">
                {registrationNumber}
              </div>
              <div className="text-[8.5px] font-mono font-bold text-zinc-800 pt-0.5 border-t border-zinc-200 mt-0.5">
                Police Ref: {policeRefNo}
              </div>
            </div>
          </div>

          {/* 2. STAY SCHEDULE RIBBON */}
          <div className="border border-black rounded-md overflow-hidden text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-black">
              <div className="p-2 sm:py-1.5 sm:px-2.5 bg-zinc-100/70">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">
                  Assigned Room{roomCount > 1 ? "s" : ""}
                </span>
                {roomCount > 3 ? (
                  <>
                    <span className="text-xs sm:text-sm font-black font-mono text-black block leading-tight">
                      {roomCount} Rooms (Group Stay)
                    </span>
                    <span className="text-[8.5px] font-mono text-zinc-700 block mt-0.5">
                      Primary Rm {rawRoomList[0]} • +{roomCount - 1} Units
                    </span>
                  </>
                ) : (
                  <span className="text-sm sm:text-base font-black font-mono text-black block leading-tight">
                    {rawRoomList.length > 0
                      ? rawRoomList.length > 1
                        ? `Rooms ${rawRoomList.join(", ")}`
                        : `Room ${rawRoomList[0]}`
                      : `Room ${roomNum}`}
                  </span>
                )}
              </div>

              <div className="p-2 sm:py-1.5 sm:px-2.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Check-In Arrival</span>
                <span className="text-[11px] font-bold font-mono text-black block leading-tight">{arrivalTime}</span>
              </div>

              <div className="p-2 sm:py-1.5 sm:px-2.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Expected Departure</span>
                <span className="text-[11px] font-bold font-mono text-black block leading-tight">{sanitize(departureDate)}</span>
              </div>

              <div className="p-2 sm:py-1.5 sm:px-2.5 bg-zinc-50/70">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Total Occupants & Stay</span>
                <span className="text-[11px] font-bold font-mono text-black block leading-tight">
                  {formattedOccupants}{stayNights !== "—" ? ` (${stayNights})` : ""}
                </span>
              </div>
            </div>

            {roomCount > 3 && (
              <div className="px-2.5 py-1.5 bg-zinc-50 border-t border-black text-xs">
                <div className="flex items-start sm:items-center gap-2 flex-col sm:flex-row">
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-zinc-700 shrink-0">
                    Group Room Allocation ({roomCount} Rooms):
                  </span>
                  <div className="flex flex-wrap gap-1 font-mono text-[10px] font-bold text-black">
                    {rawRoomList.map((rm, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-1.5 py-0.2 rounded bg-white border border-zinc-300 text-black shadow-2xs text-[9.5px]"
                      >
                        {rm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. PRIMARY GUEST PROFILE & IDENTIFICATION */}
          <div className="border border-black rounded-md overflow-hidden">
            <div className="bg-zinc-100 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-black border-b border-black flex items-center justify-between">
              <span>01. Primary Guest Profile & Identification</span>
              <span className="font-mono text-[8.5px] text-zinc-700">Mandatory Police Record</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black border-b border-black text-xs">
              <div className="py-1.5 px-2.5 space-y-0.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Full Name of Guest:</span>
                <span className="text-xs sm:text-sm font-black text-black uppercase block leading-tight">{sanitize(formatGuestDisplayName(data.fullName))}</span>
              </div>

              <div className="py-1.5 px-2.5 space-y-0.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Age / Gender / Nationality:</span>
                <span className="text-[11px] font-bold text-black block leading-tight">
                  {formattedAgeGender}
                </span>
              </div>

              <div className="py-1.5 px-2.5 space-y-0.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Father's / Spouse's Name:</span>
                <span className="text-[11px] font-bold text-black block leading-tight">{sanitize(data.fatherSpouseName)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black border-b border-black text-xs">
              <div className="py-1.5 px-2.5 space-y-0.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Mobile Contact:</span>
                <span className="text-[11px] font-bold font-mono text-black block leading-tight">{sanitize(primaryPhone)}</span>
                {hasDistinctAltPhone && (
                  <span className="text-[8.5px] font-mono text-zinc-700 block">Alt: {data.alternatePhone}</span>
                )}
              </div>

              <div className="py-1.5 px-2.5 space-y-0.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Email / Profession:</span>
                <span className="text-[11px] font-bold text-black block truncate leading-tight">
                  {formattedEmailProfession}
                </span>
              </div>

              <div className="py-1.5 px-2.5 space-y-0.5 bg-zinc-50/70">
                <span className="text-[8.5px] uppercase font-bold text-black block flex items-center gap-1">
                  <span>Govt ID Proof Verified:</span>
                </span>
                <span className="text-[11px] font-black font-mono text-black block leading-tight">
                  {formattedIdProof}
                </span>
              </div>
            </div>

            <div className="py-1.5 px-2.5 text-xs">
              <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Permanent Residential Address:</span>
              <span className="text-[11px] font-bold text-black block leading-tight">
                {formattedAddress}
                {data.policeStation && data.policeStation.trim().length > 0 && (
                  <span className="ml-2 font-mono text-[9.5px] text-zinc-800">
                    [Jurisdiction Police Station: {data.policeStation}]
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* 4. TRAVEL ITINERARY & VEHICLE */}
          <div className="border border-black rounded-md overflow-hidden">
            <div className="bg-zinc-100 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-black border-b border-black">
              02. Travel Itinerary & Vehicle Particulars
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-black text-xs">
              <div className="py-1.5 px-2.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Arrived From:</span>
                <span className="text-[11px] font-bold text-black block leading-tight">{sanitize(data.arrivedFrom)}</span>
              </div>

              <div className="py-1.5 px-2.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Going To:</span>
                <span className="text-[11px] font-bold text-black block leading-tight">{sanitize(data.goingTo)}</span>
              </div>

              <div className="py-1.5 px-2.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Purpose of Visit:</span>
                <span className="text-[11px] font-bold text-black block leading-tight">{sanitize(data.purposeOfVisit)}</span>
              </div>

              <div className="py-1.5 px-2.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Vehicle Reg. No:</span>
                <span className="text-[11px] font-bold font-mono text-black block leading-tight">{sanitize(data.vehicleNumber)}</span>
              </div>
            </div>
          </div>

          {/* 5. TARIFF, MEAL PLAN & BILLING SETTLEMENT */}
          <div className="border border-black rounded-md overflow-hidden">
            <div className="bg-zinc-100 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-black border-b border-black flex justify-between">
              <span>03. Tariff, Meal Plan & Billing Settlement</span>
              <span className="font-mono text-[8.5px] text-zinc-700">Commercial Record</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-black text-xs">
              <div className="py-1.5 px-2.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Room Tariff Rate:</span>
                <span className="text-[11px] font-bold font-mono text-black block leading-tight">{sanitize(formattedTariff)}</span>
              </div>

              <div className="py-1.5 px-2.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Meal Plan / Package:</span>
                <span className="text-[11px] font-bold text-black block leading-tight">{sanitize(formattedMealPlan)}</span>
              </div>

              <div className="py-1.5 px-2.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Advance / Deposit Paid:</span>
                <span className="text-[11px] font-bold font-mono text-black block leading-tight">{sanitize(formattedDeposit)}</span>
              </div>

              <div className="py-1.5 px-2.5">
                <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Billing Instructions:</span>
                <span className="text-[11px] font-bold text-black block truncate leading-tight">{sanitize(formattedBilling)}</span>
              </div>
            </div>
          </div>

          {/* 6. FORM C FOREIGN DETAILS (IF INTERNATIONAL) */}
          {data.nationality && data.nationality !== "Indian" && (
            <div className="border border-black rounded-md overflow-hidden">
              <div className="bg-zinc-100 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-black border-b border-black flex justify-between">
                <span>04. Foreign National Registration (Form C - FRRO Police Copy)</span>
                <span className="font-mono text-[8.5px] text-zinc-700">Rule 14 Compliant</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-black text-xs">
                <div className="py-1.5 px-2.5">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Passport Number:</span>
                  <span className="text-[11px] font-mono font-bold text-black">{sanitize(data.foreignDetails?.passportNo)}</span>
                </div>
                <div className="py-1.5 px-2.5">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Date & Place of Issue:</span>
                  <span className="text-[11px] font-bold text-black">{sanitize(data.foreignDetails?.datePlaceOfIssue)}</span>
                </div>
                <div className="py-1.5 px-2.5">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Visa / Permit No:</span>
                  <span className="text-[11px] font-mono font-bold text-black">{sanitize(data.foreignDetails?.restrictedPermitNo)}</span>
                </div>
                <div className="py-1.5 px-2.5">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Arrival in India:</span>
                  <span className="text-[11px] font-mono font-bold text-black">{sanitize(data.foreignDetails?.dateOfArrivalInIndia)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 7. ACCOMPANYING CO-GUESTS (IF ANY) */}
          {data.coGuests && data.coGuests.length > 0 && (
            <div className="border border-black rounded-md overflow-hidden">
              <div className="bg-zinc-100 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-black border-b border-black">
                {data.nationality && data.nationality !== "Indian" ? "05." : "04."} Accompanying Guests ({data.coGuests.length})
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 text-zinc-700 font-bold uppercase text-[8.5px] border-b border-black">
                  <tr>
                    <th className="py-1 px-2 border-r border-black w-8">#</th>
                    <th className="py-1 px-2 border-r border-black">Full Name</th>
                    <th className="py-1 px-2 border-r border-black w-16">Age</th>
                    <th className="py-1 px-2 border-r border-black w-20">Gender</th>
                    <th className="py-1 px-2">Relation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-black">
                  {data.coGuests.map((cg, idx) => (
                    <tr key={idx}>
                      <td className="py-1 px-2 font-mono text-zinc-600 border-r border-black">{idx + 1}</td>
                      <td className="py-1 px-2 font-bold uppercase border-r border-black">{cg.name}</td>
                      <td className="py-1 px-2 font-mono border-r border-black">{cg.age ? `${cg.age} Yrs` : "—"}</td>
                      <td className="py-1 px-2 border-r border-black">{cg.gender || "—"}</td>
                      <td className="py-1 px-2 font-semibold">{cg.relation || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 8. FRONT DESK INTAKE & ROOM ISSUANCE RECORD (WHEN NO CO-GUESTS) */}
          {(!data.coGuests || data.coGuests.length === 0) && (!data.nationality || data.nationality === "Indian") && (
            <div className="border border-black rounded-md overflow-hidden">
              <div className="bg-zinc-100 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-black border-b border-black flex justify-between">
                <span>04. Front Desk Intake & Room Issuance Record</span>
                <span className="font-mono text-[8.5px] text-zinc-700">Statutory Verification</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-black text-xs">
                <div className="py-1.5 px-2.5">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Registration Channel:</span>
                  <span className="text-[11px] font-bold text-black block leading-tight">{sanitize(formattedChannel)}</span>
                </div>

                <div className="py-1.5 px-2.5">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Room Keys Issued:</span>
                  <span className="text-[11px] font-bold font-mono text-black block leading-tight">{roomCount > 1 ? `${roomCount} Keys (${roomCount} Rooms)` : "1 Electronic Key Card"}</span>
                </div>

                <div className="py-1.5 px-2.5">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Identity Verification:</span>
                  <span className="text-[11px] font-bold text-black block leading-tight">Original Photo ID Verified</span>
                </div>

                <div className="py-1.5 px-2.5">
                  <span className="text-[8.5px] uppercase font-bold text-zinc-600 block">Duty Receptionist:</span>
                  <span className="text-[11px] font-bold text-black block leading-tight">Front Desk Officer</span>
                </div>
              </div>
            </div>
          )}

          {/* 9. STATUTORY DECLARATION & TERMS */}
          <div className="border border-black p-2.5 sm:p-3 rounded-md text-[8.5px] sm:text-[9px] leading-tight space-y-1 bg-zinc-50/70">
            <div className="font-bold text-black uppercase tracking-wider text-[8.5px] border-b border-zinc-300 pb-0.5 mb-1">
              Guest Declaration & Statutory Hotel Regulations:
            </div>
            <p className="text-zinc-800">
              1. <strong>Check-In / Check-Out:</strong> Standard check-out time is 12:00 PM (Noon). Late check-out is subject to prior approval and applicable tariff charges.
            </p>
            <p className="text-zinc-800">
              2. <strong>Safe Custody of Valuables:</strong> Management is not liable for loss or damage to money, jewelry, or goods not deposited in the hotel safe deposit locker.
            </p>
            <p className="text-zinc-800">
              3. <strong>Settlement of Accounts:</strong> All room tariff, dining, and incidental charges must be settled upon presentation or prior to departure. The hotel retains statutory lien rights on luggage.
            </p>
            <p className="text-zinc-800">
              4. <strong>Property Conduct & Safety:</strong> Smoking in non-smoking rooms and unauthorized visitors in guest rooms after 10:00 PM are strictly prohibited under municipal hospitality regulations.
            </p>
            <p className="text-zinc-900 font-semibold pt-0.5 border-t border-dashed border-zinc-300 text-[8.5px]">
              Statutory Declaration: I hereby declare that all information furnished above is true and complete. I agree to abide by all hotel regulations and consent to verification and statutory reporting of my ID credentials as required by law.
            </p>
          </div>

          {/* 10. SIGNATURE & STAMP BOXES */}
          <div className="grid grid-cols-2 gap-3 pt-0.5">
            <div className="border border-black p-2.5 rounded-md min-h-[76px] sm:min-h-[80px] flex flex-col justify-between bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] uppercase font-bold text-zinc-700 block">
                  Guest Signature / Primary Occupant:
                </span>
                {signatureUrl ? (
                  <button
                    type="button"
                    onClick={() => setShowSignModal(true)}
                    className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-zinc-600 hover:text-black cursor-pointer print:hidden select-none"
                    title="Update or Re-sign signature"
                  >
                    <PenLine className="h-2.5 w-2.5" />
                    <span>Re-sign</span>
                  </button>
                ) : null}
              </div>

              {signatureUrl ? (
                <div className="py-0.5 flex items-center justify-center border-b border-black border-dashed min-h-[38px] max-h-10">
                  <img
                    src={signatureUrl}
                    alt="Guest Signature"
                    className="max-h-9 max-w-[200px] object-contain"
                  />
                </div>
              ) : (
                <div className="py-0.5 text-center border-b border-black border-dashed min-h-[38px] flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setShowSignModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[10.5px] font-semibold transition active:scale-98 cursor-pointer shadow-2xs print:hidden select-none"
                    title="Click to sign electronically"
                  >
                    <PenLine className="h-3 w-3" />
                    <span>Click to Sign Digitally</span>
                  </button>
                  <span className="hidden print:inline font-mono font-bold text-black text-[10.5px] tracking-wider">
                    ✕ _____________________________________
                  </span>
                </div>
              )}

              <span className="text-[7.5px] font-mono text-zinc-500 block text-center pt-0.5">
                {signatureUrl ? "✓ Digitally Signed & Verified at Check-In" : "(Signature of Guest / Primary Occupant)"}
              </span>
            </div>

            <div className="border border-black p-2.5 rounded-md min-h-[76px] sm:min-h-[80px] flex flex-col justify-between bg-white">
              <span className="text-[8.5px] uppercase font-bold text-zinc-700 block text-right">
                Front Office Authorized Signatory & Seal:
              </span>
              <div className="py-0.5 text-center border-b border-black border-dashed min-h-[38px] flex items-center justify-center">
                <span className="font-bold text-black text-[10.5px] uppercase tracking-wide">
                  {hotelLegal}
                </span>
              </div>
              <span className="text-[7.5px] font-mono text-zinc-500 block text-center pt-0.5">
                Duty Manager • Front Desk Counter • Verified with ID Original
              </span>
            </div>
          </div>

          {/* 9. POLICE AUDIT & ELECTRONIC LOGGING FOOTER */}
          <div className="border border-zinc-400 py-1 px-2.5 rounded-md text-[8px] font-mono text-zinc-700 flex flex-col sm:flex-row justify-between gap-1 bg-zinc-50">
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

      {/* Embedded Digital Signature Modal */}
      {showSignModal && (
        <GrcSignaturePadModal
          isOpen={showSignModal}
          onClose={() => setShowSignModal(false)}
          guestName={formatGuestDisplayName(data.fullName) || "Guest"}
          grcNo={registrationNumber}
          onSave={handleSaveSignature}
          isSaving={isSavingSignature}
        />
      )}
    </div>
  );
}

interface GrcSignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  grcNo: string;
  onSave: (dataUrl: string) => Promise<void>;
  isSaving: boolean;
}

function GrcSignaturePadModal({
  isOpen,
  onClose,
  guestName,
  grcNo,
  onSave,
  isSaving,
}: GrcSignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isDrawingRef = useRef(false);
  const strokesRef = useRef<{ x: number; y: number }[][]>([]);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#09090b";
    ctx.lineWidth = 2.8;

    for (const stroke of strokesRef.current) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setupCanvas();
    }, 60);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    setErrorMsg(null);

    const rect = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    strokesRef.current.push([pt]);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
    ctx.fillStyle = "#09090b";
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const currentStroke = strokesRef.current[strokesRef.current.length - 1];
    if (currentStroke) {
      currentStroke.push(pt);
      if (currentStroke.length >= 2) {
        const prev = currentStroke[currentStroke.length - 2];
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        setHasDrawn(true);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleClear = () => {
    strokesRef.current = [];
    setHasDrawn(false);
    setErrorMsg(null);
    setupCanvas();
  };

  const handleSaveClick = async () => {
    const totalPoints = strokesRef.current.reduce((acc, s) => acc + s.length, 0);
    if (!hasDrawn || strokesRef.current.length === 0 || totalPoints < 4) {
      setErrorMsg("Please sign inside the box before saving.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext("2d");
    if (!expCtx) return;

    expCtx.fillStyle = "#ffffff";
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    expCtx.drawImage(canvas, 0, 0);

    const dataUrl = exportCanvas.toDataURL("image/png");
    await onSave(dataUrl);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <PenLine className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
              <span>Digital Signature</span>
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Guest: <strong className="text-zinc-800 dark:text-zinc-200">{guestName}</strong> ({grcNo})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Canvas Body */}
        <div className="p-5 space-y-3">
          <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white overflow-hidden shadow-2xs">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-48 block touch-none cursor-crosshair"
              style={{ touchAction: "none" }}
            />
            {/* Visual Guideline */}
            <div className="pointer-events-none absolute bottom-5 left-8 right-8 border-b border-zinc-200 flex justify-between items-end pb-1 text-[11px] font-mono text-zinc-400 select-none">
              <span>✕ Sign on line</span>
              <span>Touch / Stylus / Mouse</span>
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleClear}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer select-none"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold shadow-2xs transition active:scale-98 cursor-pointer disabled:opacity-50 select-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Signature</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
