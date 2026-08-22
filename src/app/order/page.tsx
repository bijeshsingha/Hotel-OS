"use client";

import React, { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatINR, calculateGST } from "@/lib/gst/calculator";
import {
  UtensilsCrossed,
  Clock,
  PhoneCall,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
  X,
  Sparkles,
  BedDouble,
  ChevronRight,
  Coffee,
  Check,
  ChevronDown,
  User,
  ShieldCheck,
  Flame,
  Filter,
} from "lucide-react";

function GuestOrderContent() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("room") || "";
  const queryPropertyId = searchParams.get("propertyId") || "";

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(queryPropertyId);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [menuData, setMenuData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Room Selection & Auto-populate state
  const [roomNumber, setRoomNumber] = useState<string>(initialRoom);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>("");
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [onlyOccupiedRooms, setOnlyOccupiedRooms] = useState(true);
  const roomDropdownRef = useRef<HTMLDivElement>(null);
  const propertyDropdownRef = useRef<HTMLDivElement>(null);

  // Menu filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [vegFilter, setVegFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Cart & checkout
  const [cart, setCart] = useState<{ [itemId: string]: { item: any; qty: number; notes: string } }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paymentPref, setPaymentPref] = useState<"POST_TO_ROOM" | "UPI_ON_DELIVERY" | "CASH_ON_DELIVERY">("POST_TO_ROOM");

  // Order Placement & Live Tracking
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);
  const [orderStatus, setOrderStatus] = useState<any | null>(null);

  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(!initialRoom);

  // Fetch Menu from API
  const loadMenu = async (propId?: string) => {
    try {
      setLoading(true);
      const url = propId ? `/api/v1/guest/menu?propertyId=${propId}` : "/api/v1/guest/menu";
      const res = await fetch(url);
      const data = await res.json();
      setMenuData(data);
      if (data?.property?.id) {
        setSelectedPropertyId(data.property.id);
      }

      // If initial room provided, auto-select and auto-populate
      if (initialRoom && data.rooms) {
        const found = data.rooms.find((r: any) => String(r.number) === String(initialRoom));
        if (found) {
          setRoomNumber(found.number);
          if (found.guestName) setCustomerName(found.guestName);
          if (found.guestPhone) setCustomerPhone(found.guestPhone);
          setShowWelcomeModal(false);
        }
      }
    } catch (err) {
      console.error("Error loading menu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu(queryPropertyId);
  }, [queryPropertyId]);

  const handleSwitchProperty = (p: any) => {
    setSelectedPropertyId(p.id);
    setShowPropertyDropdown(false);
    setRoomNumber("");
    setCustomerName("");
    setCustomerPhone("");
    loadMenu(p.id);
  };

  // Update clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside click for room dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roomDropdownRef.current && !roomDropdownRef.current.contains(event.target as Node)) {
        setIsRoomDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Poll live order status if placed
  useEffect(() => {
    if (!placedOrder?.id) return;
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/v1/guest/orders/${placedOrder.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrderStatus(data.order);
        }
      } catch (e) {
        console.error("Poll order error:", e);
      }
    };

    checkStatus();
    const timer = setInterval(checkStatus, 5000);
    return () => clearInterval(timer);
  }, [placedOrder?.id]);

  // Handle Room Selection & Auto-populate
  const handleSelectRoom = (room: any) => {
    setRoomNumber(room.number);
    setCustomerName(room.guestName || "");
    setCustomerPhone(room.guestPhone || "");
    setIsRoomDropdownOpen(false);
    setRoomSearchQuery("");
  };

  // Cart operations
  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const newQty = existing ? existing.qty + 1 : 1;
      return {
        ...prev,
        [item.id]: {
          item,
          qty: newQty,
          notes: existing?.notes || "",
        },
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.qty <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: {
          ...existing,
          qty: existing.qty - 1,
        },
      };
    });
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) => {
      if (!prev[itemId]) return prev;
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          notes,
        },
      };
    });
  };

  // Calculations
  const cartList = Object.values(cart);
  const totalItemCount = cartList.reduce((sum, i) => sum + i.qty, 0);
  const cartSubtotal = cartList.reduce((sum, i) => {
    const price = i.item.variants?.[0]?.price || 100;
    return sum + price * i.qty;
  }, 0);

  const gst = calculateGST({
    grossOrBaseAmount: cartSubtotal,
    isInclusive: false,
    sacHsn: "996331",
    supplierStateCode: "18",
  });

  // Filter Rooms for Dropdown
  const allRooms = menuData?.rooms || [];
  const filteredRooms = useMemo(() => {
    return allRooms.filter((r: any) => {
      if (onlyOccupiedRooms && !r.isOccupied) return false;
      if (roomSearchQuery.trim()) {
        const q = roomSearchQuery.toLowerCase();
        const matchNum = String(r.number).toLowerCase().includes(q);
        const matchName = r.guestName?.toLowerCase().includes(q);
        const matchType = r.roomTypeName?.toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchType) return false;
      }
      return true;
    });
  }, [allRooms, onlyOccupiedRooms, roomSearchQuery]);

  // Current selected room object
  const activeSelectedRoom = allRooms.find((r: any) => String(r.number) === String(roomNumber));

  // Filter Categories & Items
  const categories = menuData?.outlet?.categories || [];
  const timeStatus = menuData?.timeStatus;

  const filteredCategories = useMemo(() => {
    return categories
      .map((cat: any) => {
        const items = (cat.items || []).filter((item: any) => {
          if (vegFilter === "VEG" && !item.isVeg) return false;
          if (vegFilter === "NON_VEG" && item.isVeg) return false;

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = item.name.toLowerCase().includes(q);
            const matchDesc = item.description?.toLowerCase().includes(q);
            const matchCode = item.code.toLowerCase().includes(q);
            if (!matchName && !matchDesc && !matchCode) return false;
          }

          return true;
        });

        return {
          ...cat,
          filteredItems: items,
        };
      })
      .filter((cat: any) => {
        if (selectedCategory !== "ALL" && cat.id !== selectedCategory) return false;
        return cat.filteredItems.length > 0;
      });
  }, [categories, vegFilter, searchQuery, selectedCategory]);

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartList.length === 0) return;
    if (!roomNumber.trim()) {
      alert("Please select your room number.");
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload = cartList.map((c) => ({
        id: c.item.id,
        name: c.item.name,
        unitPrice: c.item.variants?.[0]?.price || 100,
        qty: c.qty,
        notes: c.notes,
        stationId: c.item.variants?.[0]?.stationId,
      }));

      const res = await fetch("/api/v1/guest/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: menuData?.property?.id,
          roomNumber: roomNumber.trim(),
          customerName: customerName.trim(),
          customerContact: customerPhone.trim(),
          items: itemsPayload,
          paymentPreference: paymentPref,
          specialInstructions: specialInstructions.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place order");

      setPlacedOrder(data.order);
      setOrderStatus(data.order);
      setCart({});
      setIsCartOpen(false);
    } catch (err: any) {
      alert(`Order placement error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-100 space-y-3">
        <div className="h-8 w-8 border-2 border-zinc-500 border-t-zinc-100 rounded-full animate-spin" />
        <div className="text-xs font-medium text-zinc-400">Loading In-Room Dining Menu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-32 selection:bg-blue-600 selection:text-white">
      {/* 1. TOP HEADER (CLEAN & MINIMALIST) */}
      <header className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-md border-b border-[#27272a] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-950 font-bold text-sm tracking-tight">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                  {menuData?.property?.name || "Hotel Ambarish Grand Residency"}
                </h1>
                <span className="rounded px-1.5 py-0.2 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-800 border border-zinc-700/60">
                  In-Room Dining
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {timeStatus?.serviceMessage || "Kitchen Open (40 Min Prep Time)"}
              </p>
            </div>
          </div>

          {/* Property & Room Selectors */}
          <div className="flex items-center gap-2">
            {/* Property Selector */}
            {menuData?.allProperties && menuData.allProperties.length > 1 && (
              <div className="relative" ref={propertyDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                  className="flex items-center gap-1.5 rounded-md bg-[#18181b] border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 transition"
                  title="Switch Hotel"
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-semibold text-zinc-100 hidden sm:inline">
                    {menuData?.property?.name || "Hotel"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-zinc-500" />
                </button>

                {showPropertyDropdown && (
                  <div className="absolute right-0 sm:left-0 mt-1.5 w-64 rounded-xl border border-zinc-800 bg-[#121215] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-75 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-500">
                      Delivering To Property
                    </div>
                    {menuData.allProperties.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSwitchProperty(p)}
                        className={`w-full text-left rounded-lg p-2 text-xs transition flex items-center justify-between ${
                          p.id === selectedPropertyId
                            ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        }`}
                      >
                        <div>
                          <div>{p.displayName}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{p.code}</div>
                        </div>
                        {p.id === selectedPropertyId && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Room Selector with Search Dropdown */}
            <div className="relative" ref={roomDropdownRef}>
              <button
                onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                className="flex items-center gap-2 rounded-md bg-[#18181b] border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-700 transition shadow-sm"
              >
                <BedDouble className="h-3.5 w-3.5 text-zinc-400" />
                <div className="text-left">
                  <span className="font-semibold text-zinc-100">
                    {roomNumber ? `Room ${roomNumber}` : "Select Room"}
                  </span>
                  {customerName && (
                    <span className="text-[10px] text-zinc-400 block -mt-0.5 truncate max-w-[100px]">
                      {customerName}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500 ml-1" />
              </button>

            {/* Room Selection Dropdown */}
            {isRoomDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-80 rounded-xl border border-zinc-800 bg-[#121215] p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-75 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
                  <span className="text-[11px] font-semibold text-zinc-300">Select In-House Room</span>
                  <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyOccupiedRooms}
                      onChange={(e) => setOnlyOccupiedRooms(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 accent-blue-600 h-3 w-3"
                    />
                    <span>Occupied Only ({allRooms.filter((r: any) => r.isOccupied).length})</span>
                  </label>
                </div>

                {/* Room Search Box */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search room or guest name..."
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    className="w-full rounded-lg bg-zinc-900 border border-zinc-800 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                    autoFocus
                  />
                </div>

                {/* Rooms List */}
                <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                  {filteredRooms.map((r: any) => {
                    const isSelected = String(r.number) === String(roomNumber);
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRoom(r)}
                        className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between text-xs ${
                          isSelected
                            ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700"
                            : "text-zinc-300 hover:bg-zinc-800/60"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">Room {r.number}</span>
                            <span className="text-[10px] text-zinc-500">• {r.roomTypeName}</span>
                          </div>
                          {r.guestName ? (
                            <div className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
                              <User className="h-3 w-3 text-zinc-500" /> {r.guestName}
                            </div>
                          ) : (
                            <div className="text-[10px] text-zinc-500 italic">Vacant / Unassigned</div>
                          )}
                        </div>

                        <div className="text-right">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-medium ${
                              r.isOccupied
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {r.isOccupied ? "Occupied" : "Vacant"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredRooms.length === 0 && (
                    <div className="p-4 text-center text-xs text-zinc-500">No rooms found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {/* ROOM BANNER WITH AUTO-SYNCED GUEST DETAILS */}
        <div className="rounded-xl bg-[#121215] border border-zinc-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <BedDouble className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-100">
                  Delivering to Room {roomNumber || "..."}
                </span>
                {activeSelectedRoom?.isOccupied && (
                  <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 text-[10px] font-medium font-mono">
                    Auto-Synced to Folio
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Guest: <strong className="text-zinc-200">{customerName || "In-House Guest"}</strong>
                {customerPhone && ` • ${customerPhone}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span>Prep Time: <strong className="text-zinc-200">~40 Mins</strong></span>
          </div>
        </div>

        {/* 3. SEARCH & VEG/NON-VEG FILTER CONTROLS */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search food items, tea, biryani, paneer, fish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-[#121215] border border-zinc-800 pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Veg / Non-Veg Filter */}
            <div className="flex items-center rounded-lg bg-[#121215] border border-zinc-800 p-1">
              <button
                onClick={() => setVegFilter("ALL")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  vegFilter === "ALL"
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setVegFilter("VEG")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
                  vegFilter === "VEG"
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Pure Veg
              </button>
              <button
                onClick={() => setVegFilter("NON_VEG")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
                  vegFilter === "NON_VEG"
                    ? "bg-rose-600/20 text-rose-400 border border-rose-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Non-Veg
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === "ALL"
                  ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm"
                  : "bg-[#121215] text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              All Items
            </button>
            {categories.map((cat: any) => {
              const isSelected = selectedCategory === cat.id;
              const isBreakfast = cat.servicePeriod === "BREAKFAST";
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm"
                      : "bg-[#121215] text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  {isBreakfast ? <Coffee className="h-3 w-3" /> : <UtensilsCrossed className="h-3 w-3" />}
                  {cat.name} ({cat.items?.length || 0})
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. MENU ITEMS CATALOG */}
        <div className="space-y-6">
          {filteredCategories.map((cat: any) => {
            const isBreakfast = cat.servicePeriod === "BREAKFAST";
            return (
              <section key={cat.id} className="space-y-2.5">
                {/* Category Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                      {cat.name}
                    </h2>
                    <span className="text-[10px] text-zinc-500">
                      ({cat.filteredItems.length})
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-zinc-500">
                    {isBreakfast ? "08:00 AM – 11:00 AM" : "12:00 PM – 10:45 PM"}
                  </span>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {cat.filteredItems.map((item: any) => {
                    const price = item.variants?.[0]?.price || 100;
                    const cartItem = cart[item.id];
                    const inCartQty = cartItem?.qty || 0;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl p-3 border transition flex flex-col justify-between ${
                          inCartQty > 0
                            ? "bg-[#18181b] border-zinc-700 shadow-sm"
                            : "bg-[#121215] border-zinc-800/90 hover:border-zinc-700/80"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              {/* Veg / Non-Veg Marker */}
                              <div
                                className={`mt-0.5 h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                  item.isVeg
                                    ? "border-emerald-500 bg-emerald-950/40"
                                    : "border-rose-500 bg-rose-950/40"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    item.isVeg ? "bg-emerald-400" : "bg-rose-400"
                                  }`}
                                />
                              </div>

                              <div>
                                <h3 className="text-xs font-semibold text-zinc-200">
                                  {item.name}
                                </h3>
                                {item.portionSize && (
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    {item.portionSize}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Price */}
                            <span className="font-mono font-semibold text-xs text-zinc-100 shrink-0">
                              {formatINR(price)}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-[11px] text-zinc-400 pl-5.5 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Add / Quantity Button */}
                        <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ⏱️ 40 mins
                          </span>

                          {inCartQty === 0 ? (
                            <button
                              onClick={() => addToCart(item)}
                              className="flex items-center gap-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-2.5 py-1 text-xs font-medium transition"
                            >
                              <Plus className="h-3 w-3 text-zinc-400" /> Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 bg-zinc-900 rounded-md p-0.5 border border-zinc-700">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="h-5 w-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-semibold text-zinc-100 text-xs w-4 text-center font-mono">
                                {inCartQty}
                              </span>
                              <button
                                onClick={() => addToCart(item)}
                                className="h-5 w-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="rounded-xl bg-[#121215] border border-zinc-800 p-8 text-center text-xs text-zinc-500">
              No menu items match your search.
            </div>
          )}
        </div>
      </main>

      {/* 5. FLOATING BOTTOM CART BAR */}
      {totalItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-5 duration-150">
          <div
            onClick={() => setIsCartOpen(true)}
            className="rounded-xl bg-zinc-100 text-zinc-950 p-3 shadow-xl cursor-pointer flex items-center justify-between border border-zinc-300 hover:bg-white transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-zinc-950 text-zinc-100 flex items-center justify-center font-bold text-xs">
                {totalItemCount}
              </div>
              <div className="text-xs font-semibold">
                View Tray • Room {roomNumber}
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs font-bold">{formatINR(gst.totalAmount)}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      {/* 6. CART & CHECKOUT DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-[#121215] p-5 shadow-2xl space-y-4 text-zinc-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Order Tray (Room {roomNumber})</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="h-7 w-7 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cartList.map(({ item, qty, notes }) => {
                const price = item.variants?.[0]?.price || 100;
                return (
                  <div
                    key={item.id}
                    className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-zinc-100">{item.name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {formatINR(price)} × {qty}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-zinc-800 rounded p-0.5">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-0.5 hover:text-white text-zinc-400"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-semibold text-zinc-200 w-4 text-center font-mono">{qty}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-0.5 hover:text-white text-zinc-400"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-mono font-semibold text-zinc-100 w-14 text-right">
                          {formatINR(price * qty)}
                        </span>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Special note (e.g. less spicy)..."
                      value={notes}
                      onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      className="w-full rounded bg-zinc-950 border border-zinc-800 px-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                );
              })}
            </div>

            {/* Bill Breakdown with 5% GST */}
            <div className="rounded-lg bg-zinc-900/80 p-3 border border-zinc-800 space-y-1 text-xs text-zinc-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-medium">{formatINR(gst.taxableAmount)}</span>
              </div>
              <div className="flex justify-between text-zinc-500 text-[11px]">
                <span>GST (5% SAC 996331)</span>
                <span className="font-mono">{formatINR(gst.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-sm text-zinc-100 pt-1.5 border-t border-zinc-800">
                <span>Total Amount</span>
                <span className="font-mono text-zinc-100">{formatINR(gst.totalAmount)}</span>
              </div>
            </div>

            {/* Delivery Details & Room Posting */}
            <form onSubmit={handlePlaceOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 font-medium">Room Number</label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. 201"
                    className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-zinc-100 font-semibold focus:outline-none focus:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-medium">Guest Name (Auto-Synced)</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Guest Name"
                    className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Bill Settlement</label>
                <div className="space-y-1.5">
                  <label
                    onClick={() => setPaymentPref("POST_TO_ROOM")}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                      paymentPref === "POST_TO_ROOM"
                        ? "bg-zinc-800 border-zinc-600 text-zinc-100 font-medium"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-zinc-400" />
                      <div>
                        <div>Post to Room Bill (Room {roomNumber})</div>
                        <div className="text-[10px] text-zinc-500">Auto-calculated & paid at checkout</div>
                      </div>
                    </div>
                    {paymentPref === "POST_TO_ROOM" && <Check className="h-4 w-4 text-blue-400" />}
                  </label>

                  <label
                    onClick={() => setPaymentPref("UPI_ON_DELIVERY")}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                      paymentPref === "UPI_ON_DELIVERY"
                        ? "bg-zinc-800 border-zinc-600 text-zinc-100 font-medium"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400 font-bold">UPI</span>
                      <div>
                        <div>UPI / QR Code on Delivery</div>
                        <div className="text-[10px] text-zinc-500">Scan QR when delivered</div>
                      </div>
                    </div>
                    {paymentPref === "UPI_ON_DELIVERY" && <Check className="h-4 w-4 text-blue-400" />}
                  </label>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white py-2.5 font-semibold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? "Placing Order..." : `Confirm Order (${formatINR(gst.totalAmount)})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. LIVE ORDER TRACKING MODAL */}
      {placedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121215] p-5 shadow-2xl text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono font-medium text-zinc-400">
                Order #{placedOrder.orderNo} Placed
              </span>
              <h2 className="text-base font-bold text-zinc-100 mt-0.5">
                Sent to Kitchen for Room {placedOrder.roomNumber}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Estimated Delivery: <strong className="text-zinc-200">~40 Mins</strong>
              </p>
            </div>

            {/* Stepper */}
            <div className="rounded-xl bg-zinc-900 p-3.5 border border-zinc-800 space-y-2.5 text-left text-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-5 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center text-[10px] font-bold shrink-0">
                  ✓
                </div>
                <div>
                  <div className="font-medium text-zinc-200">Order Confirmed</div>
                  <div className="text-[10px] text-zinc-500">KOT ticket received in kitchen</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    orderStatus?.tracker?.step >= 2
                      ? "bg-emerald-500 text-zinc-950"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 animate-pulse"
                  }`}
                >
                  2
                </div>
                <div>
                  <div className="font-medium text-zinc-200">Preparing in Kitchen</div>
                  <div className="text-[10px] text-zinc-500">
                    {orderStatus?.tracker?.subtitle || "Chefs preparing your fresh food (~40 mins)"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    orderStatus?.tracker?.step >= 3
                      ? "bg-emerald-500 text-zinc-950"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  3
                </div>
                <div>
                  <div className="font-medium text-zinc-400">Delivering to Room</div>
                  <div className="text-[10px] text-zinc-500">Staff bringing tray to Room {placedOrder.roomNumber}</div>
                </div>
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setPlacedOrder(null)}
              className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 py-2 text-xs font-medium text-zinc-300 transition"
            >
              Close / Order More Items
            </button>
          </div>
        </div>
      )}

      {/* 8. WELCOME ROOM SELECTOR MODAL (FOR GENERIC QR SCANS) */}
      {showWelcomeModal && !roomNumber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121215] p-5 shadow-2xl space-y-4 text-zinc-200">
            <div className="text-center space-y-1.5 pb-2 border-b border-zinc-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-950 font-bold text-sm tracking-tight mx-auto mb-2">
                H
              </div>
              <h2 className="text-base font-bold text-zinc-100">
                Welcome to Hotel Ambarish In-Room Dining
              </h2>
              <p className="text-xs text-zinc-400">
                Please select your room to explore the menu and order directly to your room.
              </p>
            </div>

            {/* Room Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search room number or your name..."
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>

            {/* Occupied In-House Rooms (1-Tap Selection) */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold">
                Occupied In-House Rooms
              </div>

              {filteredRooms.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => {
                    handleSelectRoom(r);
                    setShowWelcomeModal(false);
                  }}
                  className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/90 hover:border-zinc-700 cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-100">Room {r.number}</span>
                      <span className="text-[10px] text-zinc-400">• {r.roomTypeName}</span>
                    </div>
                    {r.guestName && (
                      <div className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
                        <User className="h-3 w-3 text-zinc-500" /> {r.guestName}
                      </div>
                    )}
                  </div>

                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-medium ${
                      r.isOccupied
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {r.isOccupied ? "Occupied" : "Vacant"}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowWelcomeModal(false)}
              className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 py-2 text-xs font-medium text-zinc-300 transition"
            >
              Browse Menu First
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 text-xs">Loading Menu...</div>}>
      <GuestOrderContent />
    </Suspense>
  );
}
