"use client";

import React, { useEffect, useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR, calculateGST } from "@/lib/gst/calculator";
import { PrintableKotSlipModal, KotPrintData } from "@/components/pos/printable-kot-slip";
import {
  UtensilsCrossed,
  Flame,
  Clock,
  CheckCircle2,
  Send,
  BedDouble,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  User,
  Phone,
  ChefHat,
  Printer,
  History,
  ShoppingBag,
  Layers,
  Sparkles,
  AlertCircle,
  Check,
  ArrowRight,
  Filter,
} from "lucide-react";

export default function POSPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [config, setConfig] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [kots, setKots] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation Tabs: "pad" (Order Punching), "kds" (Live Kitchen Display), "history" (KOT Register)
  const [activeTab, setActiveTab] = useState<"pad" | "kds" | "history">("pad");

  // Service Mode: "DINE_IN" (Table), "ROOM_SERVICE" (In-Room), "TAKEAWAY"
  const [serviceMode, setServiceMode] = useState<"DINE_IN" | "ROOM_SERVICE" | "TAKEAWAY">("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedStay, setSelectedStay] = useState<any>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Menu Search & Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [menuSearch, setMenuSearch] = useState("");

  // Active Cart: Array of { id, name, unitPrice, qty, stationId, isVeg, notes }
  const [cartItems, setCartItems] = useState<any[]>([]);

  // Printable KOT Slip Modal
  const [printKotData, setPrintKotData] = useState<KotPrintData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Action Loading
  const [actionLoading, setActionLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const loadData = async () => {
    if (!activeProperty) return;
    setLoading(true);
    try {
      const [configRes, staysRes, kotsRes] = await Promise.all([
        fetch(`/api/v1/properties/${activeProperty.id}/config`),
        fetch(`/api/v1/stays?propertyId=${activeProperty.id}&status=IN_HOUSE`),
        fetch(`/api/v1/kots?propertyId=${activeProperty.id}`),
      ]);

      const configData = await configRes.json();
      const staysData = await staysRes.json();
      const kotsData = await kotsRes.json();

      setConfig(configData);
      setStays(Array.isArray(staysData) ? staysData : []);
      setKots(Array.isArray(kotsData) ? kotsData : []);

      const outletId = configData.outlets?.[0]?.id;
      if (outletId) {
        const ordersRes = await fetch(`/api/v1/pos/outlets/${outletId}/orders`);
        const ordersData = await ordersRes.json();
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      }
    } catch (err) {
      console.error("POS load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProperty, refreshKey]);

  // Live polling for KDS updates every 6 seconds
  useEffect(() => {
    if (activeTab !== "kds" || !activeProperty) return;
    const interval = setInterval(() => {
      loadData();
    }, 6000);
    return () => clearInterval(interval);
  }, [activeTab, activeProperty]);

  const activeOutlet = config?.outlets?.[0];
  const tables = activeOutlet?.tables || [];
  const categories = activeOutlet?.categories || [];
  const kitchenStations = activeOutlet?.kitchenStations || [];

  const allMenuItems = categories.flatMap((c: any) =>
    c.items.map((i: any) => ({
      ...i,
      categoryName: c.name,
      variant: i.variants?.[0],
      price: i.variants?.[0]?.price || 200,
      stationId: i.variants?.[0]?.stationId,
      isVeg: i.description === "Pure Vegetarian" || !i.name.toLowerCase().includes("chicken") && !i.name.toLowerCase().includes("mutton") && !i.name.toLowerCase().includes("fish") && !i.name.toLowerCase().includes("egg") && !i.name.toLowerCase().includes("omelet"),
    }))
  );

  const filteredMenuItems = allMenuItems.filter((i: any) => {
    const matchesCat = selectedCategory === "ALL" || i.categoryId === selectedCategory;
    const matchesSearch = i.name.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Cart Operations
  const addToCart = (item: any) => {
    const existing = cartItems.find((c) => c.id === item.id);
    if (existing) {
      setCartItems(cartItems.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      setCartItems([
        ...cartItems,
        {
          id: item.id,
          name: item.name,
          unitPrice: item.price,
          stationId: item.stationId,
          qty: 1,
          notes: "",
        },
      ]);
    }
  };

  const updateQty = (itemId: string, delta: number) => {
    setCartItems(
      cartItems
        .map((c) => {
          if (c.id === itemId) {
            const newQty = c.qty + delta;
            return newQty > 0 ? { ...c, qty: newQty } : null;
          }
          return c;
        })
        .filter(Boolean)
    );
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCartItems(cartItems.map((c) => (c.id === itemId ? { ...c, notes } : c)));
  };

  const removeItem = (itemId: string) => {
    setCartItems(cartItems.filter((c) => c.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Financial calculations
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const gst = calculateGST({
    grossOrBaseAmount: cartSubtotal,
    isInclusive: false,
    sacHsn: "996331", // Restaurant Food & Beverage 5% GST
    supplierStateCode: activeProperty?.stateCode || "18",
  });

  // Fire KOT Action
  const handleFireKOT = async () => {
    if (serviceMode === "DINE_IN" && !selectedTable) {
      alert("Please select a dining table for Dine-In service.");
      return;
    }
    if (serviceMode === "ROOM_SERVICE" && !selectedStay) {
      alert("Please select an in-house room for Room Service delivery.");
      return;
    }
    if (cartItems.length === 0) {
      alert("Cart is empty. Please add items from the menu.");
      return;
    }

    setActionLoading(true);
    try {
      let custName = "";
      let custPhone = "";
      let targetRoomNumber = "";

      if (serviceMode === "ROOM_SERVICE" && selectedStay) {
        targetRoomNumber = selectedStay.roomAssignments?.[0]?.room?.number || "";
        custName = `${selectedStay.primaryGuest?.name || "Guest"} (Room ${targetRoomNumber})`;
        custPhone = selectedStay.primaryGuest?.phone || "";
      } else if (serviceMode === "DINE_IN" && selectedTable) {
        custName = `Dine-In (${selectedTable.name})`;
      } else {
        custName = customerName || "Takeaway Customer";
        custPhone = customerPhone;
      }

      // 1. Create POS Order
      const orderRes = await fetch(`/api/v1/pos/outlets/${activeOutlet.id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          tableId: serviceMode === "DINE_IN" ? selectedTable?.id : undefined,
          stayId: serviceMode === "ROOM_SERVICE" ? selectedStay?.id : undefined,
          mode: serviceMode,
          customerName: custName,
          customerContact: custPhone,
          covers: selectedTable?.capacity || 2,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create order");

      // 2. Add Items with Notes
      await fetch(`/api/v1/pos/orders/${orderData.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems }),
      });

      // 3. Fire KOT
      const kotRes = await fetch(`/api/v1/pos/orders/${orderData.id}/fire-kot`, {
        method: "POST",
      });

      const kotData = await kotRes.json();
      if (!kotRes.ok) throw new Error(kotData.error || "Failed to fire KOT");

      const generatedKots = kotData.kots || [];
      const primaryKot = generatedKots[0];

      // Setup instant printable slip preview
      if (primaryKot) {
        setPrintKotData({
          kotNo: primaryKot.kotNo || "KOT-001",
          orderNo: orderData.orderNo || "ORD-001",
          outletName: activeOutlet?.name || "Grand Saffron Restaurant",
          stationName: kitchenStations.find((s: any) => s.id === primaryKot.stationId)?.name || "Main Kitchen",
          mode: serviceMode,
          roomNumber: targetRoomNumber,
          tableName: selectedTable?.name,
          guestName: selectedStay?.primaryGuest?.name || custName,
          firedAt: new Date(),
          lines: cartItems.map((c) => ({
            name: c.name,
            qty: c.qty,
            notes: c.notes,
          })),
        });
        setShowPrintModal(true);
      }

      triggerToast(`KOT fired successfully (${generatedKots.length} ticket generated)`);
      setCartItems([]);
      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Fire KOT Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Direct Room Folio Posting
  const handlePostToRoomFolio = async () => {
    if (!selectedStay) {
      alert("Please select an active in-house stay to post charges.");
      return;
    }
    if (cartItems.length === 0) {
      alert("Cart is empty. Please add items.");
      return;
    }

    const roomNo = selectedStay.roomAssignments?.[0]?.room?.number || "Room";
    const confirmed = confirm(
      `Post total F&B bill of ${formatINR(gst.totalAmount)} (incl. 5% GST) directly to Room ${roomNo} Folio of ${selectedStay.primaryGuest?.name}?`
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      // 1. Create Order
      const orderRes = await fetch(`/api/v1/pos/outlets/${activeOutlet.id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          stayId: selectedStay.id,
          mode: "ROOM_SERVICE",
          customerName: `${selectedStay.primaryGuest?.name} (Room ${roomNo})`,
          customerContact: selectedStay.primaryGuest?.phone,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Order creation failed");

      // 2. Add Items
      await fetch(`/api/v1/pos/orders/${orderData.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems }),
      });

      // 3. Post to Room Folio
      const postRes = await fetch(`/api/v1/pos/orders/${orderData.id}/post-to-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stayId: selectedStay.id }),
      });
      const postData = await postRes.json();
      if (!postRes.ok) throw new Error(postData.error || "Room posting failed");

      triggerToast(`${formatINR(gst.totalAmount)} posted to Room ${roomNo} Folio`);
      setCartItems([]);
      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Folio Posting Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // KDS Status Transition
  const handleKdsStatus = async (kotId: string, status: string) => {
    try {
      await fetch("/api/v1/kots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kotId, status }),
      });
      await loadData();
    } catch (err) {
      console.error("KDS status error:", err);
    }
  };

  // Helper to extract KOT display data
  const getKotInfo = (kot: any) => {
    const stay = kot.order?.stay;
    const roomAssignment = stay?.roomAssignments?.[0];

    let roomNumber = roomAssignment?.room?.number ? String(roomAssignment.room.number) : "";
    if (!roomNumber && kot.order?.customerName) {
      const match = kot.order.customerName.match(/Room\s*([A-Za-z0-9_-]+)/i);
      if (match) roomNumber = match[1];
    }

    let guestName = stay?.primaryGuest?.name || "";
    if (!guestName && kot.order?.customerName) {
      guestName = kot.order.customerName.replace(/\s*\(Room\s*[^\)]+\)/i, "").trim();
    }
    if (!guestName && !roomNumber) {
      guestName = kot.order?.table?.name || "Dine-In Table";
    }

    const contactNumber = kot.order?.customerContact || stay?.primaryGuest?.phone || "";
    const firedAt = kot.firedAt ? new Date(kot.firedAt) : new Date();
    const elapsedMins = Math.max(0, Math.floor((Date.now() - firedAt.getTime()) / 60000));
    const firedTimeStr = firedAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const isRoomService = Boolean(roomNumber) || kot.order?.mode === "ROOM_SERVICE";

    return {
      roomNumber,
      guestName,
      contactNumber,
      isRoomService,
      tableName: kot.order?.table?.name,
      elapsedMins,
      firedTimeStr,
      orderNo: kot.order?.orderNo,
    };
  };

  const openKotSlip = (kot: any) => {
    const info = getKotInfo(kot);
    setPrintKotData({
      kotNo: kot.kotNo,
      orderNo: info.orderNo,
      outletName: activeOutlet?.name || "Grand Saffron Restaurant",
      stationName: kot.station?.name || "Hot Kitchen",
      mode: info.isRoomService ? "ROOM_SERVICE" : "DINE_IN",
      roomNumber: info.roomNumber,
      tableName: info.tableName,
      guestName: info.guestName,
      firedAt: kot.firedAt || new Date(),
      lines: (kot.lines || []).map((l: any) => ({
        name: l.orderItem?.nameSnapshot || "Dish",
        qty: l.qty,
        notes: l.notesSnapshot || l.orderItem?.notes,
      })),
    });
    setShowPrintModal(true);
  };

  const queuedKots = kots.filter((k) => k.status === "QUEUED");
  const preparingKots = kots.filter((k) => k.status === "PREPARING");
  const readyKots = kots.filter((k) => k.status === "READY");

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-zinc-900 text-zinc-100 border border-zinc-700 px-5 py-3.5 shadow-2xl flex items-center gap-2.5 text-sm font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* TOP HEADER / WORKSPACE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {activeProperty?.displayName || "Hotel Ambarish Grand Residency"}
              </h1>
              <span className="rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-0.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 font-semibold">
                Restaurant & In-Room Dining
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              Breakfast: 8:00 AM – 11:00 AM • À La Carte: 12:00 PM – 10:45 PM
            </p>
          </div>
        </div>

        {/* 3 Main Navigation Tabs (Large, Touch-Friendly, Unified Style) */}
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("pad")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "pad"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            <span>Order Pad</span>
          </button>

          <button
            onClick={() => setActiveTab("kds")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "kds"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
            }`}
          >
            <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Live KDS</span>
            {kots.length > 0 && (
              <span className="rounded bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-300 px-2 py-0.5 text-xs font-mono font-bold">
                {kots.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-900"
            }`}
          >
            <History className="h-4 w-4" />
            <span>KOT History</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ORDER PUNCHING PAD                                                  */}
      {/* ========================================================================= */}
      {activeTab === "pad" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT 8 COLS: Table/Room Selector & Menu Catalog */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* 1. SERVICE MODE & DESTINATION SELECTOR */}
            <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-4 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span className="text-xs font-bold uppercase text-zinc-800 dark:text-zinc-300 tracking-wider flex items-center gap-2">
                  <Layers className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  Destination & Service Mode
                </span>

                <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setServiceMode("DINE_IN");
                      setSelectedStay(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      serviceMode === "DINE_IN"
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5" />
                    <span>Dine-In Table</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setServiceMode("ROOM_SERVICE");
                      setSelectedTable(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      serviceMode === "ROOM_SERVICE"
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <BedDouble className="h-3.5 w-3.5" />
                    <span>In-Room Dining</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setServiceMode("TAKEAWAY");
                      setSelectedTable(null);
                      setSelectedStay(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      serviceMode === "TAKEAWAY"
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Takeaway</span>
                  </button>
                </div>
              </div>

              {/* MODE A: DINE-IN TABLE CARDS */}
              {serviceMode === "DINE_IN" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {tables.map((tbl: any) => {
                      const isSelected = selectedTable?.id === tbl.id;
                      const hasActiveOrder = orders.some((o: any) => o.tableId === tbl.id && o.status !== "PAID" && o.status !== "CANCELLED");

                      return (
                        <button
                          key={tbl.id}
                          type="button"
                          onClick={() => setSelectedTable(tbl)}
                          className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                            isSelected
                              ? "bg-blue-50 dark:bg-zinc-800 border-blue-500 text-zinc-900 dark:text-white shadow-xs ring-1 ring-blue-500"
                              : hasActiveOrder
                              ? "bg-amber-50/60 dark:bg-zinc-900 border-amber-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400"
                              : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900/80"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">{tbl.name}</span>
                            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{tbl.capacity} Pax</span>
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between text-xs font-mono">
                            <span className="text-zinc-500">{tbl.section || "Main"}</span>
                            {hasActiveOrder ? (
                              <span className="text-amber-800 dark:text-zinc-300 font-semibold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-zinc-400" /> Dining
                              </span>
                            ) : (
                              <span className="text-emerald-700 dark:text-zinc-500">Available</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MODE B: IN-ROOM DINING (ROOM SERVICE) */}
              {serviceMode === "ROOM_SERVICE" && (
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase tracking-wide">
                    Select Active In-House Guest Room *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {stays.map((stay: any) => {
                      const roomNo = stay.roomAssignments?.[0]?.room?.number || "303";
                      const isSelected = selectedStay?.id === stay.id;
                      return (
                        <button
                          key={stay.id}
                          type="button"
                          onClick={() => setSelectedStay(stay)}
                          className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3.5 ${
                            isSelected
                              ? "bg-blue-50 dark:bg-zinc-800 border-blue-500 text-zinc-900 dark:text-white shadow-xs ring-1 ring-blue-500"
                              : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900/80"
                          }`}
                        >
                          <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-mono font-bold text-zinc-900 dark:text-zinc-100 text-base shrink-0">
                            {roomNo}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                              {stay.primaryGuest?.name || "Guest"}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                              Ph: {stay.primaryGuest?.phone || "N/A"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MODE C: TAKEAWAY */}
              {serviceMode === "TAKEAWAY" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase">Customer Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Suman Roy"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase">Mobile Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9864341211"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. MENU CATALOG & LARGE SEARCH */}
            <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-xs">
              
              {/* Category Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                
                {/* Large Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("ALL")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      selectedCategory === "ALL"
                        ? "bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-950 shadow-xs"
                        : "bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    All Items ({allMenuItems.length})
                  </button>

                  {categories.map((c: any) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategory(c.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        selectedCategory === c.id
                          ? "bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-950 shadow-xs"
                          : "bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      {c.name} ({c.items?.length || 0})
                    </button>
                  ))}
                </div>

                {/* Large Search Bar */}
                <div className="relative min-w-[240px] sm:min-w-[280px]">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search dish (e.g. Biryani, Chicken, Dal)..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Menu Dishes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredMenuItems.map((item: any) => {
                  const inCart = cartItems.find((c) => c.id === item.id);

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition flex flex-col justify-between space-y-3 group shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            {/* Veg / Non-Veg Standard Dot Badge */}
                            <span
                              className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                item.isVeg ? "border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-500" : "border-rose-600 text-rose-600 dark:border-rose-500 dark:text-rose-500"
                              }`}
                              title={item.isVeg ? "Pure Vegetarian" : "Non-Vegetarian"}
                            >
                              <span className={`h-2 w-2 rounded-full ${item.isVeg ? "bg-emerald-600 dark:bg-emerald-500" : "bg-rose-600 dark:bg-rose-500"}`} />
                            </span>
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-white transition leading-snug">
                              {item.name}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                          <span>{item.categoryName}</span>
                          <span>{item.code}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-200 dark:border-zinc-800/70">
                        <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-100">
                          {formatINR(item.price)}
                        </span>

                        {inCart ? (
                          <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, -1)}
                              className="h-7 w-7 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="font-mono font-black text-xs px-2 text-zinc-900 dark:text-zinc-100">
                              {inCart.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, 1)}
                              className="h-7 w-7 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white font-bold text-xs border border-zinc-300 dark:border-zinc-700 transition flex items-center gap-1.5 shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

          {/* RIGHT 4 COLS: Active Order & Firing Cart */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 sticky top-4 shadow-xs">
              
              {/* Cart Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <ChefHat className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <h3 className="text-xs font-bold uppercase text-zinc-800 dark:text-zinc-200 tracking-wider">
                    Kitchen Cart ({cartItems.reduce((s, i) => s + i.qty, 0)})
                  </h3>
                </div>
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Target Location Badge */}
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">Service Target</span>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {serviceMode === "DINE_IN" ? (
                      selectedTable ? (
                        <span className="font-mono text-zinc-900 dark:text-zinc-100">{selectedTable.name} ({selectedTable.section})</span>
                      ) : (
                        <span className="text-zinc-500">No Table Selected</span>
                      )
                    ) : serviceMode === "ROOM_SERVICE" ? (
                      selectedStay ? (
                        <span className="font-mono text-zinc-900 dark:text-zinc-100">
                          Room {selectedStay.roomAssignments?.[0]?.room?.number} — {selectedStay.primaryGuest?.name}
                        </span>
                      ) : (
                        <span className="text-zinc-500">No Room Selected</span>
                      )
                    ) : (
                      <span className="text-zinc-800 dark:text-zinc-300 font-mono">Takeaway Order</span>
                    )}
                  </div>
                </div>

                <span className="rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-400">
                  {serviceMode}
                </span>
              </div>

              {/* Cart Items List */}
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs space-y-1.5">
                    <UtensilsCrossed className="h-8 w-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
                    <p className="font-bold text-zinc-700 dark:text-zinc-300">Cart is empty</p>
                    <p className="text-xs">Click "+ Add" on any menu dish to begin order.</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-3 space-y-2.5 text-xs shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <strong className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">{item.name}</strong>
                          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                            {formatINR(item.unitPrice)} each
                          </span>
                        </div>

                        <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="h-6 w-6 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="font-mono font-black text-xs px-2 text-zinc-900 dark:text-zinc-100">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="h-6 w-6 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Special Kitchen Cooking Note */}
                      <div className="pt-0.5">
                        <input
                          type="text"
                          placeholder="Special note (e.g. Less spicy, extra bowls)"
                          value={item.notes || ""}
                          onChange={(e) => updateItemNotes(item.id, e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-xs font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Financial Bill & Tax Summary */}
              {cartItems.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Food Subtotal</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 font-bold">{formatINR(gst.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Restaurant GST 5% (SAC 996331)</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">{formatINR(gst.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-zinc-900 dark:text-white pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                    <span>Total Amount</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatINR(gst.totalAmount)}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {/* 1. Fire KOT */}
                <button
                  onClick={handleFireKOT}
                  disabled={actionLoading || cartItems.length === 0}
                  className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 font-black text-xs transition flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  <Send className="h-4 w-4" />
                  <span>{actionLoading ? "Sending to Kitchen..." : "Fire KOT to Kitchen"}</span>
                </button>

                {/* 2. Post to Room Folio (Enabled for Room Service) */}
                {serviceMode === "ROOM_SERVICE" && selectedStay && (
                  <button
                    onClick={handlePostToRoomFolio}
                    disabled={actionLoading || cartItems.length === 0}
                    className="w-full h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    <BedDouble className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Post to Room {selectedStay.roomAssignments?.[0]?.room?.number} Folio</span>
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE KDS (KITCHEN DISPLAY SYSTEM)                                   */}
      {/* ========================================================================= */}
      {activeTab === "kds" && (
        <div className="space-y-4">
          
          <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center gap-2.5">
              <ChefHat className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
                Kitchen Live Order Board ({kots.length} Active Tickets)
              </span>
            </div>

            <span className="text-xs font-mono text-zinc-500">
              Live Auto-Refresh: 6s
            </span>
          </div>

          {/* 3-Column Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* COLUMN 1: QUEUED (NEW TICKETS) */}
            <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-300">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  1. Queued / New KOTs
                </span>
                <span className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-2.5 py-0.5 rounded-full text-zinc-800 dark:text-zinc-300 text-xs">
                  {queuedKots.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {queuedKots.length === 0 ? (
                  <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                    No new tickets queued.
                  </div>
                ) : (
                  queuedKots.map((kot) => {
                    const info = getKotInfo(kot);
                    return (
                      <div
                        key={kot.id}
                        className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-4 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition shadow-xs"
                      >
                        {/* Header: KOT # & Elapsed Time */}
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                          <div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{kot.kotNo}</span>
                              <span className="text-xs text-zinc-500">• Order #{info.orderNo || "N/A"}</span>
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono flex items-center gap-1.5 mt-1">
                              <Clock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                              <span>Fired {info.firedTimeStr} ({info.elapsedMins}m ago)</span>
                            </div>
                          </div>
                        </div>

                        {/* Location Tag */}
                        <div className="rounded-lg bg-white dark:bg-zinc-950 p-2.5 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                          {info.isRoomService ? (
                            <span className="flex items-center gap-1.5 font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded text-xs">
                              <BedDouble className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                              Room {info.roomNumber || "Service"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded text-xs">
                              <UtensilsCrossed className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                              {info.tableName || "Dine-In Table"}
                            </span>
                          )}
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300 truncate max-w-[130px]">
                            {info.guestName}
                          </span>
                        </div>

                        {/* Ordered Dish Lines */}
                        <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800/80">
                          {kot.lines?.map((line: any) => (
                            <div key={line.id} className="space-y-0.5">
                              <div className="flex items-start justify-between gap-2.5 text-zinc-700 dark:text-zinc-300">
                                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{line.orderItem?.nameSnapshot}</span>
                                <span className="font-mono font-black text-zinc-900 dark:text-zinc-100 text-xs">×{line.qty}</span>
                              </div>
                              {line.notesSnapshot && (
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 italic font-mono pl-2 border-l border-zinc-300 dark:border-zinc-700">
                                  Note: {line.notesSnapshot}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2.5 border-t border-zinc-200 dark:border-zinc-800">
                          <button
                            onClick={() => handleKdsStatus(kot.id, "PREPARING")}
                            className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 border border-zinc-900 dark:border-zinc-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Flame className="h-4 w-4 text-amber-500 dark:text-zinc-400" />
                            <span>Start Cooking</span>
                          </button>

                          <button
                            onClick={() => openKotSlip(kot)}
                            className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-300 dark:border-zinc-800 transition"
                            title="Print KOT Thermal Slip"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 2: PREPARING (ACTIVE COOKING) */}
            <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-300">
                <span className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-600 dark:text-zinc-400" />
                  2. Preparing / Cooking
                </span>
                <span className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-2.5 py-0.5 rounded-full text-zinc-800 dark:text-zinc-300 text-xs">
                  {preparingKots.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {preparingKots.length === 0 ? (
                  <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                    No tickets currently in cooking.
                  </div>
                ) : (
                  preparingKots.map((kot) => {
                    const info = getKotInfo(kot);
                    return (
                      <div
                        key={kot.id}
                        className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-4 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition shadow-xs"
                      >
                        {/* Header: KOT # & Elapsed Time */}
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                          <div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{kot.kotNo}</span>
                              <span className="text-xs text-zinc-500">• Order #{info.orderNo || "N/A"}</span>
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono flex items-center gap-1.5 mt-1 font-semibold">
                              <Flame className="h-3.5 w-3.5 text-amber-600 dark:text-zinc-400" />
                              <span>Cooking for {info.elapsedMins} mins</span>
                            </div>
                          </div>
                        </div>

                        {/* Location Tag */}
                        <div className="rounded-lg bg-white dark:bg-zinc-950 p-2.5 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                          {info.isRoomService ? (
                            <span className="flex items-center gap-1.5 font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded text-xs">
                              <BedDouble className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                              Room {info.roomNumber || "Service"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded text-xs">
                              <UtensilsCrossed className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                              {info.tableName || "Dine-In Table"}
                            </span>
                          )}
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300 truncate max-w-[130px]">
                            {info.guestName}
                          </span>
                        </div>

                        {/* Ordered Dish Lines */}
                        <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800/80">
                          {kot.lines?.map((line: any) => (
                            <div key={line.id} className="space-y-0.5">
                              <div className="flex items-start justify-between gap-2.5 text-zinc-700 dark:text-zinc-300">
                                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{line.orderItem?.nameSnapshot}</span>
                                <span className="font-mono font-black text-zinc-900 dark:text-zinc-100 text-xs">×{line.qty}</span>
                              </div>
                              {line.notesSnapshot && (
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 italic font-mono pl-2 border-l border-zinc-300 dark:border-zinc-700">
                                  Note: {line.notesSnapshot}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2.5 border-t border-zinc-200 dark:border-zinc-800">
                          <button
                            onClick={() => handleKdsStatus(kot.id, "READY")}
                            className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 border border-zinc-900 dark:border-zinc-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            <span>Mark Food Ready</span>
                          </button>

                          <button
                            onClick={() => openKotSlip(kot)}
                            className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-300 dark:border-zinc-800 transition"
                            title="Print KOT Thermal Slip"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 3: READY TO SERVE */}
            <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-300">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  3. Ready to Serve / Pickup
                </span>
                <span className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-2.5 py-0.5 rounded-full text-zinc-800 dark:text-zinc-300 text-xs">
                  {readyKots.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {readyKots.length === 0 ? (
                  <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                    No orders awaiting pickup.
                  </div>
                ) : (
                  readyKots.map((kot) => {
                    const info = getKotInfo(kot);
                    return (
                      <div
                        key={kot.id}
                        className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-4 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition shadow-xs"
                      >
                        {/* Header: KOT # & Elapsed Time */}
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                          <div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{kot.kotNo}</span>
                              <span className="text-xs text-zinc-500">• Order #{info.orderNo || "N/A"}</span>
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono flex items-center gap-1.5 mt-1 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Plated & Ready for Runner</span>
                            </div>
                          </div>
                        </div>

                        {/* Location Tag */}
                        <div className="rounded-lg bg-white dark:bg-zinc-950 p-2.5 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                          {info.isRoomService ? (
                            <span className="flex items-center gap-1.5 font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded text-xs">
                              <BedDouble className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                              Room {info.roomNumber || "Service"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded text-xs">
                              <UtensilsCrossed className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                              {info.tableName || "Dine-In Table"}
                            </span>
                          )}
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300 truncate max-w-[130px]">
                            {info.guestName}
                          </span>
                        </div>

                        {/* Ordered Dish Lines */}
                        <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800/80">
                          {kot.lines?.map((line: any) => (
                            <div key={line.id} className="space-y-0.5">
                              <div className="flex items-start justify-between gap-2.5 text-zinc-700 dark:text-zinc-300">
                                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{line.orderItem?.nameSnapshot}</span>
                                <span className="font-mono font-black text-zinc-900 dark:text-zinc-100 text-xs">×{line.qty}</span>
                              </div>
                              {line.notesSnapshot && (
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 italic font-mono pl-2 border-l border-zinc-300 dark:border-zinc-700">
                                  Note: {line.notesSnapshot}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2.5 border-t border-zinc-200 dark:border-zinc-800">
                          <button
                            onClick={() => handleKdsStatus(kot.id, "COMPLETED")}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Check className="h-4 w-4" />
                            <span>Mark Served & Complete</span>
                          </button>

                          <button
                            onClick={() => openKotSlip(kot)}
                            className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-300 dark:border-zinc-800 transition"
                            title="Print KOT Thermal Slip"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KOT HISTORY & AUDIT REGISTER                                        */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="rounded-2xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
                Kitchen Order Ticket (KOT) Register & Logs
              </h2>
            </div>
            <span className="font-mono text-xs text-zinc-500">
              Total Today: {kots.length} Tickets
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-zinc-200 dark:border-zinc-800 border-collapse">
              <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3 border border-zinc-200 dark:border-zinc-800">KOT #</th>
                  <th className="p-3 border border-zinc-200 dark:border-zinc-800">Fired Time</th>
                  <th className="p-3 border border-zinc-200 dark:border-zinc-800">Service Mode</th>
                  <th className="p-3 border border-zinc-200 dark:border-zinc-800">Table / Room</th>
                  <th className="p-3 border border-zinc-200 dark:border-zinc-800">Dishes Ordered</th>
                  <th className="p-3 border border-zinc-200 dark:border-zinc-800">Status</th>
                  <th className="p-3 border border-zinc-200 dark:border-zinc-800 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-300">
                {kots.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500 font-semibold">
                      No KOT records found for today.
                    </td>
                  </tr>
                ) : (
                  kots.map((kot) => {
                    const info = getKotInfo(kot);
                    return (
                      <tr key={kot.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                        <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                          {kot.kotNo}
                        </td>
                        <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                          {info.firedTimeStr}
                        </td>
                        <td className="p-3 border border-zinc-200 dark:border-zinc-800">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300">
                            {kot.order?.mode || "DINE_IN"}
                          </span>
                        </td>
                        <td className="p-3 border border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-800 dark:text-zinc-200">
                          {info.isRoomService ? `Room ${info.roomNumber}` : info.tableName || "Table"}
                        </td>
                        <td className="p-3 border border-zinc-200 dark:border-zinc-800">
                          <div className="space-y-0.5">
                            {kot.lines?.map((l: any, i: number) => (
                              <div key={i} className="text-xs">
                                <strong className="text-zinc-900 dark:text-zinc-200">{l.orderItem?.nameSnapshot}</strong>{" "}
                                <span className="text-zinc-500 dark:text-zinc-400 font-mono font-bold">×{l.qty}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 border border-zinc-200 dark:border-zinc-800">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-300">
                            {kot.status}
                          </span>
                        </td>
                        <td className="p-3 border border-zinc-200 dark:border-zinc-800 text-right">
                          <button
                            onClick={() => openKotSlip(kot)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white font-semibold text-xs border border-zinc-300 dark:border-zinc-700 inline-flex items-center gap-1.5 transition shadow-xs"
                          >
                            <Printer className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                            <span>Reprint</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3-INCH THERMAL KOT SLIP PRINTER MODAL                                     */}
      {/* ========================================================================= */}
      <PrintableKotSlipModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        kot={printKotData}
        hotelName={activeProperty?.displayName || "Hotel Ambarish Grand Residency"}
      />

    </div>
  );
}
