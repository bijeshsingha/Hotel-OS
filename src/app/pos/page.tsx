"use client";

import React, { useEffect, useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR, calculateGST } from "@/lib/gst/calculator";
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
} from "lucide-react";

export default function POSPage() {
  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [config, setConfig] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [kots, setKots] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tables" | "kds">("tables");

  // Active Order / Table Cart State
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [menuSearch, setMenuSearch] = useState("");

  // Room Posting Modal
  const [showRoomPostModal, setShowRoomPostModal] = useState(false);
  const [selectedStayId, setSelectedStayId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  // Live polling for KDS updates
  useEffect(() => {
    if (activeTab !== "kds" || !activeProperty) return;
    const interval = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, activeProperty]);

  const activeOutlet = config?.outlets?.[0];
  const tables = activeOutlet?.tables || [];
  const categories = activeOutlet?.categories || [];

  const allMenuItems = categories.flatMap((c: any) =>
    c.items.map((i: any) => ({
      ...i,
      categoryName: c.name,
      variant: i.variants[0],
    }))
  );

  const filteredMenuItems = allMenuItems.filter((i: any) => {
    const matchesCat = selectedCategory === "ALL" || i.categoryId === selectedCategory;
    const matchesSearch = i.name.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
          unitPrice: item.variant?.price || 350,
          stationId: item.variant?.stationId,
          qty: 1,
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

  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const gst = calculateGST({
    grossOrBaseAmount: cartSubtotal,
    isInclusive: false,
    sacHsn: "996331",
    supplierStateCode: activeProperty?.stateCode || "18",
  });

  const handleFireKOT = async () => {
    if (!selectedTable && !showRoomPostModal) {
      alert("Please select a table or service mode first.");
      return;
    }
    if (cartItems.length === 0) {
      alert("Please add items to order.");
      return;
    }

    setActionLoading(true);
    try {
      const orderRes = await fetch(`/api/v1/pos/outlets/${activeOutlet.id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          tableId: selectedTable?.id,
          mode: "DINE_IN",
          covers: selectedTable?.capacity || 2,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create order");

      await fetch(`/api/v1/pos/orders/${orderData.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems }),
      });

      const kotRes = await fetch(`/api/v1/pos/orders/${orderData.id}/fire-kot`, {
        method: "POST",
      });

      const kotData = await kotRes.json();
      if (!kotRes.ok) throw new Error(kotData.error || "Failed to fire KOT");

      alert(`KOT fired successfully (${kotData.kots?.length} tickets generated).`);
      setCartItems([]);
      setSelectedTable(null);
      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Fire KOT Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoomPost = async () => {
    if (!selectedStayId) {
      alert("Please select an active in-house stay.");
      return;
    }

    setActionLoading(true);
    try {
      const orderRes = await fetch(`/api/v1/pos/outlets/${activeOutlet.id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          stayId: selectedStayId,
          mode: "ROOM_SERVICE",
        }),
      });
      const orderData = await orderRes.json();

      await fetch(`/api/v1/pos/orders/${orderData.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems }),
      });

      const postRes = await fetch(`/api/v1/pos/orders/${orderData.id}/post-to-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stayId: selectedStayId }),
      });
      const postData = await postRes.json();
      if (!postRes.ok) throw new Error(postData.error || "Room posting failed");

      alert(`F&B Charge of ${formatINR(postData.totalPosted)} posted to Room Folio.`);
      setCartItems([]);
      setShowRoomPostModal(false);
      await loadData();
      await refreshData();
    } catch (err: any) {
      alert(`Room posting error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

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

  const getKotInfo = (kot: any) => {
    const stay = kot.order?.stay;
    const roomAssignment = stay?.roomAssignments?.[0];

    // 1. Room Number
    let roomNumber = roomAssignment?.room?.number ? String(roomAssignment.room.number) : "";
    if (!roomNumber && kot.order?.customerName) {
      const match = kot.order.customerName.match(/Room\s*([A-Za-z0-9_-]+)/i);
      if (match) roomNumber = match[1];
    }

    // 2. Guest Name
    let guestName = stay?.primaryGuest?.name || "";
    if (!guestName && kot.order?.customerName) {
      guestName = kot.order.customerName.replace(/\s*\(Room\s*[^\)]+\)/i, "").trim();
    }
    if (!guestName && !roomNumber) {
      guestName = kot.order?.table?.name || "Dine-In Guest";
    }

    // 3. Contact Number
    const contactNumber = kot.order?.customerContact || stay?.primaryGuest?.phone || "";

    // 4. Elapsed Time
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

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-lg bg-[#111114] border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-zinc-400" />
              {activeOutlet?.name || "Restaurant POS"}
            </h1>
            <span className="rounded px-1.5 py-0.2 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
              F01–F11
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Dine-in tables, menu orders & live KDS tickets
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("tables")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === "tables"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            Table & Menu Pad
          </button>
          <button
            onClick={() => setActiveTab("kds")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === "kds"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            KDS ({kots.length})
          </button>
        </div>
      </div>

      {/* TAB 1: TABLES & MENU ORDERING */}
      {activeTab === "tables" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Left: Tables & Menu */}
          <div className="lg:col-span-8 space-y-3">
            {/* Tables Grid */}
            <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-300">Dining Tables</span>
                <span className="text-zinc-500 font-mono">
                  {selectedTable ? `Table: ${selectedTable.name}` : "Click table to start order"}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {tables.map((table: any) => {
                  const isSelected = selectedTable?.id === table.id;
                  return (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table)}
                      className={`rounded-md p-2 border text-center transition ${
                        isSelected
                          ? "bg-zinc-800 border-blue-500 text-zinc-100"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <div className="text-xs font-semibold font-mono">{table.name}</div>
                      <div className="text-[10px] text-zinc-500">{table.capacity}pax</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-3 rounded-lg bg-[#111114] border border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  <button
                    onClick={() => setSelectedCategory("ALL")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                      selectedCategory === "ALL"
                        ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                        selectedCategory === cat.id
                          ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search menu..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="rounded-md bg-zinc-900 border border-zinc-800 pl-8 pr-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-44 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
                {filteredMenuItems.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="rounded-md bg-zinc-900 border border-zinc-800 p-2.5 hover:border-zinc-700 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs font-medium text-zinc-200">{item.name}</div>
                      <div className="text-[10px] text-zinc-500">{item.categoryName}</div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-zinc-800/80">
                      <span className="font-mono text-xs font-medium text-emerald-400 tabular-nums">
                        {formatINR(item.variant?.price || 350)}
                      </span>
                      <span className="rounded bg-zinc-800 p-1 text-zinc-300 hover:text-white">
                        <Plus className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Cart */}
          <div className="lg:col-span-4 p-3.5 rounded-lg bg-[#111114] border border-zinc-800 flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                <div>
                  <h2 className="text-xs font-semibold text-zinc-200">
                    {selectedTable ? `Order: ${selectedTable.name}` : "New Order"}
                  </h2>
                  <span className="text-[10px] text-zinc-500 font-mono">{cartItems.length} items</span>
                </div>
                <button
                  onClick={() => setCartItems([])}
                  className="text-[11px] text-zinc-500 hover:text-rose-400 flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              </div>

              <div className="space-y-1.5 mt-2.5 max-h-64 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs"
                  >
                    <div>
                      <div className="font-medium text-zinc-200">{item.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {formatINR(item.unitPrice)} × {item.qty}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <div className="flex items-center gap-1 bg-zinc-800 rounded px-1 py-0.5">
                        <button onClick={() => updateQty(item.id, -1)} className="text-zinc-400 hover:text-zinc-100">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-zinc-200 text-xs w-3 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="text-zinc-400 hover:text-zinc-100">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-zinc-200 font-medium w-12 text-right tabular-nums">
                        {formatINR(item.unitPrice * item.qty)}
                      </span>
                    </div>
                  </div>
                ))}
                {cartItems.length === 0 && (
                  <div className="p-6 text-center text-xs text-zinc-600 italic font-mono">Empty order</div>
                )}
              </div>
            </div>

            {/* Totals & Buttons */}
            <div className="pt-3 border-t border-zinc-800 space-y-2.5 text-xs font-mono">
              <div className="space-y-1 text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="text-zinc-200 tabular-nums">{formatINR(gst.taxableAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>GST 5% (SAC 996331)</span>
                  <span className="tabular-nums">{formatINR(gst.taxAmount)}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800 text-sm font-semibold text-zinc-100">
                  <span>Total</span>
                  <span className="text-emerald-400 tabular-nums">{formatINR(gst.totalAmount)}</span>
                </div>
              </div>

              <div className="space-y-1.5 font-sans">
                <button
                  onClick={handleFireKOT}
                  disabled={actionLoading || cartItems.length === 0}
                  className="w-full rounded-md bg-zinc-100 hover:bg-white text-zinc-950 py-2 font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs"
                >
                  <Send className="h-3.5 w-3.5" /> Fire KOT to Kitchen
                </button>

                <button
                  onClick={() => setShowRoomPostModal(true)}
                  disabled={actionLoading || cartItems.length === 0}
                  className="w-full rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1.5 font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs"
                >
                  <BedDouble className="h-3.5 w-3.5" /> Post to Room Folio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KDS (Kitchen Display System) */}
      {activeTab === "kds" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* QUEUED */}
          <div className="rounded-xl bg-[#111114] border border-zinc-800 p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 font-mono text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Queued KOTs
              </span>
              <span className="bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                {kots.filter((k) => k.status === "QUEUED").length}
              </span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {kots.filter((k) => k.status === "QUEUED").length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">No tickets queued.</div>
              ) : (
                kots
                  .filter((k) => k.status === "QUEUED")
                  .map((kot) => {
                    const info = getKotInfo(kot);
                    return (
                      <div
                        key={kot.id}
                        className="rounded-xl bg-[#18181b] p-3.5 border border-zinc-800 space-y-3 text-xs shadow-sm hover:border-zinc-700 transition"
                      >
                        {/* Header: KOT #, Order # and Station */}
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-zinc-800">
                          <div>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-bold text-amber-400">#{kot.kotNo}</span>
                              {info.orderNo && (
                                <span className="text-[10px] text-zinc-400">• Order #{info.orderNo}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-zinc-500" />
                              <span>{info.firedTimeStr} ({info.elapsedMins}m ago)</span>
                            </div>
                          </div>
                          <span className="rounded bg-zinc-900 border border-zinc-700 px-2 py-0.5 text-[10px] font-mono text-zinc-300 font-medium shrink-0">
                            {kot.station?.name || "Kitchen"}
                          </span>
                        </div>

                        {/* Room, Guest Name & Phone details */}
                        <div className="rounded-lg bg-zinc-900/90 border border-zinc-800 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            {info.isRoomService ? (
                              <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1 font-mono font-bold text-white bg-blue-600/30 border border-blue-500/50 text-blue-300 px-2 py-0.5 rounded text-xs">
                                  <BedDouble className="h-3.5 w-3.5" />
                                  Room {info.roomNumber || "Service"}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400">IN-ROOM</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1 font-mono font-bold text-white bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded text-xs">
                                  <UtensilsCrossed className="h-3.5 w-3.5" />
                                  {info.tableName || "Dine-In Table"}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Guest Name */}
                          <div className="flex items-center gap-1.5 text-zinc-100 font-semibold text-xs">
                            <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{info.guestName || "Guest"}</span>
                          </div>

                          {/* Phone Number */}
                          {info.contactNumber && (
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                              <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                              <a
                                href={`tel:${info.contactNumber}`}
                                className="text-zinc-300 hover:text-white transition underline underline-offset-2"
                              >
                                {info.contactNumber}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Ordered Dishes List */}
                        <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                          {kot.lines?.map((line: any) => (
                            <div key={line.id} className="flex items-start justify-between gap-2 text-zinc-200">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-zinc-200 break-words">
                                  {line.orderItem?.nameSnapshot}
                                </div>
                                {line.orderItem?.notes && (
                                  <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                                    Note: {line.orderItem.notes}
                                  </div>
                                )}
                              </div>
                              <span className="font-mono font-bold text-xs text-amber-400 shrink-0">
                                ×{line.qty}
                              </span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleKdsStatus(kot.id, "PREPARING")}
                          className="w-full rounded-md bg-zinc-800 hover:bg-zinc-700 py-1.5 text-xs font-semibold text-zinc-100 transition flex items-center justify-center gap-1.5"
                        >
                          <Flame className="h-3.5 w-3.5 text-amber-400" /> Start Preparing
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* PREPARING */}
          <div className="rounded-xl bg-[#111114] border border-zinc-800 p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 font-mono text-xs font-bold text-blue-400">
              <span className="flex items-center gap-1.5">
                <Flame className="h-4 w-4" /> Preparing / Cooking
              </span>
              <span className="bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/30">
                {kots.filter((k) => k.status === "PREPARING").length}
              </span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {kots.filter((k) => k.status === "PREPARING").length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">No active orders cooking.</div>
              ) : (
                kots
                  .filter((k) => k.status === "PREPARING")
                  .map((kot) => {
                    const info = getKotInfo(kot);
                    return (
                      <div
                        key={kot.id}
                        className="rounded-xl bg-[#18181b] p-3.5 border border-blue-500/30 space-y-3 text-xs shadow-sm hover:border-blue-500/60 transition"
                      >
                        {/* Header: KOT #, Order # and Station */}
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-zinc-800">
                          <div>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-bold text-blue-400">#{kot.kotNo}</span>
                              {info.orderNo && (
                                <span className="text-[10px] text-zinc-400">• Order #{info.orderNo}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-zinc-500" />
                              <span>{info.firedTimeStr} ({info.elapsedMins}m ago)</span>
                            </div>
                          </div>
                          <span className="rounded bg-zinc-900 border border-zinc-700 px-2 py-0.5 text-[10px] font-mono text-zinc-300 font-medium shrink-0">
                            {kot.station?.name || "Kitchen"}
                          </span>
                        </div>

                        {/* Room, Guest Name & Phone details */}
                        <div className="rounded-lg bg-zinc-900/90 border border-zinc-800 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            {info.isRoomService ? (
                              <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1 font-mono font-bold text-white bg-blue-600/30 border border-blue-500/50 text-blue-300 px-2 py-0.5 rounded text-xs">
                                  <BedDouble className="h-3.5 w-3.5" />
                                  Room {info.roomNumber || "Service"}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400">IN-ROOM</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1 font-mono font-bold text-white bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded text-xs">
                                  <UtensilsCrossed className="h-3.5 w-3.5" />
                                  {info.tableName || "Dine-In Table"}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Guest Name */}
                          <div className="flex items-center gap-1.5 text-zinc-100 font-semibold text-xs">
                            <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{info.guestName || "Guest"}</span>
                          </div>

                          {/* Phone Number */}
                          {info.contactNumber && (
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                              <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                              <a
                                href={`tel:${info.contactNumber}`}
                                className="text-zinc-300 hover:text-white transition underline underline-offset-2"
                              >
                                {info.contactNumber}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Ordered Dishes List */}
                        <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                          {kot.lines?.map((line: any) => (
                            <div key={line.id} className="flex items-start justify-between gap-2 text-zinc-200">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-zinc-200 break-words">
                                  {line.orderItem?.nameSnapshot}
                                </div>
                                {line.orderItem?.notes && (
                                  <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                                    Note: {line.orderItem.notes}
                                  </div>
                                )}
                              </div>
                              <span className="font-mono font-bold text-xs text-blue-400 shrink-0">
                                ×{line.qty}
                              </span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleKdsStatus(kot.id, "READY")}
                          className="w-full rounded-md bg-blue-600 hover:bg-blue-500 py-1.5 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Ready (Plated)
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* READY */}
          <div className="rounded-xl bg-[#111114] border border-zinc-800 p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 font-mono text-xs font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Ready to Serve / Dispatch
              </span>
              <span className="bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/30">
                {kots.filter((k) => k.status === "READY").length}
              </span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {kots.filter((k) => k.status === "READY").length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">No orders waiting for runner.</div>
              ) : (
                kots
                  .filter((k) => k.status === "READY")
                  .map((kot) => {
                    const info = getKotInfo(kot);
                    return (
                      <div
                        key={kot.id}
                        className="rounded-xl bg-[#18181b] p-3.5 border border-emerald-500/30 space-y-3 text-xs shadow-sm hover:border-emerald-500/60 transition"
                      >
                        {/* Header: KOT #, Order # and Station */}
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-zinc-800">
                          <div>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-bold text-emerald-400">#{kot.kotNo}</span>
                              {info.orderNo && (
                                <span className="text-[10px] text-zinc-400">• Order #{info.orderNo}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-zinc-500" />
                              <span>{info.firedTimeStr} ({info.elapsedMins}m ago)</span>
                            </div>
                          </div>
                          <span className="rounded bg-zinc-900 border border-zinc-700 px-2 py-0.5 text-[10px] font-mono text-zinc-300 font-medium shrink-0">
                            {kot.station?.name || "Kitchen"}
                          </span>
                        </div>

                        {/* Room, Guest Name & Phone details */}
                        <div className="rounded-lg bg-zinc-900/90 border border-zinc-800 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            {info.isRoomService ? (
                              <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1 font-mono font-bold text-white bg-blue-600/30 border border-blue-500/50 text-blue-300 px-2 py-0.5 rounded text-xs">
                                  <BedDouble className="h-3.5 w-3.5" />
                                  Room {info.roomNumber || "Service"}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400">IN-ROOM</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1 font-mono font-bold text-white bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded text-xs">
                                  <UtensilsCrossed className="h-3.5 w-3.5" />
                                  {info.tableName || "Dine-In Table"}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Guest Name */}
                          <div className="flex items-center gap-1.5 text-zinc-100 font-semibold text-xs">
                            <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{info.guestName || "Guest"}</span>
                          </div>

                          {/* Phone Number */}
                          {info.contactNumber && (
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                              <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                              <a
                                href={`tel:${info.contactNumber}`}
                                className="text-zinc-300 hover:text-white transition underline underline-offset-2"
                              >
                                {info.contactNumber}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Ordered Dishes List */}
                        <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                          {kot.lines?.map((line: any) => (
                            <div key={line.id} className="flex items-start justify-between gap-2 text-zinc-200">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-zinc-200 break-words">
                                  {line.orderItem?.nameSnapshot}
                                </div>
                                {line.orderItem?.notes && (
                                  <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                                    Note: {line.orderItem.notes}
                                  </div>
                                )}
                              </div>
                              <span className="font-mono font-bold text-xs text-emerald-400 shrink-0">
                                ×{line.qty}
                              </span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleKdsStatus(kot.id, "COMPLETED")}
                          className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 py-1.5 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete / Served
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ROOM POSTING MODAL */}
      {showRoomPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-zinc-400" />
                Post F&B to Room Folio
              </h2>
              <button onClick={() => setShowRoomPostModal(false)} className="text-zinc-500 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-md bg-zinc-900 p-2.5 border border-zinc-800 font-mono">
                <div className="text-zinc-500">Total F&B Charge:</div>
                <div className="text-base font-semibold text-emerald-400 tabular-nums">{formatINR(gst.totalAmount)}</div>
              </div>

              <div>
                <label className="text-zinc-400">Select In-House Room & Guest *</label>
                <select
                  required
                  value={selectedStayId}
                  onChange={(e) => setSelectedStayId(e.target.value)}
                  className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                >
                  <option value="">Select guest...</option>
                  {stays.map((s) => (
                    <option key={s.id} value={s.id}>
                      Room {s.roomAssignments[0]?.room?.number} — {s.primaryGuest?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoomPostModal(false)}
                  className="rounded-md px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRoomPost}
                  disabled={actionLoading || !selectedStayId}
                  className="rounded-md bg-zinc-100 px-4 py-1.5 font-medium text-zinc-950 hover:bg-white transition disabled:opacity-50"
                >
                  {actionLoading ? "Posting..." : "Confirm Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
