"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  RotateCcw,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  Upload,
  Building2,
  ChevronDown,
  ShieldCheck,
  UtensilsCrossed,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  BedDouble,
} from "lucide-react";

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
  const queryPropertyId = searchParams.get("propertyId") || "";

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [availableProperties, setAvailableProperties] = useState<PropertySummary[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertySummary | null>(null);
  const [propertyRooms, setPropertyRooms] = useState<RoomOption[]>([]);
  const [showPropertyMenu, setShowPropertyMenu] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    arrivalDateTime: "",
    fullName: "",
    age: "35",
    gender: "Male",
    nationality: "Indian",
    fatherSpouseName: "",
    preAssignedRoom: "",
    // Residential Address
    streetAddress: "",
    city: "",
    state: "",
    pinZipCode: "781008",
    country: "India",
    // Travel & Referral
    arrivedFrom: "",
    goingTo: "",
    purposeOfVisit: "Tourism / Holiday",
    referralChannel: "🔍 Google Search / Maps",
    // Contact & Vehicle
    mobilePhone: "+91 ",
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

  // 1. Initialize arrival date/time & fetch properties
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

    const loadProperties = async () => {
      try {
        setLoadingProperty(true);
        const res = await fetch("/api/v1/auth/session");
        const data = await res.json();
        const props: PropertySummary[] = data.availableProperties || data.allProperties || [];
        setAvailableProperties(props);

        // Determine active property: Query param -> Ambarish/Divine -> first
        let target = props.find((p) => p.id === queryPropertyId);
        if (!target) {
          target = props.find((p) => p.code === "GUW-01") || props[0] || null;
        }
        setSelectedProperty(target);
      } catch (err) {
        console.error("Failed to load properties:", err);
      } finally {
        setLoadingProperty(false);
      }
    };

    loadProperties();
  }, [queryPropertyId]);

  // 2. Fetch rooms when selected property changes
  useEffect(() => {
    if (!selectedProperty) return;

    const loadRooms = async () => {
      try {
        const res = await fetch(`/api/v1/rooms?propertyId=${selectedProperty.id}`);
        if (res.ok) {
          const roomsData = await res.json();
          if (Array.isArray(roomsData)) {
            setPropertyRooms(
              roomsData.map((r: any) => ({
                id: r.id,
                number: r.number,
                floor: r.floor,
                roomTypeName: r.roomType?.name || "Room",
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to load rooms for property:", err);
      }
    };

    loadRooms();
  }, [selectedProperty]);

  // Switch Property Handler
  const handleSelectProperty = (prop: PropertySummary) => {
    setSelectedProperty(prop);
    setShowPropertyMenu(false);
    setSubmitError(null);
    setSubmitSuccess(null);
    // Reset preassigned room when property changes
    setFormData((prev) => ({ ...prev, preAssignedRoom: "" }));
  };

  // Sync Canvas Resolution to exact rendered size to eliminate any touch-to-ink offset
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

  // Exact Pixel-Accurate Coordinate Calculation
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

  const isAmbarish = selectedProperty?.code === "GUW-01" || selectedProperty?.displayName.includes("Ambarish");

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

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = isAmbarish ? "#10b981" : "#38bdf8"; // Emerald for Ambarish, Sky Blue for Divine View
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

  // Client-side image compression
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
        setSubmitError("Connection timed out. Please check your Wi-Fi signal and try again.");
      } else {
        setSubmitError(err.message || "Failed to submit check-in. Please ensure you are connected to the Hotel Wi-Fi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isDark = theme === "dark";

  // SUCCESS SCREEN
  if (submitSuccess) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-[#09090b] text-zinc-100" : "bg-[#f8fafc] text-slate-900"} flex items-center justify-center p-4 transition-colors`}>
        <div className={`w-full max-w-lg rounded-2xl ${isDark ? "bg-[#121215] border border-zinc-800" : "bg-white border border-slate-200 shadow-xl"} p-8 text-center space-y-6`}>
          <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full ${
            isAmbarish ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
          }`}>
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <div className={`text-xs font-mono uppercase tracking-widest font-semibold ${
              isAmbarish ? "text-emerald-400" : "text-blue-400"
            }`}>
              {selectedProperty?.displayName || "Hotel"}
            </div>
            <h1 className="text-xl font-bold">Check-In Registration Confirmed</h1>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
              Your registration card has been submitted directly to the {selectedProperty?.displayName} reception desk.
            </p>
          </div>

          <div className={`rounded-xl ${isDark ? "bg-zinc-900 border border-zinc-800" : "bg-slate-50 border border-slate-200"} p-4 text-left font-mono space-y-2.5 text-xs`}>
            <div className={`flex justify-between border-b ${isDark ? "border-zinc-800" : "border-slate-200"} pb-2`}>
              <span className={isDark ? "text-zinc-500" : "text-slate-500"}>GRC Document #</span>
              <span className={`font-bold ${isAmbarish ? "text-emerald-400" : "text-blue-400"}`}>{submitSuccess.registrationNo}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-zinc-500" : "text-slate-500"}>Guest Name</span>
              <span className="font-semibold text-zinc-100">{submitSuccess.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-zinc-500" : "text-slate-500"}>Arrival Time</span>
              <span>{submitSuccess.arrivalDateTime}</span>
            </div>
            {submitSuccess.preAssignedRoom && (
              <div className="flex justify-between">
                <span className={isDark ? "text-zinc-500" : "text-slate-500"}>Allocated / Requested Room</span>
                <span className="text-emerald-400 font-semibold">Room {submitSuccess.preAssignedRoom}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-800 pt-2 text-[11px]">
              <span className={isDark ? "text-zinc-500" : "text-slate-500"}>Hotel GSTIN</span>
              <span className="text-zinc-400">{selectedProperty?.gstin || "18AAAAA1234A1Z5"}</span>
            </div>
          </div>

          {/* Shared Dining Notice */}
          <div className={`p-3 rounded-lg border text-left text-xs space-y-1 ${
            isDark ? "bg-amber-500/5 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-900"
          }`}>
            <div className="font-semibold flex items-center gap-1.5">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              <span>Shared Dining: Ambarish Restaurant & Room Dining</span>
            </div>
            <p className="text-[11px] opacity-90">
              You can order food to your room anytime via the QR code portal or by dialing Extension 9 from your room phone.
            </p>
          </div>

          <div className={`p-3.5 rounded-lg ${isDark ? "bg-zinc-900 border border-zinc-800 text-zinc-300" : "bg-slate-100 border border-slate-200 text-slate-800"} text-xs text-center`}>
            Please show this screen at the front desk to collect your sanitized key card.
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmitSuccess(null);
              clearSignature();
            }}
            className={`w-full rounded-lg ${
              isAmbarish
                ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                : isDark
                ? "bg-zinc-100 text-zinc-950 hover:bg-white"
                : "bg-slate-900 text-white hover:bg-slate-800"
            } px-4 py-3 text-xs font-semibold transition shadow-md`}
          >
            Start New Check-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#09090b] text-zinc-100" : "bg-[#f8fafc] text-slate-900"} py-6 px-4 sm:px-6 transition-colors duration-200`}>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Top Navigation & Property Badge Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
          {/* Property Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPropertyMenu(!showPropertyMenu)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border transition shadow-sm ${
                isAmbarish
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-emerald-400"
                  : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700"
              }`}
              title="Click to switch hotel kiosk"
            >
              <Building2 className={`h-4 w-4 ${isAmbarish ? "text-emerald-400" : "text-blue-400"}`} />
              <div className="text-left">
                <span className="font-bold">{selectedProperty?.displayName || "Select Hotel"}</span>
                <span className="ml-1 text-[10px] font-mono opacity-60">({selectedProperty?.code})</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>

            {showPropertyMenu && (
              <div className="absolute left-0 mt-1.5 w-72 rounded-xl border border-zinc-800 bg-[#121215] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Switch Hotel Kiosk
                </div>
                {availableProperties.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProperty(p)}
                    className={`w-full text-left rounded-lg p-2.5 text-xs flex items-center justify-between transition mt-1 ${
                      p.id === selectedProperty?.id
                        ? p.code === "GUW-01"
                          ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40"
                          : "bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/40"
                        : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{p.displayName}</span>
                        {p.code === "GUW-01" && (
                          <span className="rounded bg-emerald-500/30 px-1 py-0.2 text-[9px] text-emerald-300 font-mono">
                            Ambarish
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {p.code} • {p.phone || "+91 69017 41211"}
                      </div>
                    </div>
                    {p.id === selectedProperty?.id && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
              isDark
                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
            }`}
            title="Toggle Light / Dark Mode"
          >
            {isDark ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-600" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>

        {/* Dynamic Hotel Header & Hero Banner */}
        <div
          className={`rounded-2xl border p-5 sm:p-6 transition-all ${
            isAmbarish
              ? isDark
                ? "bg-gradient-to-br from-emerald-950/40 via-[#111817] to-[#09090b] border-emerald-500/30 shadow-lg shadow-emerald-950/20"
                : "bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-emerald-200 shadow-sm"
              : isDark
              ? "bg-gradient-to-br from-amber-950/30 via-[#161311] to-[#09090b] border-amber-500/30 shadow-lg shadow-amber-950/20"
              : "bg-gradient-to-br from-amber-50 via-orange-50 to-white border-amber-200 shadow-sm"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${
                    isAmbarish
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  {isAmbarish ? "Riverfront Luxury & In-City Retreat" : "Premium Station Road Stay"}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  GSTIN: {selectedProperty?.gstin || "18AAAAA1234A1Z5"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {selectedProperty?.displayName || "HOTEL AMBARISH GRAND RESIDENCY"}
              </h1>
              <p className={`text-xs flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span>
                  {selectedProperty?.address ||
                    "M.D. Shah Road, Paltan Bazar, Near Assam Finance Corporation, Guwahati - 781008, Assam"}
                </span>
              </p>
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-[11px] font-mono text-zinc-400">Reception Desk</div>
              <div className="text-xs font-semibold text-zinc-200 flex items-center justify-end gap-1">
                <Phone className="h-3 w-3 text-emerald-400" />
                <span>{selectedProperty?.phone || "+91 69017 41211"}</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Ext: 555 (Front Desk)</div>
            </div>
          </div>

          {/* Shared Restaurant Notice Badge */}
          <div
            className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
              isAmbarish ? "border-emerald-900/40 text-emerald-300" : "border-amber-900/40 text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="font-semibold">Shared F&B: Ambarish Restaurant & Room Dining</span>
            </div>
            <span className="text-[11px] opacity-80">Serving 93 Gourmet Dishes to your room (Dial Ext 9)</span>
          </div>
        </div>

        {/* Main Check-In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. PRIMARY GUEST DETAILS */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 flex items-center justify-between ${
              isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"
            }`}>
              <span>1. Primary Guest Details</span>
              <span className="text-[10px] text-zinc-500 font-normal">Fields with * are mandatory</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Arrival Date & Time *</label>
                <input
                  type="text"
                  required
                  value={formData.arrivalDateTime}
                  onChange={(e) => setFormData({ ...formData, arrivalDateTime: e.target.value })}
                  placeholder="22-08-2026 12:30"
                  className={`mt-1 w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Full Name (Block Letters) *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                  placeholder="e.g. ANUPAM ROY"
                  className={`mt-1 w-full rounded-md px-3 py-2 uppercase tracking-wide focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Age *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="35"
                    className={`mt-1 w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                      isDark
                        ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-emerald-500"
                        : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white"
                    }`}
                  />
                </div>
                <div>
                  <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                      isDark
                        ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-emerald-500"
                        : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white"
                    }`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Nationality *</label>
                <input
                  type="text"
                  required
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="Indian"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Father / Spouse Name</label>
                <input
                  type="text"
                  value={formData.fatherSpouseName}
                  onChange={(e) => setFormData({ ...formData, fatherSpouseName: e.target.value })}
                  placeholder="Full Name of Father or Spouse"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              {/* Room Selection with Property-Specific Room Options */}
              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>
                  Pre-Assigned / Preferred Room ({selectedProperty?.displayName})
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={formData.preAssignedRoom}
                    onChange={(e) => setFormData({ ...formData, preAssignedRoom: e.target.value })}
                    placeholder={
                      isAmbarish
                        ? "e.g. 101, 205 (Executive Club / Deluxe)"
                        : "e.g. 201, 304 (Staff can allocate at Desk)"
                    }
                    className={`w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                      isDark
                        ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                        : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                    }`}
                  />
                  {propertyRooms.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                      <span className="text-zinc-500">Quick Select:</span>
                      {propertyRooms.slice(0, 6).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, preAssignedRoom: r.number })}
                          className={`rounded px-1.5 py-0.2 font-mono border transition ${
                            formData.preAssignedRoom === r.number
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {r.number} ({r.roomTypeName.split(" ")[0]})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. RESIDENTIAL ADDRESS */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 ${
              isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"
            }`}>
              2. Permanent Residential Address
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Street Address / House No.</label>
                <input
                  type="text"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  placeholder="Apartment, Flat No, Street"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>City / Town</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Kolkata / Mumbai / Guwahati"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Assam / West Bengal"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>PIN / Zip Code</label>
                <input
                  type="text"
                  value={formData.pinZipCode}
                  onChange={(e) => setFormData({ ...formData, pinZipCode: e.target.value })}
                  placeholder="781008"
                  className={`mt-1 w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="India"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 3. CONTACT & TRAVEL */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 ${
              isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"
            }`}>
              3. Contact & Travel Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.mobilePhone}
                  onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className={`mt-1 w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="guest@example.com"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Arrived From</label>
                <input
                  type="text"
                  value={formData.arrivedFrom}
                  onChange={(e) => setFormData({ ...formData, arrivedFrom: e.target.value })}
                  placeholder="e.g. Airport / Railway Station / Shillong"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Next Destination / Going To</label>
                <input
                  type="text"
                  value={formData.goingTo}
                  onChange={(e) => setFormData({ ...formData, goingTo: e.target.value })}
                  placeholder="e.g. Kaziranga / Shillong / Home"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Purpose of Visit</label>
                <select
                  value={formData.purposeOfVisit}
                  onChange={(e) => setFormData({ ...formData, purposeOfVisit: e.target.value })}
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white"
                  }`}
                >
                  <option value="Tourism / Holiday">Tourism / Holiday</option>
                  <option value="Business / Work">Business / Work</option>
                  <option value="Medical">Medical Visit</option>
                  <option value="Transit">Transit / Layover</option>
                  <option value="Family Function">Family / Event</option>
                </select>
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Vehicle Number (If Any)</label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. AS-01-AB-1234"
                  className={`mt-1 w-full rounded-md px-3 py-2 uppercase font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 4. OTHER PAX (CO-GUESTS) */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`flex items-center justify-between border-b pb-2 ${
              isDark ? "border-zinc-800" : "border-slate-100"
            }`}>
              <div className={`text-xs font-semibold uppercase tracking-wider font-mono ${
                isDark ? "text-zinc-200" : "text-slate-800"
              }`}>
                4. Accompanying Guests ({formData.coGuests.length})
              </div>

              {!showCoGuestInput && (
                <button
                  type="button"
                  onClick={() => setShowCoGuestInput(true)}
                  className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition ${
                    isAmbarish
                      ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      : isDark
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Co-Guest
                </button>
              )}
            </div>

            {formData.coGuests.length > 0 ? (
              <div className="space-y-2">
                {formData.coGuests.map((cg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                      isDark ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{cg.name}</div>
                      <div className={`text-[11px] font-mono ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                        {cg.age} yrs • {cg.gender} • {cg.relation} • {cg.idType}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCoGuest(idx)}
                      className="p-1 text-zinc-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !showCoGuestInput && (
                <div className={`text-center py-2 text-xs italic ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
                  No accompanying co-guests added.
                </div>
              )
            )}

            {showCoGuestInput && (
              <div className={`p-3.5 rounded-lg border space-y-2.5 text-xs ${
                isDark ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="font-semibold">Co-Guest Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={coGuestForm.name}
                    onChange={(e) => setCoGuestForm({ ...coGuestForm, name: e.target.value.toUpperCase() })}
                    className={`rounded px-2.5 py-1.5 uppercase ${
                      isDark ? "bg-zinc-950 border border-zinc-800 text-zinc-100" : "bg-white border border-slate-300 text-slate-900"
                    }`}
                  />
                  <input
                    type="number"
                    placeholder="Age"
                    value={coGuestForm.age}
                    onChange={(e) => setCoGuestForm({ ...coGuestForm, age: e.target.value })}
                    className={`rounded px-2.5 py-1.5 font-mono ${
                      isDark ? "bg-zinc-950 border border-zinc-800 text-zinc-100" : "bg-white border border-slate-300 text-slate-900"
                    }`}
                  />
                  <select
                    value={coGuestForm.gender}
                    onChange={(e) => setCoGuestForm({ ...coGuestForm, gender: e.target.value })}
                    className={`rounded px-2.5 py-1.5 ${
                      isDark ? "bg-zinc-950 border border-zinc-800 text-zinc-100" : "bg-white border border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Child">Child</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={coGuestForm.relation}
                    onChange={(e) => setCoGuestForm({ ...coGuestForm, relation: e.target.value })}
                    className={`rounded px-2.5 py-1.5 ${
                      isDark ? "bg-zinc-950 border border-zinc-800 text-zinc-100" : "bg-white border border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                  </select>
                  <select
                    value={coGuestForm.idType}
                    onChange={(e) => setCoGuestForm({ ...coGuestForm, idType: e.target.value })}
                    className={`rounded px-2.5 py-1.5 ${
                      isDark ? "bg-zinc-950 border border-zinc-800 text-zinc-100" : "bg-white border border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="AADHAAR">Aadhaar</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                    <option value="VOTER_ID">Voter ID</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCoGuestInput(false)}
                    className="px-2.5 py-1 rounded text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCoGuest}
                    className={`px-3 py-1 rounded font-semibold transition ${
                      isAmbarish
                        ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                        : isDark
                        ? "bg-zinc-100 text-zinc-950 hover:bg-white"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Save Co-Guest
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. GOVERNMENT ID UPLOAD */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 ${
              isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"
            }`}>
              5. Government ID Verification
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>ID Document Type</label>
                <select
                  value={formData.idDocumentType}
                  onChange={(e) => setFormData({ ...formData, idDocumentType: e.target.value })}
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white"
                  }`}
                >
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="PASSPORT">Passport (Required for Foreign Nationals)</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="VOTER_ID">Voter ID</option>
                </select>
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>ID Document Number (Optional)</label>
                <input
                  type="text"
                  value={formData.idDocumentNumber}
                  onChange={(e) => setFormData({ ...formData, idDocumentNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. XXXX-XXXX-1234"
                  className={`mt-1 w-full rounded-md px-3 py-2 uppercase font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white"
                  }`}
                />
              </div>
            </div>

            <div className={`border-2 border-dashed rounded-xl p-4 text-center transition ${
              isDark ? "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700" : "border-slate-300 bg-slate-50 hover:border-slate-400"
            }`}>
              {formData.idPhotoUrl ? (
                <div className="space-y-3">
                  <div className={`relative inline-block max-w-xs rounded-lg overflow-hidden border shadow-md ${
                    isDark ? "border-zinc-700" : "border-slate-300"
                  }`}>
                    <img src={formData.idPhotoUrl} alt="ID Document" className="max-h-44 object-contain" />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, idPhotoUrl: "" })}
                      className="inline-flex items-center gap-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-1 text-xs font-medium"
                    >
                      <Trash2 className="h-3 w-3" /> Remove & Retake Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`inline-flex p-3 rounded-full ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-slate-200 text-slate-700"}`}>
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-semibold">
                    {compressingPhoto ? "Optimizing image size..." : "Capture or Upload Government ID Photo"}
                  </div>
                  <p className={`text-[11px] ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
                    {compressingPhoto
                      ? "Compressing camera image for instant Wi-Fi submission..."
                      : "Capture via mobile camera or upload from device gallery."}
                  </p>
                  <label className={`inline-block mt-2 cursor-pointer rounded-lg px-4 py-2 text-xs font-medium transition ${
                    compressingPhoto
                      ? "opacity-50 pointer-events-none bg-zinc-800 text-zinc-400"
                      : isAmbarish
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                      : isDark
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                  }`}>
                    {compressingPhoto ? "Processing..." : "Take Photo / Select File"}
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
              )}
            </div>
          </div>

          {/* 6. SIGNATURE & HOUSE RULES */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 ${
              isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"
            }`}>
              6. Terms & Guest Digital Signature
            </div>

            {/* Policy Box tailored to property */}
            <div className={`rounded-lg p-3.5 text-[11px] space-y-1.5 leading-relaxed ${
              isDark ? "bg-zinc-900 border border-zinc-800 text-zinc-400" : "bg-slate-50 border border-slate-200 text-slate-600"
            }`}>
              <div className={`font-bold uppercase text-[10px] tracking-wider font-mono flex items-center justify-between ${
                isAmbarish ? "text-emerald-400" : "text-blue-400"
              }`}>
                <span>{selectedProperty?.displayName} — GUEST HOUSE RULES:</span>
                <span>Check-Out: 11:00 AM</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Check-out Time:</strong> Standard check-out is 11:00 AM. Late check-out is subject to room availability and front desk approval.</li>
                <li><strong>Government ID:</strong> Physical ID must be presented upon room key handover as mandated by Assam Police / Local Authorities.</li>
                <li><strong>Valuables:</strong> Management is not liable for loss or damage to cash or valuables left unattended. In-room lockers are available.</li>
                <li><strong>Shared Restaurant:</strong> Room dining orders placed via our QR portal will be prepared by Ambarish Restaurant & Room Dining and posted directly to your room folio.</li>
              </ul>
            </div>

            {/* Signature Area */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <label className={`font-medium ${isDark ? "text-zinc-300" : "text-slate-700"}`}>
                  Signature of Primary Guest *
                </label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className={`flex items-center gap-1 text-[11px] transition ${
                    isDark ? "text-zinc-400 hover:text-zinc-200" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <RotateCcw className="h-3 w-3" /> Clear Signature
                </button>
              </div>

              {/* Canvas */}
              <div className={`relative rounded-lg border overflow-hidden touch-none select-none ${
                isDark ? "border-zinc-700 bg-zinc-950" : "border-slate-300 bg-slate-50"
              }`}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 cursor-crosshair block"
                />

                {!hasSignature && (
                  <div className={`absolute inset-0 flex items-center justify-center pointer-events-none text-xs italic ${
                    isDark ? "text-zinc-600" : "text-slate-400"
                  }`}>
                    Sign inside the box using your finger, stylus, or mouse
                  </div>
                )}
              </div>
            </div>

            {/* Consent Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer text-xs pt-1">
              <input
                type="checkbox"
                required
                checked={formData.termsAccepted}
                onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                className={`mt-0.5 rounded ${isAmbarish ? "text-emerald-500 focus:ring-emerald-500" : "text-blue-600 focus:ring-blue-500"}`}
              />
              <span className={isDark ? "text-zinc-300" : "text-slate-700"}>
                I certify that all details supplied above are accurate and true. I agree to abide by the rules of {selectedProperty?.displayName || "the hotel"}.
              </span>
            </label>
          </div>

          {submitError && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-xl py-3.5 text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md ${
              isAmbarish
                ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/20"
                : isDark
                ? "bg-zinc-100 hover:bg-white text-zinc-950"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            {submitting ? (
              <span>Submitting Registration to {selectedProperty?.displayName}...</span>
            ) : (
              <>
                <span>Complete Digital Check-In</span>
                <ArrowRight className="h-4 w-4" />
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
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center">
          <div className="text-sm font-mono text-zinc-400">Loading Guest Check-In Kiosk...</div>
        </div>
      }
    >
      <CheckInKioskInner />
    </Suspense>
  );
}
