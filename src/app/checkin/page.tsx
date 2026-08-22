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
  Camera,
  MapPin,
  Phone,
  Clock,
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

  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [selectedProperty, setSelectedProperty] = useState<PropertySummary | null>(null);
  const [propertyRooms, setPropertyRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    arrivalDateTime: "",
    fullName: "",
    age: "32",
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
    // Travel Details
    arrivedFrom: "",
    goingTo: "",
    purposeOfVisit: "Tourism / Holiday",
    referralChannel: "Direct / Walk-In",
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

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = theme === "dark" ? "#ffffff" : "#09090b";
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

  const isDark = theme === "dark";

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-[#09090b] text-white" : "bg-[#f4f4f5] text-zinc-950"} flex items-center justify-center`}>
        <div className="flex items-center gap-3 text-sm font-mono font-medium">
          <div className={`h-5 w-5 rounded-full border-2 ${isDark ? "border-white" : "border-zinc-900"} border-t-transparent animate-spin`} />
          <span>Loading Check-In Kiosk...</span>
        </div>
      </div>
    );
  }

  // SUCCESS SCREEN
  if (submitSuccess) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-[#09090b] text-white" : "bg-[#f4f4f5] text-zinc-950"} flex items-center justify-center p-4 sm:p-6 transition-colors`}>
        <div className={`w-full max-w-lg rounded-2xl ${isDark ? "bg-[#121215] border border-zinc-800" : "bg-white border border-zinc-300 shadow-xl"} p-8 text-center space-y-6`}>
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <div className={`text-xs font-mono uppercase tracking-widest font-bold ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              {selectedProperty?.displayName}
            </div>
            <h1 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-950"}`}>
              Check-In Confirmed
            </h1>
            <p className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              Your registration card has been submitted directly to the front desk.
            </p>
          </div>

          <div className={`rounded-xl ${isDark ? "bg-[#18181b] border border-zinc-800" : "bg-zinc-50 border border-zinc-300"} p-5 text-left font-mono space-y-3 text-xs`}>
            <div className={`flex justify-between border-b ${isDark ? "border-zinc-800" : "border-zinc-200"} pb-2.5`}>
              <span className={`font-semibold ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>GRC Document #</span>
              <span className={`font-black text-sm ${isDark ? "text-white" : "text-zinc-950"}`}>{submitSuccess.registrationNo}</span>
            </div>
            <div className="flex justify-between">
              <span className={`font-semibold ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Guest Name</span>
              <span className={`font-bold ${isDark ? "text-white" : "text-zinc-950"}`}>{submitSuccess.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className={`font-semibold ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Arrival Date & Time</span>
              <span className={`font-bold ${isDark ? "text-zinc-200" : "text-zinc-900"}`}>{submitSuccess.arrivalDateTime}</span>
            </div>
            {submitSuccess.preAssignedRoom && (
              <div className="flex justify-between">
                <span className={`font-semibold ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Requested Room</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Room {submitSuccess.preAssignedRoom}</span>
              </div>
            )}
          </div>

          <div className={`p-4 rounded-xl ${isDark ? "bg-[#18181b] text-zinc-200 border border-zinc-800" : "bg-zinc-100 text-zinc-900 border border-zinc-300"} text-xs font-medium leading-relaxed`}>
            Please show this confirmation screen at the reception counter to receive your room key card.
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmitSuccess(null);
              clearSignature();
            }}
            className={`w-full rounded-xl py-3.5 text-xs font-bold transition shadow-md ${
              isDark
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-950 text-white hover:bg-zinc-800"
            }`}
          >
            Start New Check-In
          </button>
        </div>
      </div>
    );
  }

  const inputStyles = `w-full rounded-lg px-3.5 py-2.5 text-xs transition font-medium focus:outline-none focus:ring-2 ${
    isDark
      ? "bg-[#18181b] border border-zinc-700 text-white placeholder-zinc-500 focus:border-white focus:ring-zinc-600"
      : "bg-white border border-zinc-300 text-zinc-950 placeholder-zinc-400 focus:border-zinc-950 focus:ring-zinc-950/20"
  }`;

  const cardStyles = `rounded-2xl p-6 transition ${
    isDark
      ? "bg-[#121215] border border-zinc-800"
      : "bg-white border border-zinc-300 shadow-sm"
  }`;

  const labelStyles = `block text-xs font-bold mb-1.5 ${
    isDark ? "text-zinc-200" : "text-zinc-900"
  }`;

  const sectionHeaderStyles = `text-xs font-mono uppercase tracking-widest font-black pb-3 mb-4 border-b flex items-center justify-between ${
    isDark ? "text-zinc-200 border-zinc-800" : "text-zinc-950 border-zinc-300"
  }`;

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#09090b] text-white" : "bg-[#f4f4f5] text-zinc-950"} py-8 px-4 sm:px-6 transition-colors`}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Header */}
        <div className={`flex items-center justify-between pb-4 border-b ${isDark ? "border-zinc-800" : "border-zinc-300"}`}>
          <div>
            <div className={`text-[11px] font-mono uppercase tracking-widest font-bold ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              Self-Service Check-In
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight mt-0.5 ${isDark ? "text-white" : "text-zinc-950"}`}>
              {selectedProperty?.displayName || "Hotel Check-In"}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition ${
              isDark
                ? "bg-[#18181b] border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                : "bg-white border-zinc-300 text-zinc-950 hover:bg-zinc-100 shadow-sm"
            }`}
            title="Toggle theme"
          >
            {isDark ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-zinc-800" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>

        {/* Hotel Details Card */}
        <div className={cardStyles}>
          <div className="space-y-2">
            <h2 className={`text-base font-black ${isDark ? "text-white" : "text-zinc-950"}`}>
              {selectedProperty?.displayName}
            </h2>
            {selectedProperty?.address && (
              <p className={`text-xs font-medium flex items-start gap-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-80" />
                <span>{selectedProperty.address}</span>
              </p>
            )}
            <div className={`flex flex-wrap gap-4 pt-1 text-xs font-mono font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
              {selectedProperty?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Reception: {selectedProperty.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Check-Out: 11:00 AM
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Primary Guest Details */}
          <div className={cardStyles}>
            <div className={sectionHeaderStyles}>
              <span>01. Primary Guest Information</span>
              <span className="text-[10px] font-mono lowercase opacity-70 font-normal">required *</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelStyles}>Full Name (Block Letters) *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                  placeholder="e.g. ANUPAM ROY"
                  className={`${inputStyles} uppercase font-bold`}
                />
              </div>

              <div>
                <label className={labelStyles}>Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.mobilePhone}
                  onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className={`${inputStyles} font-mono`}
                />
              </div>

              <div>
                <label className={labelStyles}>Arrival Date & Time *</label>
                <input
                  type="text"
                  required
                  value={formData.arrivalDateTime}
                  onChange={(e) => setFormData({ ...formData, arrivalDateTime: e.target.value })}
                  className={`${inputStyles} font-mono`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelStyles}>Age *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
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
                  placeholder="e.g. 101, 205 (or leave blank for front desk assignment)"
                  className={`${inputStyles} font-mono`}
                />
                {propertyRooms.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={`text-[11px] font-bold ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                      Available Rooms:
                    </span>
                    {propertyRooms.slice(0, 8).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, preAssignedRoom: r.number })}
                        className={`rounded-md px-2 py-1 text-[11px] font-mono border transition ${
                          formData.preAssignedRoom === r.number
                            ? isDark
                              ? "bg-white text-zinc-950 font-bold border-white"
                              : "bg-zinc-950 text-white font-bold border-zinc-950"
                            : isDark
                            ? "bg-[#18181b] border-zinc-700 text-zinc-200 hover:border-zinc-500"
                            : "bg-zinc-100 border-zinc-300 text-zinc-900 hover:bg-zinc-200 font-medium"
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
            <div className={sectionHeaderStyles}>
              <span>02. Permanent Residential Address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelStyles}>Street Address</label>
                <input
                  type="text"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  placeholder="House/Flat No., Road/Street"
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
            <div className={sectionHeaderStyles}>
              <span>03. Government ID & Travel</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  placeholder="e.g. XXXX-XXXX-1234"
                  className={`${inputStyles} uppercase font-mono`}
                />
              </div>

              <div>
                <label className={labelStyles}>Arrived From</label>
                <input
                  type="text"
                  value={formData.arrivedFrom}
                  onChange={(e) => setFormData({ ...formData, arrivedFrom: e.target.value })}
                  placeholder="Origin city / station"
                  className={inputStyles}
                />
              </div>

              <div>
                <label className={labelStyles}>Purpose of Visit</label>
                <select
                  value={formData.purposeOfVisit}
                  onChange={(e) => setFormData({ ...formData, purposeOfVisit: e.target.value })}
                  className={inputStyles}
                >
                  <option value="Tourism / Holiday">Tourism / Holiday</option>
                  <option value="Business / Work">Business / Work</option>
                  <option value="Medical">Medical</option>
                  <option value="Transit">Transit</option>
                  <option value="Family Event">Family Event</option>
                </select>
              </div>
            </div>

            {/* Photo Capture / Upload Box */}
            <div className={`mt-4 pt-4 border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
              <label className={labelStyles}>Government Photo ID Capture / Upload</label>
              <div className={`mt-2 rounded-xl p-5 text-center border ${
                isDark ? "bg-[#18181b] border-zinc-700 text-zinc-200" : "bg-zinc-50 border-zinc-300 text-zinc-950"
              }`}>
                {formData.idPhotoUrl ? (
                  <div className="space-y-3">
                    <div className={`relative inline-block max-w-xs rounded-lg overflow-hidden border ${isDark ? "border-zinc-700" : "border-zinc-300"}`}>
                      <img src={formData.idPhotoUrl} alt="ID Upload" className="max-h-48 object-contain" />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, idPhotoUrl: "" })}
                        className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-3 py-1.5 text-xs font-bold hover:bg-rose-500/20 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove & Retake
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`inline-flex p-3 rounded-full ${isDark ? "bg-zinc-800 text-zinc-200" : "bg-zinc-200 text-zinc-800"}`}>
                      <Camera className="h-5 w-5" />
                    </div>
                    <div className={`text-xs font-bold ${isDark ? "text-zinc-200" : "text-zinc-900"}`}>
                      {compressingPhoto ? "Compressing image..." : "Upload or Take ID Photo"}
                    </div>
                    <label className={`inline-block cursor-pointer rounded-lg px-4 py-2 text-xs font-bold transition shadow-sm ${
                      compressingPhoto
                        ? "opacity-50 pointer-events-none bg-zinc-700 text-zinc-400"
                        : isDark
                        ? "bg-white text-zinc-950 hover:bg-zinc-200"
                        : "bg-zinc-950 text-white hover:bg-zinc-800"
                    }`}>
                      {compressingPhoto ? "Processing..." : "Select File / Camera"}
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
          </div>

          {/* 4. Accompanying Guests */}
          <div className={cardStyles}>
            <div className={sectionHeaderStyles}>
              <span>04. Accompanying Guests ({formData.coGuests.length})</span>
              {!showCoGuestInput && (
                <button
                  type="button"
                  onClick={() => setShowCoGuestInput(true)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold border transition ${
                    isDark
                      ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                      : "bg-zinc-100 border-zinc-300 text-zinc-900 hover:bg-zinc-200"
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
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                      isDark ? "bg-[#18181b] border-zinc-700" : "bg-zinc-50 border-zinc-300"
                    }`}
                  >
                    <div>
                      <div className={`font-bold ${isDark ? "text-white" : "text-zinc-950"}`}>{cg.name}</div>
                      <div className={`text-[11px] font-mono mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                        {cg.age} yrs • {cg.gender} • {cg.relation} • {cg.idType}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCoGuest(idx)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !showCoGuestInput && (
                <div className={`text-center py-2 text-xs italic ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
                  No accompanying co-guests added.
                </div>
              )
            )}

            {showCoGuestInput && (
              <div className={`mt-3 p-4 rounded-xl border space-y-3 text-xs ${
                isDark ? "bg-[#18181b] border-zinc-700" : "bg-zinc-50 border-zinc-300"
              }`}>
                <div className={`font-bold ${isDark ? "text-zinc-200" : "text-zinc-950"}`}>Co-Guest Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={coGuestForm.name}
                    onChange={(e) => setCoGuestForm({ ...coGuestForm, name: e.target.value.toUpperCase() })}
                    className={inputStyles}
                  />
                  <input
                    type="number"
                    placeholder="Age"
                    value={coGuestForm.age}
                    onChange={(e) => setCoGuestForm({ ...coGuestForm, age: e.target.value })}
                    className={`${inputStyles} font-mono`}
                  />
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

                <div className="grid grid-cols-2 gap-2.5">
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

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCoGuestInput(false)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-600 hover:text-zinc-950"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCoGuest}
                    className={`px-4 py-1.5 rounded-lg font-bold transition ${
                      isDark ? "bg-white text-zinc-950 hover:bg-zinc-200" : "bg-zinc-950 text-white hover:bg-zinc-800"
                    }`}
                  >
                    Save Co-Guest
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. Signature & Terms */}
          <div className={cardStyles}>
            <div className={sectionHeaderStyles}>
              <span>05. House Rules & Signature</span>
            </div>

            <div className={`p-4 rounded-xl text-xs space-y-2 leading-relaxed border ${
              isDark ? "bg-[#18181b] border-zinc-700 text-zinc-200" : "bg-zinc-50 border-zinc-300 text-zinc-900"
            }`}>
              <div className={`font-black ${isDark ? "text-white" : "text-zinc-950"}`}>Hotel Guidelines:</div>
              <ul className={`list-disc list-inside space-y-1 font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                <li>Check-out time is strictly 11:00 AM.</li>
                <li>Physical Government ID must be presented at the front desk upon key handover.</li>
                <li>In-room dining is served by Ambarish Restaurant & Room Dining (Dial Ext 9).</li>
              </ul>
            </div>

            {/* Signature Canvas */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className={labelStyles}>Guest Signature *</label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className={`flex items-center gap-1 text-[11px] font-bold transition ${
                    isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
              </div>

              <div className={`relative rounded-xl border overflow-hidden touch-none select-none ${
                isDark ? "border-zinc-700 bg-[#09090b]" : "border-zinc-300 bg-zinc-50"
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
                  <div className={`absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-medium ${
                    isDark ? "text-zinc-500" : "text-zinc-400"
                  }`}>
                    Sign inside the box using your finger, stylus, or mouse
                  </div>
                )}
              </div>
            </div>

            {/* Consent */}
            <label className="flex items-start gap-2.5 cursor-pointer text-xs pt-3">
              <input
                type="checkbox"
                required
                checked={formData.termsAccepted}
                onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                className="mt-0.5 rounded border-zinc-400 text-zinc-950 focus:ring-0"
              />
              <span className={`font-medium ${isDark ? "text-zinc-200" : "text-zinc-900"}`}>
                I certify that the information provided is accurate and agree to follow all hotel regulations.
              </span>
            </label>
          </div>

          {submitError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-xl py-4 text-sm font-black transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg ${
              isDark
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-950 text-white hover:bg-zinc-800"
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

export default function CheckInKioskPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f4f5] text-zinc-950 flex items-center justify-center">
          <div className="text-sm font-mono text-zinc-600">Loading Kiosk...</div>
        </div>
      }
    >
      <CheckInKioskInner />
    </Suspense>
  );
}
