"use client";

import React, { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatINR, calculateGST } from "@/lib/gst/calculator";
import {
  UtensilsCrossed,
  Clock,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
  X,
  BedDouble,
  ChevronRight,
  Coffee,
  Check,
  ChevronDown,
  User,
  Phone,
  Flame,
  MessageSquarePlus,
  ChefHat,
  Truck,
  Timer,
  RefreshCw,
  History,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

function GuestOrderContent() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("room") || "";
  const queryProperty =
    searchParams.get("property") ||
    searchParams.get("propertyCode") ||
    searchParams.get("code") ||
    searchParams.get("propertyId") ||
    "";

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

  // Menu filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [vegFilter, setVegFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Cart & checkout
  const [cart, setCart] = useState<{ [itemId: string]: { item: any; qty: number; notes: string } }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);
  const [isRoomVerified, setIsRoomVerified] = useState(true);
  const [paymentPref, setPaymentPref] = useState<"POST_TO_ROOM" | "UPI_ON_DELIVERY" | "CASH_ON_DELIVERY">("POST_TO_ROOM");

  // Order Placement & Live Tracking
  const [submitting, setSubmitting] = useState(false);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [pastOrders, setPastOrders] = useState<any[]>([]);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<any | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [trackingTab, setTrackingTab] = useState<"ACTIVE" | "PAST">("ACTIVE");

  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(!initialRoom);

  // Fetch Menu from API
  const loadMenu = async (propParam?: string) => {
    try {
      setLoading(true);
      const targetProp = propParam || queryProperty;
      const url = targetProp ? `/api/v1/guest/menu?property=${encodeURIComponent(targetProp)}` : "/api/v1/guest/menu";
      const res = await fetch(url);
      const data = await res.json();
      setMenuData(data);

      // Auto-populate room and guest name from database
      if (data?.rooms && data.rooms.length > 0) {
        const targetNo = initialRoom ? String(initialRoom).trim().toLowerCase() : "";
        let selected = targetNo
          ? data.rooms.find((r: any) => String(r.number).trim().toLowerCase() === targetNo && r.guestName) ||
            data.rooms.find((r: any) => String(r.number).trim().toLowerCase() === targetNo)
          : null;
        if (!selected) {
          // Default to first in-house occupied room with a guest name from database
          selected =
            data.rooms.find((r: any) => r.isOccupied && r.guestName) ||
            data.rooms.find((r: any) => r.isOccupied) ||
            data.rooms[0];
        }
        if (selected) {
          setRoomNumber(selected.number);
          setCustomerName(selected.guestName || "");
          setCustomerPhone(selected.guestPhone || "");
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
    loadMenu(queryProperty);
  }, [queryProperty]);

  // Auto-sync guest name from database whenever roomNumber changes
  useEffect(() => {
    if (!menuData?.rooms || !roomNumber) return;
    const targetNo = String(roomNumber).trim().toLowerCase();
    const found =
      menuData.rooms.find((r: any) => String(r.number).trim().toLowerCase() === targetNo && r.guestName) ||
      menuData.rooms.find((r: any) => String(r.number).trim().toLowerCase() === targetNo);

    if (found && found.guestName) {
      setCustomerName(found.guestName);
      if (found.guestPhone) setCustomerPhone(found.guestPhone);
    }
  }, [roomNumber, menuData]);

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

  // Fetch room active and past orders from backend
  const fetchRoomOrders = async (targetRoom?: string) => {
    const roomToFetch = targetRoom || roomNumber;
    if (!roomToFetch) return;
    try {
      const propCode = menuData?.property?.code || queryProperty;
      const url = `/api/v1/guest/orders?room=${encodeURIComponent(roomToFetch)}${propCode ? `&property=${encodeURIComponent(propCode)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setActiveOrders(data.activeOrders || []);
        setPastOrders(data.pastOrders || []);
        if (data.activeOrders?.length > 0) {
          setSelectedOrderForTracking((prev: any) => {
            if (!prev) return data.activeOrders[0];
            const updated = data.activeOrders.find((o: any) => o.id === prev.id);
            return updated || data.activeOrders[0];
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch room orders:", e);
    }
  };

  // Poll live order status every 8 seconds
  useEffect(() => {
    if (!roomNumber) return;
    fetchRoomOrders(roomNumber);
    const timer = setInterval(() => {
      fetchRoomOrders(roomNumber);
    }, 8000);
    return () => clearInterval(timer);
  }, [roomNumber, menuData?.property?.id]);

  // Simulate kitchen status advancement (testing / staff action)
  const handleSimulateStatus = async (orderId: string, nextStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch("/api/v1/guest/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setSelectedOrderForTracking(data.order);
        await fetchRoomOrders(roomNumber);
      }
    } catch (err) {
      console.error("Status simulation error:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Room Selection & Auto-populate
  const handleSelectRoom = (room: any) => {
    setRoomNumber(room.number);
    setCustomerName(room.guestName || "");
    setCustomerPhone(room.guestPhone || "");
    setIsRoomDropdownOpen(false);
    setRoomSearchQuery("");

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("room", room.number);
      if (menuData?.property?.code) {
        url.searchParams.set("property", menuData.property.code);
      }
      window.history.replaceState({}, "", url.toString());
    }
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

  // Active room details
  const activeSelectedRoom = useMemo(() => {
    if (!roomNumber || !menuData?.rooms) return null;
    const targetNo = String(roomNumber).trim().toLowerCase();
    return (
      menuData.rooms.find((r: any) => String(r.number).trim().toLowerCase() === targetNo && r.guestName) ||
      menuData.rooms.find((r: any) => String(r.number).trim().toLowerCase() === targetNo) ||
      null
    );
  }, [roomNumber, menuData]);

  // Filter Menu Categories & Items
  const categories = menuData?.outlet?.categories || [];
  const timeStatus = menuData?.timeStatus;

  const filteredCategories = useMemo(() => {
    return categories
      .map((cat: any) => {
        if (selectedCategory !== "ALL" && cat.id !== selectedCategory) {
          return null;
        }

        const filteredItems = (cat.items || []).filter((item: any) => {
          if (vegFilter === "VEG" && !item.isVeg) return false;
          if (vegFilter === "NON_VEG" && item.isVeg) return false;

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = item.name.toLowerCase().includes(q);
            const matchDesc = item.description?.toLowerCase().includes(q);
            const matchTags = item.tags?.toLowerCase().includes(q);
            if (!matchName && !matchDesc && !matchTags) return false;
          }
          return true;
        });

        if (filteredItems.length === 0) return null;

        return {
          ...cat,
          filteredItems,
        };
      })
      .filter(Boolean);
  }, [categories, selectedCategory, vegFilter, searchQuery]);

  // Place Order Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      alert("Please enter or select your Room Number before ordering.");
      return;
    }
    if (cartList.length === 0) {
      alert("Your order tray is empty. Please add items to order.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        propertyId: menuData?.property?.id,
        propertyCode: menuData?.property?.code || queryProperty,
        roomNumber: roomNumber.trim(),
        customerName: customerName.trim() || "In-House Guest",
        customerContact: customerPhone.trim() || undefined,
        paymentPreference: paymentPref,
        items: cartList.map((c) => {
          const itemPrice = Number(c.item.variants?.[0]?.price ?? c.item.price ?? 100);
          return {
            menuItemId: c.item.id,
            variantId: c.item.variants?.[0]?.id,
            name: c.item.name,
            qty: c.qty,
            unitPrice: itemPrice,
            price: itemPrice,
            notes: c.notes || undefined,
          };
        }),
      };

      const res = await fetch("/api/v1/guest/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place order");

      setCart({});
      setIsCartOpen(false);
      if (data.order?.tracker) {
        setSelectedOrderForTracking(data.order.tracker);
      }
      setShowTrackingModal(true);
      await fetchRoomOrders(roomNumber);
    } catch (err: any) {
      alert(`Order placement error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-100 space-y-3 px-4">
        <div className="h-8 w-8 border-2 border-zinc-500 border-t-zinc-100 rounded-full animate-spin" />
        <div className="text-xs font-mono font-medium text-zinc-400">Loading Dining Menu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#09090b] text-zinc-100 font-sans pb-36 selection:bg-blue-600 selection:text-white">
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-md border-b border-[#27272a] px-4 sm:px-8 py-3 w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4 w-full">
          {/* Top Row: Hotel Brand & Details */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-950 font-black text-xs sm:text-sm tracking-tight shadow-sm">
              {menuData?.property?.displayName?.[0] || menuData?.property?.name?.[0] || "H"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">
                  {menuData?.property?.displayName || menuData?.property?.name || "Hotel OS"}
                </h1>
                {menuData?.property?.code && (
                  <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0">
                    {menuData.property.code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-400">
                <span className="text-emerald-400 font-medium font-mono">Kitchen Live</span>
                <span>•</span>
                <span>Ext 9</span>
              </div>
            </div>
          </div>

          {/* Header Right Actions: Live Order Status & Room Selector */}
          <div className="flex items-center gap-2 shrink-0">
            {activeOrders.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setTrackingTab("ACTIVE");
                  setSelectedOrderForTracking(activeOrders[0]);
                  setShowTrackingModal(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-2.5 py-1.5 text-xs text-white transition shadow-sm active:scale-95 animate-in fade-in"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Clock className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
                <span className="hidden sm:inline font-semibold">Status</span>
                <span className="bg-zinc-800 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold text-[10px]">
                  ~{activeOrders[0].estimatedMinutesRemaining}m
                </span>
              </button>
            ) : pastOrders.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setTrackingTab("PAST");
                  setSelectedOrderForTracking(pastOrders[0]);
                  setShowTrackingModal(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white transition"
              >
                <History className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="font-mono text-[11px]">Orders</span>
              </button>
            ) : null}

            {/* Locked Room Badge — not changeable by guest */}
            <div className="flex items-center gap-1.5 rounded-lg bg-[#18181b] border border-zinc-700 px-2.5 sm:px-3 py-1.5 text-xs text-white shadow-sm shrink-0">
              <BedDouble className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="font-bold font-mono text-[11px] sm:text-xs">
                {roomNumber ? `Rm ${roomNumber}` : "Room"}
              </span>
              {activeSelectedRoom?.isOccupied && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-48 space-y-4 sm:space-y-6 w-full">
        {/* ROOM BANNER WITH AUTO-SYNCED GUEST DETAILS */}
        <div className="rounded-2xl bg-[#121215] border border-zinc-800 p-4 shadow-sm min-w-0 w-full space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                <BedDouble className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Delivering to Room {roomNumber || "..."}
                  </span>
                  {activeSelectedRoom?.isOccupied && (
                    <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium font-mono">
                      ● Synced to Folio
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  Guest: <strong className="text-white">{customerName || "In-House Guest"}</strong>
                  {customerPhone && ` • ${customerPhone}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono self-start sm:self-auto bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 shrink-0">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span>Prep Time: <strong className="text-white">~40 Mins</strong></span>
            </div>
          </div>

          {/* Mismatch contact row */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80">
            <span>Mismatch in room or guest details?</span>
            <a
              href={`tel:${menuData?.property?.phone || "+916901741211"}`}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 font-mono transition"
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span>Dial Ext 9 / {menuData?.property?.phone || "+91 69017 41211"}</span>
            </a>
          </div>
        </div>

        {/* 3. SEARCH & VEG/NON-VEG FILTER CONTROLS */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search food items, tea, biryani, paneer, fish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-[#121215] border border-zinc-800 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Veg / Non-Veg Filter (Full width on mobile) */}
            <div className="grid grid-cols-3 sm:flex items-center rounded-xl bg-[#121215] border border-zinc-800 p-1 gap-1">
              <button
                type="button"
                onClick={() => setVegFilter("ALL")}
                className={`rounded-lg py-1.5 px-3 text-xs font-bold transition text-center ${
                  vegFilter === "ALL"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setVegFilter("VEG")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-bold transition ${
                  vegFilter === "VEG"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className="h-2 w-2 rounded-sm bg-emerald-400" /> Pure Veg
              </button>
              <button
                type="button"
                onClick={() => setVegFilter("NON_VEG")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-bold transition ${
                  vegFilter === "NON_VEG"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-400" /> Non-Veg
              </button>
            </div>
          </div>

          {/* Category Horizontal Scroll Bar (Sticky on Mobile) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x active:cursor-grabbing">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition snap-start flex items-center gap-1.5 ${
                selectedCategory === "ALL"
                  ? "bg-white text-zinc-950 shadow-md"
                  : "bg-[#121215] text-zinc-300 hover:text-white border border-zinc-800"
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
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition snap-start flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-white text-zinc-950 shadow-md"
                      : "bg-[#121215] text-zinc-300 hover:text-white border border-zinc-800"
                  }`}
                >
                  {isBreakfast ? <Coffee className="h-3.5 w-3.5" /> : <UtensilsCrossed className="h-3.5 w-3.5" />}
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-70 font-mono">({cat.items?.length || 0})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. MENU ITEMS CATALOG */}
        <div className="space-y-6 pt-1">
          {filteredCategories.map((cat: any) => {
            const isBreakfast = cat.servicePeriod === "BREAKFAST";
            return (
              <section key={cat.id} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                      {cat.name}
                    </h2>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      ({cat.filteredItems.length})
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-500">
                    {isBreakfast ? "08:00 AM – 11:00 AM" : "12:00 PM – 10:45 PM"}
                  </span>
                </div>

                {/* Items Grid (1 Col on Mobile, 2 Col on Tablet/Desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cat.filteredItems.map((item: any) => {
                    const price = item.variants?.[0]?.price || 100;
                    const cartItem = cart[item.id];
                    const inCartQty = cartItem?.qty || 0;
                    const isNoteOpen = activeNoteItemId === item.id || (cartItem?.notes && cartItem.notes.length > 0);

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-3.5 sm:p-4 border transition flex flex-col justify-between ${
                          inCartQty > 0
                            ? "bg-[#18181b] border-zinc-600 shadow-md"
                            : "bg-[#121215] border-zinc-800/90 hover:border-zinc-700"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              {/* Veg / Non-Veg Marker */}
                              <div
                                className={`mt-0.5 h-4 w-4 rounded-sm border flex items-center justify-center shrink-0 ${
                                  item.isVeg
                                    ? "border-emerald-500 bg-emerald-950/50"
                                    : "border-rose-500 bg-rose-950/50"
                                }`}
                                title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    item.isVeg ? "bg-emerald-400" : "bg-rose-400"
                                  }`}
                                />
                              </div>

                              <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                                  {item.name}
                                </h3>
                                {item.portionSize && (
                                  <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                                    Portion: {item.portionSize}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Price */}
                            <span className="font-mono font-black text-sm text-white shrink-0">
                              {formatINR(price)}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-zinc-400 pl-6 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Special Note Input (Expandable) */}
                        {inCartQty > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-zinc-800">
                            {isNoteOpen ? (
                              <input
                                type="text"
                                placeholder="Special instruction (e.g. less spicy, extra lemon)..."
                                value={cartItem?.notes || ""}
                                onChange={(e) => updateItemNotes(item.id, e.target.value)}
                                className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveNoteItemId(item.id)}
                                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition"
                              >
                                <MessageSquarePlus className="h-3 w-3" />
                                <span>Add preparation note</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Add / Quantity Button Row */}
                        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3" /> 40 mins
                          </span>

                          {inCartQty === 0 ? (
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className="flex items-center gap-1.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 px-4 py-2 text-xs font-bold transition shadow-sm active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2.5 bg-zinc-900 rounded-xl p-1 border border-zinc-700 shadow-sm">
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
                                className="h-7 w-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white active:scale-90 transition"
                                title="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="font-bold text-white text-xs w-5 text-center font-mono">
                                {inCartQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => addToCart(item)}
                                className="h-7 w-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white active:scale-90 transition"
                                title="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5" />
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
            <div className="rounded-2xl bg-[#121215] border border-zinc-800 p-8 text-center text-xs text-zinc-400 space-y-2">
              <p className="font-semibold text-zinc-200">No dishes matched your search.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setVegFilter("ALL");
                  setSelectedCategory("ALL");
                }}
                className="text-xs text-blue-400 hover:underline font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 5. FLOATING BOTTOM CART BAR (MOBILE-OPTIMIZED) */}
      {totalItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-150">
          <div
            onClick={() => setIsCartOpen(true)}
            className="rounded-2xl bg-white text-zinc-950 p-3.5 shadow-2xl cursor-pointer flex items-center justify-between border border-zinc-200 hover:bg-zinc-100 transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-black text-xs font-mono shadow-sm">
                {totalItemCount}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black">
                  View Tray • Room {roomNumber}
                </div>
                <div className="text-[11px] text-zinc-600 font-medium">
                  {totalItemCount} item{totalItemCount > 1 ? "s" : ""} in order
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-sm font-black">{formatINR(gst.totalAmount)}</span>
              <ChevronRight className="h-5 w-5 text-zinc-950" />
            </div>
          </div>
        </div>
      )}

      {/* 6. CART & CHECKOUT DRAWER / BOTTOM SHEET */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-700 bg-[#121215] shadow-2xl text-zinc-200 overflow-hidden">
            {/* Grab Handle for Mobile */}
            <div className="w-12 h-1 rounded-full bg-zinc-700 mx-auto mt-2.5 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5 text-white" />
                <div>
                  <h3 className="text-sm font-bold text-white">Order Tray (Room {roomNumber})</h3>
                  <p className="text-[11px] text-zinc-400">Review items before kitchen confirmation</p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="h-8 w-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Cart Items */}
              <div className="space-y-2.5">
                {cartList.map(({ item, qty, notes }) => {
                  const price = item.variants?.[0]?.price || 100;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl bg-[#18181b] p-3 border border-zinc-800 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-white">{item.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            {formatINR(price)} × {qty}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1.5 bg-zinc-900 rounded-lg p-1 border border-zinc-700">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-bold text-white w-4 text-center font-mono">{qty}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="font-mono font-bold text-white w-14 text-right">
                            {formatINR(price * qty)}
                          </span>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Special instruction (e.g. less spicy)..."
                        value={notes}
                        onChange={(e) => updateItemNotes(item.id, e.target.value)}
                        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Bill Breakdown with 5% GST */}
              <div className="rounded-xl bg-zinc-900 p-3.5 border border-zinc-800 space-y-1.5 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">{formatINR(gst.taxableAmount)}</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>GST (5% SAC 996331)</span>
                  <span className="font-mono">{formatINR(gst.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-zinc-800">
                  <span>Total Amount</span>
                  <span className="font-mono text-white">{formatINR(gst.totalAmount)}</span>
                </div>
              </div>

              {/* Delivery Details & Room Verification */}
              <form onSubmit={handlePlaceOrder} className="space-y-3.5 text-xs">
                {/* 1. Verified Room Delivery Card */}
                <div className="rounded-2xl bg-[#18181b] border border-zinc-700/90 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold">
                      Delivery Destination
                    </span>
                    {/* Room is locked — not changeable by guest */}
                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Rm {roomNumber} Verified
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <BedDouble className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white font-mono flex items-center gap-2">
                          <span>Room {roomNumber || "..."}</span>
                          {activeSelectedRoom?.isOccupied && (
                            <span className="text-[10px] text-emerald-400 font-mono font-medium">
                              ● In-House Verified
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-300 font-medium truncate mt-0.5">
                          Guest: <strong className="text-white">{customerName || "In-House Guest"}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phone contact for mismatch */}
                  <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-1 text-[11px] text-zinc-400">
                    <span>Not your room?</span>
                    <a
                      href={`tel:${menuData?.property?.phone || "+916901741211"}`}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 font-mono transition"
                    >
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>Dial Ext 9 / {menuData?.property?.phone || "+91 69017 41211"}</span>
                    </a>
                  </div>
                </div>

                {/* 2. Room Verification Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition">
                  <input
                    type="checkbox"
                    required
                    checked={isRoomVerified}
                    onChange={(e) => setIsRoomVerified(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 accent-emerald-500 focus:ring-0"
                  />
                  <span className="text-zinc-200 font-medium leading-relaxed text-xs">
                    I confirm that this order is for <strong className="text-white">Room {roomNumber}</strong> ({customerName || "In-House Guest"}).
                  </span>
                </label>

                {/* 3. Payment Mode */}
                <div className="space-y-2">
                  <label className="text-zinc-200 font-bold block">Bill Settlement</label>
                  <div className="space-y-2">
                    <label
                      onClick={() => setPaymentPref("POST_TO_ROOM")}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        paymentPref === "POST_TO_ROOM"
                          ? "bg-zinc-800 border-zinc-500 text-white font-bold"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <BedDouble className="h-4 w-4 text-zinc-300" />
                        <div>
                          <div className="text-xs">Post to Room Bill (Room {roomNumber})</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Auto-calculated & paid at checkout</div>
                        </div>
                      </div>
                      {paymentPref === "POST_TO_ROOM" && <Check className="h-4 w-4 text-emerald-400" />}
                    </label>

                    <label
                      onClick={() => setPaymentPref("UPI_ON_DELIVERY")}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        paymentPref === "UPI_ON_DELIVERY"
                          ? "bg-zinc-800 border-zinc-500 text-white font-bold"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-zinc-300 font-black text-xs">UPI</span>
                        <div>
                          <div className="text-xs">UPI / QR Code on Delivery</div>
                          <div className="text-[10px] text-zinc-400 font-normal">Scan QR when delivered</div>
                        </div>
                      </div>
                      {paymentPref === "UPI_ON_DELIVERY" && <Check className="h-4 w-4 text-emerald-400" />}
                    </label>
                  </div>
                </div>

                {/* 4. Submit Order */}
                <button
                  type="submit"
                  disabled={submitting || !roomNumber || !isRoomVerified}
                  className="w-full rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 py-3.5 font-black text-xs sm:text-sm shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {submitting ? (
                    "Sending to Kitchen..."
                  ) : (
                    <>
                      <span>Confirm Order for Room {roomNumber}</span>
                      <span className="font-mono">({formatINR(gst.totalAmount)})</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 7. PERSISTENT FLOATING LIVE ORDER STATUS PILL */}
      {activeOrders.length > 0 && !showTrackingModal && !isCartOpen && (
        <div
          className={`fixed inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-30 animate-in slide-in-from-bottom-3 duration-200 ${
            totalItemCount > 0 ? "bottom-24" : "bottom-4"
          }`}
        >
          <div
            onClick={() => {
              setTrackingTab("ACTIVE");
              setSelectedOrderForTracking(activeOrders[0]);
              setShowTrackingModal(true);
            }}
            className="rounded-2xl bg-[#18181b]/95 border border-zinc-700 p-3 shadow-2xl backdrop-blur-xl cursor-pointer hover:border-zinc-500 transition text-white flex items-center justify-between gap-2.5 active:scale-[0.99] min-w-0 w-full"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <Clock className="h-4 w-4 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                    {activeOrders[0].statusLabel}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-mono truncate">
                    #{activeOrders[0].orderNo}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-zinc-200 truncate mt-0.5">
                  ETA: <span className="text-white font-bold">~{activeOrders[0].estimatedMinutesRemaining}m</span> • Expected {activeOrders[0].estimatedDeliveryTime}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-zinc-950 bg-white hover:bg-zinc-200 px-3 py-1.5 rounded-xl transition shadow shrink-0">
              <span>Track</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      )}

      {/* 8. COMPREHENSIVE LIVE ORDER TRACKING MODAL (MOBILE BOTTOM SHEET & DESKTOP DIALOG) */}
      {showTrackingModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-zinc-800 bg-[#121215] shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] text-zinc-200 text-xs overflow-hidden">
            {/* Mobile Sheet Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mt-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 border-b border-zinc-800 shrink-0 min-w-0 w-full">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 min-w-0">
                    <span className="truncate">In-Room Dining Tracker</span>
                    <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 border border-zinc-700 px-1.5 py-0.2 rounded font-medium shrink-0">
                      Room {roomNumber}
                    </span>
                  </h2>
                  <p className="text-[10px] text-zinc-400 font-mono truncate">
                    Live updates synced with kitchen workstation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fetchRoomOrders(roomNumber)}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition"
                  title="Refresh order status"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTrackingModal(false)}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto overflow-x-hidden px-3.5 sm:px-6 py-3.5 space-y-3 flex-1 min-w-0 w-full">
              {/* Active vs Past Orders Tab Switcher (If both exist) */}
              {(activeOrders.length > 0 || pastOrders.length > 0) && (
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 w-full min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTrackingTab("ACTIVE");
                      if (activeOrders.length > 0) setSelectedOrderForTracking(activeOrders[0]);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-w-0 truncate ${
                      trackingTab === "ACTIVE"
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Active ({activeOrders.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTrackingTab("PAST");
                      if (pastOrders.length > 0) setSelectedOrderForTracking(pastOrders[0]);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-w-0 truncate ${
                      trackingTab === "PAST"
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <History className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">Past ({pastOrders.length})</span>
                  </button>
                </div>
              )}

              {/* Multiple Orders Selector Chips */}
              {trackingTab === "ACTIVE" && activeOrders.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 min-w-0 w-full">
                  {activeOrders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelectedOrderForTracking(o)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition shrink-0 ${
                        selectedOrderForTracking?.id === o.id
                          ? "bg-white text-zinc-950 shadow"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      #{o.orderNo} (~{o.estimatedMinutesRemaining}m)
                    </button>
                  ))}
                </div>
              )}

              {trackingTab === "PAST" && pastOrders.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 min-w-0 w-full">
                  {pastOrders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelectedOrderForTracking(o)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition shrink-0 ${
                        selectedOrderForTracking?.id === o.id
                          ? "bg-white text-zinc-950 shadow"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      #{o.orderNo} ({o.orderedAtFormatted})
                    </button>
                  ))}
                </div>
              )}

              {/* Main Tracker Content */}
              {selectedOrderForTracking ? (
                <div className="space-y-3 min-w-0 w-full">
                  {/* 1. HERO ESTIMATED TIME & STATUS BANNER */}
                  <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-3.5 sm:p-4 text-center space-y-2.5 min-w-0 w-full">
                    <div className="flex items-center justify-between text-[11px] font-mono gap-2 min-w-0">
                      <span className="text-zinc-400 truncate">
                        Order <strong className="text-white font-mono">#{selectedOrderForTracking.orderNo}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded font-bold uppercase text-[9px] sm:text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        {selectedOrderForTracking.statusLabel}
                      </span>
                    </div>

                    {/* Big ETA Display */}
                    <div className="py-0.5">
                      {selectedOrderForTracking.step < 4 ? (
                        <div>
                          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight flex items-center justify-center gap-2">
                            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 animate-pulse shrink-0" />
                            <span>~{selectedOrderForTracking.estimatedMinutesRemaining} Minutes</span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 font-medium leading-normal">
                            Estimated Delivery: <strong className="text-white font-bold font-mono">{selectedOrderForTracking.estimatedDeliveryTime}</strong> to Room {roomNumber}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400 shrink-0" />
                            <span>Delivered to Room {roomNumber}</span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 font-mono">
                            Delivered at {selectedOrderForTracking.orderedAtFormatted} • Enjoy your meal!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Clean Progress Bar */}
                    <div className="space-y-1 pt-0.5">
                      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${selectedOrderForTracking.progressPercentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono gap-1 min-w-0">
                        <span className="truncate">Ordered {selectedOrderForTracking.orderedAtFormatted}</span>
                        <span className="shrink-0 font-medium">Step {selectedOrderForTracking.step}/4: {selectedOrderForTracking.statusLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 4-STEP LIVE TIMELINE */}
                  <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-3 sm:p-4 space-y-3 text-xs min-w-0 w-full">
                    <div className="font-bold text-white flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Live Kitchen & Delivery Timeline</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Room {roomNumber}
                      </span>
                    </div>

                    {/* Step 1: Order Confirmed */}
                    <div className="flex items-start gap-2.5 min-w-0 w-full">
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          selectedOrderForTracking.step >= 1
                            ? "bg-emerald-500 text-zinc-950"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        ✓
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white flex items-center justify-between gap-2">
                          <span className="truncate">1. Order Confirmed in Kitchen</span>
                          <span className="text-[10px] font-mono text-zinc-400 font-normal shrink-0">
                            {selectedOrderForTracking.orderedAtFormatted}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 leading-snug break-words mt-0.5">
                          KOT ticket printed and assigned to kitchen workstation
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Cooking in Kitchen */}
                    <div className="flex items-start gap-2.5 min-w-0 w-full">
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          selectedOrderForTracking.step > 2
                            ? "bg-emerald-500 text-zinc-950"
                            : selectedOrderForTracking.step === 2
                            ? "bg-white text-zinc-950 ring-2 ring-white/20"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {selectedOrderForTracking.step > 2 ? "✓" : "2"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white flex items-center justify-between gap-2">
                          <span className={selectedOrderForTracking.step === 2 ? "text-white font-black truncate" : "text-zinc-300 font-bold truncate"}>
                            2. Chefs Cooking Fresh Meal
                          </span>
                          {selectedOrderForTracking.step === 2 && (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">
                              ~{selectedOrderForTracking.estimatedMinutesRemaining}m
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 leading-snug break-words mt-0.5">
                          Chefs actively preparing fresh ingredients on tandoor & wok
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Out for Delivery */}
                    <div className="flex items-start gap-2.5 min-w-0 w-full">
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          selectedOrderForTracking.step > 3
                            ? "bg-emerald-500 text-zinc-950"
                            : selectedOrderForTracking.step === 3
                            ? "bg-white text-zinc-950 ring-2 ring-white/20"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {selectedOrderForTracking.step > 3 ? "✓" : "3"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white flex items-center justify-between gap-2">
                          <span className={selectedOrderForTracking.step === 3 ? "text-white font-black truncate" : "text-zinc-300 font-bold truncate"}>
                            3. Dispatched & Out for Delivery
                          </span>
                          {selectedOrderForTracking.step === 3 && (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">
                              On the Way (~5m)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 leading-snug break-words mt-0.5">
                          Food plated warm; room service runner bringing tray to Room {roomNumber}
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className="flex items-start gap-2.5 min-w-0 w-full">
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          selectedOrderForTracking.step === 4
                            ? "bg-emerald-500 text-zinc-950"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {selectedOrderForTracking.step === 4 ? "✓" : "4"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white">4. Delivered to Room</div>
                        <div className="text-[11px] text-zinc-400 leading-snug break-words mt-0.5">
                          Meal received in room. Bill posted to room folio / settled.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. ORDER ITEMS BREAKDOWN (GENUINE DATABASE ITEMS) */}
                  <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-3 sm:p-4 space-y-2 text-xs min-w-0 w-full">
                    <div className="font-bold text-white flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span>Ordered Dishes ({selectedOrderForTracking.items?.length || 0} items)</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {formatINR(selectedOrderForTracking.totalAmount)}
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5 min-w-0 w-full">
                      {selectedOrderForTracking.items?.map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-zinc-800/40 min-w-0 w-full">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-mono font-bold text-zinc-400 shrink-0">{it.qty}x</span>
                            <div className="min-w-0 flex-1">
                              <span className="text-white font-medium truncate block">{it.name}</span>
                              {it.notes && (
                                <span className="text-[10px] text-zinc-400 block font-mono truncate">
                                  Note: {it.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-zinc-300 shrink-0">{formatINR(it.total)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>GST (5% SAC 996331): {formatINR(selectedOrderForTracking.taxTotal)}</span>
                      <span className="text-white font-bold">Total: {formatINR(selectedOrderForTracking.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 space-y-2">
                  <UtensilsCrossed className="h-8 w-8 mx-auto text-zinc-600" />
                  <p>No active food orders found for Room {roomNumber}.</p>
                  <button
                    type="button"
                    onClick={() => setShowTrackingModal(false)}
                    className="rounded-xl bg-white text-zinc-950 font-bold px-4 py-2 text-xs shadow-md"
                  >
                    Browse Menu & Place Order
                  </button>
                </div>
              )}
            </div>

            {/* Modal Sticky Bottom Footer */}
            <div className="p-3.5 sm:p-4 border-t border-zinc-800 bg-[#121215] shrink-0 w-full">
              <button
                type="button"
                onClick={() => setShowTrackingModal(false)}
                className="w-full rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 py-3 text-xs font-bold transition active:scale-95 shadow-md"
              >
                Close & Continue Dining
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. WELCOME ROOM SELECTOR MODAL (FOR GENERIC QR SCANS) */}
      {showWelcomeModal && !roomNumber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-zinc-700 bg-[#121215] p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-200">
            <div className="text-center space-y-1.5 pb-2 border-b border-zinc-800">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-950 font-black text-base tracking-tight mx-auto mb-2 shadow-md">
                A
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                In-Room Dining
              </h2>
              <p className="text-xs text-zinc-400">
                Please select your room to explore the menu and order directly to your room.
              </p>
            </div>

            {/* Room Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search room number or your name..."
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700 pl-10 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white"
              />
            </div>

            {/* Occupied In-House Rooms (1-Tap Selection) */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold">
                In-House Rooms
              </div>

              {filteredRooms.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => {
                    handleSelectRoom(r);
                    setShowWelcomeModal(false);
                  }}
                  className="p-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">Room {r.number}</span>
                      <span className="text-[10px] text-zinc-400">• {r.roomTypeName}</span>
                    </div>
                    {r.guestName && (
                      <div className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
                        <User className="h-3 w-3 text-blue-400" /> {r.guestName}
                      </div>
                    )}
                  </div>

                  <span
                    className={`rounded-md px-2 py-0.5 text-[9px] font-mono font-bold ${
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
              className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 py-3 text-xs font-bold text-zinc-300 transition"
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 text-xs font-mono">
          Loading Menu...
        </div>
      }
    >
      <GuestOrderContent />
    </Suspense>
  );
}
