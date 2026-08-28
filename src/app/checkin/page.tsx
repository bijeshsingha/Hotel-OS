"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  RotateCcw,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Camera,
  MapPin,
  Phone,
  Clock,
  Printer,
} from "lucide-react";
import { PrintableGrcModal, GrcData } from "@/components/pms/printable-grc";

interface PropertySummary {
  id: string;
  code: string;
  displayName: string;
  legalName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
}

interface RoomOption {
  id: string;
  number: string;
  floor: number;
  roomTypeName: string;
}

function CheckInKioskInner() {
  const searchParams = useSearchParams();
  const queryPropertyId =
    searchParams.get("property") ||
    searchParams.get("propertyCode") ||
    searchParams.get("code") ||
    searchParams.get("propertyId") ||
    "";

  const [selectedProperty, setSelectedProperty] = useState<PropertySummary | null>(null);
  const [propertyRooms, setPropertyRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    arrivalDateTime: "",
    fullName: "",
    age: "",
    gender: "Male",
    nationality: "Indian",
    fatherSpouseName: "",
    preAssignedRoom: "",
    // Residential Address
    streetAddress: "",
    city: "",
    state: "",
    pinZipCode: "",
    country: "India",
    // Travel Details
    arrivedFrom: "",
    goingTo: "",
    purposeOfVisit: "Tourism / Holiday",
    referralChannel: "Direct / Walk-In",
    // Contact & Vehicle
    mobilePhone: "",
    alternatePhone: "",
    email: "",
    driverName: "",
    vehicleNumber: "",
    // Other Pax
    coGuests: [] as Array<{
      name: string;
      age: string;
      gender: string;
      relation: string;
      idType: string;
    }>,
    // ID Document
    idDocumentType: "AADHAAR",
    idDocumentNumber: "",
    idPhotoUrl: "",
    // Terms
    termsAccepted: true,
  });

  // Co-guest temp form
  const [coGuestForm, setCoGuestForm] = useState({
    name: "",
    age: "",
    gender: "Female",
    relation: "Spouse",
    idType: "AADHAAR",
  });
  const [showCoGuestInput, setShowCoGuestInput] = useState(false);

  // Signature Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Photo compression indicator
  const [compressingPhoto, setCompressingPhoto] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showGrcModal, setShowGrcModal] = useState(false);
  const [repeatGuest, setRepeatGuest] = useState<any | null>(null);
  const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);

  const handlePhoneChange = async (val: string) => {
    setFormData((prev) => ({ ...prev, mobilePhone: val }));
    const digits = val.replace(/\D/g, "");
    if (digits.length >= 10) {
      setIsLookingUpPhone(true);
      try {
        const res = await fetch(`/api/v1/guests/lookup?phone=${encodeURIComponent(digits)}`);
        const data = await res.json();
        if (data.found && data.guest) {
          const g = data.guest;
          setRepeatGuest(g);
          setFormData((prev) => ({
            ...prev,
            mobilePhone: val,
            fullName: g.fullName || prev.fullName,
            fatherSpouseName: g.fatherSpouseName || prev.fatherSpouseName,
            age: g.age ? String(g.age) : prev.age,
            gender: g.gender || prev.gender,
            nationality: g.nationality || prev.nationality,
            alternatePhone: g.alternatePhone || prev.alternatePhone,
            email: g.email || prev.email,
            streetAddress: g.streetAddress || prev.streetAddress,
            city: g.city || prev.city,
            state: g.state || prev.state,
            pinZipCode: g.pinZipCode || prev.pinZipCode,
            country: g.country || prev.country,
            arrivedFrom: g.arrivedFrom || prev.arrivedFrom,
            goingTo: g.goingTo || prev.goingTo,
            purposeOfVisit: g.purposeOfVisit || prev.purposeOfVisit,
            vehicleNumber: g.vehicleNumber || prev.vehicleNumber,
            driverName: g.driverName || prev.driverName,
            idDocumentType: g.idType || prev.idDocumentType,
            idDocumentNumber: g.idLast4 || prev.idDocumentNumber,
          }));
        } else {
          setRepeatGuest(null);
        }
      } catch (e) {
        console.error("Kiosk phone lookup failed:", e);
      } finally {
        setIsLookingUpPhone(false);
      }
    } else {
      setRepeatGuest(null);
    }
  };

  // GRC Data memo for Kiosk
  const kioskGrcData: GrcData = useMemo(() => {
    if (!submitSuccess) {
      return {
        fullName: formData.fullName,
        mobilePhone: formData.mobilePhone,
      };
    }

    let coGuests: any[] = [];
    if (submitSuccess.coGuestsJson) {
      try {
        const parsed = JSON.parse(submitSuccess.coGuestsJson);
        if (Array.isArray(parsed)) coGuests = parsed;
      } catch {}
    } else if (Array.isArray(formData.coGuests)) {
      coGuests = formData.coGuests;
    }

    return {
      grcNo: submitSuccess.registrationNo || "1204",
      roomNumber: submitSuccess.preAssignedRoom || submitSuccess.assignedRoomNumber || "",
      arrivalDateTime: submitSuccess.arrivalDateTime || formData.arrivalDateTime,
      paxM: 1,
      paxF: formData.coGuests?.filter((c) => c.gender === "Female").length || 0,
      paxC: 0,
      fullName: submitSuccess.fullName || formData.fullName,
      age: submitSuccess.age || formData.age,
      gender: submitSuccess.gender || formData.gender,
      nationality: submitSuccess.nationality || formData.nationality,
      fatherSpouseName: submitSuccess.fatherSpouseName || formData.fatherSpouseName,
      profession: submitSuccess.profession || "",
      streetAddress: submitSuccess.streetAddress || formData.streetAddress,
      policeStation: submitSuccess.policeStation || "",
      city: submitSuccess.city || formData.city,
      pinZipCode: submitSuccess.pinZipCode || formData.pinZipCode,
      state: submitSuccess.state || formData.state,
      country: submitSuccess.country || formData.country,
      arrivedFrom: submitSuccess.arrivedFrom || formData.arrivedFrom,
      goingTo: submitSuccess.goingTo || formData.goingTo,
      purposeOfVisit: submitSuccess.purposeOfVisit || formData.purposeOfVisit,
      phone: submitSuccess.alternatePhone || formData.alternatePhone,
      mobilePhone: submitSuccess.mobilePhone || formData.mobilePhone,
      email: submitSuccess.email || formData.email,
      driverName: submitSuccess.driverName || formData.driverName,
      vehicleNumber: submitSuccess.vehicleNumber || formData.vehicleNumber,
      signatureDataUrl: submitSuccess.signatureDataUrl,
      coGuests,
    };
  }, [submitSuccess, formData]);

  // 1. Initialize arrival date/time & fetch property
  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;

    setFormData((prev) => ({
      ...prev,
      arrivalDateTime: dStr,
    }));

    const loadProperty = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/auth/session");
        const data = await res.json();
        const props: PropertySummary[] = data.availableProperties || data.allProperties || [];

        // Match requested propertyId from QR link, otherwise default
        let target = props.find((p) => p.id === queryPropertyId);
        if (!target && queryPropertyId) {
          target = props.find((p) => p.code.toLowerCase() === queryPropertyId.toLowerCase());
        }
        if (!target) {
          target = props.find((p) => p.code === "GUW-01") || props[0] || null;
        }
        setSelectedProperty(target);

        if (target) {
          const roomsRes = await fetch(`/api/v1/rooms?propertyId=${target.id}`);
          if (roomsRes.ok) {
            const roomsData = await roomsRes.json();
            if (Array.isArray(roomsData)) {
              const vacantRooms = roomsData.filter(
                (r: any) =>
                  (!r.assignments || r.assignments.length === 0) &&
                  r.roomState?.occupancyStatus !== "OCCUPIED"
              );
              setPropertyRooms(
                vacantRooms.map((r: any) => ({
                  id: r.id,
                  number: r.number,
                  floor: r.floor,
                  roomTypeName: r.roomType?.name || "Room",
                }))
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed to load property data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [queryPropertyId]);

  // Sync Canvas Resolution to exact rendered size
  const syncCanvasResolution = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    }
  }, []);

  useEffect(() => {
    syncCanvasResolution();
    window.addEventListener("resize", syncCanvasResolution);
    return () => window.removeEventListener("resize", syncCanvasResolution);
  }, [syncCanvasResolution]);

  // Exact Coordinate Calculation
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pt = getCanvasPoint(e);
    if (!pt) return;

    setIsDrawing(true);
    setHasSignature(true);

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pt = getCanvasPoint(e);
    if (!pt) return;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Image compression
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(reader.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressingPhoto(true);
      const compressedDataUrl = await compressImage(file);
      if (compressedDataUrl) {
        setFormData((prev) => ({ ...prev, idPhotoUrl: compressedDataUrl }));
      }
    } catch (err) {
      console.error("Photo processing error:", err);
    } finally {
      setCompressingPhoto(false);
    }
  };

  // Add Co-guest
  const handleAddCoGuest = () => {
    if (!coGuestForm.name.trim()) return;
    setFormData((prev) => ({
      ...prev,
      coGuests: [...prev.coGuests, { ...coGuestForm }],
    }));
    setCoGuestForm({ name: "", age: "", gender: "Female", relation: "Spouse", idType: "AADHAAR" });
    setShowCoGuestInput(false);
  };

  const handleRemoveCoGuest = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      coGuests: prev.coGuests.filter((_, i) => i !== index),
    }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    let signatureDataUrl = "";
    if (canvasRef.current && hasSignature) {
      signatureDataUrl = canvasRef.current.toDataURL("image/png");
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/v1/registrations` : "/api/v1/registrations";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          ...formData,
          propertyId: selectedProperty?.id || undefined,
          signatureDataUrl,
        }),
      });

      clearTimeout(timeoutId);

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned non-JSON response (HTTP ${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Submission failed with status ${res.status}`);
      }

      setSubmitSuccess(data.registration);
    } catch (err: any) {
      console.error("Check-in submission error:", err);
      if (err.name === "AbortError") {
        setSubmitError("Connection timed out. Please try again.");
      } else {
        setSubmitError(err.message || "Failed to submit check-in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-9 w-9 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 font-mono">Loading Check-In Kiosk...</span>
        </div>
      </div>
    );
  }

  // SUCCESS SCREEN
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-white flex items-center justify-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white">
        <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-6 sm:p-10 text-center space-y-6 shadow-2xl shadow-zinc-200/50 dark:shadow-black/80">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 shadow-md">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 px-3.5 py-1 rounded-full inline-block">
              {selectedProperty?.displayName || "Hotel Guest Registration"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Check-In Confirmed
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              Your Guest Registration Card has been submitted directly to the front desk.
            </p>
          </div>

          {/* Luxury Boarding Summary */}
          <div className="rounded-2xl bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6 text-left font-mono space-y-3.5 text-sm shadow-inner">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">GRC Registration #</span>
              <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{submitSuccess.registrationNo}</span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 pb-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Primary Guest</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{submitSuccess.fullName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 pb-3">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Arrival Time</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{submitSuccess.arrivalDateTime}</span>
            </div>
            {submitSuccess.preAssignedRoom && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Room Requested</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-lg text-xs">
                  Room {submitSuccess.preAssignedRoom}
                </span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs sm:text-sm font-medium leading-relaxed">
            Please show this screen to the reception counter to collect your physical room key card.
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowGrcModal(true)}
              className="w-full flex-1 rounded-xl py-3.5 text-sm font-bold transition flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white cursor-pointer shadow-xs"
            >
              <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Print / View GRC Form</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubmitSuccess(null);
                clearSignature();
              }}
              className="w-full flex-1 rounded-xl py-3.5 text-sm font-bold transition shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 cursor-pointer"
            >
              Start New Check-In
            </button>
          </div>

          {/* PRINTABLE GRC MODAL */}
          <PrintableGrcModal
            isOpen={showGrcModal}
            onClose={() => setShowGrcModal(false)}
            data={kioskGrcData}
            property={selectedProperty || {}}
          />
        </div>
      </div>
    );
  }

  const inputStyles = `w-full h-12 rounded-xl px-4 text-sm sm:text-base font-medium transition bg-zinc-50 dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs`;

  const cardStyles = `rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800/90 p-6 sm:p-7 space-y-5 shadow-xs`;

  const labelStyles = `block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2`;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 py-8 sm:py-12 px-4 sm:px-6 selection:bg-blue-600 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800/80 gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 px-3 py-1 rounded-full mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Self-Service Kiosk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {selectedProperty?.displayName || "Guest Registration Card"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              Please enter your details below for mandatory hotel guest registration.
            </p>
          </div>
        </div>

        {/* Hotel Details Card */}
        <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 space-y-2 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
            {selectedProperty?.displayName}
          </h2>
          {selectedProperty?.address && (
            <p className="text-xs sm:text-sm font-medium flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
              <MapPin className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
              <span>{selectedProperty.address}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-4 pt-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
            {selectedProperty?.phone && (
              <span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 font-semibold">
                <Phone className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" /> Front Desk: {selectedProperty.phone}
              </span>
            )}
            <span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 font-semibold">
              <Clock className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" /> Standard Check-Out: 11:00 AM
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Primary Guest Details */}
          <div className={cardStyles}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                  01
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">Primary Guest Information</span>
              </div>
              {isLookingUpPhone ? (
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold animate-pulse">
                  Looking up guest profile...
                </span>
              ) : (
                <span className="text-xs font-mono text-zinc-400 font-medium">* Required</span>
              )}
            </div>

            {/* Returning Guest Banner */}
            {repeatGuest && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⭐</span>
                  <div>
                    <span className="text-xs font-black text-amber-900 dark:text-amber-200 block">
                      Welcome Back, {repeatGuest.fullName}!
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium block mt-0.5">
                      Your details from your previous stay have been automatically filled into this kiosk registration.
                    </span>
                  </div>
                </div>
                <span className="rounded-lg bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-2.5 py-1 text-[10px] font-mono font-bold uppercase shrink-0">
                  Auto-Populated
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelStyles}>Mobile Phone *</label>
                <div className="relative flex items-center">
                  <input
                    type="tel"
                    required
                    value={formData.mobilePhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+91 98765 43210"
                    className={`${inputStyles} font-mono`}
                  />
                  {repeatGuest && (
                    <span className="absolute right-3 text-emerald-500 text-xs font-bold font-mono">
                      ✓ Auto-Filled
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className={labelStyles}>Full Name (Block Letters) *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                  placeholder="e.g. ANUPAM ROY"
                  className={`${inputStyles} uppercase font-bold tracking-wide`}
                />
              </div>

              <div>
                <label className={labelStyles}>
                  <span>Arrival Date & Time</span>
                  <span className="text-[10px] text-zinc-400 lowercase font-normal ml-1">(auto-stamped)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={formData.arrivalDateTime}
                  className={`${inputStyles} font-mono cursor-not-allowed select-none opacity-80 !bg-zinc-100 dark:!bg-zinc-900 !text-zinc-600 dark:!text-zinc-400 !border-zinc-200 dark:!border-zinc-800`}
                  title="Arrival date and time is automatically stamped by the kiosk system."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyles}>Age *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    placeholder="28"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className={`${inputStyles} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelStyles}>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={inputStyles}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelStyles}>Nationality</label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="Indian"
                  className={inputStyles}
                />
              </div>

              <div>
                <label className={labelStyles}>Father / Spouse Name</label>
                <input
                  type="text"
                  value={formData.fatherSpouseName}
                  onChange={(e) => setFormData({ ...formData, fatherSpouseName: e.target.value })}
                  placeholder="Full name"
                  className={inputStyles}
                />
              </div>

              {/* Room Selection */}
              <div className="sm:col-span-2">
                <label className={labelStyles}>Preferred / Pre-Assigned Room</label>
                <input
                  type="text"
                  value={formData.preAssignedRoom}
                  onChange={(e) => setFormData({ ...formData, preAssignedRoom: e.target.value })}
                  placeholder="e.g. 101, 205 (or select available below)"
                  className={`${inputStyles} font-mono`}
                />
                {propertyRooms.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-500">
                      Available:
                    </span>
                    {propertyRooms.slice(0, 10).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, preAssignedRoom: r.number })}
                        className={`rounded-lg px-2.5 py-1 text-xs font-mono font-semibold border transition-all cursor-pointer shadow-xs ${
                          formData.preAssignedRoom === r.number
                            ? "bg-blue-600 text-white font-bold border-blue-500 shadow-sm"
                            : "bg-zinc-100 dark:bg-[#18181b] border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {r.number}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Residential Address */}
          <div className={cardStyles}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                  02
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">Permanent Residential Address</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="sm:col-span-2">
                <label className={labelStyles}>Full Street Address</label>
                <input
                  type="text"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  placeholder="House/Flat No., Road/Street, Landmark"
                  className={inputStyles}
                />
              </div>

              <div>
                <label className={labelStyles}>City / Town</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className={inputStyles}
                />
              </div>

              <div>
                <label className={labelStyles}>State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                  className={inputStyles}
                />
              </div>

              <div>
                <label className={labelStyles}>PIN Code</label>
                <input
                  type="text"
                  value={formData.pinZipCode}
                  onChange={(e) => setFormData({ ...formData, pinZipCode: e.target.value })}
                  placeholder="781008"
                  className={`${inputStyles} font-mono`}
                />
              </div>

              <div>
                <label className={labelStyles}>Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="India"
                  className={inputStyles}
                />
              </div>
            </div>
          </div>

          {/* 3. Travel & Identification */}
          <div className={cardStyles}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                  03
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">Government ID & Travel Particulars</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className={labelStyles}>ID Document Type *</label>
                <select
                  value={formData.idDocumentType}
                  onChange={(e) => setFormData({ ...formData, idDocumentType: e.target.value })}
                  className={inputStyles}
                >
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="PASSPORT">Passport (Mandatory for Foreign Guests)</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="VOTER_ID">Voter ID</option>
                </select>
              </div>

              <div>
                <label className={labelStyles}>ID Document Number</label>
                <input
                  type="text"
                  value={formData.idDocumentNumber}
                  onChange={(e) => setFormData({ ...formData, idDocumentNumber: e.target.value.toUpperCase() })}
                  placeholder="XXXX-XXXX-1234"
                  className={`${inputStyles} uppercase font-mono`}
                />
              </div>

              <div>
                <label className={labelStyles}>Arrived From (Origin)</label>
                <input
                  type="text"
                  value={formData.arrivedFrom}
                  onChange={(e) => setFormData({ ...formData, arrivedFrom: e.target.value })}
                  placeholder="Origin city / station"
                  className={inputStyles}
                />
              </div>

              <div>
                <label className={labelStyles}>Going To (Next Destination)</label>
                <input
                  type="text"
                  value={formData.goingTo}
                  onChange={(e) => setFormData({ ...formData, goingTo: e.target.value })}
                  placeholder="e.g. Shillong / Kaziranga / Home"
                  className={inputStyles}
                />
              </div>

              <div>
                <label className={labelStyles}>Total Rooms Needed (Group Booking)</label>
                <select
                  value={formData.preAssignedRoom ? `Room ${formData.preAssignedRoom}` : "1 Room"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      preAssignedRoom: val,
                    });
                  }}
                  className={inputStyles}
                >
                  <option value="1 Room">1 Room (Single / Couple)</option>
                  <option value="2 Rooms (Group)">2 Rooms (Group / Family)</option>
                  <option value="3 Rooms (Group)">3 Rooms (Group)</option>
                  <option value="4+ Rooms (Large Group)">4+ Rooms (Large Group)</option>
                  {propertyRooms.map((r) => (
                    <option key={r.id} value={r.number}>
                      Specific Room: {r.number} ({r.roomTypeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Photo Capture / Upload Box */}
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
              <label className={labelStyles}>Government Photo ID Capture / Upload</label>
              <div className="mt-2 rounded-2xl p-6 text-center border border-dashed border-zinc-300 dark:border-zinc-700/80 bg-zinc-50 dark:bg-[#18181b]/50">
                {formData.idPhotoUrl ? (
                  <div className="space-y-3">
                    <div className="relative inline-block max-w-sm rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 shadow-md">
                      <img src={formData.idPhotoUrl} alt="ID Upload" className="max-h-52 object-contain" />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, idPhotoUrl: "" })}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 px-4 py-2 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition cursor-pointer shadow-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove & Retake Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="inline-flex p-3 rounded-full bg-blue-50 dark:bg-zinc-800/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-zinc-700/80 shadow-xs">
                      <Camera className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {compressingPhoto ? "Compressing image..." : "Upload or Take Photo of ID Document"}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto font-medium">
                      Clear photo of Aadhaar, Passport, or Driving License.
                    </p>
                    <div>
                      <label className={`inline-flex items-center gap-2 cursor-pointer rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition shadow-xs ${
                        compressingPhoto
                          ? "opacity-50 pointer-events-none bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                          : "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      }`}>
                        <Camera className="h-4 w-4" />
                        <span>{compressingPhoto ? "Processing..." : "Select File / Camera"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={compressingPhoto}
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Accompanying Guests */}
          <div className={cardStyles}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                  04
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">Accompanying Guests ({formData.coGuests.length})</span>
              </div>
              {!showCoGuestInput && (
                <button
                  type="button"
                  onClick={() => setShowCoGuestInput(true)}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Add Co-Guest
                </button>
              )}
            </div>

            {formData.coGuests.length > 0 ? (
              <div className="space-y-2.5">
                {formData.coGuests.map((cg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b] text-sm shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{cg.name}</div>
                      <div className="text-xs font-mono mt-0.5 text-zinc-500 dark:text-zinc-400">
                        {cg.age} yrs • {cg.gender} • {cg.relation} • {cg.idType}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCoGuest(idx)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      title="Remove guest"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !showCoGuestInput && (
                <div className="text-center py-3 text-xs italic text-zinc-400 dark:text-zinc-500 font-medium">
                  No accompanying co-guests added. Click "Add Co-Guest" if staying with additional guests.
                </div>
              )
            )}

            {showCoGuestInput && (
              <div className="mt-3 p-5 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-zinc-50 dark:bg-[#18181b] space-y-4 text-xs sm:text-sm shadow-xs">
                <div className="font-bold text-zinc-900 dark:text-zinc-200">Add Accompanying Guest</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelStyles}>Full Name *</label>
                    <input
                      type="text"
                      placeholder="Co-Guest Name"
                      value={coGuestForm.name}
                      onChange={(e) => setCoGuestForm({ ...coGuestForm, name: e.target.value.toUpperCase() })}
                      className={`${inputStyles} uppercase font-medium`}
                    />
                  </div>
                  <div>
                    <label className={labelStyles}>Age *</label>
                    <input
                      type="number"
                      placeholder="Age"
                      value={coGuestForm.age}
                      onChange={(e) => setCoGuestForm({ ...coGuestForm, age: e.target.value })}
                      className={`${inputStyles} font-mono`}
                    />
                  </div>
                  <div>
                    <label className={labelStyles}>Gender</label>
                    <select
                      value={coGuestForm.gender}
                      onChange={(e) => setCoGuestForm({ ...coGuestForm, gender: e.target.value })}
                      className={inputStyles}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Child">Child</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelStyles}>Relationship</label>
                    <select
                      value={coGuestForm.relation}
                      onChange={(e) => setCoGuestForm({ ...coGuestForm, relation: e.target.value })}
                      className={inputStyles}
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Child">Child</option>
                      <option value="Parent">Parent</option>
                      <option value="Friend">Friend</option>
                      <option value="Colleague">Colleague</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyles}>ID Type</label>
                    <select
                      value={coGuestForm.idType}
                      onChange={(e) => setCoGuestForm({ ...coGuestForm, idType: e.target.value })}
                      className={inputStyles}
                    >
                      <option value="AADHAAR">Aadhaar</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="DRIVING_LICENSE">Driving License</option>
                      <option value="VOTER_ID">Voter ID</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCoGuestInput(false)}
                    className="px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCoGuest}
                    className="px-5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer shadow-xs"
                  >
                    Save Co-Guest
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. Signature & Terms */}
          <div className={cardStyles}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                  05
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">House Rules & Digital Signature</span>
              </div>
            </div>

            <div className="p-4 rounded-xl text-xs sm:text-sm space-y-2 leading-relaxed border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b] shadow-xs">
              <div className="font-bold text-zinc-900 dark:text-zinc-200">Hotel Guidelines:</div>
              <ul className="list-disc list-inside space-y-1 font-medium text-zinc-600 dark:text-zinc-400">
                <li>Check-out time is strictly 11:00 AM.</li>
                <li>Physical Government ID must be presented at the front desk upon key card handover.</li>
                <li>In-room dining is served by Ambarish Restaurant & Room Dining (Dial Ext 9).</li>
              </ul>
            </div>

            {/* Signature Canvas */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className={labelStyles}>Guest Signature *</label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear Signature
                </button>
              </div>

              <div className="relative rounded-2xl border border-zinc-300 dark:border-zinc-500/80 bg-white overflow-hidden touch-none select-none p-1 shadow-inner">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 sm:h-52 cursor-crosshair block bg-white"
                />

                {!hasSignature ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-sm sm:text-base font-semibold text-zinc-400 gap-1 p-4 text-center">
                    <span>✍️ Sign inside this box using finger, stylus, or mouse</span>
                    <span className="text-[11px] text-zinc-400 font-normal">Official Guest Registration Card Legal Signature</span>
                  </div>
                ) : (
                  <div className="absolute bottom-2 left-4 right-4 pointer-events-none flex justify-between text-[10px] text-zinc-400 font-mono border-t border-zinc-200 pt-0.5">
                    <span>✕ Signed Signature</span>
                    <span>Legal Verification</span>
                  </div>
                )}
              </div>
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer text-xs sm:text-sm pt-2">
              <input
                type="checkbox"
                required
                checked={formData.termsAccepted}
                onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                className="mt-0.5 h-4.5 w-4.5 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 leading-relaxed">
                I certify that the information provided is accurate and agree to follow all hotel regulations.
              </span>
            </label>
          </div>

          {submitError && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-4 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-2xl font-bold text-base sm:text-lg transition flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-lg shadow-blue-600/20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer active:scale-[0.99]"
          >
            {submitting ? (
              <span>Submitting Registration...</span>
            ) : (
              <>
                <span>Complete Digital Check-In</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CheckInKioskPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-white flex items-center justify-center p-6">
          <div className="text-sm font-mono text-zinc-500 dark:text-zinc-400 font-medium">Loading Kiosk...</div>
        </div>
      }
    >
      <CheckInKioskInner />
    </Suspense>
  );
}
