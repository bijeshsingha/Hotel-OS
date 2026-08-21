"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";

export default function CheckInKioskPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [hotelName, setHotelName] = useState("HOTEL DIVINE VIEW");
  const [propertyId, setPropertyId] = useState("");

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
    pinZipCode: "110001",
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

  // Initialize arrival date/time & load hotel name
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

    fetch("/api/v1/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.activeProperty) {
          setHotelName(data.activeProperty.displayName.toUpperCase());
          setPropertyId(data.activeProperty.id);
        }
      })
      .catch(() => {});
  }, []);

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
    ctx.strokeStyle = theme === "dark" ? "#38bdf8" : "#0284c7"; // Sky Blue in dark, Classic Blue in light
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

  // Client-side image compression to ensure lightning-fast upload even on 48MP mobile cameras
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

  // Image Upload / Capture with Auto-Compression
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
          propertyId: propertyId || undefined,
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
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <div className={`text-xs font-mono uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>{hotelName}</div>
            <h1 className="text-xl font-bold">Check-in Registration Received</h1>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
              Thank you for registering. Your details have been submitted to the front desk.
            </p>
          </div>

          <div className={`rounded-xl ${isDark ? "bg-zinc-900 border border-zinc-800" : "bg-slate-50 border border-slate-200"} p-4 text-left font-mono space-y-2 text-xs`}>
            <div className={`flex justify-between border-b ${isDark ? "border-zinc-800" : "border-slate-200"} pb-2`}>
              <span className={isDark ? "text-zinc-500" : "text-slate-500"}>Registration #</span>
              <span className="font-bold text-blue-500">{submitSuccess.registrationNo}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-zinc-500" : "text-slate-500"}>Guest Name</span>
              <span className="font-semibold">{submitSuccess.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-zinc-500" : "text-slate-500"}>Arrival Time</span>
              <span>{submitSuccess.arrivalDateTime}</span>
            </div>
            {submitSuccess.preAssignedRoom && (
              <div className="flex justify-between">
                <span className={isDark ? "text-zinc-500" : "text-slate-500"}>Requested Room</span>
                <span className="text-emerald-500 font-semibold">{submitSuccess.preAssignedRoom}</span>
              </div>
            )}
          </div>

          <div className={`p-3.5 rounded-lg ${isDark ? "bg-zinc-900 border border-zinc-800 text-zinc-300" : "bg-blue-50 border border-blue-100 text-blue-900"} text-xs text-center`}>
            Please proceed to the reception counter to collect your room key.
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmitSuccess(null);
              clearSignature();
            }}
            className={`w-full rounded-lg ${isDark ? "bg-zinc-100 text-zinc-950 hover:bg-white" : "bg-slate-900 text-white hover:bg-slate-800"} px-4 py-3 text-xs font-semibold transition`}
          >
            Start New Check-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#09090b] text-zinc-100" : "bg-[#f8fafc] text-slate-900"} py-8 px-4 sm:px-6 transition-colors duration-200`}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Bar: Hotel Name Header + Clean Theme Toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{hotelName}</h1>
            <p className={`text-xs font-mono tracking-wider uppercase ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
              Guest Check-In Kiosk
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. PRIMARY GUEST DETAILS */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 ${isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"}`}>
              Primary Guest Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Arrival Date & Time *</label>
                <input
                  type="text"
                  required
                  value={formData.arrivalDateTime}
                  onChange={(e) => setFormData({ ...formData, arrivalDateTime: e.target.value })}
                  placeholder="20-08-2026 18:43"
                  className={`mt-1 w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
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
                  placeholder="e.g. ROBERT JOHN SMITH"
                  className={`mt-1 w-full rounded-md px-3 py-2 uppercase tracking-wide focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
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
                        ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-zinc-600"
                        : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-500 focus:bg-white"
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
                        ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-zinc-600"
                        : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-500 focus:bg-white"
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
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-500 focus:bg-white"
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
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Room Number (If Pre-Assigned)</label>
                <input
                  type="text"
                  value={formData.preAssignedRoom}
                  onChange={(e) => setFormData({ ...formData, preAssignedRoom: e.target.value })}
                  placeholder="e.g. 304 (Staff can assign at Desk)"
                  className={`mt-1 w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 2. RESIDENTIAL ADDRESS */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 ${isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"}`}>
              Residential Address
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Street Address</label>
                <input
                  type="text"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  placeholder="House / Flat No., Building, Street"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City / Town"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>PIN / Zip Code</label>
                <input
                  type="text"
                  value={formData.pinZipCode}
                  onChange={(e) => setFormData({ ...formData, pinZipCode: e.target.value })}
                  placeholder="110001"
                  className={`mt-1 w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State / Province"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
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
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 3. TRAVEL & REFERRAL CHANNEL */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 ${isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"}`}>
              Travel & Referral Channel
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Arrived From</label>
                <input
                  type="text"
                  value={formData.arrivedFrom}
                  onChange={(e) => setFormData({ ...formData, arrivedFrom: e.target.value })}
                  placeholder="City arrived from"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Going To</label>
                <input
                  type="text"
                  value={formData.goingTo}
                  onChange={(e) => setFormData({ ...formData, goingTo: e.target.value })}
                  placeholder="Next destination"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
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
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-500 focus:bg-white"
                  }`}
                >
                  <option value="Tourism / Holiday">Tourism / Holiday</option>
                  <option value="Business / Work">Business / Work</option>
                  <option value="Medical">Medical</option>
                  <option value="Transit">Transit</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>How Did You Hear About Us?</label>
                <select
                  value={formData.referralChannel}
                  onChange={(e) => setFormData({ ...formData, referralChannel: e.target.value })}
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-500 focus:bg-white"
                  }`}
                >
                  <option value="🔍 Google Search / Maps">🔍 Google Search / Maps</option>
                  <option value="MakeMyTrip / Goibibo">MakeMyTrip / Goibibo</option>
                  <option value="Booking.com">Booking.com</option>
                  <option value="Friend / Recommendation">Friend / Recommendation</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Social Media">Social Media</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. CONTACT & VEHICLE INFO */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 ${isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"}`}>
              Contact & Vehicle Info
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={formData.mobilePhone}
                  onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className={`mt-1 w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Alternate Phone / Landline</label>
                <input
                  type="text"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  placeholder="Landline number"
                  className={`mt-1 w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
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
                  className={`mt-1 w-full rounded-md px-3 py-2 font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Driver Name (If Any)</label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  placeholder="Driver's Full Name"
                  className={`mt-1 w-full rounded-md px-3 py-2 focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={isDark ? "text-zinc-400" : "text-slate-600"}>Car / Vehicle Number</label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. DL 01 AB 1234"
                  className={`mt-1 w-full rounded-md px-3 py-2 uppercase font-mono focus:outline-none transition ${
                    isDark
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-600"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 5. OTHER PAX (CO-GUESTS) */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`flex items-center justify-between border-b pb-2 ${isDark ? "border-zinc-800" : "border-slate-100"}`}>
              <div className={`text-xs font-semibold uppercase tracking-wider font-mono ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
                Other Pax ({formData.coGuests.length})
              </div>

              {!showCoGuestInput && (
                <button
                  type="button"
                  onClick={() => setShowCoGuestInput(true)}
                  className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition ${
                    isDark
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
                  No co-guests added yet.
                </div>
              )
            )}

            {showCoGuestInput && (
              <div className={`p-3.5 rounded-lg border space-y-2.5 text-xs ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
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
                      isDark ? "bg-zinc-100 text-zinc-950 hover:bg-white" : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. GOVERNMENT ID UPLOAD */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 ${isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"}`}>
              Government ID Upload
            </div>

            <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
              Please provide a photo of your Government ID (Aadhaar, Passport, DL, etc.).
            </p>

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
                      className="inline-flex items-center gap-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-1 text-xs"
                    >
                      <Trash2 className="h-3 w-3" /> Remove & Retake
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`inline-flex p-3 rounded-full ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-slate-200 text-slate-700"}`}>
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-semibold">
                    {compressingPhoto ? "Optimizing photo..." : "Upload or Capture ID"}
                  </div>
                  <p className={`text-[11px] ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
                    {compressingPhoto
                      ? "Compressing camera image for instant Wi-Fi submission..."
                      : "Take a photo using your mobile camera or upload an image file."}
                  </p>
                  <label className={`inline-block mt-2 cursor-pointer rounded-lg px-4 py-2 text-xs font-medium transition ${
                    compressingPhoto
                      ? "opacity-50 pointer-events-none bg-zinc-800 text-zinc-400"
                      : isDark
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                  }`}>
                    {compressingPhoto ? "Processing Image..." : "Upload / Camera"}
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

          {/* 7. ACCURATE SIGNATURE AREA & TERMS (LIKE BEFORE) */}
          <div className={`rounded-xl ${isDark ? "bg-[#111114] border border-zinc-800" : "bg-white border border-slate-200 shadow-sm"} p-5 space-y-3.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wider font-mono border-b pb-2 ${isDark ? "text-zinc-200 border-zinc-800" : "text-slate-800 border-slate-100"}`}>
              Terms & Guest Signature
            </div>

            {/* Policy Box */}
            <div className={`rounded-lg p-3.5 text-[11px] space-y-1.5 leading-relaxed ${
              isDark ? "bg-zinc-900 border border-zinc-800 text-zinc-400" : "bg-slate-50 border border-slate-200 text-slate-600"
            }`}>
              <div className={`font-semibold uppercase text-[10px] tracking-wider font-mono ${isDark ? "text-zinc-200" : "text-slate-800"}`}>
                GUESTS TO PLEASE NOTE:
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Check-out Time:</strong> Standard check-out time is 11:00 AM. Late check-out requires prior approval from reception.</li>
                <li><strong>Government Identity Verification:</strong> Guests must produce a valid physical government photo ID upon check-in. Foreign nationals must present a valid Passport & Visa.</li>
                <li><strong>Valuables:</strong> Management is not liable for loss or damage to cash or valuables left unmonitored in guest rooms. In-room safes are provided.</li>
                <li><strong>Prohibitions:</strong> Hazardous items, weapons, illegal substances, and non-designated smoking are strictly prohibited.</li>
              </ul>
            </div>

            {/* Clean Signature Area */}
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
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
              </div>

              {/* Exact Pixel-Mapped Canvas */}
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
                className="mt-0.5 rounded border-zinc-700 text-blue-600"
              />
              <span className={isDark ? "text-zinc-300" : "text-slate-700"}>
                I certify that all information provided above is true and correct. I agree to abide by the hotel rules and regulations.
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
            className={`w-full rounded-xl py-3.5 text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md ${
              isDark
                ? "bg-zinc-100 hover:bg-white text-zinc-950"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            {submitting ? (
              <span>Submitting Registration...</span>
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
