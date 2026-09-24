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
  ArrowRight,
  ShieldCheck,
  Calendar,
  Phone,
  FileText,
  UserCheck,
  RotateCcw,
  Trash2,
  Pencil,
  Archive,
  FolderArchive,
  History,
  UtensilsCrossed,
  Wallet,
  Coins,
  Banknote,
} from "lucide-react";
import { DISCOUNT_REASONS, PAYMENT_METHODS } from "@/data";
import { PrintableTaxInvoiceModal } from "@/components/billing/printable-tax-invoice";
import {
  DirectoryRoomItem,
  MainFolioTab,
  ChargeFormState,
  DiscountFormState,
  PaymentFormState,
  RefundFormState,
  GroupPaymentFormState,
  OutstandingFormState,
  GroupAdvanceMetrics,
} from "@/components/billing/billing-types";
import { PostChargeModal } from "@/components/billing/post-charge-modal";
import { PostDiscountModal } from "@/components/billing/post-discount-modal";
import { CollectPaymentModal } from "@/components/billing/collect-payment-modal";
import { EditPaymentModal } from "@/components/billing/edit-payment-modal";
import { ProcessRefundModal } from "@/components/billing/process-refund-modal";
import { GroupPaymentModal } from "@/components/billing/group-payment-modal";
import { GroupAdvanceModal } from "@/components/billing/group-advance-modal";
import { CheckoutSettlementModal } from "@/components/billing/checkout-settlement-modal";
import { TransferRoomModal } from "@/components/billing/transfer-room-modal";
import { BillingSidebar } from "@/components/billing/billing-sidebar";
import { FolioHero } from "@/components/billing/folio/folio-hero";
import { FolioChargesTable } from "@/components/billing/folio/folio-charges-table";
import { FolioPaymentsTable } from "@/components/billing/folio/folio-payments-table";
import { apiCache } from "@/lib/cache/api-cache";
import { calculate24HrBillableDays, calculateDynamicDepartureDate } from "@/lib/domain/pms-service";

export type { DirectoryRoomItem, MainFolioTab };

// Helper to discover all historical/predecessor room numbers for a given room in a stay
function getPredecessorRoomNumbers(assignments: any[] = [], currentRoomNumber: string): string[] {
  if (!currentRoomNumber || currentRoomNumber === "Unassigned") return [];
  const predecessors = new Set<string>();
  const queue = [currentRoomNumber];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const a of assignments) {
      const roomNum = a.room?.number;
      // 1. If this assignment is curr, check its moveReason for MOVED_FROM:XYZ
      if (roomNum === curr && a.moveReason) {
        const match = a.moveReason.match(/MOVED_FROM:([^|:]+)/i);
        if (match && match[1] && match[1].trim() !== currentRoomNumber && !predecessors.has(match[1].trim())) {
          predecessors.add(match[1].trim());
          queue.push(match[1].trim());
        }
      }
      // 2. If another assignment has reason: "Moved to Room curr"
      const reasonText = `${a.moveReason || ""} ${a.reason || ""}`;
      if (a.endsAt && reasonText) {
        const movedMatch = reasonText.match(/Moved to Room\s+([A-Za-z0-9_-]+)/i);
        if (movedMatch && movedMatch[1]?.toLowerCase() === curr.toLowerCase()) {
          if (roomNum && roomNum !== currentRoomNumber && !predecessors.has(roomNum)) {
            predecessors.add(roomNum);
            queue.push(roomNum);
          }
        }
      }
    }
  }

  predecessors.delete(currentRoomNumber);
  return Array.from(predecessors);
}

