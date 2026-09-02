"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR, calculateGST } from "@/lib/gst/calculator";
import {
  UtensilsCrossed,
  ChefHat,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  Clock,
  BedDouble,
  Wine,
  Store,
  Layers,
  Sparkles,
  RefreshCw,
  X,
  AlertCircle,
  Check,
  Send,
  Receipt,
  FileText,
  User,
  Users,
  MessageSquare,
  Flame,
  ArrowRight,
} from "lucide-react";
import { PrintableKotSlipModal, KotPrintData } from "@/components/pos/printable-kot-slip";

type DestinationType = "ROOM" | "BAR" | "TABLE" | "OTHER";

interface CartItem {
  item: any;
  qty: number;
  notes: string;
}

export default function POSPage() {
  const { activeProperty } = useHotel();

  // Active Top Tab
  const [activeTab, setActiveTab] = useState<"TERMINAL" | "HISTORY">("TERMINAL");

  // Data state
  const [loading, setLoading] = useState(true);
  const [posData, setPosData] = useState<{
    property: any;
    outlet: any;
    categories: any[];
    items: any[];
    rooms: any[];
    tables: any[];
    barLocations: any[];
    otherLocations: any[];
    recentKots: any[];
  } | null>(null);

  // Live Kolkata Time
  const [currentTime, setCurrentTime] = useState<string>("");

  // Destination state
  const [destinationType, setDestinationType] = useState<DestinationType>("ROOM");
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [selectedBarId, setSelectedBarId] = useState<string>("bar_main");
  const [selectedOtherId, setSelectedOtherId] = useState<string>("oth_takeaway");
  const [customOtherText, setCustomOtherText] = useState<string>("");

  const [guestName, setGuestName] = useState<string>("");
  const [guestPhone, setGuestPhone] = useState<string>("");
  const [waiterName, setWaiterName] = useState<string>("Steward");
  const [covers, setCovers] = useState<number>(2);

  // Menu filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [vegFilter, setVegFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Cart & Order
  const [cart, setCart] = useState<{ [itemId: string]: CartItem }>({});
  const [paymentPreference, setPaymentPreference] = useState<"POST_TO_ROOM" | "CASH" | "UPI" | "CARD" | "UNSETTLED">("POST_TO_ROOM");
  const [kitchenInstructions, setKitchenInstructions] = useState<string>("");

  // Custom Item Modal
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({
    name: "",
    price: "",
    qty: "1",
    isVeg: true,
    notes: "",
  });

  // Per-item Note Editing Modal
  const [noteModalItem, setNoteModalItem] = useState<{ id: string; name: string; notes: string } | null>(null);

  // Printable KOT Modal
  const [activePrintKot, setActivePrintKot] = useState<KotPrintData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [lastFiredKot, setLastFiredKot] = useState<KotPrintData | null>(null);

  // KOTs list
  const [kotsList, setKotsList] = useState<any[]>([]);

  // Load POS Data
  const loadPOSData = async () => {
    if (!activeProperty?.id && !activeProperty?.code) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/pos/init?property=${activeProperty?.code || activeProperty?.id || "GUW-01"}`);
      const data = await res.json();
      if (data.success) {
        setPosData(data);
        setKotsList(data.recentKots || []);

        // Auto-select first occupied room or first room
        if (data.rooms && data.rooms.length > 0 && !selectedRoomNumber) {
          const occupied = data.rooms.find((r: any) => r.isOccupied);
          const firstRoom = occupied || data.rooms[0];
          setSelectedRoomNumber(firstRoom.number);
          setGuestName(firstRoom.guestName || "");
          setGuestPhone(firstRoom.guestPhone || "");
        }

        if (data.tables && data.tables.length > 0 && !selectedTableId) {
          setSelectedTableId(data.tables[0].name);
        }
      }
    } catch (err) {
      console.error("Error loading POS init:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOSData();
  }, [activeProperty?.id, activeProperty?.code]);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update guest details when room selection changes
  useEffect(() => {
    if (!posData?.rooms || !selectedRoomNumber) return;
    const found = posData.rooms.find((r) => String(r.number).trim() === String(selectedRoomNumber).trim());
    if (found) {
      setGuestName(found.guestName || "");
      setGuestPhone(found.guestPhone || "");
      if (found.isOccupied) {
        setPaymentPreference("POST_TO_ROOM");
      } else {
        setPaymentPreference("CASH");
      }
    }
  }, [selectedRoomNumber, posData]);

  // Selected Room Object
  const currentRoomObj = useMemo(() => {
    if (!posData?.rooms || !selectedRoomNumber) return null;
    return posData.rooms.find((r) => String(r.number).trim() === String(selectedRoomNumber).trim()) || null;
  }, [posData, selectedRoomNumber]);

  // Destination title calculation
  const currentDestinationLabel = useMemo(() => {
    if (destinationType === "ROOM") {
      return `Room ${selectedRoomNumber || "—"}${guestName ? ` (${guestName})` : ""}`;
    }
    if (destinationType === "BAR") {
      const found = posData?.barLocations.find((b) => b.id === selectedBarId);
      return found ? found.name : "Bar Counter";
    }
    if (destinationType === "TABLE") {
      return `${selectedTableId || "Table 1"} • ${covers} Covers`;
    }
    if (destinationType === "OTHER") {
      if (customOtherText.trim()) return customOtherText;
      const found = posData?.otherLocations.find((o) => o.id === selectedOtherId);
      return found ? found.name : "Other / Takeaway";
    }
    return "Dining";
  }, [destinationType, selectedRoomNumber, guestName, selectedBarId, selectedTableId, covers, selectedOtherId, customOtherText, posData]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    if (!posData?.items) return [];

    return posData.items.filter((item) => {
      // Category filter
      if (selectedCategory !== "ALL" && item.categoryId !== selectedCategory) {
        return false;
      }
      // Veg filter
      if (vegFilter === "VEG" && !item.isVeg) return false;
      if (vegFilter === "NON_VEG" && item.isVeg) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = item.code?.toLowerCase().includes(q);
        const matchCat = item.categoryName?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        return matchName || matchCode || matchCat || matchDesc;
      }

      return true;
    });
  }, [posData, selectedCategory, vegFilter, searchQuery]);

  // Cart Management
  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev[item.id];
      if (existing) {
        return {
          ...prev,
          [item.id]: { ...existing, qty: existing.qty + 1 },
        };
      }
      return {
        ...prev,
        [item.id]: {
          item,
          qty: 1,
          notes: "",
        },
      };
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: { ...existing, qty: newQty },
      };
    });
  };

  const setItemNotes = (itemId: string, notes: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      return {
        ...prev,
        [itemId]: { ...existing, notes },
      };
    });
  };

  const clearCart = () => {
    setCart({});
    setKitchenInstructions("");
  };

  // Add Custom Off-Menu Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemForm.name.trim() || !customItemForm.price) return;

    const customId = `custom_${Date.now()}`;
    const priceNum = Number(customItemForm.price) || 0;
    const qtyNum = Math.max(Number(customItemForm.qty) || 1, 1);

    const customItem = {
      id: customId,
      name: customItemForm.name.trim(),
      price: priceNum,
      isVeg: customItemForm.isVeg,
      portionSize: "Custom",
      categoryName: "Custom Kitchen Order",
    };

    setCart((prev) => ({
      ...prev,
      [customId]: {
        item: customItem,
        qty: qtyNum,
        notes: customItemForm.notes.trim(),
      },
    }));

    setCustomItemForm({
      name: "",
      price: "",
      qty: "1",
      isVeg: true,
      notes: "",
    });
    setShowCustomItemModal(false);
  };

  // Cart Calculations
  const cartEntries = useMemo(() => Object.values(cart), [cart]);
  const cartTotalItems = useMemo(() => cartEntries.reduce((sum, c) => sum + c.qty, 0), [cartEntries]);
  const cartSubtotal = useMemo(() => cartEntries.reduce((sum, c) => sum + (c.item.price * c.qty), 0), [cartEntries]);

  const gstCalculation = useMemo(() => {
    return calculateGST({
      grossOrBaseAmount: cartSubtotal,
      isInclusive: false,
      sacHsn: "996331",
      supplierStateCode: posData?.property?.stateCode || "18",
    });
  }, [cartSubtotal, posData]);

  // Fire KOT Handler
  const handleFireKOT = async () => {
    if (cartEntries.length === 0) {
      alert("Please add at least one item to fire KOT.");
      return;
    }

    if (destinationType === "ROOM" && !selectedRoomNumber) {
      alert("Please select a room number.");
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload = cartEntries.map((c) => ({
        menuItemId: c.item.id?.startsWith("custom_") ? undefined : c.item.id,
        variantId: c.item.defaultVariantId,
        name: c.item.name,
        qty: c.qty,
        unitPrice: c.item.price,
        notes: c.notes || undefined,
        stationId: c.item.stationId,
      }));

      let destinationDetail = "";
      if (destinationType === "ROOM") destinationDetail = `Room ${selectedRoomNumber}`;
      else if (destinationType === "BAR") destinationDetail = posData?.barLocations.find(b => b.id === selectedBarId)?.name || "Bar Counter";
      else if (destinationType === "TABLE") destinationDetail = selectedTableId || "Table 1";
      else destinationDetail = customOtherText.trim() || posData?.otherLocations.find(o => o.id === selectedOtherId)?.name || "Takeaway / Parcel";

      const res = await fetch("/api/v1/pos/kots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: posData?.property?.id,
          outletId: posData?.outlet?.id,
          destinationType,
          destinationDetail,
          roomNumber: destinationType === "ROOM" ? selectedRoomNumber : undefined,
          stayId: destinationType === "ROOM" ? currentRoomObj?.stayId : undefined,
          guestName: guestName.trim() || undefined,
          waiterName: waiterName.trim() || "Steward",
          covers: Number(covers) || 2,
          items: itemsPayload,
          paymentPreference,
          kitchenInstructions: kitchenInstructions.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to fire KOT.");

      // Set KOT Print Slip
      if (result.kotSlip) {
        setActivePrintKot(result.kotSlip);
        setLastFiredKot(result.kotSlip);
        setShowPrintModal(true);
      }

      // Clear Cart
      clearCart();

      // Refresh KOTs list
      loadPOSData();
    } catch (err: any) {
      alert(`KOT Firing Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Update KOT Status
  const handleUpdateKotStatus = async (kotId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/pos/kots/${kotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setKotsList((prev) =>
          prev.map((k) => (k.id === kotId ? { ...k, status: newStatus } : k))
        );
      }
    } catch (err) {
      console.error("Error updating KOT status:", err);
    }
  };

  // Reprint KOT
  const handleReprintKot = (kot: any) => {
    const slipData: KotPrintData = {
      kotNo: kot.kotNo,
      orderNo: kot.orderNo,
      outletName: posData?.property?.displayName || "Restaurant & Dining",
      stationName: kot.stationName || "Hot Kitchen",
      mode: kot.mode,
      roomNumber: kot.destinationTitle?.includes("Room") ? kot.destinationTitle : undefined,
      tableName: !kot.destinationTitle?.includes("Room") ? kot.destinationTitle : undefined,
      guestName: kot.waiterName || "Guest",
      waiterName: kot.waiterName || "Steward",
      firedAt: kot.firedAt || new Date().toISOString(),
      lines: kot.lines.map((l: any) => ({
        name: l.name,
        qty: l.qty,
        notes: l.notes,
      })),
    };

    setActivePrintKot(slipData);
    setShowPrintModal(true);

    // Track reprint increment
    fetch(`/api/v1/pos/kots/${kot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incrementReprint: true }),
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c0c0e] text-zinc-900 dark:text-white p-3 sm:p-5 lg:p-6 space-y-4">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & LIVE STATUS BAR                                          */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 p-4 sm:p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Restaurant POS & Kitchen Terminal</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-black uppercase">
                Live POS
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {posData?.property?.displayName || "Hotel Ambarish Grand Residency"} • High-Speed KOT Dispatch & Folio Posting
            </p>
          </div>
        </div>

        {/* Header Right Actions & Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab("TERMINAL")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "TERMINAL"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-black"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Send className="h-3.5 w-3.5 text-orange-500" />
              <span>KOT Terminal</span>
            </button>
            <button
              onClick={() => setActiveTab("HISTORY")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "HISTORY"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-black"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-zinc-500" />
              <span>Recent KOTs</span>
            </button>
          </div>

          {lastFiredKot && (
            <button
              onClick={() => {
                setActivePrintKot(lastFiredKot);
                setShowPrintModal(true);
              }}
              className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Reprint last fired KOT slip"
            >
              <Printer className="h-3.5 w-3.5 text-zinc-500" />
              <span>Reprint {lastFiredKot.kotNo}</span>
            </button>
          )}

          <div className="h-9 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span>{currentTime || "IST"}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB 1: NEW KOT & ORDER TERMINAL                                        */}
      {/* ========================================================================= */}
      {activeTab === "TERMINAL" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT 8 COLS: DESTINATION + MENU BROWSER */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* DESTINATION SELECTOR CARD (ROOM, BAR, TABLE, OTHER) */}
            <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-orange-500" />
                  <span>Select Order Destination *</span>
                </span>
                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 font-mono bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900">
                  {currentDestinationLabel}
                </span>
              </div>

              {/* 4 Segmented Destination Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setDestinationType("ROOM")}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    destinationType === "ROOM"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md font-black"
                      : "bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <BedDouble className="h-4 w-4 shrink-0" />
                  <span>Room Service</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDestinationType("BAR")}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    destinationType === "BAR"
                      ? "bg-purple-600 text-white border-purple-600 shadow-md font-black"
                      : "bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Wine className="h-4 w-4 shrink-0" />
                  <span>Bar Lounge</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDestinationType("TABLE")}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    destinationType === "TABLE"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md font-black"
                      : "bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <UtensilsCrossed className="h-4 w-4 shrink-0" />
                  <span>Dine-In Table</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDestinationType("OTHER")}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    destinationType === "OTHER"
                      ? "bg-amber-600 text-white border-amber-600 shadow-md font-black"
                      : "bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Store className="h-4 w-4 shrink-0" />
                  <span>Other / Takeaway</span>
                </button>
              </div>

              {/* DYNAMIC DESTINATION CONTROLS */}
              <div className="pt-1">
                {/* 1. ROOM DESTINATION FORM */}
                {destinationType === "ROOM" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 animate-in fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Select Guest Room *
                      </label>
                      <select
                        value={selectedRoomNumber}
                        onChange={(e) => setSelectedRoomNumber(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                      >
                        <optgroup label="🏨 Occupied In-House Rooms">
                          {posData?.rooms
                            ?.filter((r) => r.isOccupied)
                            .map((r) => (
                              <option key={r.id} value={r.number}>
                                Room {r.number} — {r.guestName} ({r.roomType})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Vacant Rooms">
                          {posData?.rooms
                            ?.filter((r) => !r.isOccupied)
                            .map((r) => (
                              <option key={r.id} value={r.number}>
                                Room {r.number} — Vacant ({r.roomType})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Guest Name
                      </label>
                      <input
                        type="text"
                        placeholder="In-House Guest"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Steward / Waiter
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul / Room Service"
                        value={waiterName}
                        onChange={(e) => setWaiterName(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {/* 2. BAR DESTINATION FORM */}
                {destinationType === "BAR" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 animate-in fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Bar Location / Station *
                      </label>
                      <select
                        value={selectedBarId}
                        onChange={(e) => setSelectedBarId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                      >
                        {posData?.barLocations?.map((b) => (
                          <option key={b.id} value={b.id}>
                            🍸 {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Guest / Tab Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mr. Kapoor / Tab #4"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Bartender / Steward
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Alex / Barman"
                        value={waiterName}
                        onChange={(e) => setWaiterName(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {/* 3. TABLE DESTINATION FORM */}
                {destinationType === "TABLE" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 animate-in fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Select Dining Table *
                      </label>
                      <select
                        value={selectedTableId}
                        onChange={(e) => setSelectedTableId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                      >
                        {posData?.tables?.map((t) => (
                          <option key={t.id} value={t.name}>
                            🍽️ {t.name} ({t.section || "Main Dining"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Covers (Guest Count)
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 4, 6, 8].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCovers(c)}
                            className={`h-10 flex-1 rounded-xl text-xs font-mono font-bold transition cursor-pointer border ${
                              covers === c
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Server / Steward
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amit / Server"
                        value={waiterName}
                        onChange={(e) => setWaiterName(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {/* 4. OTHER / TAKEAWAY DESTINATION FORM */}
                {destinationType === "OTHER" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 animate-in fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Location Preset
                      </label>
                      <select
                        value={selectedOtherId}
                        onChange={(e) => {
                          setSelectedOtherId(e.target.value);
                          setCustomOtherText("");
                        }}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
                      >
                        {posData?.otherLocations?.map((o) => (
                          <option key={o.id} value={o.id}>
                            📦 {o.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Custom Destination / Note
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Takeaway for Mr. Das"
                        value={customOtherText}
                        onChange={(e) => setCustomOtherText(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Guest / Receiver Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Walk-in Guest"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MENU BROWSER & FILTER BAR */}
            <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] p-4 sm:p-5 shadow-xs space-y-4">
              
              {/* Category Pills Slider */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-black shadow-xs"
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  All Items ({posData?.items?.length || 0})
                </button>
                {posData?.categories?.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-black shadow-xs"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {cat.name} ({cat.itemsCount})
                  </button>
                ))}
              </div>

              {/* Search + Diet Filter + Custom Item Button */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search dishes by name, ingredients, or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Veg / Non-veg Segmented Control */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold shrink-0">
                  <button
                    onClick={() => setVegFilter("ALL")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      vegFilter === "ALL" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-bold" : "text-zinc-500"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setVegFilter("VEG")}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                      vegFilter === "VEG" ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold" : "text-zinc-500"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span>Veg</span>
                  </button>
                  <button
                    onClick={() => setVegFilter("NON_VEG")}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                      vegFilter === "NON_VEG" ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-2xs font-bold" : "text-zinc-500"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    <span>Non-Veg</span>
                  </button>
                </div>

                {/* Custom Item Button */}
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(true)}
                  className="h-10 px-3.5 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 border border-orange-200 dark:border-orange-800/80"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Custom Item</span>
                </button>
              </div>

              {/* MENU ITEMS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[580px] overflow-y-auto pr-1">
                {filteredMenuItems.map((item) => {
                  const cartItem = cart[item.id];
                  const inCartQty = cartItem?.qty || 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 select-none ${
                        inCartQty > 0
                          ? "bg-orange-50/80 dark:bg-orange-950/40 border-orange-400 dark:border-orange-600 shadow-sm"
                          : "bg-white dark:bg-zinc-900/70 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs"
                      }`}
                    >
                      {/* Top Row: Indicator, Name & Price */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 mt-1 ${
                                item.isVeg ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                              title={item.isVeg ? "Veg" : "Non-Veg"}
                            />
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-2 leading-tight">
                              {item.name}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                            {formatINR(item.price)}
                          </span>
                          {item.portionSize && item.portionSize !== "Standard" && (
                            <span className="text-[10px] font-mono text-zinc-400">
                              {item.portionSize}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom Controls */}
                      {inCartQty > 0 ? (
                        <div className="flex items-center justify-between pt-1.5 border-t border-orange-200/80 dark:border-orange-800/80">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoteModalItem({
                                id: item.id,
                                name: item.name,
                                notes: cartItem?.notes || "",
                              });
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition ${
                              cartItem?.notes
                                ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                            }`}
                          >
                            {cartItem?.notes ? "📝 Note" : "+ Note"}
                          </button>

                          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-0.5 rounded-lg border border-orange-300 dark:border-orange-700 shadow-2xs">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQty(item.id, -1);
                              }}
                              className="h-5 w-5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold hover:bg-zinc-200 text-xs"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="font-mono font-black text-xs px-1 text-orange-600 dark:text-orange-400">
                              {inCartQty}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQty(item.id, 1);
                              }}
                              className="h-5 w-5 rounded bg-orange-600 text-white flex items-center justify-center font-bold hover:bg-orange-700 text-xs"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end pt-1">
                          <span className="h-5 px-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10.5px] font-bold inline-flex items-center gap-1">
                            <Plus className="h-2.5 w-2.5 text-zinc-400" />
                            <span>Add</span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredMenuItems.length === 0 && (
                  <div className="col-span-full p-8 text-center text-zinc-400 space-y-2">
                    <UtensilsCrossed className="h-8 w-8 mx-auto opacity-40" />
                    <p className="text-xs">No dishes match your active filter.</p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* RIGHT 4 COLS: ACTIVE KOT TICKET & DISPATCH */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] p-4 sm:p-5 shadow-xs space-y-4 sticky top-4">
              
              {/* KOT Ticket Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white">Active KOT Order</h3>
                    <p className="text-[10.5px] text-zinc-500">{currentDestinationLabel}</p>
                  </div>
                </div>

                {cartTotalItems > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Items in KOT Ticket */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {cartEntries.map(({ item, qty, notes }) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            item.isVeg ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span className="font-bold text-zinc-900 dark:text-white line-clamp-1">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-zinc-900 dark:text-white">
                        {formatINR(item.price * qty)}
                      </span>
                    </div>

                    {notes && (
                      <div className="text-[10.5px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 italic">
                        * Note: {notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setNoteModalItem({
                            id: item.id,
                            name: item.name,
                            notes: notes || "",
                          })
                        }
                        className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold"
                      >
                        {notes ? "Edit note" : "+ Add note"}
                      </button>

                      <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, -1)}
                          className="h-5 w-5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-xs font-bold"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="font-mono font-bold px-1 text-xs">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, 1)}
                          className="h-5 w-5 rounded bg-orange-600 text-white flex items-center justify-center text-xs font-bold"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {cartEntries.length === 0 && (
                  <div className="p-8 text-center text-zinc-400 space-y-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <UtensilsCrossed className="h-6 w-6 mx-auto opacity-30" />
                    <p className="text-xs">No items in KOT ticket.</p>
                    <p className="text-[10.5px] text-zinc-400">Click on dishes from the menu to add.</p>
                  </div>
                )}
              </div>

              {/* Kitchen Instructions */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                  Kitchen / Chef Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Serve hot, send extra cutlery & water"
                  value={kitchenInstructions}
                  onChange={(e) => setKitchenInstructions(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              {/* Bill Summary & GST */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Subtotal ({cartTotalItems} items):</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">{formatINR(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Restaurant GST (5% SAC 996331):</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">{formatINR(gstCalculation.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1.5 border-t border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white">
                  <span>Total Payable:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatINR(gstCalculation.totalAmount)}</span>
                </div>
              </div>

              {/* Settlement Preference */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                  Settlement & Folio Preference
                </label>
                <select
                  value={paymentPreference}
                  onChange={(e: any) => setPaymentPreference(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {destinationType === "ROOM" && currentRoomObj?.isOccupied && (
                    <option value="POST_TO_ROOM">🏨 Post to Guest Room Folio (Room {selectedRoomNumber})</option>
                  )}
                  <option value="CASH">💵 Cash / Counter Settle</option>
                  <option value="UPI">📱 UPI / QR Code</option>
                  <option value="CARD">💳 Credit / Debit Card</option>
                  <option value="UNSETTLED">🕒 Pay Later (Open KOT Ticket)</option>
                </select>
              </div>

              {/* FIRE KOT ACTION BUTTON */}
              <button
                type="button"
                disabled={cartTotalItems === 0 || submitting}
                onClick={handleFireKOT}
                className="w-full h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Flame className="h-5 w-5" />
                <span>{submitting ? "Firing KOT..." : "Fire KOT & Print Slip"}</span>
              </button>

            </div>
          </div>

        </div>
      )}



      {/* ========================================================================= */}
      {/* 4. TAB 3: RECENT KOTS & REPRINT HISTORY                                   */}
      {/* ========================================================================= */}
      {activeTab === "HISTORY" && (
        <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-sm font-black text-zinc-900 dark:text-white">Recent Kitchen Order Tickets (KOT)</h2>
              <p className="text-xs text-zinc-500">View and reprint all recently fired KOT slips</p>
            </div>
            <button
              onClick={loadPOSData}
              className="h-8 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 text-[11px] uppercase font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">KOT #</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3">Ordered Items</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {kotsList.map((kot) => (
                  <tr key={kot.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-orange-600 dark:text-orange-400">
                      {kot.kotNo}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-500 font-mono text-[11px]">
                      {new Date(kot.firedAt).toLocaleTimeString("en-GB")}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">
                      {kot.destinationTitle}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold">{kot.totalItemsCount} Items</span>
                      <span className="text-[11px] text-zinc-400 ml-1.5">
                        ({kot.lines.map((l: any) => `${l.name} ×${l.qty}`).join(", ")})
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        kot.status === "QUEUED"
                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          : kot.status === "PREPARING"
                          ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      }`}>
                        {kot.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right">
                      {formatINR(kot.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleReprintKot(kot)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="h-3 w-3 text-zinc-500" />
                        <span>Print KOT</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {kotsList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-400">
                      No KOT tickets recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CUSTOM OFF-MENU DISH MODAL                                             */}
      {/* ========================================================================= */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-bold">Add Custom Off-Menu Dish</h3>
              </div>
              <button
                onClick={() => setShowCustomItemModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold block mb-1">Dish / Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Assam Black Tea / Chef Custom Fish"
                  value={customItemForm.name}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="250"
                    value={customItemForm.price}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, price: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={customItemForm.qty}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, qty: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Dietary Type</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomItemForm({ ...customItemForm, isVeg: true })}
                    className={`flex-1 h-9 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      customItemForm.isVeg
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span>Pure Veg</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomItemForm({ ...customItemForm, isVeg: false })}
                    className={`flex-1 h-9 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      !customItemForm.isVeg
                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300"
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    <span>Non-Veg</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Kitchen Prep Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Mild spice, no garlic"
                  value={customItemForm.notes}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, notes: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="h-10 px-4 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md"
                >
                  Add to KOT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PER-ITEM KITCHEN NOTE MODAL                                            */}
      {/* ========================================================================= */}
      {noteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-bold">Kitchen Instructions</h3>
                <p className="text-xs text-zinc-500">{noteModalItem.name}</p>
              </div>
              <button
                onClick={() => setNoteModalItem(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Quick Preset Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {["Less Spicy", "Extra Spicy", "No Onion / Garlic", "Jain Prep", "Make it Crispy", "Extra Butter / Gravy", "Sugar Free"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const current = noteModalItem.notes;
                      const next = current ? `${current}, ${preset}` : preset;
                      setNoteModalItem({ ...noteModalItem, notes: next });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] transition cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                placeholder="Type custom note for the chef..."
                value={noteModalItem.notes}
                onChange={(e) => setNoteModalItem({ ...noteModalItem, notes: e.target.value })}
                className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNoteModalItem(null)}
                className="h-10 px-4 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setItemNotes(noteModalItem.id, noteModalItem.notes);
                  setNoteModalItem(null);
                }}
                className="h-10 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PRINTABLE KOT SLIP MODAL                                               */}
      {/* ========================================================================= */}
      <PrintableKotSlipModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        kot={activePrintKot}
        hotelName={posData?.property?.displayName || "Hotel Ambarish Grand Residency"}
      />

    </div>
  );
}
