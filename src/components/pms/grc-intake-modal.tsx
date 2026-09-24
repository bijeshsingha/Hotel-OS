"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ArrowLeft,
  FileText,
  QrCode,
  UserPlus,
  Users,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Car,
  Compass,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  Globe,
  Share2,
  Copy,
  Check,
  BedDouble,
  Clock,
} from "lucide-react";
import {
  ID_PROOF_TYPES,
  PURPOSE_OF_VISIT_OPTIONS,
  MEAL_PLANS,
  COMMON_NATIONALITIES,
} from "@/data";
import { normalizeGuestName } from "@/lib/domain/name-utils";
import { CompanySelector } from "./company-selector";

interface GrcIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  rooms: any[];
  activeProperty: any;
  initialRoomId?: string;
  initialReservation?: any;
}

export function GrcIntakeModal({
  isOpen,
  onClose,
  onSuccess,
  rooms,
  activeProperty,
  initialRoomId,
  initialReservation,
}: GrcIntakeModalProps) {
  // Method Switcher: "PHYSICAL_ENTRY" vs "QR_DIGITAL"
  const [activeMethod, setActiveMethod] = useState<"PHYSICAL_ENTRY" | "QR_DIGITAL">("PHYSICAL_ENTRY");
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [repeatGuest, setRepeatGuest] = useState<any | null>(null);
  const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);

  // Current date & time helper
  const now = new Date();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const currentTimeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  // Form State
  const [formData, setFormData] = useState({
    // Stay & Room
    roomId: initialRoomId || "",
    additionalRoomIds: [] as string[],
    roomRates: {} as Record<string, string>,
    groupBilling: true,
    arrivalDate: todayStr,
    arrivalTime: currentTimeStr,
    departureDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    mealPlan: "EP", // EP, CP, MAP, AP
    extraPaxCount: 0,
    roomExtraPax: {} as Record<string, number>,
    roomPax: {} as Record<string, { adults: number; children: number }>,
    extraBedRate: "500",
    adults: "2",
    children: "0",
    paxM: "",
    paxF: "",
    paxC: "",

    // Primary Guest
    title: "Mr.",
    fullName: "",
    fatherSpouseName: "",
    age: "",
    gender: "Male",
    nationality: "Indian",
    profession: "",
    mobilePhone: "",
    alternatePhone: "",
    email: "",

    // Address
    streetAddress: "",
    policeStation: "",
    city: "",
    state: "",
    pinZipCode: "",
    country: "India",

    // Travel
    arrivedFrom: "",
    goingTo: "",
    purposeOfVisit: "Tourism / Holiday",
    referralChannel: "Walk-in",
    vehicleNumber: "",
    driverName: "",

    // ID Document & GST
    idType: "AADHAAR",
    idLast4: "",
    companyName: "",
    guestGstin: "",

    // Billing & Advance
    agreedTariff: "",
    isComplimentary: false,
    isRateInclusive: true,
    checkoutType: "FIXED_TIME" as "24_HOURS" | "FIXED_TIME",
    gracePeriodMinutes: "0",
    depositAmount: "0",
    paymentMethod: "UPI",
    transactionRef: "",
    kitchenDining: "NO" as "NO" | "YES",
    diningFixedRate: "",

    // Co-Guests
    coGuests: [] as Array<{
      name: string;
      soDoWo: string;
      age: string;
      gender: string;
      relation: string;
    }>,

    // Foreign Details
    foreignDetails: {
      countryOfCitizenship: "",
      passportNo: "",
      datePlaceOfIssue: "",
      restrictedPermitNo: "",
      dateOfArrivalInIndia: "",
      portOfEntry: "",
      employedInIndia: "No",
      proposedDurationOfStay: "",
      nextDestination: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;
      const defaultDepDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

      if (initialReservation) {
        const guest = initialReservation.primaryGuest || {};
        let guestAddress: any = {};
        try {
          if (guest.addressJson) {
            guestAddress = typeof guest.addressJson === "string" ? JSON.parse(guest.addressJson) : guest.addressJson;
          }
        } catch {}

        const roomsList = Array.isArray(initialReservation.rooms) ? initialReservation.rooms : [];
        const totalAdults = Number(initialReservation.adults) || (roomsList[0]?.adults ?? 2);
        const totalChildren = Number(initialReservation.children) || (roomsList[0]?.children ?? 0);
        const firstRoom = roomsList[0] || {};
        const totalDeposit = initialReservation.deposits?.reduce((s: number, d: any) => s + (d.originalAmount || d.payment?.amount || 0), 0) || (initialReservation.deposits?.[0]?.payment?.amount || 0);
        const assigned = firstRoom.assignedRoomId || initialRoomId;
        const resolvedRoomId = assigned || (rooms.find((r) => r.roomState?.occupancyStatus === "VACANT" && (!firstRoom.roomTypeId || r.roomTypeId === firstRoom.roomTypeId))?.id || "");
        const targetRoomObj = rooms.find((r) => r.id === resolvedRoomId);
        const defaultRate = targetRoomObj?.roomType?.basePrice ? String(targetRoomObj.roomType.basePrice) : (firstRoom.ratePerNight ? String(firstRoom.ratePerNight) : "3200");
        const defaultExtraRate = targetRoomObj?.roomType?.extraAdult ? String(targetRoomObj.roomType.extraAdult) : "500";

        setFormData((prev) => ({
          ...prev,
          fullName: guest.name || initialReservation.guestName || "",
          mobilePhone: guest.phone || initialReservation.guestPhone || "",
          email: guest.email || initialReservation.guestEmail || "",
          city: guestAddress.city || guest.city || initialReservation.guestCity || "",
          state: guestAddress.state || guest.state || initialReservation.guestState || "",
          guestGstin: guest.gstin || initialReservation.guestGstin || "",
          companyName: guest.companyName || initialReservation.companyName || initialReservation.agencyName || "",
          arrivalDateTime: currentDateTime,
          departureDate: initialReservation.departureDate || defaultDepDate,
          adults: String(totalAdults),
          children: String(totalChildren),
          roomPax: resolvedRoomId ? {
            [resolvedRoomId]: { adults: totalAdults, children: totalChildren }
          } : {},
          referralChannel: initialReservation.source || "DIRECT",
          depositAmount: String(totalDeposit),
          roomId: resolvedRoomId,
          agreedTariff: defaultRate,
          extraBedRate: defaultExtraRate,
          additionalRoomIds: [],
          roomRates: {},
          groupBilling: true,
        }));
      } else {
        const resolvedRoomId = initialRoomId || (rooms.find((r) => r.roomState?.occupancyStatus === "VACANT")?.id || "");
        const targetRoomObj = rooms.find((r) => r.id === resolvedRoomId);
        const defaultRate = targetRoomObj?.roomType?.basePrice ? String(targetRoomObj.roomType.basePrice) : "3200";
        const defaultExtraRate = targetRoomObj?.roomType?.extraAdult ? String(targetRoomObj.roomType.extraAdult) : "500";
        const initialAdults = targetRoomObj?.roomType?.capacity ? Math.min(2, targetRoomObj.roomType.capacity) : 2;

        setFormData((prev) => ({
          ...prev,
          roomId: resolvedRoomId,
          agreedTariff: prev.agreedTariff && prev.agreedTariff !== "" ? prev.agreedTariff : defaultRate,
          extraBedRate: defaultExtraRate,
          adults: prev.adults && Number(prev.adults) > 0 ? prev.adults : String(initialAdults),
          children: prev.children || "0",
          roomPax: resolvedRoomId ? {
            [resolvedRoomId]: { adults: initialAdults, children: 0 }
          } : {},
          additionalRoomIds: [],
          roomRates: {},
          roomExtraPax: {},
          extraPaxCount: 0,
          groupBilling: true,
          arrivalDateTime: currentDateTime,
          departureDate: prev.departureDate || defaultDepDate,
        }));
      }
      setRepeatGuest(null);
    }
  }, [isOpen, initialRoomId, initialReservation, rooms]);

  if (!isOpen) return null;

  // Handle Instant Repeat Guest Auto-Fill by Phone Number
  const handlePhoneChange = async (val: string) => {
    setFormData((prev) => ({ ...prev, mobilePhone: val }));
    const digits = val.replace(/\D/g, "");
    if (digits.length >= 10) {
      setIsLookingUpPhone(true);
      try {
        const res = await fetch(`/api/v1/guests/lookup?phone=${encodeURIComponent(digits)}&propertyId=${activeProperty?.id || ""}`);
        const data = await res.json();
        if (data.found && data.guest) {
          const g = data.guest;
          setRepeatGuest(g);
          setFormData((prev) => {
            const { title, pureName } = normalizeGuestName(g.fullName || g.name || prev.fullName, g.title || prev.title);

            return {
              ...prev,
              mobilePhone: val,
              fullName: prev.fullName.trim() ? prev.fullName : pureName,
              title: prev.fullName.trim() ? prev.title : title,
              fatherSpouseName: g.fatherSpouseName || prev.fatherSpouseName,
              age: g.age ? String(g.age) : prev.age,
              gender: g.gender || prev.gender,
              nationality: g.nationality || prev.nationality,
              profession: g.profession || prev.profession,
              alternatePhone: g.alternatePhone || prev.alternatePhone,
              email: g.email || prev.email,

              // Address
              streetAddress: g.streetAddress || prev.streetAddress,
              policeStation: g.policeStation || prev.policeStation,
              city: g.city || prev.city,
              state: g.state || prev.state,
              pinZipCode: g.pinZipCode || prev.pinZipCode,
              country: g.country || prev.country,

              // Travel & ID
              arrivedFrom: g.arrivedFrom || prev.arrivedFrom,
              goingTo: g.goingTo || prev.goingTo,
              purposeOfVisit: g.purposeOfVisit || prev.purposeOfVisit,
              vehicleNumber: g.vehicleNumber || prev.vehicleNumber,
              driverName: g.driverName || prev.driverName,
              idType: g.idType || prev.idType,
              idLast4: g.idLast4 || prev.idLast4,
              guestGstin: g.guestGstin || prev.guestGstin,
              companyName: g.companyName || prev.companyName,
            };
          });
        } else {
          setRepeatGuest(null);
        }
      } catch (err) {
        console.error("Phone auto-lookup failed:", err);
      } finally {
        setIsLookingUpPhone(false);
      }
    } else {
      setRepeatGuest(null);
    }
  };

  // Handle Add Co-Guest Row
  const handleAddCoGuest = () => {
    setFormData({
      ...formData,
      coGuests: [
        ...formData.coGuests,
        { name: "", soDoWo: "", age: "", gender: "Male", relation: "Spouse" },
      ],
    });
  };

  // Handle Remove Co-Guest Row
  const handleRemoveCoGuest = (index: number) => {
    setFormData({
      ...formData,
      coGuests: formData.coGuests.filter((_, i) => i !== index),
    });
  };

  // Handle Co-Guest Field Change
  const handleCoGuestChange = (index: number, field: string, val: string) => {
    const updated = [...formData.coGuests];
    updated[index] = { ...updated[index], [field]: val };
    setFormData({ ...formData, coGuests: updated });
  };

  const updateRoomPax = (roomId: string, field: "adults" | "children", val: number) => {
    setFormData((prev) => {
      const targetRoom = rooms.find((r) => r.id === roomId);
      const roomBaseCap = targetRoom?.roomType?.capacity || 2;

      const nextRoomPax = { ...(prev.roomPax || {}) };
      const currentEntry = nextRoomPax[roomId] || {
        adults: targetRoom?.roomType?.capacity ? Math.min(2, targetRoom.roomType.capacity) : 2,
        children: 0,
      };
      nextRoomPax[roomId] = { ...currentEntry, [field]: val };

      // Recompute total adults and children across all selected rooms
      const allSelected = [prev.roomId, ...prev.additionalRoomIds].filter(Boolean);
      let sumAdults = 0;
      let sumChildren = 0;
      for (const id of allSelected) {
        sumAdults += nextRoomPax[id]?.adults !== undefined ? nextRoomPax[id].adults : 2;
        sumChildren += nextRoomPax[id]?.children !== undefined ? nextRoomPax[id].children : 0;
      }

      // Auto-compute extra pax if adults exceed standard room capacity
      let nextExtraPaxCount = prev.extraPaxCount;
      const nextRoomExtraPax = { ...(prev.roomExtraPax || {}) };

      if (roomId === prev.roomId) {
        if (field === "adults") {
          nextExtraPaxCount = Math.max(0, val - roomBaseCap);
        }
      } else {
        if (field === "adults") {
          nextRoomExtraPax[roomId] = Math.max(0, val - roomBaseCap);
        }
      }

      return {
        ...prev,
        roomPax: nextRoomPax,
        adults: String(sumAdults),
        children: sumChildren > 0 ? String(sumChildren) : (prev.children || "0"),
        extraPaxCount: nextExtraPaxCount,
        roomExtraPax: nextRoomExtraPax,
      };
    });
  };

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allSelectedRooms = [formData.roomId, ...formData.additionalRoomIds].filter(Boolean);
    if (allSelectedRooms.length === 0 || !formData.roomId) {
      alert("Please select a vacant room to assign.");
      return;
    }

    const matrixAdults = allSelectedRooms.reduce((sum, rid) => {
      const rAdults = formData.roomPax?.[rid]?.adults;
      return sum + (rAdults !== undefined && !isNaN(rAdults) ? rAdults : 2);
    }, 0);
    const effectiveAdults = Math.max(1, matrixAdults || Number(formData.adults) || 2);

    if (effectiveAdults < 1) {
      alert("Total Adults is mandatory (minimum 1 pax).");
      return;
    }
    if (!formData.fullName || !formData.fullName.trim()) {
      alert("Guest Full Name is required.");
      return;
    }
    if (!formData.mobilePhone || !formData.mobilePhone.trim()) {
      alert("Guest Mobile Phone Number is required.");
      return;
    }

    // Form C International Pax Mandatory Validation
    if (formData.nationality === "Foreign") {
      if (!formData.foreignDetails.countryOfCitizenship?.trim() && !formData.country?.trim()) {
        alert("Country of Citizenship / Foreign Nationality is mandatory for international guests.");
        return;
      }
      if (!formData.foreignDetails.passportNo?.trim()) {
        alert("Passport Number is mandatory for foreign guests (Form C compliance).");
        return;
      }
      if (!formData.foreignDetails.datePlaceOfIssue?.trim()) {
        alert("Passport Issue Place/Date is mandatory for foreign guests.");
        return;
      }
      if (!formData.foreignDetails.restrictedPermitNo?.trim()) {
        alert("Visa / Entry Permit Number is mandatory for foreign guests.");
        return;
      }
      if (!formData.foreignDetails.dateOfArrivalInIndia?.trim()) {
        alert("Date of Arrival in India is mandatory for foreign guests.");
        return;
      }
    }

    setLoading(true);
    try {
      const actualNationality = formData.nationality === "Indian"
        ? "Indian"
        : (formData.foreignDetails.countryOfCitizenship || formData.country || "Foreign");

      const { title: finalTitle, pureName: finalPureName } = normalizeGuestName(formData.fullName, formData.title);

      const res = await fetch("/api/v1/stays/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          reservationId: initialReservation?.id,
          roomIds: [formData.roomId, ...formData.additionalRoomIds],
          groupBilling: formData.groupBilling,
          roomRates: formData.roomRates,
          guestData: {
            name: finalPureName,
            title: finalTitle,
            phone: formData.mobilePhone,
            alternatePhone: formData.alternatePhone,
            email: formData.email,
            nationality: actualNationality,
            age: Number(formData.age) || undefined,
            gender: formData.gender,
            fatherSpouseName: formData.fatherSpouseName,
            profession: formData.profession,
            streetAddress: formData.streetAddress,
            policeStation: formData.policeStation,
            city: formData.city,
            state: formData.state,
            pinZipCode: formData.pinZipCode,
            country: actualNationality === "Indian" ? "India" : actualNationality,
            arrivedFrom: formData.arrivedFrom,
            goingTo: formData.goingTo,
            purposeOfVisit: formData.purposeOfVisit,
            driverName: formData.driverName,
            vehicleNumber: formData.vehicleNumber,
            gstin: formData.guestGstin,
            companyName: formData.companyName,
            idType: formData.idType,
            idLast4: formData.idLast4,
          },
          arrivalAt: `${formData.arrivalDate}T${formData.arrivalTime || "14:00"}:00`,
          expectedDepartureAt: formData.departureDate,
          adults: effectiveAdults,
          children: Number(formData.children) || 0,
          paxM: Number(formData.paxM) || 0,
          paxF: Number(formData.paxF) || 0,
          paxC: Number(formData.paxC) || 0,
          agreedTariff: formData.isComplimentary ? 0 : (formData.agreedTariff !== "" ? Number(formData.agreedTariff) : undefined),
          isComplimentary: formData.isComplimentary,
          isRateInclusive: formData.isRateInclusive,
          checkoutType: formData.checkoutType,
          gracePeriodMinutes: formData.gracePeriodMinutes !== undefined ? Number(formData.gracePeriodMinutes) : 0,
          depositAmount: Number(formData.depositAmount) || 0,
          depositMethod: formData.paymentMethod || "CASH",
          depositRef: formData.transactionRef?.trim() || undefined,
          extraBeds: (Number(formData.extraPaxCount) || 0) + formData.additionalRoomIds.reduce((acc, id) => acc + (Number(formData.roomExtraPax?.[id]) || 0), 0),
          extraBedRate: Number(formData.extraBedRate) || primaryRoom?.roomType?.extraAdult || 500,
          roomPax: (() => {
            const allSelectedRooms = [formData.roomId, ...formData.additionalRoomIds].filter(Boolean);
            const mapping: Record<string, { adults: number; children: number }> = {};
            for (const rid of allSelectedRooms) {
              const r = rooms.find((x) => x.id === rid);
              const customPax = formData.roomPax?.[rid];
              if (customPax) {
                mapping[rid] = {
                  adults: Number(customPax.adults) || 2,
                  children: Number(customPax.children) || 0,
                };
                if (r?.number) {
                  mapping[r.number] = mapping[rid];
                }
              } else {
                mapping[rid] = {
                  adults: Math.max(1, Math.min(Number(formData.adults) || 2, r?.roomType?.capacity || 2)),
                  children: 0,
                };
                if (r?.number) {
                  mapping[r.number] = mapping[rid];
                }
              }
            }
            return mapping;
          })(),
          coGuests: formData.coGuests.filter((cg) => cg.name.trim() !== ""),
          foreignDetails: formData.nationality !== "Indian" ? formData.foreignDetails : undefined,
          kitchenDining: formData.kitchenDining || "NO",
          diningFixedRate: formData.diningFixedRate ? Number(formData.diningFixedRate) : 0,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to complete check-in");

      onSuccess(result);
      onClose();
    } catch (err: any) {
      alert(`Check-in Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKioskLink = () => {
    const propParam = activeProperty?.code ? `?property=${encodeURIComponent(activeProperty.code)}` : activeProperty?.id ? `?propertyId=${activeProperty.id}` : "";
    const link = `${window.location.origin}/checkin${propParam}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const selectedRoom = rooms.find((r) => r.id === formData.roomId);
  const primaryRoom = selectedRoom;
  const allSelectedRoomsList = [formData.roomId, ...formData.additionalRoomIds].filter(Boolean);
  const calculatedTotalAdults = allSelectedRoomsList.reduce((sum, rid) => {
    return sum + (formData.roomPax?.[rid]?.adults ?? 2);
  }, 0) || Math.max(1, Number(formData.adults) || 2);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-100 dark:bg-[#09090b] flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-150">
      
      {/* Full-Width Sticky Top Header */}
      <header className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] px-6 lg:px-10 py-3 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 transition cursor-pointer shadow-xs"
            title="Return to Front Desk"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Room Rack</span>
          </button>

          <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <UserPlus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Guest Check-In & GRC Intake</span>
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              {activeProperty?.displayName || "Hotel"} {activeProperty?.code ? `• ${activeProperty.code}` : ""}
            </p>
          </div>
        </div>

        {/* Intake Method Switcher Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveMethod("PHYSICAL_ENTRY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMethod === "PHYSICAL_ENTRY"
                  ? "bg-blue-600 text-white shadow-xs font-black"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Physical GRC Entry</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMethod("QR_DIGITAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMethod === "QR_DIGITAL"
                  ? "bg-blue-600 text-white shadow-xs font-black"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Digital QR Kiosk</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* METHOD 1: PHYSICAL GRC DATA ENTRY FORM */}
      {activeMethod === "PHYSICAL_ENTRY" && (
        <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto w-full px-6 lg:px-12 py-6 space-y-6 text-xs max-w-[1700px] mx-auto">
            
            {/* 1. ROOM ASSIGNMENT & STAY SCHEDULE */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#111114] p-5 sm:p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
                      1. Room Assignment & Stay Schedule
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Configure check-in parameters, stay duration, dining inclusions, and room guest allocations.
                    </p>
                  </div>
                </div>

                {selectedRoom && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-semibold bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      Floor {selectedRoom.floor} • {selectedRoom.roomType?.bedType || "King Bed"}
                      {formData.additionalRoomIds.length > 0 && ` • +${formData.additionalRoomIds.length} Extra Room${formData.additionalRoomIds.length > 1 ? "s" : ""}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Parameter Grid 1: Stay Timings & Policies (4 Balanced Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Select Primary Room */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] tracking-wide">
                    Select Primary Room *
                  </label>
                  <select
                    required
                    value={formData.roomId}
                    onChange={(e) => {
                      const nextRoomId = e.target.value;
                      const r = rooms.find((rm) => rm.id === nextRoomId);
                      const roomCap = r?.roomType?.capacity || 2;
                      const currentRoomPax = formData.roomPax?.[nextRoomId]?.adults || Math.min(2, roomCap);
                      setFormData((prev) => ({
                        ...prev,
                        roomId: nextRoomId,
                        agreedTariff: r?.roomType?.basePrice ? String(r.roomType.basePrice) : prev.agreedTariff,
                        extraBedRate: r?.roomType?.extraAdult ? String(r.roomType.extraAdult) : (prev.extraBedRate || "500"),
                        adults: prev.adults && Number(prev.adults) > 0 ? prev.adults : String(currentRoomPax),
                        roomPax: {
                          ...prev.roomPax,
                          [nextRoomId]: prev.roomPax?.[nextRoomId] || { adults: currentRoomPax, children: 0 },
                        },
                      }));
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="">-- Choose Vacant Room --</option>
                    {rooms
                      .filter((r) => r.roomState?.occupancyStatus === "VACANT" || r.id === formData.roomId)
                      .map((r) => {
                        const bedType = r.roomType?.bedType || (r.wing === "TWIN" ? "Twin Beds" : "King Bed");
                        return (
                          <option key={r.id} value={r.id}>
                            Room {r.number} - {r.roomType?.name} [{bedType}]
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* 2. Check-In Date & Time (Paired container) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] tracking-wide">
                      Check-In Date & Time *
                    </label>
                    <span className="text-[10px] text-zinc-400 font-mono">🔒 Today</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      disabled
                      readOnly
                      value={formData.arrivalDate}
                      className="w-full h-10 px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-xs cursor-not-allowed select-none font-bold"
                      title="Check-in date is locked to the current business day"
                    />
                    <input
                      type="time"
                      required
                      value={formData.arrivalTime}
                      onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                      className="w-full h-10 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-xs"
                      title="Arrival Time"
                    />
                  </div>
                </div>

                {/* 3. Expected Departure Date */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] tracking-wide">
                    Expected Departure *
                  </label>
                  <input
                    type="date"
                    required
                    min={formData.arrivalDate || new Date().toISOString().split("T")[0]}
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-xs"
                  />
                </div>

                {/* 4. Checkout Billing & Grace Period */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] tracking-wide">
                    Checkout Billing & Grace *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.checkoutType}
                      onChange={(e: any) => setFormData({ ...formData, checkoutType: e.target.value })}
                      className="w-full h-10 px-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-xs truncate"
                      title="Checkout Billing Cycle"
                    >
                      <option value="FIXED_TIME">Std 11:00 AM</option>
                      <option value="24_HOURS">24-Hour Cycle</option>
                    </select>

                    <select
                      value={formData.gracePeriodMinutes}
                      onChange={(e: any) => setFormData({ ...formData, gracePeriodMinutes: e.target.value })}
                      className="w-full h-10 px-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-xs truncate"
                      title="Grace Period Window"
                    >
                      <option value="0">0h Grace</option>
                      <option value="60">1h Grace</option>
                      <option value="120">2h Grace</option>
                      <option value="180">3h Grace</option>
                      <option value="240">4h Grace</option>
                      <option value="300">5h Grace</option>
                      <option value="360">6h Grace</option>
                      <option value="420">7h Grace</option>
                      <option value="1440">Waive Night</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Parameter Grid 2: Total Adults (Calculated), Children, Meal Plan, Dining & Demographics (5 Balanced Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-1">
                {/* 1. Total Adults (Read-Only Aggregate from Room Matrix) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] tracking-wide">
                      Total Adults
                    </label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                      Auto-Calculated
                    </span>
                  </div>
                  <div 
                    className="w-full h-10 px-3 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs font-bold flex items-center justify-between shadow-xs select-none cursor-default"
                    title="Total Adults is auto-calculated from the assigned guests in each room below."
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm">👥</span>
                      <span className="font-black text-sm">{calculatedTotalAdults}</span>
                      <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">{calculatedTotalAdults === 1 ? "Adult" : "Adults"}</span>
                    </span>
                    <span className="text-[10px] font-sans font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/70 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded">
                      {allSelectedRoomsList.length} {allSelectedRoomsList.length === 1 ? "Room" : "Rooms"}
                    </span>
                  </div>
                </div>

                {/* 2. Children (Free) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] tracking-wide">
                      Children
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                      Free (₹0)
                    </span>
                  </div>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={formData.children}
                    onChange={(e) => setFormData({ ...formData, children: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  />
                </div>

                {/* 3. Meal Plan */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] tracking-wide">
                    Meal Plan
                  </label>
                  <select
                    value={formData.mealPlan}
                    onChange={(e) => setFormData({ ...formData, mealPlan: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="EP">EP (Room Only)</option>
                    <option value="CP">CP (Continental Plan - Breakfast)</option>
                    <option value="MAP">MAP (Modified American - Half Board)</option>
                    <option value="AP">AP (American Plan - Full Board)</option>
                  </select>
                </div>

                {/* 4. Kitchen Dining */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] tracking-wide">
                    Kitchen Dining
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={formData.kitchenDining || "NO"}
                      onChange={(e: any) => setFormData({ ...formData, kitchenDining: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-xs"
                    >
                      <option value="NO">No Dining</option>
                      <option value="YES">Dining Included</option>
                    </select>
                    {formData.kitchenDining === "YES" && (
                      <div className="relative w-32 shrink-0">
                        <span className="absolute left-2.5 top-2.5 text-xs text-zinc-400 font-bold font-mono">₹</span>
                        <input
                          type="number"
                          placeholder="Fixed Rate"
                          value={formData.diningFixedRate || ""}
                          onChange={(e) => setFormData({ ...formData, diningFixedRate: e.target.value })}
                          className="w-full h-10 pl-6 pr-2 rounded-xl bg-white dark:bg-zinc-900 border border-amber-400 dark:border-amber-600 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Gender Demographics (Optional) */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] tracking-wide">
                    Gender Split (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Male"
                      min="0"
                      value={formData.paxM}
                      onChange={(e) => setFormData({ ...formData, paxM: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                    />
                    <input
                      type="number"
                      placeholder="Female"
                      min="0"
                      value={formData.paxF}
                      onChange={(e) => setFormData({ ...formData, paxF: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Early Bird Offer Banner */}
              {(() => {
                const hour = parseInt(formData.arrivalTime?.split(":")[0] || "-1", 10);
                const isEarlyBird = hour >= 5 && hour < 11;
                if (!isEarlyBird) return null;
                return (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
                    <span className="text-base">🌟</span>
                    <div>
                      <strong className="font-bold">Early Bird Check-In Included:</strong>
                      <span className="ml-1 text-[11.5px] text-amber-800 dark:text-amber-300">
                        Arrival between 5:00 AM and 11:00 AM is included at no extra charge. Stay valid until Standard Check-Out on departure date.
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Room & Occupancy Allocation Matrix */}
              {(() => {
                const selectedRoomsList = rooms.filter(
                  (r) => r.id === formData.roomId || formData.additionalRoomIds.includes(r.id)
                );
                const totalRoomsCount = Math.max(1, selectedRoomsList.length);
                const baseStandardCapacity = selectedRoomsList.reduce(
                  (acc, r) => acc + (r.roomType?.capacity || 2),
                  0
                ) || totalRoomsCount * 2;
                
                const currentExtraPax = (Number(formData.extraPaxCount) || 0) + formData.additionalRoomIds.reduce((sum, id) => sum + (Number(formData.roomExtraPax?.[id]) || 0), 0);
                const totalCapacity = baseStandardCapacity + currentExtraPax;
                const absoluteMaxRoomCapacity = baseStandardCapacity + totalRoomsCount * 2;
                
                const allSelectedRooms = [formData.roomId, ...formData.additionalRoomIds].filter(Boolean);
                const totalAdultsCount = allSelectedRooms.reduce((sum, rid) => {
                  return sum + (formData.roomPax?.[rid]?.adults ?? (rid === formData.roomId ? (Number(formData.adults) || 2) : 2));
                }, 0) || Number(formData.adults) || 2;
                const totalChildrenCount = Number(formData.children || 0) + Number(formData.paxC || 0);
                const totalGuests = totalAdultsCount + totalChildrenCount;

                const hasGuestsEntered = totalGuests > 0;
                const isOverCapacity = hasGuestsEntered && totalAdultsCount > totalCapacity;
                const isBeyondMaxPhysicalLimit = hasGuestsEntered && (totalAdultsCount > absoluteMaxRoomCapacity || totalGuests > absoluteMaxRoomCapacity + totalRoomsCount * 2);

                const primaryExtraRate = Number(formData.extraBedRate || primaryRoom?.roomType?.extraAdult || 500);

                return (
                  <div className="space-y-3 pt-2">
                    {/* Header bar above matrix */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                          Room & Occupancy Allocation Matrix
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {totalRoomsCount} {totalRoomsCount === 1 ? "Room" : "Rooms"}
                        </span>
                      </div>

                      {/* Capacity status pill */}
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono border flex items-center gap-1.5 shadow-xs ${
                          isBeyondMaxPhysicalLimit
                            ? "bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200"
                            : isOverCapacity
                            ? "bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
                            : hasGuestsEntered
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200"
                            : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}>
                          <span>{isBeyondMaxPhysicalLimit ? "⛔" : isOverCapacity ? "⚠️" : hasGuestsEntered ? "✓" : "👥"}</span>
                          <span>
                            {isBeyondMaxPhysicalLimit
                              ? `Physical Limit Exceeded (${totalAdultsCount}/${absoluteMaxRoomCapacity} Pax)`
                              : isOverCapacity
                              ? `Overcapacity (${totalAdultsCount}/${totalCapacity} Pax - Add Extra Pax or Room)`
                              : hasGuestsEntered
                              ? `Capacity Verified: ${totalAdultsCount}/${totalCapacity} Adults • ${totalChildrenCount} Kids (Free)`
                              : `Standard Capacity: ${baseStandardCapacity} Adults across ${totalRoomsCount} Room(s)`}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Table Matrix */}
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/80 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                            <th className="py-2.5 px-4">Room</th>
                            <th className="py-2.5 px-4">Category & Bedding</th>
                            <th className="py-2.5 px-4">Nightly Tariff</th>
                            <th className="py-2.5 px-4 text-center">Assigned Guests</th>
                            <th className="py-2.5 px-4 text-center">Extra Pax</th>
                            <th className="py-2.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:border-zinc-800 dark:divide-zinc-800/80">
                          {/* Row 1: Primary Room */}
                          {primaryRoom ? (() => {
                            const pAdults = formData.roomPax?.[primaryRoom.id]?.adults ?? (primaryRoom.roomType?.capacity ? Math.min(2, primaryRoom.roomType.capacity) : 2);
                            const pKids = formData.roomPax?.[primaryRoom.id]?.children ?? 0;
                            const pExtraPax = Number(formData.extraPaxCount) || 0;

                            return (
                              <tr className="bg-white dark:bg-[#111114] hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold font-mono text-xs border border-blue-200 dark:border-blue-800">
                                      Room {primaryRoom.number}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                                      Primary
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {primaryRoom.roomType?.name || "Standard Room"}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 font-mono">
                                    Floor {primaryRoom.floor} • {primaryRoom.roomType?.bedType || "King Bed"}
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-zinc-400 font-mono text-xs">₹</span>
                                    <input
                                      type="number"
                                      disabled={formData.isComplimentary}
                                      value={formData.isComplimentary ? "0" : formData.agreedTariff}
                                      onChange={(e) => setFormData({ ...formData, agreedTariff: e.target.value })}
                                      className="w-24 h-8 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono font-bold text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 shadow-xs"
                                      placeholder="Tariff"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setFormData((prev) => ({ ...prev, isComplimentary: !prev.isComplimentary }))}
                                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                                        formData.isComplimentary
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                          : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-emerald-700"
                                      }`}
                                      title="Toggle complimentary stay"
                                    >
                                      <span>🎁</span>
                                      <span>{formData.isComplimentary ? "Comp" : "Comp"}</span>
                                    </button>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-3">
                                    {/* Adults */}
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-zinc-500 font-medium">Adults:</span>
                                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <button
                                          type="button"
                                          onClick={() => updateRoomPax(primaryRoom.id, "adults", Math.max(1, pAdults - 1))}
                                          className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                        >
                                          <Minus className="h-3 w-3 stroke-[2.5]" />
                                        </button>
                                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white px-2 min-w-[20px] text-center select-none">
                                          {pAdults}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateRoomPax(primaryRoom.id, "adults", pAdults + 1)}
                                          className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                        >
                                          <Plus className="h-3 w-3 stroke-[2.5]" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Kids */}
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-zinc-500 font-medium">Kids:</span>
                                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <button
                                          type="button"
                                          onClick={() => updateRoomPax(primaryRoom.id, "children", Math.max(0, pKids - 1))}
                                          className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                        >
                                          <Minus className="h-3 w-3 stroke-[2.5]" />
                                        </button>
                                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white px-2 min-w-[20px] text-center select-none">
                                          {pKids}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateRoomPax(primaryRoom.id, "children", pKids + 1)}
                                          className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                        >
                                          <Plus className="h-3 w-3 stroke-[2.5]" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const cur = Number(formData.extraPaxCount) || 0;
                                          setFormData((prev) => ({ ...prev, extraPaxCount: Math.max(0, cur - 1) }));
                                        }}
                                        className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                      >
                                        <Minus className="h-3 w-3 stroke-[2.5]" />
                                      </button>
                                      <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white px-2 min-w-[20px] text-center select-none">
                                        {pExtraPax}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const cur = Number(formData.extraPaxCount) || 0;
                                          setFormData((prev) => ({ ...prev, extraPaxCount: cur + 1 }));
                                        }}
                                        className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                      >
                                        <Plus className="h-3 w-3 stroke-[2.5]" />
                                      </button>
                                    </div>
                                    {pExtraPax > 0 && (
                                      <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                        +₹{pExtraPax * primaryExtraRate}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                    Primary Stay
                                  </span>
                                </td>
                              </tr>
                            );
                          })() : (
                            <tr>
                              <td colSpan={6} className="py-4 text-center text-zinc-400">
                                Please select a primary room above.
                              </td>
                            </tr>
                          )}

                          {/* Subsequent Rows: Additional Group Rooms */}
                          {formData.additionalRoomIds.map((id) => {
                            const r = rooms.find((room) => room.id === id);
                            const roomPaxCount = formData.roomExtraPax?.[id] || 0;
                            const isRoomComp = formData.roomRates[id] === "0" || formData.roomRates[id] === "COMP";
                            const currentRate = formData.roomRates[id] !== undefined ? formData.roomRates[id] : (r?.roomType?.basePrice ? String(r.roomType.basePrice) : "3200");
                            const assignedAdults = formData.roomPax?.[id]?.adults ?? 2;
                            const assignedKids = formData.roomPax?.[id]?.children ?? 0;
                            const roomExtraRate = r?.roomType?.extraAdult !== undefined ? Number(r.roomType.extraAdult) : (Number(formData.extraBedRate) || 500);

                            return (
                              <tr key={id} className="bg-white dark:bg-[#111114] hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold font-mono text-xs border border-zinc-200 dark:border-zinc-700">
                                      Room {r?.number}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                      Group
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {r?.roomType?.name || "Standard Room"}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 font-mono">
                                    Floor {r?.floor} • {r?.roomType?.bedType || "Twin Bed"}
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-zinc-400 font-mono text-xs">₹</span>
                                    <input
                                      type="number"
                                      disabled={isRoomComp}
                                      value={isRoomComp ? "0" : currentRate}
                                      onChange={(e) =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          roomRates: { ...prev.roomRates, [id]: e.target.value },
                                        }))
                                      }
                                      className="w-24 h-8 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono font-bold text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 shadow-xs"
                                      placeholder="Tariff"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData((prev) => {
                                          const nextRate = isRoomComp
                                            ? (r?.roomType?.basePrice ? String(r.roomType.basePrice) : "3200")
                                            : "0";
                                          return {
                                            ...prev,
                                            roomRates: { ...prev.roomRates, [id]: nextRate },
                                          };
                                        });
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                                        isRoomComp
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                          : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-emerald-700"
                                      }`}
                                      title="Toggle complimentary stay"
                                    >
                                      <span>🎁</span>
                                      <span>{isRoomComp ? "Comp" : "Comp"}</span>
                                    </button>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-3">
                                    {/* Adults */}
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-zinc-500 font-medium">Adults:</span>
                                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <button
                                          type="button"
                                          onClick={() => updateRoomPax(id, "adults", Math.max(1, assignedAdults - 1))}
                                          className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                        >
                                          <Minus className="h-3 w-3 stroke-[2.5]" />
                                        </button>
                                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white px-2 min-w-[20px] text-center select-none">
                                          {assignedAdults}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateRoomPax(id, "adults", assignedAdults + 1)}
                                          className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                        >
                                          <Plus className="h-3 w-3 stroke-[2.5]" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Kids */}
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-zinc-500 font-medium">Kids:</span>
                                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <button
                                          type="button"
                                          onClick={() => updateRoomPax(id, "children", Math.max(0, assignedKids - 1))}
                                          className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                        >
                                          <Minus className="h-3 w-3 stroke-[2.5]" />
                                        </button>
                                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white px-2 min-w-[20px] text-center select-none">
                                          {assignedKids}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateRoomPax(id, "children", assignedKids + 1)}
                                          className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                        >
                                          <Plus className="h-3 w-3 stroke-[2.5]" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const cur = formData.roomExtraPax?.[id] || 0;
                                          setFormData((prev) => ({
                                            ...prev,
                                            roomExtraPax: { ...(prev.roomExtraPax || {}), [id]: Math.max(0, cur - 1) },
                                          }));
                                        }}
                                        className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                      >
                                        <Minus className="h-3 w-3 stroke-[2.5]" />
                                      </button>
                                      <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white px-2 min-w-[20px] text-center select-none">
                                        {roomPaxCount}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const cur = formData.roomExtraPax?.[id] || 0;
                                          setFormData((prev) => ({
                                            ...prev,
                                            roomExtraPax: { ...(prev.roomExtraPax || {}), [id]: cur + 1 },
                                          }));
                                        }}
                                        className="h-6 w-6 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition shadow-xs cursor-pointer"
                                      >
                                        <Plus className="h-3 w-3 stroke-[2.5]" />
                                      </button>
                                    </div>
                                    {roomPaxCount > 0 && (
                                      <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                        +₹{roomPaxCount * roomExtraRate}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormData((prev) => {
                                        const nextPax = { ...(prev.roomExtraPax || {}) };
                                        const nextRates = { ...(prev.roomRates || {}) };
                                        const nextRoomPax = { ...(prev.roomPax || {}) };
                                        delete nextPax[id];
                                        delete nextRates[id];
                                        delete nextRoomPax[id];
                                        const remainingRoomIds = prev.additionalRoomIds.filter((rid) => rid !== id);
                                        const allSelected = [prev.roomId, ...remainingRoomIds].filter(Boolean);
                                        let sumAdults = 0;
                                        for (const rid of allSelected) {
                                          sumAdults += nextRoomPax[rid]?.adults ?? 2;
                                        }
                                        return {
                                          ...prev,
                                          additionalRoomIds: remainingRoomIds,
                                          roomExtraPax: nextPax,
                                          roomRates: nextRates,
                                          roomPax: nextRoomPax,
                                          adults: String(sumAdults),
                                        };
                                      })
                                    }
                                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Remove Room"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Footer: Add Room Dropdown & Consolidate Folio Checkbox */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex-1 max-w-md">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const newId = e.target.value;
                              const roomObj = rooms.find((r) => r.id === newId);
                              const defaultRate = roomObj?.roomType?.basePrice
                                ? String(roomObj.roomType.basePrice)
                                : "3200";
                              const roomCap = roomObj?.roomType?.capacity || 2;
                              setFormData((prev) => {
                                const nextPax = {
                                  ...(prev.roomPax || {}),
                                  [newId]: { adults: roomCap, children: 0 },
                                };
                                const allSelected = [prev.roomId, ...prev.additionalRoomIds, newId].filter(Boolean);
                                let sumAdults = 0;
                                for (const rid of allSelected) {
                                  sumAdults += nextPax[rid]?.adults ?? 2;
                                }
                                return {
                                  ...prev,
                                  additionalRoomIds: [...prev.additionalRoomIds, newId],
                                  roomRates: { ...prev.roomRates, [newId]: defaultRate },
                                  roomPax: nextPax,
                                  adults: String(sumAdults),
                                };
                              });
                            }
                          }}
                          className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-xs"
                        >
                          <option value="">+ Add Vacant Room (Group Booking)...</option>
                          {rooms
                            .filter(
                              (r) =>
                                r.roomState?.occupancyStatus === "VACANT" &&
                                r.id !== formData.roomId &&
                                !formData.additionalRoomIds.includes(r.id)
                            )
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                Room {r.number} - {r.roomType?.name} (Floor {r.floor})
                              </option>
                            ))}
                        </select>
                      </div>

                      {formData.additionalRoomIds.length > 0 && (
                        <label className="flex items-center gap-2 cursor-pointer bg-blue-50/70 dark:bg-blue-950/30 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-xs">
                          <input
                            type="checkbox"
                            checked={formData.groupBilling}
                            onChange={(e) => setFormData({ ...formData, groupBilling: e.target.checked })}
                            className="w-4 h-4 rounded bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500/50 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                            Consolidate Master Folio (Single invoice for all {formData.additionalRoomIds.length + 1} rooms)
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 2. PRIMARY GUEST DOSSIER */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#111114] p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center justify-between">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  2. Primary Guest Profile (From Physical GRC Card)
                </span>
                {isLookingUpPhone && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono animate-pulse flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-spin" /> Looking up guest profile...
                  </span>
                )}
              </div>

              {/* Repeat Customer Detected Badge */}
              {repeatGuest && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-300 dark:border-amber-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      ⭐
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-amber-950 dark:text-amber-100">
                          Returning Guest: {repeatGuest.fullName}
                        </span>
                        <span className="rounded px-2 py-0.5 text-[10px] font-bold font-mono uppercase bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                          {repeatGuest.pastStaysCount} Past {repeatGuest.pastStaysCount === 1 ? "Stay" : "Stays"}
                        </span>
                        {repeatGuest.vipStatus && (
                          <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                            VIP Guest
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 font-medium mt-0.5">
                        Profile, address & ID details auto-populated from stay history
                        {repeatGuest.city ? ` (${repeatGuest.city}, ${repeatGuest.state})` : ""}
                        {repeatGuest.companyName ? ` • Company: ${repeatGuest.companyName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setRepeatGuest(null)}
                      className="text-[11px] text-amber-800 dark:text-amber-400 hover:underline font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Mobile Phone *</label>
                  <div className="relative flex items-center">
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9864341211"
                      value={formData.mobilePhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full h-10 px-3 pr-8 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    {repeatGuest && (
                      <span className="absolute right-2.5 text-emerald-500 text-xs" title="Repeat Customer Auto-Filled">
                        ✓
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Title</label>
                  <select
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Prof.">Prof.</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Guest Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suman Roy, Vikash Kumar"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Father / Spouse Name</label>
                  <input
                    type="text"
                    placeholder="S/O, D/O, W/O"
                    value={formData.fatherSpouseName}
                    onChange={(e) => setFormData({ ...formData, fatherSpouseName: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Alternate Phone</label>
                  <input
                    type="tel"
                    placeholder="Optional phone"
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Age (Years) *</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="Age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Nationality *</label>
                  <select
                    required
                    value={formData.nationality}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        nationality: val,
                        country: val === "Indian" ? "India" : "",
                        idType: val === "Indian" ? "AADHAAR" : "PASSPORT",
                      });
                    }}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="Indian">Indian</option>
                    <option value="Foreign">Foreign</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Email Address</label>
                  <input
                    type="email"
                    placeholder="guest@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Profession / Occupation</label>
                  <input
                    type="text"
                    placeholder="e.g. Business Executive"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* MANDATORY FOREIGN NATIONAL SECTION (FORM C) - SHOWN IF FOREIGN */}
            {formData.nationality === "Foreign" && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/10 p-4 space-y-3.5 animate-in fade-in shadow-xs">
                <div className="flex items-center justify-between border-b border-blue-200 dark:border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
                      Foreign National Form C Details (Mandatory for Foreign Guests)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-blue-800 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 px-2 py-0.5 rounded font-bold">
                    Govt Form C Compliance
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Row 1: Passport & Citizenship */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Country of Citizenship *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. United Kingdom / USA / Japan"
                      value={formData.foreignDetails.countryOfCitizenship}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          country: val,
                          foreignDetails: { ...formData.foreignDetails, countryOfCitizenship: val },
                        });
                      }}
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Passport Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Z1234567"
                      value={formData.foreignDetails.passportNo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, passportNo: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Passport Issue Place & Date *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. London / 2022-05-10"
                      value={formData.foreignDetails.datePlaceOfIssue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, datePlaceOfIssue: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Row 2: Visa & Arrival Record */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Visa / Permit Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. V9876543 / eVisa"
                      value={formData.foreignDetails.restrictedPermitNo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, restrictedPermitNo: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Date of Arrival in India *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.foreignDetails.dateOfArrivalInIndia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, dateOfArrivalInIndia: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Port / City of Entry in India
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi / Kolkata / Mumbai"
                      value={formData.foreignDetails.portOfEntry || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, portOfEntry: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Row 3: Stay Details & Itinerary */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Stay Duration in India (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 15"
                      value={formData.foreignDetails.proposedDurationOfStay}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, proposedDurationOfStay: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Employed in India?
                    </label>
                    <select
                      value={formData.foreignDetails.employedInIndia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, employedInIndia: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      Next Destination
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kaziranga / Bangkok"
                      value={formData.foreignDetails.nextDestination || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          foreignDetails: { ...formData.foreignDetails, nextDestination: e.target.value },
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. RESIDENTIAL ADDRESS */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#111114] p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  3. Residential Address
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Street / House Address</label>
                  <input
                    type="text"
                    placeholder="Flat / Building / Road / Locality"
                    value={formData.streetAddress}
                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Police Station</label>
                  <input
                    type="text"
                    placeholder="Local P.S."
                    value={formData.policeStation}
                    onChange={(e) => setFormData({ ...formData, policeStation: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Guwahati / Kolkata"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Assam"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">PIN / Zip Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 781008"
                    value={formData.pinZipCode}
                    onChange={(e) => setFormData({ ...formData, pinZipCode: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Country</label>
                  <input
                    type="text"
                    placeholder="e.g. India"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 4. TRAVEL & ID VERIFICATION */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#111114] p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Compass className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  4. Travel Details, ID Proof & Vehicle
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Arrived From</label>
                  <input
                    type="text"
                    placeholder="e.g. Kolkata, Delhi"
                    value={formData.arrivedFrom}
                    onChange={(e) => setFormData({ ...formData, arrivedFrom: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Going To</label>
                  <input
                    type="text"
                    placeholder="e.g. Shillong, Home"
                    value={formData.goingTo}
                    onChange={(e) => setFormData({ ...formData, goingTo: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Purpose of Visit</label>
                  <select
                    value={formData.purposeOfVisit}
                    onChange={(e) => setFormData({ ...formData, purposeOfVisit: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
                  >
                    {PURPOSE_OF_VISIT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. AS 01 EX 1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">ID Document Type</label>
                  <select
                    value={formData.idType}
                    onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {ID_PROOF_TYPES.map((id) => (
                      <option key={id.id} value={id.id}>
                        {id.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">ID Number / Last 4</label>
                  <input
                    type="text"
                    placeholder="e.g. 4521 or full ID"
                    value={formData.idLast4}
                    onChange={(e) => setFormData({ ...formData, idLast4: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap flex items-center justify-between">
                    <span>Company / Travel Agent Master</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">24+ Directory</span>
                  </label>
                  <CompanySelector
                    value={formData.companyName}
                    activeProperty={activeProperty}
                    placeholder="Search corporate company (e.g. ABB, Asian Paints, MMT...)"
                    onSelect={(comp) => {
                      if (!comp) {
                        setFormData((prev) => ({
                          ...prev,
                          companyName: "",
                          guestGstin: "",
                        }));
                        return;
                      }
                      setFormData((prev) => ({
                        ...prev,
                        companyName: comp.accountName,
                        guestGstin: comp.gstin || "",
                        // Company address is for billing only; do not overwrite guest personal residential address
                        email: prev.email || comp.email || "",
                        alternatePhone: prev.alternatePhone || comp.phone || comp.mobile || "",
                        referralChannel: comp.accountType === "TRAVEL_AGENT" ? (comp.shortName || comp.accountName) : prev.referralChannel,
                      }));
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">Company GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 18AAAAA0000A1Z5"
                    value={formData.guestGstin}
                    onChange={(e) => setFormData({ ...formData, guestGstin: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* 5. ACCOMPANYING CO-GUESTS */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#111114] p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  5. Accompanying Co-Guests ({formData.coGuests.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddCoGuest}
                  className="px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold text-[11px] flex items-center gap-1 transition shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Companion</span>
                </button>
              </div>

              {formData.coGuests.length > 0 ? (
                <div className="space-y-2">
                  {formData.coGuests.map((cg, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 items-center shadow-xs">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Companion Name *"
                          value={cg.name}
                          onChange={(e) => handleCoGuestChange(idx, "name", e.target.value.toUpperCase())}
                          className="w-full h-9 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          placeholder="Age"
                          value={cg.age}
                          onChange={(e) => handleCoGuestChange(idx, "age", e.target.value)}
                          className="w-full h-9 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={cg.gender}
                          onChange={(e) => handleCoGuestChange(idx, "gender", e.target.value)}
                          className="w-full h-9 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <select
                          value={cg.relation}
                          onChange={(e) => handleCoGuestChange(idx, "relation", e.target.value)}
                          className="w-full h-9 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        >
                          <option value="Spouse">Spouse</option>
                          <option value="Child">Child</option>
                          <option value="Parent">Parent</option>
                          <option value="Friend">Friend</option>
                          <option value="Colleague">Colleague</option>
                          <option value="Relative">Relative</option>
                        </select>
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveCoGuest(idx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 italic text-[11px]">
                  No co-guests added. Click "Add Companion" if the guest has family or colleagues sharing the room.
                </p>
              )}
            </div>

            {/* 6. ADVANCE PAYMENT & SETTLEMENT */}
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#111114] p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 flex-wrap gap-2">
                <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 text-xs">
                  <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {formData.additionalRoomIds.length > 0
                    ? `6. Primary Room (Room ${primaryRoom?.number || ""}) Tariff, Complimentary & Deposit`
                    : "6. Room Tariff, Complimentary Option & Advance Deposit"}
                </span>

                {/* Complimentary Room Option */}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <input
                    type="checkbox"
                    checked={formData.isComplimentary}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData((prev) => ({
                        ...prev,
                        isComplimentary: checked,
                        agreedTariff: checked ? "0" : (prev.agreedTariff === "0" ? String(primaryRoom?.roomType?.basePrice || 3200) : prev.agreedTariff),
                      }));
                    }}
                    className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                  />
                  <span>🎁 {formData.additionalRoomIds.length > 0 ? `Room ${primaryRoom?.number || "1"} Complimentary (₹0)` : "Complimentary Room (₹0 Free Stay)"}</span>
                </label>
              </div>

              {/* Multi-Room Tariff Summary Breakdown */}
              {formData.additionalRoomIds.length > 0 && (
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800/60 space-y-2 text-xs">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between flex-wrap gap-2">
                    <span>Group Booking Room Tariffs Breakdown:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-black">
                      Total Daily: ₹{
                        (formData.isComplimentary ? 0 : (Number(formData.agreedTariff) || Number(primaryRoom?.roomType?.basePrice) || 3200)) +
                        formData.additionalRoomIds.reduce((sum, rid) => {
                          const rObj = rooms.find((r) => r.id === rid);
                          const rateVal = formData.roomRates[rid];
                          if (rateVal === "0" || rateVal === "COMP") return sum;
                          const rRate = rateVal !== undefined && rateVal !== "" ? Number(rateVal) : (rObj?.roomType?.basePrice || 3200);
                          return sum + (isNaN(rRate) ? 3200 : rRate);
                        }, 0)
                      }
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">Room {primaryRoom?.number} (Primary):</span>
                      <span className={`font-mono font-bold ${formData.isComplimentary ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-white"}`}>
                        {formData.isComplimentary ? "🎁 Comp (₹0)" : `₹${formData.agreedTariff || primaryRoom?.roomType?.basePrice || 3200}`}
                      </span>
                    </div>
                    {formData.additionalRoomIds.map((rid) => {
                      const rObj = rooms.find((r) => r.id === rid);
                      const rateVal = formData.roomRates[rid];
                      const isComp = rateVal === "0" || rateVal === "COMP";
                      const rateDisplay = isComp ? "🎁 Comp (₹0)" : `₹${rateVal !== undefined && rateVal !== "" ? rateVal : (rObj?.roomType?.basePrice || 3200)}`;
                      return (
                        <div key={rid} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Room {rObj?.number}:</span>
                          <span className={`font-mono font-bold ${isComp ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-white"}`}>
                            {rateDisplay}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                      {formData.additionalRoomIds.length > 0
                        ? `Primary Rate (Room ${primaryRoom?.number || ""}) (₹)`
                        : "Agreed Room Rate (₹)"}
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-400 font-bold font-mono text-xs">₹</span>
                    <input
                      type="number"
                      placeholder={formData.isComplimentary ? "0 (Complimentary)" : "Enter custom rate"}
                      disabled={formData.isComplimentary}
                      value={formData.isComplimentary ? "0" : formData.agreedTariff}
                      onChange={(e) => setFormData({ ...formData, agreedTariff: e.target.value })}
                      className="w-full h-10 pl-7 pr-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-blue-700 dark:text-blue-400 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
                    />
                  </div>
                </div>

                {/* GST Inclusion / Exclusion Toggle */}
                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    GST Tax Treatment
                  </label>
                  <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-300 dark:border-zinc-700 h-10">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isRateInclusive: true })}
                      className={`flex-1 h-full rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        formData.isRateInclusive
                          ? "bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 shadow-xs border border-zinc-200 dark:border-zinc-700"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                      }`}
                      title="Room rate already includes GST"
                    >
                      <span>Incl. GST</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isRateInclusive: false })}
                      className={`flex-1 h-full rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        !formData.isRateInclusive
                          ? "bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 shadow-xs border border-zinc-200 dark:border-zinc-700"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                      }`}
                      title="GST tax is added on top of the base rate"
                    >
                      <span>+Tax Extra</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Advance Deposit (₹)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-emerald-500 font-bold font-mono text-xs">₹</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.depositAmount}
                      onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                      className="w-full h-10 pl-7 pr-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Payment Mode
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash Drawer</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="DIRECT_BILL">🏢 Bill to Company (Company Ledger / BTC)</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[11px] whitespace-nowrap">
                    Transaction / UTR / PO Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR/98127391 or PO-2026"
                    value={formData.transactionRef}
                    onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {formData.paymentMethod === "DIRECT_BILL" && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Billing will be posted to Company Ledger:{" "}
                    <strong>{formData.companyName || "Corporate Account (Please enter Company Name in Section 4)"}</strong>
                    {formData.guestGstin ? ` • GSTIN: ${formData.guestGstin}` : ""}
                  </span>
                </div>
              )}
            </div>

          </div> {/* End of scrollable form body */}

          {/* Docked Sticky Bottom Actions Bar */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#111114]/95 backdrop-blur-md px-6 lg:px-12 py-3 flex items-center justify-between shrink-0 shadow-lg z-20">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse hidden sm:block" />
              <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                <span className="font-bold text-zinc-900 dark:text-white font-mono">
                  Room {primaryRoom?.number || "-"}
                  {formData.additionalRoomIds.length > 0 && ` (+${formData.additionalRoomIds.length} group room${formData.additionalRoomIds.length > 1 ? "s" : ""})`}
                </span>
                <span className="mx-2 text-zinc-300 dark:text-zinc-700">•</span>
                <span className="font-mono">
                  {calculatedTotalAdults} Adults{Number(formData.children) > 0 ? `, ${formData.children} Children` : ""}
                </span>
                <span className="mx-2 text-zinc-300 dark:text-zinc-700">•</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Advance: ₹{formData.depositAmount || 0}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs sm:text-sm transition shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{loading ? "Checking In..." : "Complete Check-In"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* METHOD 2: DIGITAL QR KIOSK / GUEST SELF CHECK-IN */}
      {activeMethod === "QR_DIGITAL" && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
          <div className="p-8 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200/80 dark:border-zinc-800/80 space-y-5 shadow-lg max-w-md w-full text-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto shadow-inner">
              <QrCode className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Contactless Guest Self Check-In</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Guests can scan this QR code on their smartphone to fill out their GRC, upload ID photos, and sign digitally before reaching the counter.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl max-w-[200px] mx-auto shadow-md border border-zinc-200 dark:border-zinc-700">
              {/* Visual QR Code Display */}
              <div className="aspect-square bg-zinc-950 rounded-xl flex flex-col items-center justify-center p-3 text-white">
                <QrCode className="h-28 w-28 text-white" />
                <span className="text-[9px] font-mono text-zinc-400 mt-1 uppercase font-bold tracking-widest">
                  SCAN TO CHECK-IN
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyKioskLink}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />}
                <span>{copiedLink ? "Link Copied" : "Copy Kiosk Link"}</span>
              </button>

              <a
                href={activeProperty?.code ? `/checkin?property=${encodeURIComponent(activeProperty.code)}` : activeProperty?.id ? `/checkin?propertyId=${activeProperty.id}` : "/checkin"}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white inline-flex items-center gap-1.5 transition shadow"
              >
                <span>Open Kiosk Portal ↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
