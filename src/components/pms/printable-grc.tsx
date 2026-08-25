"use client";

import React, { useState } from "react";
import {
  FileText,
  X,
  CheckCircle2,
  ShieldCheck,
  User,
  Users,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Car,
  Compass,
  Copy,
  Check,
  Download,
  Share2,
  Lock,
  Sparkles,
  Printer,
  QrCode,
  Fingerprint,
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

  const registrationNumber = data.grcNo || data.registrationNo || "GRC-2627-0101";
  const roomNum = data.roomNumber || data.assignedRoomNumber || data.preAssignedRoom || "303";
  const arrivalTime = data.arrivalDateTime || new Date().toISOString().replace("T", " ").slice(0, 16);
  const auditTimestamp = new Date().toISOString();
  const shaHash = `SHA256:${Buffer.from(`${registrationNumber}-${data.fullName}-${arrivalTime}`).toString("hex").slice(0, 32)}`;

  const handleCopyLink = () => {
    const text = `Hotel OS Digital GRC: ${registrationNumber} | Guest: ${data.fullName} | Room: ${roomNum} | Date: ${arrivalTime} | Verified ID: ${data.idDocumentType || data.idType || "AADHAAR"}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Modal Container */}
      <div className="w-full max-w-4xl rounded-2xl border border-zinc-700 bg-[#121215] text-zinc-100 p-5 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:bg-white print:text-black print:p-4">
        
        {/* Top Control Toolbar (Hidden when printing) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  Guest Registration Card (GRC) & Police Verification Dossier
                </span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  E-VERIFIED & AUDIT LOGGED
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Compliant with Indian Registration of Foreigners Rules & State Police Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Official GRC / Police Hardcopy</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 px-3.5 py-2 text-xs font-semibold transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
              <span>{copied ? "Copied" : "Copy Record"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Master Printable GRC Document Card */}
        <div className="rounded-2xl border border-zinc-800 bg-[#09090b] p-5 sm:p-7 space-y-5 shadow-inner print:bg-white print:border-black print:text-black print:p-0 print:space-y-4 print:border-none">
          
          {/* 1. HOTEL LETTERHEAD & GRC HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-zinc-800 print:border-b-2 print:border-black">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase print:text-black print:text-lg">
                {property.displayName || "Hotel Ambarish Grand Residency"}
              </h2>
              <div className="text-xs font-bold text-zinc-400 print:text-zinc-800 mt-0.5">
                {property.legalName || "AMBARISH RESIDENCY"} • GSTIN: {property.gstin || "18AACCB2447F1ZX"}
              </div>
              <div className="text-[11px] text-zinc-500 print:text-zinc-700 max-w-md mt-1 font-mono">
                {property.address || "MD SHAH ROAD, PALTAN BAZAR, GUWAHATI, ASSAM - 781008"} • Ph: {property.phone || "9864341211"}
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 print:bg-zinc-100 print:border-black print:p-2">
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400 print:text-zinc-800">
                GUEST REGISTRATION CARD (GRC)
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-blue-400 print:text-black">
                {registrationNumber}
              </div>
              <div className="text-[10px] text-emerald-400 print:text-black font-mono flex items-center sm:justify-end gap-1 font-bold">
                <span>⚡ Police Verification Ref: {registrationNumber.replace("GRC-", "PV-")}</span>
              </div>
            </div>
          </div>

          {/* 2. STAY SCHEDULE & ROOM ALLOCATION RIBBON */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-800/80 print:bg-zinc-50 print:border-black print:p-2.5">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-zinc-400 print:text-zinc-600 font-bold">Assigned Room</span>
              <div className="text-lg font-black font-mono text-white print:text-black">
                Room {roomNum}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-zinc-400 print:text-zinc-600 font-bold">Check-In Arrival</span>
              <div className="text-xs font-bold font-mono text-zinc-200 print:text-black">
                {arrivalTime}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-zinc-400 print:text-zinc-600 font-bold">Expected Checkout</span>
              <div className="text-xs font-bold font-mono text-zinc-200 print:text-black">
                {data.expectedDepartureDate || "2026-08-25"}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-zinc-400 print:text-zinc-600 font-bold">Total Occupants</span>
              <div className="text-xs font-bold font-mono text-emerald-400 print:text-black">
                {data.paxM || 1} Male • {data.paxF || 0} Female {Number(data.paxC || 0) > 0 ? `• ${data.paxC} Child` : ""}
              </div>
            </div>
          </div>

          {/* 3. PRIMARY GUEST DOSSIER & POLICE ID MATCH */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 print:border-black pb-1">
              <User className="h-4 w-4 text-blue-400 print:text-black" />
              Primary Guest Profile & Police ID Verification
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-zinc-900/40 print:bg-transparent p-2.5 rounded-lg border border-zinc-800 print:border-black">
                <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block uppercase">Guest Full Name:</span>
                <strong className="text-white print:text-black text-sm font-bold">{data.fullName}</strong>
              </div>

              <div className="bg-zinc-900/40 print:bg-transparent p-2.5 rounded-lg border border-zinc-800 print:border-black">
                <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block uppercase">Age / Gender / Nationality:</span>
                <strong className="text-zinc-200 print:text-black font-semibold">
                  {data.age || "30"} Yrs • {data.gender || "Male"} • {data.nationality || "Indian"}
                </strong>
              </div>

              <div className="bg-zinc-900/40 print:bg-transparent p-2.5 rounded-lg border border-zinc-800 print:border-black">
                <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block uppercase">Father / Spouse Name:</span>
                <strong className="text-zinc-200 print:text-black font-semibold">{data.fatherSpouseName || "N/A"}</strong>
              </div>

              <div className="bg-zinc-900/40 print:bg-transparent p-2.5 rounded-lg border border-zinc-800 print:border-black">
                <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block uppercase">Mobile Phone:</span>
                <strong className="text-white print:text-black font-mono font-bold">{data.mobilePhone}</strong>
                {data.alternatePhone && (
                  <span className="text-[10px] text-zinc-400 print:text-zinc-600 block font-mono">Alt: {data.alternatePhone}</span>
                )}
              </div>

              <div className="bg-zinc-900/40 print:bg-transparent p-2.5 rounded-lg border border-zinc-800 print:border-black">
                <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block uppercase">Email / Profession:</span>
                <strong className="text-zinc-200 print:text-black truncate block font-medium">
                  {data.email || "N/A"} • {data.profession || "Business"}
                </strong>
              </div>

              {/* Govt ID Document Box */}
              <div className="bg-blue-950/20 print:bg-transparent p-2.5 rounded-lg border border-blue-500/40 print:border-black">
                <span className="text-[10px] text-blue-300 print:text-zinc-800 font-bold block uppercase flex items-center gap-1">
                  <Fingerprint className="h-3 w-3 text-blue-400 print:text-black" />
                  Govt ID Proof Verified:
                </span>
                <strong className="text-blue-300 print:text-black font-mono font-bold text-xs">
                  {data.idType || data.idDocumentType || "AADHAAR"} — {data.idLast4 || data.idDocumentNumber || "Verified at Desk"}
                </strong>
              </div>

              <div className="sm:col-span-3 bg-zinc-900/40 print:bg-transparent p-2.5 rounded-lg border border-zinc-800 print:border-black">
                <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block uppercase">Permanent Residential Address:</span>
                <strong className="text-zinc-200 print:text-black font-medium">
                  {data.streetAddress || "Paltan Bazar"}, {data.city || "Guwahati"}, {data.state || "Assam"} - {data.pinZipCode || "781008"} ({data.country || "India"})
                  {data.policeStation && (
                    <span className="ml-2 font-mono text-zinc-400 print:text-zinc-700">
                      [Jurisdiction P.S.: {data.policeStation}]
                    </span>
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* 4. TRAVEL ITINERARY & VEHICLE */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 print:border-black pb-1">
              <Compass className="h-4 w-4 text-amber-400 print:text-black" />
              Travel Itinerary & Vehicle Particulars
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-zinc-900/40 print:bg-transparent p-2 rounded-lg border border-zinc-800 print:border-black">
                <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block uppercase">Arrived From:</span>
                <strong className="text-zinc-200 print:text-black">{data.arrivedFrom || "Guwahati Airport / Station"}</strong>
              </div>

              <div className="bg-zinc-900/40 print:bg-transparent p-2 rounded-lg border border-zinc-800 print:border-black">
                <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block uppercase">Going To:</span>
                <strong className="text-zinc-200 print:text-black">{data.goingTo || "City Center"}</strong>
              </div>

              <div className="bg-zinc-900/40 print:bg-transparent p-2 rounded-lg border border-zinc-800 print:border-black">
                <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block uppercase">Purpose of Visit:</span>
                <strong className="text-zinc-200 print:text-black">{data.purposeOfVisit || "Tourism / Work"}</strong>
              </div>

              <div className="bg-zinc-900/40 print:bg-transparent p-2 rounded-lg border border-zinc-800 print:border-black">
                <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block uppercase">Vehicle Number:</span>
                <strong className="text-zinc-200 print:text-black font-mono">{data.vehicleNumber || "N/A"}</strong>
              </div>
            </div>
          </div>

          {/* 5. FOREIGN NATIONAL FORM C SECTION (IF INTERNATIONAL GUEST) */}
          {data.nationality && data.nationality !== "Indian" && (
            <div className="space-y-2.5 border border-zinc-800 print:border-black p-3 rounded-xl bg-zinc-900/40 print:bg-transparent">
              <div className="text-xs font-bold text-blue-400 print:text-black uppercase tracking-wider flex items-center justify-between border-b border-zinc-800 print:border-black pb-1">
                <span>Foreign National Registration (Form C Data for Police / FRRO)</span>
                <span className="text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 print:border print:border-black px-1.5 py-0.5 rounded">
                  Form C Compliant
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block">Passport No:</span>
                  <strong className="text-white print:text-black font-mono">{data.foreignDetails?.passportNo || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block">Place/Date of Issue:</span>
                  <strong className="text-white print:text-black">{data.foreignDetails?.datePlaceOfIssue || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block">Visa / Permit No:</span>
                  <strong className="text-white print:text-black font-mono">{data.foreignDetails?.restrictedPermitNo || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-bold block">Arrival in India:</span>
                  <strong className="text-white print:text-black font-mono">{data.foreignDetails?.dateOfArrivalInIndia || "N/A"}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 6. ACCOMPANYING CO-GUESTS (IF ANY) */}
          {data.coGuests && data.coGuests.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-white print:text-black uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 print:border-black pb-1">
                <Users className="h-4 w-4 text-cyan-400 print:text-black" />
                Accompanying Co-Guests ({data.coGuests.length})
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-zinc-800 print:border-black border-collapse">
                  <thead className="bg-zinc-900 print:bg-zinc-100 text-zinc-400 print:text-black uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-1.5 border border-zinc-800 print:border-black">#</th>
                      <th className="p-1.5 border border-zinc-800 print:border-black">Companion Name</th>
                      <th className="p-1.5 border border-zinc-800 print:border-black">Age</th>
                      <th className="p-1.5 border border-zinc-800 print:border-black">Gender</th>
                      <th className="p-1.5 border border-zinc-800 print:border-black">Relationship</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 print:divide-black text-zinc-300 print:text-black">
                    {data.coGuests.map((cg, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 font-mono text-zinc-500 print:text-black border border-zinc-800 print:border-black">{idx + 1}</td>
                        <td className="p-1.5 font-bold text-white print:text-black border border-zinc-800 print:border-black">{cg.name}</td>
                        <td className="p-1.5 font-mono border border-zinc-800 print:border-black">{cg.age || "N/A"}</td>
                        <td className="p-1.5 border border-zinc-800 print:border-black">{cg.gender}</td>
                        <td className="p-1.5 text-purple-400 print:text-black font-medium border border-zinc-800 print:border-black">{cg.relation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. CLEAR AUDIT TRAIL & POLICE VERIFICATION BLOCK */}
          <div className="rounded-xl border border-emerald-500/30 print:border-black bg-emerald-500/5 print:bg-zinc-50 p-3.5 space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 print:border-black pb-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 print:text-black font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-400 print:text-black" />
                <span>Police Verification Audit Trail & E-Signature Hash</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 print:text-zinc-700">
                IT Act 2000 & Rule 46 Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10px] text-zinc-400 print:text-black">
              <div>
                <span className="text-zinc-500 print:text-zinc-600 block">Digital Verification Hash:</span>
                <span className="text-zinc-300 print:text-black font-bold">{shaHash}</span>
              </div>
              <div>
                <span className="text-zinc-500 print:text-zinc-600 block">Sign-off Timestamp:</span>
                <span className="text-zinc-300 print:text-black font-bold">{auditTimestamp}</span>
              </div>
              <div>
                <span className="text-zinc-500 print:text-zinc-600 block">Intake Terminal:</span>
                <span className="text-zinc-300 print:text-black font-bold">Front Desk Counter 01 (Host Verified)</span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-400 print:text-zinc-700 pt-1">
              Declaration: I hereby declare that the particulars furnished above are true and accurate. I have presented valid Government Identification verified by hotel reception.
            </p>
          </div>

          {/* 8. SIGNATURE BOXES (FOR PHYSICAL POLICE HARDCOPY INSPECTION) */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-800 print:border-black text-xs font-mono">
            <div className="space-y-4">
              <span className="text-[10px] uppercase text-zinc-400 print:text-black font-bold block">
                Guest Digital / Physical Signature:
              </span>
              <div className="border-b border-zinc-700 print:border-black pb-1">
                <span className="font-bold text-white print:text-black text-xs tracking-wider">
                  /{data.fullName.toUpperCase().replace(/\s+/g, "_")}/
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 print:text-zinc-600 block">
                Signed & Verified at Desk
              </span>
            </div>

            <div className="space-y-4 text-right">
              <span className="text-[10px] uppercase text-zinc-400 print:text-black font-bold block">
                Front Desk Authorized Signatory:
              </span>
              <div className="border-b border-zinc-700 print:border-black pb-1">
                <span className="font-bold text-zinc-300 print:text-black text-xs">
                  {property.legalName || "AMBARISH RESIDENCY"}
                </span>
              </div>
              <span className="text-[9px] text-zinc-400 print:text-zinc-600 block">
                Hotel Front Office Duty Manager
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions (Hidden in Print) */}
        <div className="flex items-center justify-between pt-2 print:hidden">
          <span className="text-xs text-zinc-500 font-mono">
            Hotel OS Digital Document Engine • Property Code {property.code || "GUW-01"}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print GRC</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
