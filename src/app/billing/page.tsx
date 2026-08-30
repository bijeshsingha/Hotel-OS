"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useHotel } from "@/lib/context/hotel-context";
import { formatINR, ACTIVE_TAX_RATES, getTaxRateForSac } from "@/lib/gst/calculator";
import { formatGuestDisplayName } from "@/lib/domain/name-utils";
import { numberToWordsINR } from "@/lib/gst/number-to-words";
import {
  Receipt,
  Plus,
  CreditCard,
  Printer,
  X,
  Search,
  BedDouble,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Phone,
  FileText,
  UserCheck,
} from "lucide-react";
import { DISCOUNT_REASONS, PAYMENT_METHODS } from "@/data";
import { PrintableTaxInvoiceModal } from "@/components/billing/printable-tax-invoice";

// Helper to match charges with specific rooms in separate billing mode
function isEntryForRoom(entry: any, roomNumber: string, allOtherRoomNumbers: string[]): boolean {
  if (!roomNumber || roomNumber === "Unassigned") return true;
  const desc = entry.description || "";

  // Check if description explicitly mentions another room in the group
  const otherRooms = allOtherRoomNumbers.filter((r) => r !== roomNumber);
  for (const other of otherRooms) {
    const regex = new RegExp(`\\bRoom\\s*#?\\s*${other}\\b`, "i");
    if (regex.test(desc)) {
      return false; // Belongs to the other room
    }
  }

  // If description mentions this room, it definitely belongs here
  const thisRoomRegex = new RegExp(`\\bRoom\\s*#?\\s*${roomNumber}\\b`, "i");
  if (thisRoomRegex.test(desc)) {
    return true;
  }

  // If it's a general charge (doesn't mention any room), assign to primary room (first in list)
  if (allOtherRoomNumbers.length > 0 && allOtherRoomNumbers[0] === roomNumber) {
    return true;
  }

  return false;
}

export interface DirectoryRoomItem {
  key: string;
  stayId: string;
  stay: any;
  roomNumber: string;
  roomId?: string;
  roomType?: any;
  rateHandling?: string;
  moveReason?: string;
  startsAt?: string;
  endsAt?: string;
  isMultiRoom: boolean;
  allRoomNumbers: string[];
  guestName: string;
  companyName?: string;
  phone?: string;
  arrivalAt?: string;
  expectedDepartureAt?: string;
  status: string;
  roomCharges: number;
  roomPayments: number;
  roomBalance: number;
  isSettled: boolean;
}

function BillingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStayId = searchParams.get("stayId") || "";
  const initialAction = searchParams.get("action") || "";

  const { activeProperty, refreshKey, refreshData } = useHotel();
  const [stays, setStays] = useState<any[]>([]);
  const [selectedStayId, setSelectedStayId] = useState<string>(initialStayId);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>("");
  const [groupBillingMode, setGroupBillingMode] = useState<"NO" | "YES">("NO");
  const [folioData, setFolioData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter States for Stays / Folios
  const [staySearchQuery, setStaySearchQuery] = useState<string>("");
  const [stayStatusFilter, setStayStatusFilter] = useState<"ALL" | "IN_HOUSE" | "CHECKED_OUT" | "WITH_BALANCE">("ALL");

  // Search & Filter States for Ledger Entries
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState<string>("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<"ALL" | "ROOM_TARIFF" | "RESTAURANT_FOOD" | "MANUAL">("ALL");

  // Group Multi-Room Settlement State
  const [selectedGroupStayIds, setSelectedGroupStayIds] = useState<string[]>([]);
  const [showGroupPaymentModal, setShowGroupPaymentModal] = useState(false);
  const [groupPaymentForm, setGroupPaymentForm] = useState({
    payerName: "",
    method: "UPI",
    reference: "",
    companyName: "",
    gstin: "",
    allocations: {} as Record<string, number>,
  });

  // Action Modals State
  const [showManualChargeModal, setShowManualChargeModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isLiveTaxBillView, setIsLiveTaxBillView] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for modals
  const [chargeForm, setChargeForm] = useState({
    chargeCode: "RESTAURANT_FOOD",
    description: "Dinner Service Bill",
    amount: "650",
    sacHsn: "996331",
  });

  const [discountForm, setDiscountForm] = useState({
    description: "Discount / Rebate",
    amount: "500",
    sacHsn: "996311",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "0",
    method: "UPI",
    reference: "",
    payerName: "Guest",
    companyName: "",
    gstin: "",
    creditPeriod: "30_DAYS",
    billingRemarks: "",
  });

  // Grace Period control state (in minutes)
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(60);

  // Load in-house and past stays for current property
  const loadStays = async () => {
    if (!activeProperty?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/stays?propertyId=${activeProperty.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setStays(data);
        if (data.length > 0 && !selectedStayId) {
          const inHouse = data.find((s: any) => s.status === "IN_HOUSE");
          const targetStay = inHouse || data[0];
          setSelectedStayId(targetStay.id);
          const firstRoom = targetStay.roomAssignments?.[0]?.room?.number || "";
          setSelectedRoomNumber(firstRoom);
        }
      }
    } catch (e) {
      console.error("Error loading stays:", e);
    } finally {
      setLoading(false);
    }
  };

  // Load specific folio for selected stay with dynamic 24h synchronization
  const loadFolio = async (folioId: string, grace?: number) => {
    try {
      const g = grace !== undefined ? grace : gracePeriodMinutes;
      const res = await fetch(`/api/v1/folios/${folioId}?graceMinutes=${g}`);
      const data = await res.json();
      setFolioData(data);
    } catch (e) {
      console.error("Error loading folio:", e);
    }
  };

  const handleGracePeriodChange = async (newGrace: number) => {
    setGracePeriodMinutes(newGrace);
    if (folioData?.id) {
      await loadFolio(folioData.id, newGrace);
    }
  };

  useEffect(() => {
    loadStays();
  }, [activeProperty?.id, refreshKey]);

  // When selected stay changes, fetch its live folio
  useEffect(() => {
    if (selectedStayId && stays.length > 0) {
      const activeStay = stays.find((s) => s.id === selectedStayId);
      if (activeStay?.folio?.id) {
        loadFolio(activeStay.folio.id);
      } else {
        setFolioData(null);
      }
    }
  }, [selectedStayId, stays]);

  // Handle URL checkout action trigger
  useEffect(() => {
    if (initialAction === "checkout" && folioData && selectedStayId) {
      const activeStay = stays.find((s) => s.id === selectedStayId);
      if (activeStay && activeStay.status === "IN_HOUSE") {
        const bal = folioData.balance ?? 0;
        if (bal > 0) {
          setPaymentForm({
            amount: String(Math.max(0, bal)),
            method: activeStay?.primaryGuest?.companyName ? "DIRECT_BILL" : "UPI",
            reference: "",
            payerName: formatGuestDisplayName(activeStay?.primaryGuest?.name) || "Guest",
            companyName: activeStay?.primaryGuest?.companyName || "",
            gstin: activeStay?.primaryGuest?.gstin || "",
            creditPeriod: "30_DAYS",
            billingRemarks: "",
          });
        }
      }
    }
  }, [initialAction, folioData?.id]);

  // Expand Stays into individual Room Directory items so multi-room stays have separated cards
  const directoryItems: DirectoryRoomItem[] = useMemo(() => {
    const items: DirectoryRoomItem[] = [];

    stays.forEach((s) => {
      const assignments = s.roomAssignments || [];
      const distinctRooms: any[] = [];
      const seen = new Set<string>();

      assignments.forEach((a: any) => {
        const num = a.room?.number || "Unassigned";
        if (!seen.has(num)) {
          seen.add(num);
          distinctRooms.push(a);
        }
      });

      if (distinctRooms.length === 0) {
        distinctRooms.push({
          room: { number: "Unassigned", roomType: null },
        });
      }

      const allRoomNumbers = distinctRooms.map((d) => d.room?.number || "Unassigned");
      const isMultiRoom = allRoomNumbers.length > 1;

      distinctRooms.forEach((assignment) => {
        const roomNo = assignment.room?.number || "Unassigned";
        const otherRooms = allRoomNumbers.filter((r) => r !== roomNo);
        const rawEntriesList = s.folio?.windows?.flatMap((w: any) => w.entries || w.lineItems || []) || [];
        const paymentsList = s.folio?.payments || [];

        // Determine charges for this room
        const roomEntries = isMultiRoom
          ? rawEntriesList.filter((e: any) => isEntryForRoom(e, roomNo, otherRooms))
          : rawEntriesList;
        const roomCharges = roomEntries.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
        const totalGroupCharges = rawEntriesList.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
        const totalGroupPayments = paymentsList.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        // Determine payments for this room
        let allocatedPayment = 0;
        paymentsList.forEach((p: any) => {
          const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${p.notes || ""}`;
          const isThis = new RegExp(`\\bRoom\\s*#?\\s*${roomNo}\\b`, "i").test(text);
          const isOther = otherRooms.some((o) => new RegExp(`\\bRoom\\s*#?\\s*${o}\\b`, "i").test(text));

          if (isThis && !isOther) {
            allocatedPayment += p.amount || 0;
          }
        });

        const unallocatedPayments = paymentsList.filter((p: any) => {
          const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${p.notes || ""}`;
          const isSpecific = allRoomNumbers.some((r) => new RegExp(`\\bRoom\\s*#?\\s*${r}\\b`, "i").test(text));
          return !isSpecific;
        }).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        if (unallocatedPayments > 0 && totalGroupCharges > 0) {
          if (Math.abs(unallocatedPayments - roomCharges) < 1) {
            allocatedPayment += roomCharges;
          } else {
            allocatedPayment += unallocatedPayments * (roomCharges / totalGroupCharges);
          }
        }

        if (!isMultiRoom) {
          allocatedPayment = totalGroupPayments;
        }

        const roomBalance = Math.max(0, roomCharges - allocatedPayment);

        items.push({
          key: `${s.id}-${roomNo}`,
          stayId: s.id,
          stay: s,
          roomNumber: roomNo,
          roomId: assignment.room?.id,
          roomType: assignment.room?.roomType,
          rateHandling: assignment.rateHandling,
          moveReason: assignment.moveReason,
          startsAt: assignment.startsAt,
          endsAt: assignment.endsAt,
          isMultiRoom,
          allRoomNumbers,
          guestName: formatGuestDisplayName(s.primaryGuest?.name) || "Guest",
          companyName: s.primaryGuest?.companyName,
          phone: s.primaryGuest?.phone,
          arrivalAt: s.arrivalAt,
          expectedDepartureAt: s.expectedDepartureAt,
          status: s.status,
          roomCharges,
          roomPayments: allocatedPayment,
          roomBalance,
          isSettled: roomBalance <= 0.5,
        });
      });
    });

    return items;
  }, [stays]);

  // Filtered Directory Items based on Search Query and Status Tabs
  const filteredDirectoryItems = useMemo(() => {
    return directoryItems.filter((item) => {
      // 1. Status Filter
      if (stayStatusFilter === "IN_HOUSE" && item.status !== "IN_HOUSE") return false;
      if (stayStatusFilter === "CHECKED_OUT" && item.status !== "CHECKED_OUT") return false;
      if (stayStatusFilter === "WITH_BALANCE" && item.roomBalance <= 0) return false;

      // 2. Search Query Filter
      if (!staySearchQuery.trim()) return true;
      const q = staySearchQuery.toLowerCase();
      const roomNum = item.roomNumber.toLowerCase();
      const guestName = item.guestName.toLowerCase();
      const phone = (item.phone || "").toLowerCase();
      const company = (item.companyName || "").toLowerCase();
      return roomNum.includes(q) || guestName.includes(q) || phone.includes(q) || company.includes(q);
    });
  }, [directoryItems, staySearchQuery, stayStatusFilter]);

  const activeStay = stays.find((s) => s.id === selectedStayId);
  const activeDirectoryItem = directoryItems.find(
    (d) => d.stayId === selectedStayId && (selectedRoomNumber ? d.roomNumber === selectedRoomNumber : true)
  ) || directoryItems.find((d) => d.stayId === selectedStayId);

  const activeRoomNumber = activeDirectoryItem?.roomNumber || activeStay?.roomAssignments?.[0]?.room?.number || "Unassigned";
  const allGroupRooms = activeDirectoryItem?.allRoomNumbers || [activeRoomNumber];
  const isMultiRoomGroup = allGroupRooms.length > 1;

  // Group Multi-Room Checkbox toggle
  const toggleGroupStaySelection = (stayId: string) => {
    setSelectedGroupStayIds((prev) =>
      prev.includes(stayId) ? prev.filter((id) => id !== stayId) : [...prev, stayId]
    );
  };

  // Stay Calculations for Active Selected Room
  const stayCalculations = useMemo(() => {
    if (!activeStay) {
      return {
        nights: 1,
        scheduledNights: 1,
        roomRatePerNight: 0,
        isMultiNight: false,
        isComplimentary: false,
        elapsedHours: "0.0",
        completedCycles: 0,
        remainingMinutes: 0,
        isWithinGrace: false,
        checkoutCycleText: "24-Hr Cycle Billing",
      };
    }
    const arr = activeStay.arrivalAt ? new Date(activeStay.arrivalAt) : new Date();
    const exp = activeStay.expectedDepartureAt ? new Date(activeStay.expectedDepartureAt) : new Date();
    
    const diffTime = Math.abs(exp.getTime() - arr.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    let rate = 3200;
    let isComp = false;

    const assignment = activeStay.roomAssignments?.find((a: any) => a.room?.number === activeRoomNumber) || activeStay.roomAssignments?.[0];
    if (assignment?.rateHandling === "COMPLIMENTARY" || assignment?.moveReason === "AGREED_RATE:0") {
      rate = 0;
      isComp = true;
    } else if (assignment?.moveReason?.startsWith("AGREED_RATE:")) {
      rate = Number(assignment.moveReason.replace("AGREED_RATE:", "")) || 3200;
    } else if (folioData?.windows?.[0]) {
      const items = folioData.windows[0].entries || folioData.windows[0].lineItems || [];
      const roomCharge = items.find((i: any) => i.chargeCode?.includes("ROOM_TARIFF") && (i.description?.includes(activeRoomNumber) || true));
      if (roomCharge && roomCharge.unitAmount !== undefined) {
        rate = roomCharge.unitAmount;
        if (rate === 0) isComp = true;
      }
    }

    // Real-time 24-hr cycle metrics
    const now = new Date();
    const elapsedMs = Math.max(0, now.getTime() - arr.getTime());
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const completedCycles = Math.floor(elapsedHours / 24);
    const remainingMinutes = Math.round((elapsedHours % 24) * 60);

    const items = folioData?.windows?.[0]?.entries || folioData?.windows?.[0]?.lineItems || [];
    const allRoomEntries = items.filter((i: any) => i.chargeCode?.includes("ROOM_TARIFF"));
    const chargedRoomEntries = allRoomEntries.filter((i: any) => {
      if (groupBillingMode === "YES") return true;
      if (allRoomEntries.length <= 1) return true;
      return i.description?.includes(activeRoomNumber);
    });
    const chargedNights = chargedRoomEntries.length > 0
      ? chargedRoomEntries.reduce((sum: number, i: any) => sum + (i.qty || 1), 0)
      : 1;

    const isWithinGrace = completedCycles >= 1 && remainingMinutes <= gracePeriodMinutes;

    return {
      nights: chargedNights,
      scheduledNights: diffDays,
      roomRatePerNight: rate,
      isMultiNight: chargedNights > 1,
      isComplimentary: isComp,
      elapsedHours: elapsedHours.toFixed(1),
      completedCycles,
      remainingMinutes,
      isWithinGrace,
      checkoutCycleText: "24-Hr Cycle Billing",
    };
  }, [activeStay, activeRoomNumber, folioData, gracePeriodMinutes]);

  // Aggregate raw ledger line items from Prisma folio windows (entries)
  const rawEntries = useMemo(() => {
    if (!folioData?.windows) return [];
    const allItems = folioData.windows.flatMap((w: any) => w.entries || w.lineItems || []);
    return allItems.sort((a: any, b: any) => new Date(a.createdAt || a.postedAt).getTime() - new Date(b.createdAt || b.postedAt).getTime());
  }, [folioData]);

  // Entries filtered by Group Billing Mode (Separate vs Combined Group)
  const modeFilteredEntries = useMemo(() => {
    if (groupBillingMode === "YES" || !isMultiRoomGroup) {
      return rawEntries;
    }
    // "NO" mode: Separate billing for activeRoomNumber only
    const otherRooms = allGroupRooms.filter((r) => r !== activeRoomNumber);
    return rawEntries.filter((e: any) => isEntryForRoom(e, activeRoomNumber, otherRooms));
  }, [rawEntries, groupBillingMode, isMultiRoomGroup, activeRoomNumber, allGroupRooms]);

  // Filtered charges ledger items (search and category)
  const entries = useMemo(() => {
    return modeFilteredEntries.filter((e: any) => {
      // Type Filter
      if (ledgerTypeFilter === "ROOM_TARIFF" && !e.chargeCode?.includes("ROOM_TARIFF")) return false;
      if (ledgerTypeFilter === "RESTAURANT_FOOD" && !e.chargeCode?.includes("FOOD") && !e.chargeCode?.includes("RESTAURANT") && !e.chargeCode?.includes("FB")) return false;
      if (ledgerTypeFilter === "MANUAL" && (e.chargeCode?.includes("ROOM_TARIFF") || e.chargeCode?.includes("FOOD") || e.chargeCode?.includes("RESTAURANT"))) return false;

      // Search Query
      if (!ledgerSearchQuery.trim()) return true;
      const q = ledgerSearchQuery.toLowerCase();
      const desc = e.description?.toLowerCase() || "";
      const code = e.chargeCode?.toLowerCase() || "";
      return desc.includes(q) || code.includes(q);
    });
  }, [modeFilteredEntries, ledgerTypeFilter, ledgerSearchQuery]);

  const payments = folioData?.payments || [];
  const invoices = folioData?.invoices || [];

  // Financial calculations for active mode
  const totalCharges = modeFilteredEntries.reduce((acc: number, e: any) => acc + (e.totalAmount || 0), 0);
  const totalTaxable = modeFilteredEntries.reduce((acc: number, e: any) => acc + (e.taxableAmount || 0), 0);
  const totalTaxes = totalCharges - totalTaxable;

  const totalGroupPayments = payments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
  const totalPayments = useMemo(() => {
    if (groupBillingMode === "YES" || !isMultiRoomGroup) {
      return totalGroupPayments;
    }
    return activeDirectoryItem?.roomPayments ?? totalGroupPayments;
  }, [groupBillingMode, isMultiRoomGroup, totalGroupPayments, activeDirectoryItem]);

  const currentBalance = useMemo(() => {
    return Math.max(0, Math.round((totalCharges - totalPayments) * 100) / 100);
  }, [totalCharges, totalPayments]);

  // Post Manual / Restaurant Charge (5% GST Inclusive)
  const handlePostCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioData) return;
    setActionLoading(true);
    try {
      const numAmt = Number(chargeForm.amount);
      if (numAmt <= 0) {
        alert("Please enter a valid charge amount.");
        setActionLoading(false);
        return;
      }

      const res = await fetch(`/api/v1/folios/${folioData.id}/charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folioWindowId: folioData.windows[0].id,
          chargeCode: chargeForm.chargeCode || "RESTAURANT_FOOD",
          description: chargeForm.description || "Dinner Service Bill",
          qty: 1,
          amount: numAmt,
          isInclusive: true,
          sacHsn: chargeForm.sacHsn || "996331",
          customTaxRate: 5,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to post charge");
      }

      await loadFolio(folioData.id);
      await loadStays();
      setShowManualChargeModal(false);
      setChargeForm({
        chargeCode: "RESTAURANT_FOOD",
        description: "Dinner Service Bill",
        amount: "650",
        sacHsn: "996331",
      });
    } catch (err: any) {
      alert(`Error posting charge: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Record Single Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioData) return;
    setActionLoading(true);
    try {
      const numAmt = Number(paymentForm.amount);
      if (numAmt <= 0) {
        alert("Please enter a valid payment amount.");
        setActionLoading(false);
        return;
      }

      const res = await fetch(`/api/v1/folios/${folioData.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmt,
          method: paymentForm.method,
          reference: paymentForm.reference || undefined,
          payerName: paymentForm.payerName,
          companyName: paymentForm.companyName || undefined,
          gstin: paymentForm.gstin || undefined,
          creditPeriod: paymentForm.creditPeriod || undefined,
          billingRemarks: paymentForm.billingRemarks || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Payment recording failed");
      }

      await loadFolio(folioData.id);
      await loadStays();
      setShowPaymentModal(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Live Tax Bill Print Modal
  const handleOpenLiveTaxBill = () => {
    setSelectedInvoice(null);
    setIsLiveTaxBillView(true);
    setShowInvoiceModal(true);
  };

  // Open Group Multi-Room Payment Modal
  const handleOpenGroupPaymentModal = () => {
    if (selectedGroupStayIds.length === 0) return;
    const initialAlloc: Record<string, number> = {};
    const selectedStays = stays.filter((s) => selectedGroupStayIds.includes(s.id));
    selectedStays.forEach((s) => {
      initialAlloc[s.id] = Math.max(0, s.folio?.balance ?? 0);
    });

    const firstGuest = selectedStays[0]?.primaryGuest;
    setGroupPaymentForm({
      payerName: formatGuestDisplayName(firstGuest?.name) || "Corporate / Group Head",
      method: firstGuest?.companyName ? "DIRECT_BILL" : "UPI",
      reference: firstGuest?.companyName ? `GRP-PO-${(firstGuest.companyName || "").slice(0, 8)}` : "",
      companyName: firstGuest?.companyName || "",
      gstin: firstGuest?.gstin || "",
      allocations: initialAlloc,
    });
    setShowGroupPaymentModal(true);
  };

  // Submit Group Multi-Room Payment
  const handleSubmitGroupPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const selectedStays = stays.filter((s) => selectedGroupStayIds.includes(s.id));
      const allocations = selectedStays
        .map((s) => ({
          folioId: s.folio?.id,
          amount: Number(groupPaymentForm.allocations[s.id]) || 0,
        }))
        .filter((a) => a.folioId && a.amount > 0);

      if (allocations.length === 0) {
        alert("Please allocate at least one payment amount greater than zero.");
        setActionLoading(false);
        return;
      }

      const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);

      const res = await fetch(`/api/v1/billing/group-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: activeProperty?.id,
          totalAmount,
          method: groupPaymentForm.method,
          reference: groupPaymentForm.reference || undefined,
          payerName: groupPaymentForm.payerName || undefined,
          companyName: groupPaymentForm.companyName || undefined,
          gstin: groupPaymentForm.gstin || undefined,
          allocations,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Group payment processing failed");
      }

      alert(`Group payment of ${formatINR(totalAmount)} recorded across ${allocations.length} rooms!`);
      setShowGroupPaymentModal(false);
      setSelectedGroupStayIds([]);
      await loadStays();
      if (folioData?.id) await loadFolio(folioData.id);
    } catch (err: any) {
      alert(`Group payment error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Group Checkout (for all settled rooms in group)
  const handleExecuteGroupCheckout = async () => {
    const selectedStays = stays.filter((s) => selectedGroupStayIds.includes(s.id) && s.status === "IN_HOUSE");
    const unSettled = selectedStays.filter((s) => (s.folio?.balance ?? 0) > 0.5);

    if (unSettled.length > 0) {
      alert(
        `Cannot group checkout: Room(s) ${unSettled
          .map((s) => s.roomAssignments?.[0]?.room?.number)
          .join(", ")} still have unpaid balances. Please record group settlement first.`
      );
      return;
    }

    if (!confirm(`Confirm checkout for all ${selectedStays.length} selected group rooms?`)) return;

    setActionLoading(true);
    try {
      for (const s of selectedStays) {
        await fetch(`/api/v1/stays/${s.id}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      }
      alert(`Group checkout complete for ${selectedStays.length} rooms! Invoices generated.`);
      setSelectedGroupStayIds([]);
      await loadStays();
      await refreshData();
    } catch (err: any) {
      alert(`Group checkout error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Check-out and Issue Invoice
  const handleExecuteCheckout = async () => {
    if (!activeStay) return;
    if (currentBalance > 0.5) {
      setPaymentForm({
        amount: String(currentBalance),
        method: activeStay?.primaryGuest?.companyName ? "DIRECT_BILL" : "UPI",
        reference: "",
        payerName: formatGuestDisplayName(activeStay?.primaryGuest?.name) || "Guest",
        companyName: activeStay?.primaryGuest?.companyName || "",
        gstin: activeStay?.primaryGuest?.gstin || "",
        creditPeriod: "30_DAYS",
        billingRemarks: "",
      });
      setShowPaymentModal(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/stays/${activeStay.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Checkout failed");
      }

      const invoiceData = await res.json();
      alert(`Check-out successful! Tax Invoice #${invoiceData.invoiceNo} generated.`);
      await loadStays();
      await loadFolio(folioData.id);
      await refreshData();
    } catch (err: any) {
      alert(`Error checking out: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="billing-dashboard-view no-print print:hidden min-h-[calc(100vh-60px)] bg-slate-50/60 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 p-3 sm:p-4 xl:p-5 space-y-3.5 xl:space-y-4 transition-colors duration-150">
        
        {/* 1. MASTER TOP HEADER & ACTIONS (CLEAN 1440x900 BAR) */}
      <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 dark:bg-white text-white dark:text-zinc-950 font-bold text-base flex items-center justify-center shadow-xs shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  Folio, Billing & Tax Invoices
                </h1>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 uppercase tracking-wide">
                  GST Rule 46
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex-wrap">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {activeProperty?.displayName || "Hotel Ambarish Grand Residency"}
                </span>
                <span>•</span>
                <span className="font-mono">GSTIN: {activeProperty?.gstin || "18AACCB2447F1ZX"}</span>
                <span>•</span>
                <span>Date: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{activeProperty?.businessDate || new Date().toISOString().split("T")[0]}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {selectedGroupStayIds.length > 0 && (
              <button
                onClick={handleOpenGroupPaymentModal}
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer animate-in fade-in"
              >
                <Users className="h-4 w-4" />
                <span>Group Payment ({selectedGroupStayIds.length})</span>
              </button>
            )}

            {selectedGroupStayIds.length > 0 && (
              <button
                onClick={handleExecuteGroupCheckout}
                className="h-9 px-3.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 font-semibold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Group Checkout</span>
              </button>
            )}

            {folioData && (
              <>
                <button
                  onClick={handleOpenLiveTaxBill}
                  className="h-9 px-3.5 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 font-semibold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Print Tax Bill</span>
                </button>

                <button
                  onClick={() => {
                    setChargeForm({
                      chargeCode: "RESTAURANT_FOOD",
                      description: "Dinner Service Bill",
                      amount: "650",
                      sacHsn: "996331",
                    });
                    setShowManualChargeModal(true);
                  }}
                  className="h-9 px-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-500/10 hover:bg-amber-100/80 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Post Charge</span>
                </button>

                <button
                  onClick={() => {
                    setDiscountForm({
                      description: "Discount / Rebate",
                      amount: "500",
                      sacHsn: "996311",
                    });
                    setShowDiscountModal(true);
                  }}
                  className="h-9 px-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Add Discount</span>
                </button>

                <button
                  onClick={() => {
                    const hasCompany = Boolean(activeStay?.primaryGuest?.companyName);
                    setPaymentForm({
                      amount: String(Math.max(0, currentBalance)),
                      method: hasCompany ? "DIRECT_BILL" : "UPI",
                      reference: hasCompany ? `PO-${(activeStay.primaryGuest.companyName || "").slice(0, 10)}` : "",
                      payerName: formatGuestDisplayName(activeStay?.primaryGuest?.name) || "Guest",
                      companyName: activeStay?.primaryGuest?.companyName || "",
                      gstin: activeStay?.primaryGuest?.gstin || "",
                      creditPeriod: "30_DAYS",
                      billingRemarks: "",
                    });
                    setShowPaymentModal(true);
                  }}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm shadow-blue-600/30 cursor-pointer"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Collect Payment</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN OPERATIONAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 xl:gap-4 items-start">
        
        {/* LEFT COLUMN: ROOMS DIRECTORY & GROUP SELECTOR (3 COLS) */}
        <div className="lg:col-span-3 xl:col-span-3 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 p-3 shadow-xs space-y-2.5 flex flex-col">
          
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
            <span className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Rooms Directory
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedGroupStayIds.length === stays.length) {
                    setSelectedGroupStayIds([]);
                  } else {
                    setSelectedGroupStayIds(stays.map((s) => s.id));
                  }
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                {selectedGroupStayIds.length > 0 ? "Clear" : "Select All"}
              </button>
              <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-semibold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                {filteredDirectoryItems.length} / {directoryItems.length}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search room #, guest name, company..."
              value={staySearchQuery}
              onChange={(e) => setStaySearchQuery(e.target.value)}
              className="w-full h-9 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-8.5 pr-8 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-medium transition"
            />
            {staySearchQuery && (
              <button
                onClick={() => setStaySearchQuery("")}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-[11px] font-semibold text-center">
            <button
              onClick={() => setStayStatusFilter("ALL")}
              className={`rounded-lg py-1.5 transition cursor-pointer ${
                stayStatusFilter === "ALL"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              All ({directoryItems.length})
            </button>
            <button
              onClick={() => setStayStatusFilter("IN_HOUSE")}
              className={`rounded-lg py-1.5 transition cursor-pointer ${
                stayStatusFilter === "IN_HOUSE"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              In-House ({directoryItems.filter((d) => d.status === "IN_HOUSE").length})
            </button>
            <button
              onClick={() => setStayStatusFilter("WITH_BALANCE")}
              className={`rounded-lg py-1.5 transition cursor-pointer ${
                stayStatusFilter === "WITH_BALANCE"
                  ? "bg-rose-600 text-white shadow-xs font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Due ({directoryItems.filter((d) => d.roomBalance > 0).length})
            </button>
            <button
              onClick={() => setStayStatusFilter("CHECKED_OUT")}
              className={`rounded-lg py-1.5 transition cursor-pointer ${
                stayStatusFilter === "CHECKED_OUT"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Departed
            </button>
          </div>

          {/* Stays / Rooms List with Separated Individual Cards */}
          <div className="space-y-2 max-h-[calc(100vh-290px)] overflow-y-auto pr-0.5 flex-1">
            {filteredDirectoryItems.map((item) => {
              const isSelected = item.stayId === selectedStayId && (selectedRoomNumber ? item.roomNumber === selectedRoomNumber : true);
              const isGroupChecked = selectedGroupStayIds.includes(item.stayId);
              const hasCompany = Boolean(item.companyName);

              return (
                <div
                  key={item.key}
                  onClick={() => {
                    setSelectedStayId(item.stayId);
                    setSelectedRoomNumber(item.roomNumber);
                    setGroupBillingMode("NO"); // Default to separate billing on click
                  }}
                  className={`rounded-xl p-3 border transition-all cursor-pointer flex items-start gap-2.5 shadow-xs ${
                    isSelected
                      ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 text-zinc-900 dark:text-zinc-100"
                      : "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isGroupChecked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleGroupStaySelection(item.stayId)}
                    className="mt-0.5 h-3.5 w-3.5 rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 accent-emerald-500 cursor-pointer shrink-0"
                    title="Select for group settlement"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Top Row: Room Number & Settled/Due Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-zinc-900 dark:text-white">
                          {item.roomNumber}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-medium truncate">
                          {item.roomType?.name || "Deluxe Room"}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {item.roomBalance > 0 ? (
                          <span className="text-[10.5px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 px-2 py-0.5 rounded-md">
                            Due: {formatINR(item.roomBalance)}
                          </span>
                        ) : (
                          <span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-md">
                            ✓ Settled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Guest Name & Status Tag */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {item.guestName}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.isMultiRoom && (
                          <span className="rounded-md px-1.5 py-0.2 text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            Group ({item.allRoomNumbers.length} Rooms)
                          </span>
                        )}
                        <span
                          className={`rounded-md px-1.5 py-0.2 text-[9.5px] font-semibold uppercase ${
                            item.status === "IN_HOUSE"
                              ? "bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Corporate Entity if present */}
                    {hasCompany && (
                      <div className="flex items-center gap-1 text-[10.5px] text-amber-800 dark:text-amber-300 font-medium truncate bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 rounded-md">
                        <Building2 className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span className="truncate">{item.companyName}</span>
                      </div>
                    )}

                    {/* Bottom Row: Dates & Phone */}
                    <div className="flex items-center justify-between text-[10.5px] text-zinc-400 dark:text-zinc-500">
                      <span>
                        {item.arrivalAt?.slice(0, 10)} → {item.expectedDepartureAt?.slice(0, 10)}
                      </span>
                      {item.phone && <span className="truncate font-mono">{item.phone}</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredDirectoryItems.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
                <AlertCircle className="h-6 w-6 text-zinc-400 dark:text-zinc-600 mx-auto" />
                <p className="font-bold text-zinc-800 dark:text-zinc-300 text-xs">No matching folios found</p>
                <p className="text-zinc-400 text-[11px]">Try changing your search term or filter status.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: FOLIO HERO, KPI CARDS & LEDGER (9 COLS) */}
        <div className="lg:col-span-9 xl:col-span-9 space-y-3.5 xl:space-y-4">
          {folioData ? (
            <>
              {/* 1. ACTIVE STAY HERO OVERVIEW CARD */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-700/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <BedDouble className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                          {groupBillingMode === "YES" && isMultiRoomGroup
                            ? `Rooms ${allGroupRooms.join(" + ")}`
                            : `Room ${activeRoomNumber}`}
                        </span>
                        <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                          {groupBillingMode === "YES" && isMultiRoomGroup
                            ? "Combined Group Folio"
                            : activeDirectoryItem?.roomType?.name || activeStay?.roomAssignments?.[0]?.room?.roomType?.name || "Deluxe AC"}
                        </span>
                        <span className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 text-[11px] font-bold">
                          {activeStay?.status}
                        </span>
                      </div>

                      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Guest: <strong className="text-zinc-950 dark:text-white font-bold">{formatGuestDisplayName(activeStay?.primaryGuest?.name)}</strong></span>
                        {activeStay?.primaryGuest?.phone && (
                          <span className="text-xs text-zinc-400 font-mono font-normal">({activeStay.primaryGuest.phone})</span>
                        )}
                        {activeStay?.primaryGuest?.email && (
                          <span className="text-xs text-zinc-400 font-normal">• {activeStay.primaryGuest.email}</span>
                        )}
                      </div>

                      {activeStay?.primaryGuest?.companyName && (
                        <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                          <Building2 className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          <span>Bill to Company: {activeStay.primaryGuest.companyName}</span>
                          {activeStay?.primaryGuest?.gstin && <span className="font-mono">• GSTIN: {activeStay.primaryGuest.gstin}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 24-Hr Cycle Metric & Primary Action Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    
                    {/* 24-Hour Cycle Metric Indicator */}
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2.5 shadow-2xs">
                      <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white block">
                            {stayCalculations.nights} Night{stayCalculations.nights > 1 ? "s" : ""} Billed
                          </span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                            Cycle {stayCalculations.completedCycles + 1} ({stayCalculations.elapsedHours}h Elapsed)
                          </span>
                        </div>
                        <span className="text-[10.5px] text-zinc-500 block font-mono">
                          {stayCalculations.isComplimentary ? (
                            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">🎁 Complimentary (₹0/nt)</strong>
                          ) : (
                            `${formatINR(stayCalculations.roomRatePerNight)}/night`
                          )}
                        </span>
                      </div>
                    </div>

                    {activeStay?.status === "IN_HOUSE" ? (
                      currentBalance <= 0.5 ? (
                        <button
                          onClick={handleExecuteCheckout}
                          disabled={actionLoading}
                          className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{actionLoading ? "Checking Out..." : groupBillingMode === "YES" && isMultiRoomGroup ? "Check Out Group & Invoice" : `Check Out Room ${activeRoomNumber}`}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setPaymentForm({
                              amount: String(currentBalance),
                              method: activeStay?.primaryGuest?.companyName ? "DIRECT_BILL" : "UPI",
                              reference: groupBillingMode === "YES" && isMultiRoomGroup ? `Group Settlement (Rooms ${allGroupRooms.join(", ")})` : `Room ${activeRoomNumber} Settlement`,
                              payerName: formatGuestDisplayName(activeStay?.primaryGuest?.name) || "Guest",
                              companyName: activeStay?.primaryGuest?.companyName || "",
                              gstin: activeStay?.primaryGuest?.gstin || "",
                              creditPeriod: "30_DAYS",
                              billingRemarks: groupBillingMode === "YES" ? `Group billing settlement` : `Settlement for Room ${activeRoomNumber}`,
                            });
                            setShowPaymentModal(true);
                          }}
                          className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>Settle {formatINR(currentBalance)} & Check Out</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={handleOpenLiveTaxBill}
                        className="h-10 px-5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Print Final Invoice</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* BILLING CONTROLS: GRACE PERIOD & GROUP BILLING TOGGLE */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex-wrap">
                  <div className="flex items-center gap-4 flex-wrap">
                    
                    {/* Grace Period Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        Grace Period:
                      </span>
                      <select
                        value={gracePeriodMinutes}
                        onChange={(e) => handleGracePeriodChange(Number(e.target.value))}
                        className="h-8.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
                      >
                        <option value={0}>0 Hours (Strict 24h)</option>
                        <option value={60}>1 Hour Grace (Default)</option>
                        <option value={120}>2 Hours Grace</option>
                        <option value={180}>3 Hours Grace</option>
                        <option value={240}>4 Hours Grace</option>
                        <option value={1440}>Waive Next Night</option>
                      </select>
                    </div>

                    {/* Group Billing Selector (Only visible for multi-room groups) */}
                    {isMultiRoomGroup && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          Group Billing:
                        </span>
                        <select
                          value={groupBillingMode}
                          onChange={(e) => setGroupBillingMode(e.target.value as "NO" | "YES")}
                          className="h-8.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                        >
                          <option value="NO">No — Separate Billing (Room {activeRoomNumber} Only)</option>
                          <option value="YES">Yes — Combined Group Billing ({allGroupRooms.length} Rooms)</option>
                        </select>
                      </div>
                    )}

                  </div>

                  {/* Clean Status Badge for Multi-Room Group */}
                  {isMultiRoomGroup && (
                    <div className="flex items-center gap-2 text-[11px] font-medium">
                      {groupBillingMode === "NO" ? (
                        <span className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1 rounded-lg font-semibold">
                          Separate Billing • Room {activeRoomNumber} of {allGroupRooms.length} Group Rooms
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg font-bold">
                          ✓ Combined Group Folio ({allGroupRooms.length} Rooms)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. THREE LARGE FINANCIAL KPI STAT TILES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:gap-3.5">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-0.5">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold tracking-wider">
                    Total Charges Posted
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                    {formatINR(totalCharges)}
                  </div>
                  <div className="text-[10.5px] text-zinc-400">
                    Taxable: <span className="font-mono">{formatINR(totalTaxable)}</span> + Tax: <span className="font-mono">{formatINR(totalTaxes)}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-0.5">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold tracking-wider">
                    Payments Received
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatINR(totalPayments)}
                  </div>
                  <div className="text-[10.5px] text-zinc-400">
                    {payments.length} Transaction{payments.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-0.5">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold tracking-wider">
                    Outstanding Balance Due
                  </div>
                  <div
                    className={`text-xl sm:text-2xl font-bold tabular-nums ${
                      currentBalance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {formatINR(currentBalance)}
                  </div>
                  <div className="text-[10.5px] text-zinc-400">
                    {currentBalance > 0 ? "Pending Guest / Corporate Settlement" : "Folio is Fully Cleared"}
                  </div>
                </div>
              </div>

              {/* 3. FOLIO CHARGES LEDGER TABLE */}
              <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] overflow-hidden shadow-xs p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      {groupBillingMode === "YES" && isMultiRoomGroup
                        ? `Group Folio Charges Ledger (Rooms ${allGroupRooms.join(", ")})`
                        : `Room ${activeRoomNumber} Itemized Charges Ledger`}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {groupBillingMode === "YES" && isMultiRoomGroup
                        ? `Combined billing for ${allGroupRooms.length} rooms + restaurant food & services`
                        : `Separate individual billing for Room ${activeRoomNumber} (Default)`}
                    </p>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-44 sm:w-56">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Filter charges..."
                        value={ledgerSearchQuery}
                        onChange={(e) => setLedgerSearchQuery(e.target.value)}
                        className="w-full h-8.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-8 pr-7 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                      />
                      {ledgerSearchQuery && (
                        <button
                          onClick={() => setLedgerSearchQuery("")}
                          className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <select
                      value={ledgerTypeFilter}
                      onChange={(e: any) => setLedgerTypeFilter(e.target.value)}
                      className="h-8.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="ROOM_TARIFF">🛏️ Room Tariffs ({ACTIVE_TAX_RATES.ROOM_ACCOMMODATION_RATE}%)</option>
                      <option value="RESTAURANT_FOOD">🍽️ Restaurant F&B ({ACTIVE_TAX_RATES.RESTAURANT_FOOD_RATE}%)</option>
                      <option value="MANUAL">🧺 Laundry & Services ({ACTIVE_TAX_RATES.SERVICES_LAUNDRY_RATE}%)</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50/80 dark:bg-zinc-900/80 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase border-b border-zinc-200/80 dark:border-zinc-800 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Description & Category</th>
                        <th className="py-2 px-3">SAC</th>
                        <th className="py-2 px-3 text-right">Taxable</th>
                        <th className="py-2 px-3 text-right">GST</th>
                        <th className="py-2 px-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                      {entries.map((e: any) => {
                        const taxAmt = (e.totalAmount || 0) - (e.taxableAmount || 0);
                        const isFood = e.chargeCode?.includes("FOOD") || e.chargeCode?.includes("RESTAURANT") || e.chargeCode?.includes("FB");
                        const isRoom = e.chargeCode?.includes("ROOM_TARIFF");
                        const isDiscount = (e.amount || 0) < 0 || (e.totalAmount || 0) < 0;

                        return (
                          <tr key={e.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50 transition">
                            <td className="py-2 px-3 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                              {e.serviceDate || e.createdAt?.slice(0, 10)}
                            </td>
                            <td className="py-2 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{e.description}</span>
                                <span
                                  className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                    isDiscount
                                      ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-700"
                                      : isFood
                                      ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
                                      : isRoom
                                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                                      : "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700"
                                  }`}
                                >
                                  {isDiscount ? "Discount" : isFood ? `🍽️ F&B ${ACTIVE_TAX_RATES.RESTAURANT_FOOD_RATE}%` : isRoom ? `🛏️ Room ${ACTIVE_TAX_RATES.ROOM_ACCOMMODATION_RATE}%` : `🧺 Service ${ACTIVE_TAX_RATES.SERVICES_LAUNDRY_RATE}%`}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3 font-mono text-zinc-500 dark:text-zinc-400 text-xs">
                              {e.sacHsn || (isFood ? "996331" : "996311")}
                            </td>
                            <td className="py-2 px-3 font-mono tabular-nums text-zinc-600 dark:text-zinc-300 text-right">
                              {formatINR(e.taxableAmount || 0)}
                            </td>
                            <td className="py-2 px-3 font-mono text-zinc-500 dark:text-zinc-400 tabular-nums text-right">
                              {formatINR(taxAmt)}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-zinc-950 dark:text-white text-right tabular-nums">
                              {formatINR(e.totalAmount || 0)}
                            </td>
                          </tr>
                        );
                      })}
                      {entries.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-5 text-center text-zinc-400 italic text-xs">
                            {rawEntries.length === 0 ? "No charges posted yet" : "No charges match your search filter"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. PAYMENT RECEIPTS TABLE */}
              <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] overflow-hidden shadow-xs p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Payment & Settlement Receipts
                    </h2>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {payments.length} Transaction{payments.length === 1 ? "" : "s"} Recorded for Folio
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    Total Settled: {formatINR(totalPayments)}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50/80 dark:bg-zinc-900/80 text-zinc-500 dark:text-zinc-400 text-[11px] uppercase border-b border-zinc-200/80 dark:border-zinc-800 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Receipt #</th>
                        <th className="py-2 px-3">Date & Time</th>
                        <th className="py-2 px-3">Payment Method</th>
                        <th className="py-2 px-3">Reference / Notes</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                      {payments.map((p: any) => {
                        const isGroup = p.reference?.includes("GRP") || p.receiptNo?.includes("GRP");
                        const isBTC = p.method === "DIRECT_BILL";

                        return (
                          <tr key={p.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50 transition">
                            <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                              <span>{p.receiptNo}</span>
                              {isGroup && (
                                <span className="text-[9.5px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 py-0.2 rounded font-bold">
                                  Group
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-zinc-500 dark:text-zinc-400 text-xs">
                              {p.receivedAt ? new Date(p.receivedAt).toLocaleString("en-GB") : "—"}
                            </td>
                            <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                              <span
                                className={`rounded-md border px-2 py-0.5 text-xs font-semibold inline-flex items-center gap-1.5 ${
                                  isBTC
                                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700 shadow-xs"
                                    : p.method === "UPI"
                                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                                    : p.method === "CARD"
                                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700"
                                    : p.method === "BANK_TRANSFER"
                                    ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700"
                                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700"
                                }`}
                              >
                                {isBTC ? (
                                  <>
                                    <Building2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                    <span>Bill to Company (BTC)</span>
                                  </>
                                ) : p.method === "UPI" ? (
                                  <span>📱 UPI / QR</span>
                                ) : p.method === "CARD" ? (
                                  <span>💳 Card</span>
                                ) : p.method === "BANK_TRANSFER" ? (
                                  <span>🏦 Bank Transfer</span>
                                ) : (
                                  <span>💵 {p.method || "Cash"}</span>
                                )}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-zinc-600 dark:text-zinc-400 text-xs">
                              {p.reference && !p.reference.startsWith("GRC-DEPOSIT-") ? p.reference : "—"}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right tabular-nums text-sm">
                              {formatINR(p.amount || 0)}
                            </td>
                          </tr>
                        );
                      })}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-5 text-center text-zinc-400 italic text-xs">
                            No payments recorded yet for this stay.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. GENERATED TAX INVOICES CARD */}
              {invoices.length > 0 && (
                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] p-4 sm:p-5 space-y-3 shadow-xs">
                  <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Generated Tax Invoices
                  </h2>
                  <div className="space-y-2">
                    {invoices.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs sm:text-sm"
                      >
                        <div>
                          <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                            {inv.invoiceNo}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                            FY: {inv.financialYear} • Issued: {inv.issuedAt?.slice(0, 10)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                            {formatINR(inv.totalAmount || 0)}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsLiveTaxBillView(false);
                              setShowInvoiceModal(true);
                            }}
                            className="h-8.5 px-3.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Print Tax Invoice</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] p-16 text-center text-zinc-500 dark:text-zinc-400 space-y-3 shadow-xs">
              <Receipt className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mx-auto" />
              <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                Select a room from the directory to manage billing
              </p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Use the directory on the left or select multiple rooms for group payment settlements.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🍲 POST CHARGE MODAL (CLEAN DROPDOWN & 5% GST INCLUSIVE)                   */}
      {/* ========================================================================= */}
      {showManualChargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Post Charge to Room {activeStay?.roomAssignments?.[0]?.room?.number || "—"}
                </h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Guest: {activeStay?.primaryGuest?.name || "In-House Guest"}
                </p>
              </div>
              <button
                onClick={() => setShowManualChargeModal(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePostCharge} className="space-y-4 text-xs sm:text-sm">
              {/* 1. Single Clean Dropdown for Charge Category */}
              <div>
                <label className="text-xs uppercase font-bold font-mono text-zinc-500 tracking-wider block mb-1.5">
                  Select Service / Category *
                </label>
                <select
                  value={chargeForm.chargeCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    const presets: Record<string, { desc: string; sac: string; defaultAmt: string }> = {
                      RESTAURANT_FOOD: { desc: "Dinner Service Bill", sac: "996331", defaultAmt: "650" },
                      ROOM_TARIFF: { desc: "Extra Bed / Stay Extension", sac: "996311", defaultAmt: "1000" },
                      LAUNDRY: { desc: "Laundry & Pressing Service", sac: "9997", defaultAmt: "300" },
                      TRANSPORT: { desc: "Cab / Airport Pick & Drop", sac: "9964", defaultAmt: "800" },
                      MISC: { desc: "Miscellaneous Guest Service", sac: "9999", defaultAmt: "250" },
                    };
                    const selected = presets[val] || { desc: "Guest Service Charge", sac: "996331", defaultAmt: "500" };
                    setChargeForm({
                      ...chargeForm,
                      chargeCode: val,
                      sacHsn: selected.sac,
                      description: selected.desc,
                      amount: chargeForm.amount || selected.defaultAmt,
                    });
                  }}
                  className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-xs sm:text-sm text-zinc-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="RESTAURANT_FOOD">🍽️ Restaurant & In-Room Dining (5% GST)</option>
                  <option value="ROOM_TARIFF">🛏️ Room Tariff / Extension (5% GST)</option>
                  <option value="LAUNDRY">🧺 Laundry & Valet Service (5% GST)</option>
                  <option value="TRANSPORT">🚗 Travel / Cab / Transfer (5% GST)</option>
                  <option value="MISC">📦 Miscellaneous Guest Service (5% GST)</option>
                </select>
              </div>

              {/* 2. Editable Description */}
              <div>
                <label className="text-xs uppercase font-bold font-mono text-zinc-500 tracking-wider block mb-1.5">
                  Description / Item Details *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dinner Service Bill #1042 / KOT #55"
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 font-medium transition"
                />
              </div>

              {/* 3. Total Amount (Inclusive of 5% GST) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs uppercase font-bold font-mono text-zinc-500 tracking-wider">
                    Total Amount (₹) *
                  </label>
                  <span className="text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                    ✓ 5% GST Inclusive
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-zinc-400 font-mono text-base">₹</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={chargeForm.amount}
                    onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                    className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 pl-8 pr-3.5 text-base text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono font-black transition"
                  />
                </div>
              </div>

              {/* 4. Live 5% GST Inclusive Math Breakdown */}
              {(() => {
                const gross = Number(chargeForm.amount) || 0;
                const taxRatePercent = getTaxRateForSac(chargeForm.sacHsn, gross);
                const baseTaxable = Math.round((gross / (1 + taxRatePercent / 100)) * 100) / 100;
                const totalGst = Math.round((gross - baseTaxable) * 100) / 100;
                const halfRate = (taxRatePercent / 2).toFixed(1);
                const cgst = Math.round((totalGst / 2) * 100) / 100;
                const sgst = Math.round((totalGst - cgst) * 100) / 100;

                return (
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-zinc-500 font-medium">Tax Calculation ({taxRatePercent}% Inclusive):</span>
                      <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                        CGST {halfRate}% + SGST {halfRate}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="bg-white dark:bg-zinc-800/80 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs">
                        <span className="text-[10px] text-zinc-400 block uppercase">Base Taxable</span>
                        <span className="font-bold text-zinc-900 dark:text-white">{formatINR(baseTaxable)}</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-800/80 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs">
                        <span className="text-[10px] text-zinc-400 block uppercase">CGST ({halfRate}%)</span>
                        <span className="font-bold text-zinc-900 dark:text-white">{formatINR(cgst)}</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-800/80 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs">
                        <span className="text-[10px] text-zinc-400 block uppercase">SGST ({halfRate}%)</span>
                        <span className="font-bold text-zinc-900 dark:text-white">{formatINR(sgst)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Total Posted to Room:</span>
                      <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {formatINR(gross)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowManualChargeModal(false)}
                  className="h-10 px-4 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-10 px-5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 font-black transition disabled:opacity-50 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{actionLoading ? "Posting..." : "Post Charge (5% GST)"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🏷️ ADD DISCOUNT / REBATE MODAL                                            */}
      {/* ========================================================================= */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                Add Discount / Rebate to Room {activeStay?.roomAssignments?.[0]?.room?.number}
              </h2>
              <button onClick={() => setShowDiscountModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setActionLoading(true);
                try {
                  const numAmt = Number(discountForm.amount);
                  if (numAmt <= 0) {
                    alert("Please enter a positive amount to discount.");
                    setActionLoading(false);
                    return;
                  }
                  
                  const res = await fetch(`/api/v1/folios/${folioData.id}/charges`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      folioWindowId: folioData.windows[0].id,
                      chargeCode: "DISCOUNT",
                      description: discountForm.description,
                      qty: 1,
                      amount: -numAmt,
                      isInclusive: true,
                      sacHsn: discountForm.sacHsn,
                    }),
                  });

                  if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || "Failed to post discount");
                  }
                  await loadFolio(folioData.id);
                  await loadStays();
                  setShowDiscountModal(false);
                } catch (err: any) {
                  alert(err.message || err);
                } finally {
                  setActionLoading(false);
                }
              }}
              className="space-y-4 text-xs sm:text-sm"
            >
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Reason / Description *</label>
                <select
                  required
                  value={discountForm.description}
                  onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                  className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium cursor-pointer"
                >
                  <option value="Discount / Rebate">General Discount / Rebate</option>
                  {DISCOUNT_REASONS.map((r) => (
                    <option key={r.id} value={r.label}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Discount Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={discountForm.amount}
                    onChange={(e) => setDiscountForm({ ...discountForm, amount: e.target.value })}
                    className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-rose-300 dark:border-rose-900/60 px-3 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 font-mono font-black text-base"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Deducted from final folio total.</p>
                </div>
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">SAC / Tax Rule</label>
                  <select
                    value={discountForm.sacHsn}
                    onChange={(e) => setDiscountForm({ ...discountForm, sacHsn: e.target.value })}
                    className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500 font-mono"
                  >
                    <option value="996311">SAC 996311 (Room 12%)</option>
                    <option value="996331">SAC 996331 (F&B 5%)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="h-11 px-5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-11 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black transition disabled:opacity-50 shadow-md"
                >
                  {actionLoading ? "Applying..." : "Apply Discount"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💳 COLLECT PAYMENT & CORPORATE SETTLEMENT MODAL                            */}
      {/* ========================================================================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Collect Payment for Room {activeStay?.roomAssignments?.[0]?.room?.number}
              </h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Payment Method *</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => {
                      const newMethod = e.target.value;
                      setPaymentForm((prev) => ({
                        ...prev,
                        method: newMethod,
                        reference: newMethod === "DIRECT_BILL" && !prev.reference ? `PO-${(prev.companyName || "CORP").slice(0, 10)}` : prev.reference,
                      }));
                    }}
                    className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="UPI">📱 UPI / QR Code</option>
                    <option value="CARD">💳 Debit / Credit Card</option>
                    <option value="CASH">💵 Cash Drawer</option>
                    <option value="DIRECT_BILL">🏢 Bill to Company (BTC / Corporate)</option>
                    <option value="BANK_TRANSFER">🏦 Bank Transfer / NEFT</option>
                    <option value="OTA_VCC">🌐 OTA Virtual Card</option>
                    <option value="CHEQUE">📝 Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono font-black text-base"
                  />
                </div>
              </div>

              {/* Corporate Direct Billing Fields */}
              {paymentForm.method === "DIRECT_BILL" && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 space-y-3.5 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider font-mono">
                    <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Bill to Company (BTC / Corporate Ledger)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Company Entity *</label>
                      <input
                        type="text"
                        required={paymentForm.method === "DIRECT_BILL"}
                        placeholder="e.g. Tata Consultancy Services"
                        value={paymentForm.companyName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, companyName: e.target.value })}
                        className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Company GSTIN</label>
                      <input
                        type="text"
                        placeholder="e.g. 18AAAAA0000A1Z5"
                        value={paymentForm.gstin}
                        onChange={(e) => setPaymentForm({ ...paymentForm, gstin: e.target.value.toUpperCase() })}
                        className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Corporate PO # / Approval Ref *</label>
                      <input
                        type="text"
                        required={paymentForm.method === "DIRECT_BILL"}
                        placeholder="e.g. PO-2026-8891 / Mgr Approval"
                        value={paymentForm.reference}
                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                        className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Credit Terms</label>
                      <select
                        value={paymentForm.creditPeriod}
                        onChange={(e) => setPaymentForm({ ...paymentForm, creditPeriod: e.target.value })}
                        className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="15_DAYS">Net 15 Days</option>
                        <option value="30_DAYS">Net 30 Days (Standard Corporate)</option>
                        <option value="45_DAYS">Net 45 Days</option>
                        <option value="60_DAYS">Net 60 Days</option>
                        <option value="IMMEDIATE">Immediate Invoice Submission</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Billing Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Annual Executive Summit / Project Team Bill"
                      value={paymentForm.billingRemarks}
                      onChange={(e) => setPaymentForm({ ...paymentForm, billingRemarks: e.target.value })}
                      className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {paymentForm.method !== "DIRECT_BILL" && (
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Reference / UTR / Auth Code</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR/98127391823 or Cash Ref"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">
                  {paymentForm.method === "DIRECT_BILL" ? "Authorized Guest / Employee Name" : "Payer Name"}
                </label>
                <input
                  type="text"
                  value={paymentForm.payerName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payerName: e.target.value })}
                  className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="h-11 px-5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-11 px-6 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 font-black transition disabled:opacity-50 shadow-md flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  {actionLoading ? "Recording..." : paymentForm.method === "DIRECT_BILL" ? "Bill to Company Ledger" : "Record Payment & Settle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 👥 GROUP MULTI-ROOM SETTLEMENT MODAL                                      */}
      {/* ========================================================================= */}
      {showGroupPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-zinc-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Group Multi-Room Payment Settlement
                </h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Record a single payment distributed across {selectedGroupStayIds.length} room folios
                </p>
              </div>
              <button onClick={() => setShowGroupPaymentModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGroupPayment} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Group Payer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Sharma (Group Head)"
                    value={groupPaymentForm.payerName}
                    onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, payerName: e.target.value })}
                    className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Payment Method *</label>
                  <select
                    value={groupPaymentForm.method}
                    onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, method: e.target.value })}
                    className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="UPI">📱 UPI / QR Code</option>
                    <option value="CARD">💳 Debit / Credit Card</option>
                    <option value="CASH">💵 Cash Drawer</option>
                    <option value="DIRECT_BILL">🏢 Bill to Company (Corporate Group Account)</option>
                    <option value="BANK_TRANSFER">🏦 Bank Transfer / NEFT</option>
                    <option value="CHEQUE">📝 Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">
                    Company Name {groupPaymentForm.method === "DIRECT_BILL" ? "*" : "(Optional)"}
                  </label>
                  <input
                    type="text"
                    required={groupPaymentForm.method === "DIRECT_BILL"}
                    placeholder="e.g. Singhania Tech Ltd"
                    value={groupPaymentForm.companyName}
                    onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, companyName: e.target.value })}
                    className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Company GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 18AAAAA0000A1Z5"
                    value={groupPaymentForm.gstin}
                    onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, gstin: e.target.value })}
                    className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1.5">Transaction Ref / UTR / Cheque # *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR/98127391823"
                  value={groupPaymentForm.reference}
                  onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, reference: e.target.value })}
                  className="w-full h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Allocated Rooms Breakdown */}
              <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  <span>Room Allocations ({selectedGroupStayIds.length} Rooms)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    Total Group Settlement:{" "}
                    {formatINR(
                      Object.values(groupPaymentForm.allocations).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0)
                    )}
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {stays
                    .filter((s) => selectedGroupStayIds.includes(s.id))
                    .map((s) => {
                      const roomNo = s.roomAssignments?.[0]?.room?.number || "Unassigned";
                      const bal = s.folio?.balance ?? 0;
                      const allocVal = groupPaymentForm.allocations[s.id] ?? bal;

                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-900 dark:text-white font-mono text-sm">Room {roomNo}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {s.primaryGuest?.name} • Due: {formatINR(bal)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 font-mono font-bold">Allocate ₹</span>
                            <input
                              type="number"
                              required
                              step="0.01"
                              value={allocVal}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setGroupPaymentForm({
                                  ...groupPaymentForm,
                                  allocations: {
                                    ...groupPaymentForm.allocations,
                                    [s.id]: val,
                                  },
                                });
                              }}
                              className="w-28 h-9 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 px-2.5 text-right text-zinc-900 dark:text-white font-mono font-black focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowGroupPaymentModal(false)}
                  className="h-11 px-5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition disabled:opacity-50 shadow-md"
                >
                  {actionLoading ? "Processing..." : "Confirm Group Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* 📄 HIGH-FIDELITY PRINTABLE TAX INVOICE MODAL (1-PAGE A4 GUARANTEE)         */}
      {/* ========================================================================= */}
      {showInvoiceModal && (
        <PrintableTaxInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          isLiveTaxBillView={isLiveTaxBillView}
          property={{
            displayName: activeProperty?.displayName || "HOTEL AMBARISH GRAND RESIDENCY",
            legalName: activeProperty?.legalName || "AMBARISH RESIDENCY",
            address: activeProperty?.address || "MD Shah Road, Paltan Bazar, Guwahati, Assam, 781008, India",
            phone: activeProperty?.phone || "9864341211, 0361 2547102",
            email: (activeProperty as any)?.email || "reservation.ambarish@gmail.com",
            website: (activeProperty as any)?.website || "www.hotelambarish.com",
            gstin: activeProperty?.gstin || "18AACCB2447F1ZX",
            stateCode: activeProperty?.stateCode || "18",
          }}
          stay={activeStay}
          roomNumber={activeRoomNumber}
          allRooms={allGroupRooms}
          isMultiRoomGroup={isMultiRoomGroup}
          groupBillingMode={groupBillingMode}
          invoiceData={selectedInvoice}
          ledgerEntries={modeFilteredEntries}
          payments={payments}
          cashierName="Front Desk Cashier"
          receptionistName="Gobin Tamang"
        />
      )}
    </>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-xs font-mono text-zinc-500">
          Loading Billing & Invoicing Engine...
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