// Helper to match charges with specific rooms in separate billing mode
function isEntryForRoom(
  entry: any,
  roomNumber: string,
  allOtherRoomNumbers: string[],
  predecessorRooms: string[] = [],
  primaryRoomNumber?: string
): boolean {
  if (!roomNumber || roomNumber === "Unassigned") return true;
  const desc = entry.description || "";

  // 1. Explicit Room Mention Detection: If description mentions ANY room, evaluate strictly
  const roomMatches = Array.from(desc.matchAll(/\b(?:Room|Rm)\s*#?\s*([A-Za-z0-9_-]+)\b/gi));
  if (roomMatches.length > 0) {
    const mentionedRooms = roomMatches.map((m: any) => m[1]?.trim().toLowerCase());
    const isThis = mentionedRooms.includes(roomNumber.toLowerCase());
    const isPred = predecessorRooms.some((p) => mentionedRooms.includes(p.toLowerCase()));
    if (isThis || isPred) {
      return true;
    }
    // Mentions other room(s) (even if ended or transferred) - strictly reject
    return false;
  }

  // 2. Fallback check for other active rooms without explicit "Room" prefix
  const otherRooms = allOtherRoomNumbers.filter((r) => r !== roomNumber && !predecessorRooms.includes(r));
  for (const other of otherRooms) {
    const regex = new RegExp(`\\b(?:Room|Rm)?\\s*#?\\s*${other}\\b`, "i");
    if (regex.test(desc)) {
      return false;
    }
  }

  // 3. Prevent room tariffs or extra pax without room numbers from blindly falling back to primary room if different
  if (
    (entry.chargeCode === "ROOM_TARIFF" || entry.chargeCode === "EXTRA_PAX" || entry.chargeCode === "EXTRA_BED") &&
    primaryRoomNumber &&
    roomNumber !== primaryRoomNumber
  ) {
    return false;
  }

  // 4. Attribute general stay charges (dining, laundry, misc) to the primary room
  if (primaryRoomNumber && roomNumber === primaryRoomNumber) {
    return true;
  }

  return false;
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return dateStr.slice(0, 10);
  }
}

function formatDateTimeShort(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return typeof dateStr === "string" ? dateStr : "-";
    const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${datePart}, ${timePart}`;
  } catch {
    return typeof dateStr === "string" ? dateStr : "-";
  }
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

  // Main Folio View Tabs: In-House Active Rooms vs. Outstanding Dues vs. Settled & Departed Folios Archive
  const [activeMainTab, setActiveMainTab] = useState<"IN_HOUSE" | "OUTSTANDING_DUES" | "SETTLED_ARCHIVE">(
    searchParams.get("tab") === "outstanding" ? "OUTSTANDING_DUES" : searchParams.get("tab") === "settled" ? "SETTLED_ARCHIVE" : "IN_HOUSE"
  );
  // Unified Room Check-Out & Settlement Modal States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutTab, setCheckoutTab] = useState<"PAY_NOW" | "APPLY_ADVANCE" | "TRANSFER" | "DEBTOR">("PAY_NOW");
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<string>("UPI");
  const [checkoutPaymentAmount, setCheckoutPaymentAmount] = useState<string>("");
  const [checkoutPaymentRef, setCheckoutPaymentRef] = useState<string>("");
  const [checkoutAdvanceAmount, setCheckoutAdvanceAmount] = useState<string>("");
  const [checkoutTransferRemarks, setCheckoutTransferRemarks] = useState<string>("");

  // Group Advance Pool Management Modal
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  // Legacy compatibility states (aliased to unified checkout)
  const showOutstandingModal = showCheckoutModal;
  const setShowOutstandingModal = setShowCheckoutModal;
  const [checkoutResolutionMode, setCheckoutResolutionMode] = useState<"TRANSFER" | "DEBTOR">("TRANSFER");
  const [transferRemarksInput, setTransferRemarksInput] = useState("");
  const [outstandingForm, setOutstandingForm] = useState({
    reason: "Corporate Direct Billing / Bill to Company",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    remarks: "",
  });

  // Search & Filter States for Stays / Folios
  const [staySearchQuery, setStaySearchQuery] = useState<string>("");
  const [stayStatusFilter, setStayStatusFilter] = useState<"ALL" | "WITH_BALANCE" | "SETTLED">("ALL");

  // Search & Filter States for Ledger Entries
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState<string>("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<"ALL" | "ROOM_TARIFF" | "RESTAURANT_FOOD" | "MANUAL">("ALL");

  // Group Multi-Room Settlement State (keyed by item.key so each room card can be selected independently)
  const [selectedRoomKeys, setSelectedRoomKeys] = useState<string[]>([]);
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
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isLiveTaxBillView, setIsLiveTaxBillView] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for modals
  const [chargeForm, setChargeForm] = useState<ChargeFormState>({
    chargeCode: "RESTAURANT_FOOD",
    description: "Kitchen Order (KOT)",
    amount: "0",
    sacHsn: "996331",
    isInclusive: true,
    kotNumber: "",
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

  const [refundForm, setRefundForm] = useState({
    amount: "0",
    method: "UPI",
    reference: "",
    notes: "Advance surplus return at checkout",
  });

  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<{
    id: string;
    receiptNo: string;
    amount: string;
    method: string;
    reference: string;
    payerName: string;
    companyName?: string;
    gstin?: string;
  } | null>(null);
  const [editPaymentLoading, setEditPaymentLoading] = useState(false);

  // Grace Period control state (in minutes) - Default: 0 mins (Strict 11 AM - 12 PM Checkout)
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(0);

  // In-Folio Room Transfer modal state & rooms cache
  const [showTransferRoomModal, setShowTransferRoomModal] = useState(false);
  const [propertyRooms, setPropertyRooms] = useState<any[]>([]);

  // Global Escape key listener to close billing modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPaymentModal(false);
        setShowEditPaymentModal(false);
        setShowRefundModal(false);
        setShowManualChargeModal(false);
        setShowDiscountModal(false);
        setShowInvoiceModal(false);
        setShowGroupPaymentModal(false);
        setShowOutstandingModal(false);
        setShowTransferRoomModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  // Load in-house and past stays for current property
  const loadStays = async (forceFresh = false) => {
    if (!activeProperty?.id) {
      setStays([]);
      setSelectedStayId("");
      setSelectedRoomNumber("");
      setFolioData(null);
      setLoading(false);
      return;
    }
    const staysUrl = `/api/v1/stays?propertyId=${activeProperty.id}`;

    // Instant SWR cache lookup (0ms render)
    if (!forceFresh) {
      const cached = apiCache.get(staysUrl);
      if (cached && Array.isArray(cached)) {
        setStays(cached);
        if (cached.length > 0) {
          if (!selectedStayId || !cached.some((s: any) => s.id === selectedStayId)) {
            const inHouse = cached.find((s: any) => s.status === "IN_HOUSE");
            const targetStay = inHouse || cached[0];
            setSelectedStayId(targetStay.id);
            const activeAssign = targetStay.roomAssignments?.find((a: any) => !a.endsAt) || targetStay.roomAssignments?.[0];
            const firstRoom = activeAssign?.room?.number || "";
            setSelectedRoomNumber(firstRoom);
          } else {
            const currentStay = cached.find((s: any) => s.id === selectedStayId);
            if (currentStay && !selectedRoomNumber) {
              const activeAssign = currentStay.roomAssignments?.find((a: any) => !a.endsAt) || currentStay.roomAssignments?.[0];
              setSelectedRoomNumber(activeAssign?.room?.number || "");
            }
          }
        } else {
          setSelectedStayId("");
          setSelectedRoomNumber("");
          setFolioData(null);
        }
      } else {
        setLoading(true);
      }
    }

    try {
      const data = await apiCache.swrFetch(staysUrl, undefined, (cached) => {
        if (Array.isArray(cached)) {
          setStays(cached);
          if (cached.length === 0) {
            setSelectedStayId("");
            setSelectedRoomNumber("");
            setFolioData(null);
          }
        }
      });

      if (Array.isArray(data)) {
        setStays(data);
        if (data.length > 0) {
          if (!selectedStayId || !data.some((s: any) => s.id === selectedStayId)) {
            const inHouse = data.find((s: any) => s.status === "IN_HOUSE");
            const targetStay = inHouse || data[0];
            setSelectedStayId(targetStay.id);
            const activeAssign = targetStay.roomAssignments?.find((a: any) => !a.endsAt) || targetStay.roomAssignments?.[0];
            const firstRoom = activeAssign?.room?.number || "";
            setSelectedRoomNumber(firstRoom);
          } else {
            const currentStay = data.find((s: any) => s.id === selectedStayId);
            if (currentStay && !selectedRoomNumber) {
              const activeAssign = currentStay.roomAssignments?.find((a: any) => !a.endsAt) || currentStay.roomAssignments?.[0];
              setSelectedRoomNumber(activeAssign?.room?.number || "");
            }
          }
        } else {
          // Zero stays for this property: strictly wipe folio data
          setSelectedStayId("");
          setSelectedRoomNumber("");
          setFolioData(null);
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
    if (!selectedStayId) return;

    try {
      // 1. Persist new grace period to the stay in the database
      await fetch(`/api/v1/stays/${selectedStayId}/grace-period`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gracePeriodMinutes: newGrace }),
      });

      // 2. Reload folio and stays fresh to update ledger charges and balance
      if (folioData?.id) {
        await loadFolio(folioData.id, newGrace);
      }
      await loadStays(true);
      await refreshData();
    } catch (e) {
      console.error("Error updating grace period:", e);
    }
  };

  const loadPropertyRooms = async () => {
    if (!activeProperty?.id) {
      setPropertyRooms([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/rooms?propertyId=${activeProperty.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setPropertyRooms(data);
      }
    } catch (err) {
      console.error("Failed to load rooms for billing:", err);
    }
  };

  useEffect(() => {
    // When active property changes, immediately reset stay/folio state to prevent cross-hotel leakage
    setStays([]);
    setSelectedStayId("");
    setSelectedRoomNumber("");
    setFolioData(null);
    setSelectedInvoice(null);
    setSelectedRoomKeys([]);
    loadStays();
    loadPropertyRooms();
  }, [activeProperty?.id, refreshKey]);

  // When selected stay changes, fetch its live folio and sync saved grace period
  useEffect(() => {
    if (!selectedStayId || stays.length === 0) {
      setFolioData(null);
      return;
    }
    const activeStay = stays.find((s) => s.id === selectedStayId);
    if (!activeStay) {
      setFolioData(null);
      return;
    }
    let stayGrace = 0;
    const rh = activeStay?.roomAssignments?.[0]?.rateHandling;
    if (rh?.includes("24_HOURS:")) {
      stayGrace = Number(rh.split(":")[1]) || 0;
    } else if (rh?.includes("FIXED_TIME:")) {
      stayGrace = Number(rh.split(":")[1]) || 0;
    }
    setGracePeriodMinutes(stayGrace);

    if (activeStay?.folio?.id) {
      loadFolio(activeStay.folio.id, stayGrace);
    } else {
      setFolioData(null);
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
      let targetAssignments: any[] = [];

      if (s.status === "IN_HOUSE") {
        // For IN_HOUSE stays: ONLY include active room assignments where endsAt is null!
        // Ended assignments are historical transferred rooms and must NOT appear as separate in-house rooms.
        const activeOnly = assignments.filter((a: any) => !a.endsAt);
        targetAssignments = activeOnly.length > 0 ? activeOnly : [assignments[0] || { room: { number: "Unassigned", roomType: null } }];
      } else {
        // For CHECKED_OUT / COMPLETED stays:
        // Filter out transferred predecessor rooms where endsAt is set and another assignment started after
        const endedTransfers = new Set<string>();
        for (const a of assignments) {
          if (a.endsAt) {
            const successor = assignments.find(
              (o: any) => o.id !== a.id && o.roomId !== a.roomId && new Date(o.startsAt).getTime() >= new Date(a.startsAt).getTime() + 10000
            );
            if (successor) {
              endedTransfers.add(a.room?.number || a.id);
            }
          }
        }
        targetAssignments = assignments.filter((a: any) => !endedTransfers.has(a.room?.number || a.id));
        if (targetAssignments.length === 0) {
          targetAssignments = [assignments[assignments.length - 1] || { room: { number: "Unassigned", roomType: null } }];
        }
      }

      const distinctRooms: any[] = [];
      const seen = new Set<string>();

      targetAssignments.forEach((a: any) => {
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
        const predecessors = getPredecessorRoomNumbers(assignments, roomNo);
        const rawEntriesList = (s.folio?.windows?.flatMap((w: any) => w.entries || w.lineItems || []) || []).filter(
          (e: any) => e.chargeCode !== "ROOM_TRANSFER_CREDIT"
        );
        const paymentsList = s.folio?.payments || [];

        // Determine charges for this room (including predecessor rooms)
        const originalPrimaryRoom = assignments[0]?.room?.number || allRoomNumbers[0];
        const roomEntries = isMultiRoom
          ? rawEntriesList.filter((e: any) => isEntryForRoom(e, roomNo, otherRooms, predecessors, originalPrimaryRoom))
          : rawEntriesList;
        const roomCharges = roomEntries.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
        const totalGroupCharges = rawEntriesList.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
        const totalGroupPayments = paymentsList.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        // Determine payments for this room (direct payments and explicit allocations only)
        let allocatedPayment = 0;
        paymentsList.forEach((p: any) => {
          if (p.method === "ADVANCE_ALLOCATION") return;
          const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${p.notes || ""}`;
          const isThis =
            new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${roomNo}\\b`, "i").test(text) ||
            new RegExp(`"roomNumber"\\s*:\\s*"${roomNo}"`, "i").test(text) ||
            new RegExp(`"room"\\s*:\\s*"${roomNo}"`, "i").test(text) ||
            predecessors.some((pred) =>
              new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${pred}\\b`, "i").test(text) ||
              new RegExp(`"roomNumber"\\s*:\\s*"${pred}"`, "i").test(text)
            );
          const isOther = otherRooms
            .filter((o) => !predecessors.includes(o))
            .some((o) =>
              new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${o}\\b`, "i").test(text) ||
              new RegExp(`"roomNumber"\\s*:\\s*"${o}"`, "i").test(text)
            );

          if (isThis && !isOther) {
            allocatedPayment += p.amount || 0;
          }
        });

        // Group advance allocated to this specific room
        let groupAdvanceCovered = 0;
        paymentsList.forEach((p: any) => {
          if (p.method === "ADVANCE_ALLOCATION") {
            const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${p.notes || ""}`;
            const isSingleRoomFolio = distinctRooms.length === 1;
            const isMatch =
              isSingleRoomFolio ||
              new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${roomNo}\\b`, "i").test(text) ||
              new RegExp(`"roomNumber"\\s*:\\s*"${roomNo}"`, "i").test(text) ||
              new RegExp(`"room"\\s*:\\s*"${roomNo}"`, "i").test(text) ||
              predecessors.some((pred) =>
                new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${pred}\\b`, "i").test(text) ||
                new RegExp(`"roomNumber"\\s*:\\s*"${pred}"`, "i").test(text)
              );
            if (isMatch) {
              groupAdvanceCovered += p.amount || 0;
            }
          }
        });

        const effectiveRoomPaid = isMultiRoom ? (allocatedPayment + groupAdvanceCovered) : totalGroupPayments;
        const roomBalance = Math.max(0, Math.round((roomCharges - effectiveRoomPaid) * 100) / 100);

        items.push({
          key: `${s.id}-${roomNo}`,
          stayId: s.id,
          stay: s,
          roomNumber: roomNo,
          roomId: assignment.room?.id,
          room: assignment.room,
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
          isExtendedDeparture: s.isExtendedDeparture,
          extensionNights: s.extensionNights,
          originalExpectedDepartureAt: s.originalExpectedDepartureAt,
          status: s.status,
          roomCharges,
          roomPayments: effectiveRoomPaid,
          directPayments: allocatedPayment,
          groupAdvanceCovered,
          isGroupAdvanceCovered: groupAdvanceCovered > 0,
          roomBalance,
          isSettled: roomBalance <= 0.5,
        });
      });
    });

    return items;
  }, [stays]);

  // Filtered Directory Items based on Active Main Tab (In-House vs Outstanding Dues vs Settled Archive) + Search + Sub-filters
  const filteredDirectoryItems = useMemo(() => {
    return directoryItems.filter((item) => {
      // 1. Main Tab Filter
      if (activeMainTab === "IN_HOUSE" && item.status !== "IN_HOUSE") {
        return false;
      }
      if (activeMainTab === "OUTSTANDING_DUES") {
        const isCheckedOut = item.status === "CHECKED_OUT" || item.status === "COMPLETED";
        const hasDue = item.roomBalance > 0.5;
        if (!isCheckedOut || !hasDue) return false;
      }
      if (activeMainTab === "SETTLED_ARCHIVE") {
        const isCheckedOut = item.status === "CHECKED_OUT" || item.status === "COMPLETED";
        const isOutstanding = item.roomBalance > 0.5;
        if (!isCheckedOut || isOutstanding) return false;
      }

      // 2. Sub-status Filter within tab
      if (activeMainTab === "IN_HOUSE") {
        if (stayStatusFilter === "WITH_BALANCE" && item.roomBalance <= 0.5) return false;
        if (stayStatusFilter === "SETTLED" && item.roomBalance > 0.5) return false;
      } else if (activeMainTab === "OUTSTANDING_DUES") {
        if (stayStatusFilter === "WITH_BALANCE" && !item.companyName) return false; // Corporate Debtors
        if (stayStatusFilter === "SETTLED" && item.companyName) return false; // Individual Guests
      } else {
        if (stayStatusFilter === "WITH_BALANCE" && !item.companyName) return false; // Corporate Accounts
      }

      // 3. Search Filter across room #, guest name, phone, company, and invoice #
      if (staySearchQuery.trim()) {
        const q = staySearchQuery.toLowerCase();
        const roomMatch = item.roomNumber.toLowerCase().includes(q);
        const guestMatch = item.guestName.toLowerCase().includes(q);
        const phoneMatch = item.phone?.toLowerCase().includes(q);
        const companyMatch = item.companyName?.toLowerCase().includes(q);
        const invoiceMatch = item.stay?.folio?.windows?.[0]?.invoices?.some((inv: any) =>
          inv.invoiceNo?.toLowerCase().includes(q)
        );
        return roomMatch || guestMatch || phoneMatch || companyMatch || Boolean(invoiceMatch);
      }

      return true;
    });
  }, [directoryItems, activeMainTab, stayStatusFilter, staySearchQuery]);

  // Counts for Top Tab Badges
  const inHouseCount = useMemo(() => directoryItems.filter((d) => d.status === "IN_HOUSE").length, [directoryItems]);
  const outstandingCount = useMemo(() => directoryItems.filter((d) => (d.status === "CHECKED_OUT" || d.status === "COMPLETED") && d.roomBalance > 0.5).length, [directoryItems]);
  const settledArchiveCount = useMemo(() => directoryItems.filter((d) => (d.status === "CHECKED_OUT" || d.status === "COMPLETED") && d.roomBalance <= 0.5).length, [directoryItems]);

  // Respond immediately when sidebar sub-tabs are clicked (/billing?tab=settled, /billing?tab=outstanding, or /billing?tab=in-house)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "outstanding" && activeMainTab !== "OUTSTANDING_DUES") {
      setActiveMainTab("OUTSTANDING_DUES");
      setStayStatusFilter("ALL");
      setStaySearchQuery("");
      const dueItems = directoryItems.filter((d) => (d.status === "CHECKED_OUT" || d.status === "COMPLETED") && d.roomBalance > 0.5);
      if (dueItems.length > 0) {
        setSelectedStayId(dueItems[0].stayId);
        setSelectedRoomNumber(dueItems[0].roomNumber);
      }
    } else if (tabParam === "settled" && activeMainTab !== "SETTLED_ARCHIVE") {
      setActiveMainTab("SETTLED_ARCHIVE");
      setStayStatusFilter("ALL");
      setStaySearchQuery("");
      const settledItems = directoryItems.filter((d) => (d.status === "CHECKED_OUT" || d.status === "COMPLETED") && d.roomBalance <= 0.5);
      if (settledItems.length > 0) {
        setSelectedStayId(settledItems[0].stayId);
        setSelectedRoomNumber(settledItems[0].roomNumber);
      }
    } else if ((tabParam === "in-house" || !tabParam) && activeMainTab !== "IN_HOUSE" && !searchParams.get("stayId")) {
      setActiveMainTab("IN_HOUSE");
      setStayStatusFilter("ALL");
      setStaySearchQuery("");
      const inHouseItems = directoryItems.filter((d) => d.status === "IN_HOUSE");
      if (inHouseItems.length > 0) {
        setSelectedStayId(inHouseItems[0].stayId);
        setSelectedRoomNumber(inHouseItems[0].roomNumber);
      }
    }
  }, [searchParams, directoryItems]);

  // Synchronize URL parameters (stayId & room) from Front Desk PMS or external links
  useEffect(() => {
    if (stays.length === 0) return;
    const urlStayId = searchParams.get("stayId");
    const urlRoom = searchParams.get("room") || searchParams.get("roomNumber");
    if (!urlStayId && !urlRoom) return;

    const matchedStay = stays.find((s) => {
      if (urlStayId && s.id === urlStayId) return true;
      if (urlRoom && s.roomAssignments?.some((ra: any) => ra.room?.number === urlRoom)) return true;
      return false;
    });

    if (matchedStay) {
      setSelectedStayId(matchedStay.id);
      const activeAssign =
        matchedStay.roomAssignments?.find(
          (ra: any) => !ra.endsAt && (urlRoom ? ra.room?.number === urlRoom : true)
        ) || matchedStay.roomAssignments?.[0];
      const rNum = activeAssign?.room?.number || urlRoom || "";
      setSelectedRoomNumber(rNum);

      // Auto-switch main tab according to stay status
      if (matchedStay.status === "IN_HOUSE") {
        if (activeMainTab !== "IN_HOUSE") setActiveMainTab("IN_HOUSE");
      } else if (matchedStay.status === "CHECKED_OUT" || matchedStay.status === "COMPLETED") {
        const rawEntries = (matchedStay.folio?.windows?.flatMap((w: any) => w.entries || w.lineItems || []) || []).filter(
          (e: any) => e.chargeCode !== "ROOM_TRANSFER_CREDIT"
        );
        const totCharges = rawEntries
          .filter((e: any) => e.type === "DEBIT" || !e.type)
          .reduce((s: number, e: any) => s + (e.totalAmount || 0), 0);
        const totCredits = rawEntries
          .filter((e: any) => e.type === "CREDIT")
          .reduce((s: number, e: any) => s + (e.totalAmount || 0), 0);
        const bal = totCharges - totCredits;
        if (bal > 0.5) {
          if (activeMainTab !== "OUTSTANDING_DUES") setActiveMainTab("OUTSTANDING_DUES");
        } else {
          if (activeMainTab !== "SETTLED_ARCHIVE") setActiveMainTab("SETTLED_ARCHIVE");
        }
      }

      setStaySearchQuery("");
      setStayStatusFilter("ALL");

      if (matchedStay.folio?.id) {
        loadFolio(matchedStay.folio.id);
      }
    }
  }, [searchParams, stays]);

  const handleSwitchMainTab = (tab: "IN_HOUSE" | "OUTSTANDING_DUES" | "SETTLED_ARCHIVE") => {
    setActiveMainTab(tab);
    setStayStatusFilter("ALL");
    setStaySearchQuery("");

    // Keep URL parameter synchronized for sidebar & browser history
    const targetTab = tab === "OUTSTANDING_DUES" ? "outstanding" : tab === "SETTLED_ARCHIVE" ? "settled" : "in-house";
    router.replace(`/billing?tab=${targetTab}`, { scroll: false });

    // Auto-select first item in the selected tab
    const targetItems = directoryItems.filter((d) => {
      if (tab === "IN_HOUSE") return d.status === "IN_HOUSE";
      if (tab === "OUTSTANDING_DUES") return (d.status === "CHECKED_OUT" || d.status === "COMPLETED") && d.roomBalance > 0.5;
      return (d.status === "CHECKED_OUT" || d.status === "COMPLETED") && d.roomBalance <= 0.5;
    });
    if (targetItems.length > 0) {
      setSelectedStayId(targetItems[0].stayId);
      setSelectedRoomNumber(targetItems[0].roomNumber);
    } else {
      setSelectedStayId("");
      setSelectedRoomNumber("");
    }
  };

  const activeStay = stays.find((s) => s.id === selectedStayId);
  const activeDirectoryItem = directoryItems.find(
    (d) => d.stayId === selectedStayId && (selectedRoomNumber ? d.roomNumber === selectedRoomNumber : true)
  ) || directoryItems.find((d) => d.stayId === selectedStayId);

  const activeRoomNumber = activeDirectoryItem?.roomNumber || activeStay?.roomAssignments?.[0]?.room?.number || "Unassigned";
  const allGroupRooms = activeDirectoryItem?.allRoomNumbers || [activeRoomNumber];
  const isMultiRoomGroup = allGroupRooms.length > 1;

  // Group Advance Pool Metrics (For Multi-Room Groups)
  const groupAdvanceMetrics = useMemo(() => {
    if (!isMultiRoomGroup) {
      return { totalReceived: 0, consumed: 0, available: 0, unallocatedPayments: [] as any[] };
    }

    // Collect all related stays belonging to this specific group and guest
    const relatedStays = stays.filter((s) => {
      if (s.id === activeStay?.id) return true;
      // Stays MUST belong to the same primary guest profile to prevent leaking other guests' advance funds
      if (s.primaryGuestId !== activeStay?.primaryGuestId) return false;
      // Shared reservation linkage or shared group room numbers
      if (activeStay?.reservationId && s.reservationId === activeStay?.reservationId) return true;
      const sRooms = s.roomAssignments?.map((ra: any) => ra.room?.number).filter(Boolean) || [];
      return sRooms.some((r: string) => allGroupRooms.includes(r));
    });

    const paymentsList = Array.from(
      new Map(
        relatedStays
          .flatMap((s) => s.folio?.payments || [])
          .concat(folioData?.payments || [])
          .map((p: any) => [p.id, p])
      ).values()
    );

    const entriesList = Array.from(
      new Map(
        relatedStays
          .flatMap((s) => s.folio?.windows?.flatMap((w: any) => w.entries || w.lineItems || []) || [])
          .concat(folioData?.windows?.flatMap((w: any) => w.entries || w.lineItems || []) || [])
          .map((e: any) => [e.id, e])
      ).values()
    );

    // Advance/Deposit payments not tied to a single specific room (i.e. group advance pool)
    const unallocated = paymentsList.filter((p: any) => {
      if (p.status !== "SUCCEEDED") return false;
      // Exclude internal allocation accounting vouchers
      if (p.method === "ADVANCE_ALLOCATION") return false;
      // Exclude individual room checkout settlement receipts
      if (p.reference?.includes("Settlement for Room")) return false;

      const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${p.notes || ""}`;
      const isGroupPool = text.includes("isGroupAdvancePool") || text.includes("GROUP_ADVANCE_POOL");
      const isSpecific = allGroupRooms.some((r) => new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${r}\\b`, "i").test(text));
      return isGroupPool || !isSpecific;
    });
    const totalReceived = unallocated.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Consumed advance:
    // Any GROUP_ADVANCE_CONSUMPTION charge entries or ADVANCE_ALLOCATION payments
    const consumed = entriesList
      .filter((e: any) => e.chargeCode === "GROUP_ADVANCE_CONSUMPTION")
      .reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);

    const available = Math.max(0, Math.round((totalReceived - consumed) * 100) / 100);

    return {
      totalReceived,
      consumed,
      available,
      unallocatedPayments: unallocated,
    };
  }, [isMultiRoomGroup, folioData, allGroupRooms, stays, activeStay]);

  // Room Card Checkbox toggle (operates per distinct room item key)
  const toggleRoomSelection = (key: string) => {
    setSelectedRoomKeys((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  };

  const selectedGroupStayIds = useMemo(() => {
    const selectedItems = directoryItems.filter((d) => selectedRoomKeys.includes(d.key));
    return Array.from(new Set(selectedItems.map((d) => d.stayId)));
  }, [directoryItems, selectedRoomKeys]);

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
        isEarlyBird: false,
        checkoutDeadlineText: "Standard Billing",
        waivedNextNight: false,
      };
    }
    const arr = activeStay.arrivalAt ? new Date(activeStay.arrivalAt) : new Date();
    const exp = activeStay.expectedDepartureAt ? new Date(activeStay.expectedDepartureAt) : new Date();
    
    const diffTime = Math.abs(exp.getTime() - arr.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    let rate = 3200;
    let isComp = false;
    let isRateInclusive = true;

    const assignment = activeStay.roomAssignments?.find((a: any) => a.room?.number === activeRoomNumber) || activeStay.roomAssignments?.[0];
    const predecessors = getPredecessorRoomNumbers(activeStay.roomAssignments || [], activeRoomNumber);
    if (assignment?.rateHandling === "COMPLIMENTARY" || assignment?.moveReason === "AGREED_RATE:0" || assignment?.moveReason?.includes("AGREED_RATE:0")) {
      rate = 0;
      isComp = true;
    } else if (assignment?.moveReason?.includes("AGREED_RATE:")) {
      const match = assignment.moveReason.match(/AGREED_RATE:(\d+)(?::([A-Z]+))?/);
      if (match) {
        rate = Number(match[1]) || 3200;
        if (match[2] === "EXC") isRateInclusive = false;
      }
    } else if (folioData?.windows?.[0]) {
      const items = folioData.windows[0].entries || folioData.windows[0].lineItems || [];
      const roomCharge = items.find((i: any) => i.chargeCode?.includes("ROOM_TARIFF") && (
        i.description?.includes(activeRoomNumber) ||
        predecessors.some((pred: string) => i.description?.includes(pred)) ||
        true
      ));
      if (roomCharge && roomCharge.unitAmount !== undefined) {
        rate = roomCharge.unitAmount;
        if (rate === 0) isComp = true;
        if (roomCharge.taxableAmount && roomCharge.totalAmount && Math.abs(roomCharge.taxableAmount - roomCharge.unitAmount) < 0.01 && roomCharge.totalAmount > roomCharge.taxableAmount) {
          isRateInclusive = false;
        }
      }
    }

    // Real-time Early Bird & 24-hr cycle metrics
    const now = new Date();
    const elapsedMs = Math.max(0, now.getTime() - arr.getTime());
    const elapsedHours = (elapsedMs / (1000 * 60 * 60)).toFixed(1);
    const completedCycles = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
    const remainingMinutes = Math.round(((elapsedMs / (1000 * 60 * 60)) % 24) * 60);

    const billableCalc = calculate24HrBillableDays(
      arr,
      now,
      assignment?.rateHandling?.startsWith("24_HOURS") ? "24_HOURS" : "FIXED_TIME",
      gracePeriodMinutes
    );

    const items = folioData?.windows?.[0]?.entries || folioData?.windows?.[0]?.lineItems || [];
    const allRoomEntries = items.filter((i: any) => i.chargeCode?.includes("ROOM_TARIFF") && i.status === "POSTED" && i.sourceType !== "MANUAL_CHARGE");
    const chargedRoomEntries = allRoomEntries.filter((i: any) => {
      if (groupBillingMode === "YES" || !isMultiRoomGroup) return true;
      if (allRoomEntries.length <= 1) return true;
      const desc = i.description || "";
      return desc.includes(activeRoomNumber) || predecessors.some((pred: string) => desc.includes(pred));
    });
    const chargedNights = chargedRoomEntries.length > 0
      ? chargedRoomEntries.reduce((sum: number, i: any) => sum + (i.qty || 1), 0)
      : billableCalc.billableDays;

    const unWaivedCalc = calculate24HrBillableDays(
      arr,
      now,
      assignment?.rateHandling?.startsWith("24_HOURS") ? "24_HOURS" : "FIXED_TIME",
      0
    );
    const unWaivedNights = Math.max(unWaivedCalc.billableDays, chargedRoomEntries.length || 1);

    const dynamicDep = calculateDynamicDepartureDate({
      arrivalAt: arr,
      expectedDepartureAt: activeStay.expectedDepartureAt || exp,
      checkoutType: assignment?.rateHandling?.startsWith("24_HOURS") ? "24_HOURS" : "FIXED_TIME",
      gracePeriodMinutes,
      now,
    });

    return {
      nights: chargedNights,
      unWaivedNights,
      canWaiveNextNight: unWaivedNights > 1,
      scheduledNights: diffDays,
      roomRatePerNight: rate,
      isRateInclusive,
      isMultiNight: chargedNights > 1,
      isComplimentary: isComp,
      elapsedHours,
      completedCycles,
      remainingMinutes,
      isWithinGrace: billableCalc.gracePeriodApplied,
      isEarlyBird: billableCalc.isEarlyBird,
      checkoutDeadlineText: billableCalc.checkoutDeadlineText,
      waivedNextNight: gracePeriodMinutes >= 1440 && unWaivedNights > 1,
      effectiveDepartureAt: dynamicDep.effectiveDepartureAt,
      isExtendedDeparture: dynamicDep.isExtended || Boolean(activeStay.isExtendedDeparture),
      extensionNights: dynamicDep.extensionNights || activeStay.extensionNights || 0,
      originalExpectedDepartureAt: dynamicDep.originalDepartureAt || activeStay.originalExpectedDepartureAt,
    };
  }, [activeStay, activeRoomNumber, folioData, gracePeriodMinutes, groupBillingMode]);

  // Aggregate raw ledger line items from Prisma folio windows (entries)
  const rawEntries = useMemo(() => {
    if (!folioData?.windows) return [];
    const allItems = folioData.windows.flatMap((w: any) => w.entries || w.lineItems || []);
    return allItems
      .filter((e: any) => e.chargeCode !== "ROOM_TRANSFER_CREDIT")
      .sort((a: any, b: any) => new Date(a.createdAt || a.postedAt).getTime() - new Date(b.createdAt || b.postedAt).getTime());
  }, [folioData]);

  // Entries filtered by Group Billing Mode (Separate vs Combined Group)
  const modeFilteredEntries = useMemo(() => {
    if (groupBillingMode === "YES" || !isMultiRoomGroup) {
      return rawEntries;
    }
    // "NO" mode: Separate billing for activeRoomNumber only
    const otherRooms = allGroupRooms.filter((r) => r !== activeRoomNumber);
    const predecessors = getPredecessorRoomNumbers(activeStay?.roomAssignments || [], activeRoomNumber);
    const filtered = rawEntries.filter((e: any) =>
      isEntryForRoom(e, activeRoomNumber, otherRooms, predecessors, allGroupRooms[0])
    );
    return filtered;
  }, [rawEntries, groupBillingMode, isMultiRoomGroup, activeRoomNumber, allGroupRooms, activeStay]);

  // Filtered charges ledger items (search and category)
  const entries = useMemo(() => {
    return modeFilteredEntries.filter((e: any) => {
      // Type Filter
      if (ledgerTypeFilter === "ROOM_TARIFF" && !e.chargeCode?.includes("ROOM_TARIFF") && e.chargeCode !== "STAY_EXTENSION") return false;
      if (ledgerTypeFilter === "RESTAURANT_FOOD" && !e.chargeCode?.includes("FOOD") && !e.chargeCode?.includes("RESTAURANT") && !e.chargeCode?.includes("FB")) return false;
      if (ledgerTypeFilter === "MANUAL" && (e.chargeCode?.includes("ROOM_TARIFF") || e.chargeCode === "STAY_EXTENSION" || e.chargeCode?.includes("FOOD") || e.chargeCode?.includes("RESTAURANT"))) return false;

      // Search Query
      if (!ledgerSearchQuery.trim()) return true;
      const q = ledgerSearchQuery.toLowerCase();
      const desc = e.description?.toLowerCase() || "";
      const code = e.chargeCode?.toLowerCase() || "";
      return desc.includes(q) || code.includes(q);
    });
  }, [modeFilteredEntries, ledgerTypeFilter, ledgerSearchQuery]);

  const payments = folioData?.payments || [];
  const invoices = useMemo(() => {
    if (!folioData) return [];
    if (Array.isArray(folioData.invoices) && folioData.invoices.length > 0) return folioData.invoices;
    return folioData.windows?.flatMap((w: any) => w.invoices || []) || [];
  }, [folioData]);

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

  const netDifference = useMemo(() => {
    return Math.round((totalCharges - totalPayments) * 100) / 100;
  }, [totalCharges, totalPayments]);

  const currentBalance = useMemo(() => {
    return Math.max(0, netDifference);
  }, [netDifference]);

  const surplusCredit = useMemo(() => {
    if (totalPayments <= 0 || totalPayments <= totalCharges) return 0;
    return Math.round((totalPayments - totalCharges) * 100) / 100;
  }, [totalCharges, totalPayments]);

  // Post Manual / Restaurant Charge (5% GST Inclusive)
  const handlePostCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioData) return;
    setActionLoading(true);
    try {
      const numAmt = Number(chargeForm.amount);
      if (!chargeForm.amount || isNaN(numAmt) || numAmt <= 0) {
        alert("Please enter a valid charge amount greater than ₹0 before posting.");
        setActionLoading(false);
        return;
      }

      let finalDesc = chargeForm.description.trim() || "Kitchen Order (KOT)";
      if (chargeForm.kotNumber?.trim()) {
        const kotTag = `KOT #${chargeForm.kotNumber.trim().toUpperCase()}`;
        if (!finalDesc.includes(kotTag)) {
          finalDesc = `${kotTag} — ${finalDesc}`;
        }
      }
      // Tag active room in description if not already present, ensuring attribution in separate billing mode
      if (isMultiRoomGroup && activeRoomNumber && activeRoomNumber !== "Unassigned" && !new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${activeRoomNumber}\\b`, "i").test(finalDesc)) {
        finalDesc = `${finalDesc} (Room ${activeRoomNumber})`;
      }

      const res = await fetch(`/api/v1/folios/${folioData.id}/charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folioWindowId: folioData.windows[0].id,
          chargeCode: chargeForm.chargeCode || "RESTAURANT_FOOD",
          description: finalDesc,
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
      await loadStays(true);
      setShowManualChargeModal(false);
      setChargeForm({
        chargeCode: "RESTAURANT_FOOD",
        description: "Kitchen Order (KOT)",
        amount: "0",
        sacHsn: "996331",
        isInclusive: true,
        kotNumber: "",
      });
    } catch (err: any) {
      alert(`Error posting charge: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioData?.id) return;
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
      await loadStays(true);
      setShowDiscountModal(false);
    } catch (err: any) {
      alert(err.message || err);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete / Void Mistaken Folio Charge
  const handleDeleteCharge = async (entryId: string, description: string, amount: number) => {
    if (!folioData?.id) return;
    const isConfirmed = window.confirm(
      `Are you sure you want to delete "${description}" (${formatINR(amount)}) from this folio?\n\nThis will remove the charge and automatically recalculate the live folio balance.`
    );
    if (!isConfirmed) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/folios/${folioData.id}/charges/${entryId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Mistaken charge deleted from billing folio" }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete charge");
      }

      await loadFolio(folioData.id);
      await loadStays(true);
      await refreshData();
    } catch (err: any) {
      alert(`Error deleting charge: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Allocate advance from Group Advance Pool to a specific room
  const handleApplyGroupAdvance = async (stayId: string, roomNumber: string, amount: number) => {
    if (!stayId || amount <= 0) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/billing/group-advance/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stayId,
          roomNumber,
          amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to allocate group advance");
      }
      alert(`Successfully deducted ${formatINR(amount)} from Group Advance Pool and applied to Room ${roomNumber}.`);
      if (folioData?.id) await loadFolio(folioData.id);
      await loadStays(true);
      await refreshData();
    } catch (err: any) {
      alert(`Error applying group advance: ${err.message}`);
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

      if (paymentForm.method === "ADVANCE_ALLOCATION") {
        await handleApplyGroupAdvance(activeStay?.id, activeRoomNumber, numAmt);
        setShowPaymentModal(false);
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

  // Update Collected Payment
  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !folioData?.id) return;
    setEditPaymentLoading(true);

    try {
      const res = await fetch(`/api/v1/folios/${folioData.id}/payments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: editingPayment.id,
          amount: Number(editingPayment.amount),
          method: editingPayment.method,
          reference: editingPayment.reference,
          payerName: editingPayment.payerName,
          companyName: editingPayment.companyName,
          gstin: editingPayment.gstin,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update payment");

      await loadFolio(folioData.id);
      await loadStays(true);
      setShowEditPaymentModal(false);
      setEditingPayment(null);
    } catch (err: any) {
      alert(`Payment Update Error: ${err.message}`);
    } finally {
      setEditPaymentLoading(false);
    }
  };

  // Delete / Void Payment
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment record? The folio balance will be recalculated.")) return;
    if (!folioData?.id) return;
    setEditPaymentLoading(true);

    try {
      const res = await fetch(`/api/v1/folios/${folioData.id}/payments?paymentId=${paymentId}`, {
        method: "DELETE",
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete payment");

      await loadFolio(folioData.id);
      await loadStays(true);
      setShowEditPaymentModal(false);
      setEditingPayment(null);
    } catch (err: any) {
      alert(`Error deleting payment: ${err.message}`);
    } finally {
      setEditPaymentLoading(false);
    }
  };

  // Open Refund Payout Modal
  const handleOpenRefundModal = (customAmount?: number) => {
    const amt = customAmount !== undefined ? customAmount : surplusCredit;
    setRefundForm({
      amount: String(amt || 0),
      method: "UPI",
      reference: "",
      notes: "Advance surplus return / checkout settlement",
    });
    setShowRefundModal(true);
  };

  // Process Refund Payout
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioData) return;
    setActionLoading(true);
    try {
      const numAmt = Number(refundForm.amount);
      if (numAmt <= 0) {
        alert("Please enter a valid refund amount.");
        setActionLoading(false);
        return;
      }

      const res = await fetch(`/api/v1/folios/${folioData.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: -Math.abs(numAmt),
          method: refundForm.method,
          reference: refundForm.reference || undefined,
          payerName: folioData.stay?.primaryGuest?.name || "Guest",
          isRefund: true,
          billingRemarks: refundForm.notes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to process refund");
      }

      await loadFolio(folioData.id);
      await loadStays();
      setShowRefundModal(false);
      alert(`Refund payout of ${formatINR(numAmt)} recorded successfully!`);
    } catch (err: any) {
      alert(`Refund error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Live Tax Bill Print Modal (for In-House pre-checkout estimated bill)
  const handleOpenLiveTaxBill = () => {
    setSelectedInvoice(null);
    setIsLiveTaxBillView(true);
    setShowInvoiceModal(true);
  };

  // Open Official Tax Invoice Print Modal (for Checked-out / Outstanding / Settled folios)
  const handleOpenPrintInvoice = () => {
    if (invoices.length > 0) {
      setSelectedInvoice(invoices[0]);
      setIsLiveTaxBillView(false);
    } else {
      setSelectedInvoice(null);
      setIsLiveTaxBillView(true);
    }
    setShowInvoiceModal(true);
  };


  // Open Group Multi-Room Payment Modal
  const handleOpenGroupPaymentModal = () => {
    if (selectedRoomKeys.length === 0) return;
    const initialAlloc: Record<string, number> = {};
    const selectedItems = directoryItems.filter((d) => selectedRoomKeys.includes(d.key));
    selectedItems.forEach((d) => {
      initialAlloc[d.stayId] = (initialAlloc[d.stayId] || 0) + Math.max(0, d.roomBalance);
    });

    const firstStay = stays.find((s) => s.id === selectedItems[0]?.stayId);
    const firstGuest = firstStay?.primaryGuest;
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
      const selectedItems = directoryItems.filter((d) => selectedRoomKeys.includes(d.key));
      const uniqueStayIds = Array.from(new Set(selectedItems.map((d) => d.stayId)));
      const selectedStays = stays.filter((s) => uniqueStayIds.includes(s.id));
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
      setSelectedRoomKeys([]);
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
    const selectedItems = directoryItems.filter((d) => selectedRoomKeys.includes(d.key) && d.status === "IN_HOUSE");
    const unSettled = selectedItems.filter((d) => d.roomBalance > 0.5);

    if (unSettled.length > 0) {
      alert(
        `Cannot group checkout: Room(s) ${unSettled
          .map((d) => d.roomNumber)
          .join(", ")} still have unpaid balances. Please record group settlement first.`
      );
      return;
    }

    const uniqueStayIds = Array.from(new Set(selectedItems.map((d) => d.stayId)));
    if (!confirm(`Confirm checkout for ${selectedItems.length} selected room(s)?`)) return;

    setActionLoading(true);
    try {
      for (const stayId of uniqueStayIds) {
        await fetch(`/api/v1/stays/${stayId}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      }
      alert(`Group checkout complete for ${selectedItems.length} room(s)! Invoices generated.`);
      setSelectedRoomKeys([]);
      await loadStays();
      await refreshData();
    } catch (err: any) {
      alert(`Group checkout error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Core Checkout Performer (Supports direct payment, advance allocation, group transfer, or debtors)
  const handlePerformCheckout = async (options?: {
    allowOutstanding?: boolean;
    transferBalanceToGroup?: boolean;
    transferRemarks?: string;
    applyGroupAdvance?: boolean;
    groupAdvanceAmount?: number;
    paymentNow?: {
      amount: number;
      method: string;
      reference?: string;
    };
  }) => {
    if (!activeStay) return;
    setActionLoading(true);
    try {
      const isSingleRoomOfGroup = isMultiRoomGroup && groupBillingMode === "NO";
      const allowOutstanding = Boolean(options?.allowOutstanding);
      const transferBalanceToGroup = Boolean(options?.transferBalanceToGroup);
      const applyGroupAdvance = Boolean(options?.applyGroupAdvance);

      const payload: any = {
        allowOutstanding,
        outstandingReason: allowOutstanding ? outstandingForm.reason : undefined,
        outstandingRemarks: allowOutstanding ? outstandingForm.remarks : undefined,
        settlementDueDate: allowOutstanding ? outstandingForm.dueDate : undefined,
        transferBalanceToGroup,
        transferRemarks: options?.transferRemarks || undefined,
        applyGroupAdvance,
        groupAdvanceAmount: options?.groupAdvanceAmount,
        paymentNow: options?.paymentNow,
      };

      if (isSingleRoomOfGroup && activeDirectoryItem?.roomId) {
        payload.roomId = activeDirectoryItem.roomId;
        payload.roomNumber = activeRoomNumber;
      }

      const res = await fetch(`/api/v1/stays/${activeStay.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Checkout failed");
      }

      const invoiceData = await res.json();
      const invoiceNo = invoiceData.invoice?.invoiceNo || invoiceData.invoiceNo || "";

      if (options?.paymentNow) {
        alert(`Check-out successful for Room ${activeRoomNumber}!\nCollected ${formatINR(options.paymentNow.amount)} via ${options.paymentNow.method}. Tax Invoice #${invoiceNo} generated.`);
      } else if (applyGroupAdvance && invoiceData.appliedAdvance) {
        alert(`Check-out successful for Room ${activeRoomNumber}!\nApplied ${formatINR(invoiceData.appliedAdvance)} from Group Advance Pool. Tax Invoice #${invoiceNo} generated.`);
      } else if (transferBalanceToGroup && invoiceData.transferredAmount) {
        alert(`Check-out successful for Room ${activeRoomNumber}!\nTransferred balance of ${formatINR(invoiceData.transferredAmount)} to Group Master Folio. Tax Invoice #${invoiceNo} generated.`);
      } else if (allowOutstanding) {
        alert(`Room ${activeRoomNumber} checked out with an outstanding balance of ${formatINR(currentBalance)}.\nRecorded in Debtors Ledger. Tax Invoice #${invoiceNo} generated.`);
      } else {
        alert(`Check-out successful for Room ${activeRoomNumber}! Tax Invoice #${invoiceNo} generated.`);
      }

      setShowCheckoutModal(false);
      await loadStays(true);
      if (folioData?.id) await loadFolio(folioData.id);
      await refreshData();
    } catch (err: any) {
      alert(`Error checking out: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Unified Checkout & Settlement Modal
  const handleOpenCheckoutModal = () => {
    setCheckoutPaymentAmount(String(currentBalance));
    setCheckoutPaymentMethod(activeStay?.primaryGuest?.companyName ? "DIRECT_BILL" : "UPI");
    setCheckoutPaymentRef("");
    setCheckoutAdvanceAmount(String(Math.min(currentBalance, groupAdvanceMetrics.available)));
    setCheckoutTransferRemarks("");
    
    // Choose sensible default tab
    if (groupAdvanceMetrics.available >= currentBalance && groupAdvanceMetrics.available > 0) {
      setCheckoutTab("APPLY_ADVANCE");
    } else {
      setCheckoutTab("PAY_NOW");
    }
    setShowCheckoutModal(true);
  };

  // Execute Check-out and Issue Invoice
  const handleExecuteCheckout = async () => {
    if (!activeStay) return;
    const isSingleRoomOfGroup = isMultiRoomGroup && groupBillingMode === "NO";

    // If balance remains, prompt with unified checkout & settlement modal
    if (currentBalance > 0.5) {
      handleOpenCheckoutModal();
      return;
    }

    if (surplusCredit > 0.5) {
      const confirmRefund = window.confirm(
        `This folio has an Advance Surplus of ${formatINR(surplusCredit)}.\n\nClick OK to record a ${formatINR(surplusCredit)} refund payout now.\nClick Cancel to abort and cancel check out.`
      );
      if (confirmRefund) {
        handleOpenRefundModal(surplusCredit);
      }
      return; // Clicking Cancel cancels check out!
    }

    await handlePerformCheckout();
  };

  return (
    <>
      <div className="billing-dashboard-view no-print print:hidden max-w-[1700px] mx-auto w-full text-zinc-900 dark:text-zinc-100 space-y-6 transition-colors duration-150">
        
        {/* 1. MASTER TOP HEADER (SLEEK & INTEGRATED) */}
        <div className="pb-4 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
                Billing & Folio
              </h1>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 uppercase tracking-wide">
                GST Rule 46
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 flex-wrap">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {activeProperty?.displayName || "Hotel Folio & Billing"}
              </span>
              <span>•</span>
              <span className="font-mono">GSTIN: {activeProperty?.gstin || "N/A"}</span>
              <span>•</span>
              <span>Date: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{activeProperty?.businessDate || (typeof window !== "undefined" ? new Date().toLocaleDateString("en-CA") : "")}</strong></span>
            </div>
          </div>

          {/* Top Main Tab Navigation: In-House vs Outstanding Dues vs Settled Archive */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl text-xs sm:text-sm font-semibold self-start md:self-auto border border-zinc-200/60 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => handleSwitchMainTab("IN_HOUSE")}
              className={`flex items-center gap-2 h-9 px-3.5 rounded-lg transition cursor-pointer ${
                activeMainTab === "IN_HOUSE"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <BedDouble className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>In-House</span>
              <span className="font-mono text-xs opacity-80">({inHouseCount})</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMainTab("OUTSTANDING_DUES")}
              className={`flex items-center gap-2 h-9 px-3.5 rounded-lg transition cursor-pointer ${
                activeMainTab === "OUTSTANDING_DUES"
                  ? "bg-rose-600 text-white font-bold shadow-xs"
                  : "text-rose-700 dark:text-rose-400 hover:text-rose-900"
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              <span>Debtors</span>
              <span className="font-mono text-xs opacity-80">({outstandingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMainTab("SETTLED_ARCHIVE")}
              className={`flex items-center gap-2 h-9 px-3.5 rounded-lg transition cursor-pointer ${
                activeMainTab === "SETTLED_ARCHIVE"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Archive className="h-4 w-4 text-zinc-400" />
              <span>Settled</span>
              <span className="font-mono text-xs opacity-80">({settledArchiveCount})</span>
            </button>
          </div>
        </div>

      {/* 2. MAIN 2-COLUMN OPERATIONAL VIEW: Optimal proportions and fluid workspace */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        
        {/* LEFT COLUMN: ROOMS DIRECTORY */}
        <BillingSidebar
          activeMainTab={activeMainTab}
          directoryItems={directoryItems}
          filteredDirectoryItems={filteredDirectoryItems}
          selectedStayId={selectedStayId}
          selectedRoomNumber={selectedRoomNumber}
          staySearchQuery={staySearchQuery}
          setStaySearchQuery={setStaySearchQuery}
          stayStatusFilter={stayStatusFilter}
          setStayStatusFilter={setStayStatusFilter}
          onSelectRoom={(stayId, roomNumber) => {
            setSelectedStayId(stayId);
            setSelectedRoomNumber(roomNumber);
            setGroupBillingMode("NO");
          }}
          inHouseCount={inHouseCount}
          outstandingCount={outstandingCount}
          settledArchiveCount={settledArchiveCount}
          formatShortDate={formatShortDate}
        />

        {/* RIGHT COLUMN: FOLIO HERO, KPI CARDS & LEDGER */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {folioData && activeStay ? (
            <>
              <FolioHero
                activeStay={activeStay}
                activeRoomNumber={activeRoomNumber}
                activeDirectoryItem={activeDirectoryItem}
                groupBillingMode={groupBillingMode}
                setGroupBillingMode={setGroupBillingMode}
                isMultiRoomGroup={isMultiRoomGroup}
                allGroupRooms={allGroupRooms}
                currentBalance={currentBalance}
                surplusCredit={surplusCredit}
                totalCharges={totalCharges}
                totalTaxable={totalTaxable}
                totalTaxes={totalTaxes}
                totalPayments={totalPayments}
                paymentsCount={payments.length}
                stayCalculations={stayCalculations}
                gracePeriodMinutes={gracePeriodMinutes}
                onGracePeriodChange={handleGracePeriodChange}
                groupAdvanceMetrics={groupAdvanceMetrics}
                onManageAdvance={() => setShowAdvanceModal(true)}
                onApplyGroupAdvance={(amount) => handleApplyGroupAdvance(activeStay?.id, activeRoomNumber, amount)}
                onExecuteCheckout={handleExecuteCheckout}
                onOpenPaymentModal={() => {
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
                onOpenPrintInvoice={handleOpenPrintInvoice}
                onOpenLiveTaxBill={handleOpenLiveTaxBill}
                onOpenChargeModal={() => {
                  setChargeForm({
                    chargeCode: "MISC",
                    description: "Guest Service Charge",
                    amount: "",
                    sacHsn: "9999",
                    isInclusive: true,
                    kotNumber: "",
                  });
                  setShowManualChargeModal(true);
                }}
                onOpenKotModal={() => {
                  setChargeForm({
                    chargeCode: "RESTAURANT_FOOD",
                    description: "Kitchen Order (KOT)",
                    amount: "",
                    sacHsn: "996331",
                    isInclusive: true,
                    kotNumber: "",
                  });
                  setShowManualChargeModal(true);
                }}
                onOpenDiscountModal={() => {
                  setDiscountForm({
                    description: "Discount / Rebate",
                    amount: "500",
                    sacHsn: "996311",
                  });
                  setShowDiscountModal(true);
                }}
                onOpenRefundModal={(amt) => handleOpenRefundModal(amt)}
                onOpenTransferRoomModal={() => setShowTransferRoomModal(true)}
                actionLoading={actionLoading}
                folioStatus={folioData?.status}
                formatDateTimeShort={formatDateTimeShort}
                formatGuestDisplayName={formatGuestDisplayName}
              />

              <FolioChargesTable
                entries={entries}
                rawEntriesCount={rawEntries.length}
                searchQuery={ledgerSearchQuery}
                onSearchChange={setLedgerSearchQuery}
                typeFilter={ledgerTypeFilter}
                onTypeFilterChange={(val: any) => setLedgerTypeFilter(val)}
                activeStayStatus={activeStay?.status}
                folioStatus={folioData?.status}
                actionLoading={actionLoading}
                onDeleteCharge={(id, desc, amt) => handleDeleteCharge(id, desc, amt)}
                activeTaxRates={ACTIVE_TAX_RATES}
              />

              <FolioPaymentsTable
                payments={payments}
                totalPayments={totalPayments}
                onEditPayment={(p) => {
                  let parsedSnap: any = {};
                  try {
                    if (p.payerSnapshot) parsedSnap = typeof p.payerSnapshot === "string" ? JSON.parse(p.payerSnapshot) : p.payerSnapshot;
                  } catch {}
                  setEditingPayment({
                    id: p.id,
                    receiptNo: p.receiptNo || "Payment",
                    amount: String(Math.abs(p.amount || 0)),
                    method: p.method || "CASH",
                    reference: p.reference || "",
                    payerName: parsedSnap.name || p.payerName || "",
                    companyName: parsedSnap.companyName || "",
                    gstin: parsedSnap.gstin || "",
                  });
                  setShowEditPaymentModal(true);
                }}
              />


              {/* 5. GENERATED TAX INVOICES CARD */}
              {invoices.length > 0 && (
                <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-[#121215] p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Generated Tax Invoices
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {invoices.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-xs"
                      >
                        <div>
                          <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {inv.invoiceNo}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            FY: {inv.financialYear} • Issued: {inv.issuedAt?.slice(0, 10)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatINR(inv.totalAmount || 0)}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsLiveTaxBillView(false);
                              setShowInvoiceModal(true);
                            }}
                            className="h-7.5 px-3 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Printer className="h-3 w-3" />
                            <span>Print</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-[#121215] p-12 text-center text-zinc-500 space-y-2">
              <Receipt className="h-8 w-8 text-zinc-400 mx-auto" />
              <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                {stays.length === 0 ? "No active folios found for this property" : "Select a room from the directory to manage billing"}
              </p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {stays.length === 0 ? "Currently there are no in-house guests or pending folios for this property." : "Use the directory on the left or select multiple rooms for group payment settlements."}
              </p>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* ========================================================================= */}
      {/* 📦 MODULAR BILLING MODALS                                                */}
      {/* ========================================================================= */}
      <PostChargeModal
        isOpen={showManualChargeModal}
        onClose={() => setShowManualChargeModal(false)}
        activeStay={activeStay}
        chargeForm={chargeForm}
        setChargeForm={setChargeForm}
        onSubmit={handlePostCharge}
        loading={actionLoading}
      />

      <PostDiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        activeStay={activeStay}
        discountForm={discountForm}
        setDiscountForm={setDiscountForm}
        onSubmit={handlePostDiscount}
        loading={actionLoading}
      />

      <CollectPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        activeStay={activeStay}
        activeProperty={activeProperty}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        onSubmit={handleRecordPayment}
        loading={actionLoading}
        groupAdvanceMetrics={groupAdvanceMetrics}
        activeRoomNumber={activeRoomNumber}
      />

      <EditPaymentModal
        isOpen={showEditPaymentModal}
        onClose={() => {
          setShowEditPaymentModal(false);
          setEditingPayment(null);
        }}
        editingPayment={editingPayment}
        setEditingPayment={setEditingPayment}
        onSubmit={handleUpdatePayment}
        onDelete={handleDeletePayment}
        loading={editPaymentLoading}
      />

      <ProcessRefundModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        activeStay={activeStay}
        refundForm={refundForm}
        setRefundForm={setRefundForm}
        onSubmit={handleProcessRefund}
        surplusCredit={surplusCredit}
        totalPayments={totalPayments}
        totalCharges={totalCharges}
        loading={actionLoading}
      />

      <GroupPaymentModal
        isOpen={showGroupPaymentModal}
        onClose={() => setShowGroupPaymentModal(false)}
        selectedGroupStayIds={selectedGroupStayIds}
        stays={stays}
        activeProperty={activeProperty}
        groupPaymentForm={groupPaymentForm}
        setGroupPaymentForm={setGroupPaymentForm}
        onSubmit={handleSubmitGroupPayment}
        loading={actionLoading}
      />

      <CheckoutSettlementModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        activeStay={activeStay}
        activeRoomNumber={activeRoomNumber}
        allGroupRooms={allGroupRooms}
        isMultiRoomGroup={isMultiRoomGroup}
        groupBillingMode={groupBillingMode}
        totalCharges={totalCharges}
        totalPayments={totalPayments}
        currentBalance={currentBalance}
        groupAdvanceMetrics={groupAdvanceMetrics}
        checkoutTab={checkoutTab}
        setCheckoutTab={setCheckoutTab}
        checkoutPaymentMethod={checkoutPaymentMethod}
        setCheckoutPaymentMethod={setCheckoutPaymentMethod}
        checkoutPaymentAmount={checkoutPaymentAmount}
        setCheckoutPaymentAmount={setCheckoutPaymentAmount}
        checkoutPaymentRef={checkoutPaymentRef}
        setCheckoutPaymentRef={setCheckoutPaymentRef}
        checkoutAdvanceAmount={checkoutAdvanceAmount}
        setCheckoutAdvanceAmount={setCheckoutAdvanceAmount}
        checkoutTransferRemarks={checkoutTransferRemarks}
        setCheckoutTransferRemarks={setCheckoutTransferRemarks}
        outstandingForm={outstandingForm}
        setOutstandingForm={setOutstandingForm}
        onPerformCheckout={handlePerformCheckout}
        loading={actionLoading}
      />

      <GroupAdvanceModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        activeStay={activeStay}
        allGroupRooms={allGroupRooms}
        groupAdvanceMetrics={groupAdvanceMetrics}
        directoryItems={directoryItems}
        selectedStayId={selectedStayId}
        onAllocateAdvance={handleApplyGroupAdvance}
        onRefresh={async () => {
          if (folioData?.id) await loadFolio(folioData.id);
          await loadStays(true);
          await refreshData();
        }}
      />

      <TransferRoomModal
        isOpen={showTransferRoomModal}
        onClose={() => setShowTransferRoomModal(false)}
        stay={activeStay}
        currentRoom={
          activeDirectoryItem?.room ||
          activeStay?.roomAssignments?.find(
            (ra: any) => !ra.endsAt && (ra.room?.number === activeRoomNumber || ra.roomId === activeDirectoryItem?.roomId)
          )?.room ||
          activeStay?.roomAssignments?.find((ra: any) => !ra.endsAt)?.room ||
          activeStay?.roomAssignments?.[0]?.room
        }
        folioBalance={currentBalance}
        rooms={propertyRooms}
        onSuccess={async (targetRoomNumber?: string) => {
          apiCache.invalidate("/api/v1/stays");
          if (targetRoomNumber) {
            setSelectedRoomNumber(targetRoomNumber);
          }
          await loadStays(true);
          if (folioData?.id) {
            await loadFolio(folioData.id);
          }
          await loadPropertyRooms();
          refreshData();
        }}
      />

      {/* ========================================================================= */}
      {/* 📄 HIGH-FIDELITY PRINTABLE TAX INVOICE MODAL (1-PAGE A4 GUARANTEE)         */}
      {/* ========================================================================= */}
      {showInvoiceModal && (
        <PrintableTaxInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          isLiveTaxBillView={isLiveTaxBillView}
          property={{
            displayName: activeProperty?.displayName || activeProperty?.legalName || "HOTEL OS",
            legalName: activeProperty?.legalName || activeProperty?.displayName || "HOTEL OS",
            address: activeProperty?.address || "",
            phone: activeProperty?.phone || "",
            email: activeProperty?.email || "",
            website: activeProperty?.website || "",
            gstin: activeProperty?.gstin || "",
            stateCode: activeProperty?.stateCode || "",
            logoUrl: activeProperty?.logoUrl || undefined,
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
