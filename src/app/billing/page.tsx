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
import { BillingSidebar } from "@/components/billing/billing-sidebar";
import { apiCache } from "@/lib/cache/api-cache";
import { calculate24HrBillableDays, calculateDynamicDepartureDate } from "@/lib/domain/pms-service";

export type { DirectoryRoomItem, MainFolioTab };

// Helper to match charges with specific rooms in separate billing mode
function isEntryForRoom(entry: any, roomNumber: string, allOtherRoomNumbers: string[]): boolean {
  if (!roomNumber || roomNumber === "Unassigned") return true;
  const desc = entry.description || "";

  // Check if description explicitly mentions another room in the group
  const otherRooms = allOtherRoomNumbers.filter((r) => r !== roomNumber);
  for (const other of otherRooms) {
    const regex = new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${other}\\b`, "i");
    if (regex.test(desc)) {
      return false; // Belongs to the other room
    }
  }

  // If description mentions this room, it definitely belongs here
  const thisRoomRegex = new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${roomNumber}\\b`, "i");
  if (thisRoomRegex.test(desc)) {
    return true;
  }

  return false;
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return dateStr.slice(0, 10);
  }
}

function formatDateTimeShort(dateStr?: string | Date | null): string {
  if (!dateStr) return "—";
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return typeof dateStr === "string" ? dateStr : "—";
    const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${datePart}, ${timePart}`;
  } catch {
    return typeof dateStr === "string" ? dateStr : "—";
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

  useEffect(() => {
    // When active property changes, immediately reset stay/folio state to prevent cross-hotel leakage
    setStays([]);
    setSelectedStayId("");
    setSelectedRoomNumber("");
    setFolioData(null);
    setSelectedInvoice(null);
    setSelectedRoomKeys([]);
    loadStays();
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
        const rawEntriesList = s.folio?.windows?.flatMap((w: any) => w.entries || w.lineItems || []) || [];
        const paymentsList = s.folio?.payments || [];

        // Determine charges for this room
        const roomEntries = isMultiRoom
          ? rawEntriesList.filter((e: any) => isEntryForRoom(e, roomNo, otherRooms))
          : rawEntriesList;
        const roomCharges = roomEntries.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
        const totalGroupCharges = rawEntriesList.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);
        const totalGroupPayments = paymentsList.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        // Determine payments for this room (direct payments and explicit allocations only)
        let allocatedPayment = 0;
        paymentsList.forEach((p: any) => {
          const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${p.notes || ""}`;
          const isThis = new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${roomNo}\\b`, "i").test(text);
          const isOther = otherRooms.some((o) => new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${o}\\b`, "i").test(text));

          if (isThis && !isOther) {
            allocatedPayment += p.amount || 0;
          }
        });

        // Group advance calculation under Master-Sub Folio Industry Standard:
        let groupAdvanceCovered = 0;
        if (isMultiRoom && roomCharges > allocatedPayment) {
          const roomDueBeforeAdvance = roomCharges - allocatedPayment;

          // Unallocated payments made at the master level (not assigned to a specific room)
          const unallocatedPayments = paymentsList.filter((p: any) => {
            if (p.status !== "SUCCEEDED") return false;
            const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${p.notes || ""}`;
            const isSpecific = allRoomNumbers.some((r) => new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${r}\\b`, "i").test(text));
            return !isSpecific;
          });
          const totalUnallocated = unallocatedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

          // If the group master payments cover all group charges (fully prepaid reservation)
          if (totalGroupPayments >= totalGroupCharges - 0.5) {
            groupAdvanceCovered = roomDueBeforeAdvance;
          } else if (totalUnallocated > 0) {
            // Group advance covers up to remaining group advance pool
            groupAdvanceCovered = Math.min(roomDueBeforeAdvance, totalUnallocated);
          }
        }

        const effectiveRoomPaid = isMultiRoom ? (allocatedPayment + groupAdvanceCovered) : totalGroupPayments;
        const roomBalance = Math.max(0, Math.round((roomCharges - effectiveRoomPaid) * 100) / 100);

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
    if (!isMultiRoomGroup || !folioData) {
      return { totalReceived: 0, consumed: 0, available: 0, unallocatedPayments: [] as any[] };
    }
    const paymentsList = folioData.payments || [];
    const entriesList = folioData.windows?.flatMap((w: any) => w.entries || w.lineItems || []) || [];

    // Advance/Deposit payments not tied to a single specific room
    const unallocated = paymentsList.filter((p: any) => {
      if (p.status !== "SUCCEEDED") return false;
      const text = `${p.reference || ""} ${p.payerSnapshot || ""} ${p.notes || ""}`;
      const isSpecific = allGroupRooms.some((r) => new RegExp(`\\b(?:Room|Rm)\\s*#?\\s*${r}\\b`, "i").test(text));
      return !isSpecific;
    });
    const totalReceived = unallocated.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Consumed advance:
    // Any GROUP_ADVANCE_CONSUMPTION charge entries posted on the master folio
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
  }, [isMultiRoomGroup, folioData, allGroupRooms]);

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
    if (assignment?.rateHandling === "COMPLIMENTARY" || assignment?.moveReason === "AGREED_RATE:0") {
      rate = 0;
      isComp = true;
    } else if (assignment?.moveReason?.startsWith("AGREED_RATE:")) {
      const parts = assignment.moveReason.replace("AGREED_RATE:", "").split(":");
      rate = Number(parts[0]) || 3200;
      if (parts[1] === "EXC") isRateInclusive = false;
    } else if (folioData?.windows?.[0]) {
      const items = folioData.windows[0].entries || folioData.windows[0].lineItems || [];
      const roomCharge = items.find((i: any) => i.chargeCode?.includes("ROOM_TARIFF") && (i.description?.includes(activeRoomNumber) || true));
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
      return i.description?.includes(activeRoomNumber);
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

  const netDifference = useMemo(() => {
    return Math.round((totalCharges - totalPayments) * 100) / 100;
  }, [totalCharges, totalPayments]);

  const currentBalance = useMemo(() => {
    return Math.max(0, netDifference);
  }, [netDifference]);

  const surplusCredit = useMemo(() => {
    return netDifference < 0 ? Math.abs(netDifference) : 0;
  }, [netDifference]);

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

  // Open Live Tax Bill Print Modal
  const handleOpenLiveTaxBill = () => {
    setSelectedInvoice(null);
    setIsLiveTaxBillView(true);
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
        `This folio has an Advance Surplus of ${formatINR(surplusCredit)}.\n\nClick OK to record a ${formatINR(surplusCredit)} refund payout now.\nClick CANCEL to proceed with checkout retaining surplus as advance.`
      );
      if (confirmRefund) {
        handleOpenRefundModal(surplusCredit);
        return;
      }
    }

    await handlePerformCheckout();
  };

  return (
    <>
      <div className="billing-dashboard-view no-print print:hidden max-w-[1600px] mx-auto w-full text-zinc-900 dark:text-zinc-100 space-y-4 transition-colors duration-150">
        
        {/* 1. MASTER TOP HEADER & ACTIONS (CLEAN 1440x900 BAR) */}
      <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 sm:p-4 shadow-xs space-y-3">
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
                  {activeProperty?.displayName || "Hotel Folio & Billing"}
                </span>
                <span>•</span>
                <span className="font-mono">GSTIN: {activeProperty?.gstin || "—"}</span>
                <span>•</span>
                <span>Date: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{activeProperty?.businessDate || (typeof window !== "undefined" ? new Date().toLocaleDateString("en-CA") : "")}</strong></span>
              </div>
            </div>
          </div>

          {/* Top Main Tab Navigation: In-House vs Outstanding Dues vs Settled Archive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-1 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => handleSwitchMainTab("IN_HOUSE")}
              className={`flex items-center justify-between sm:justify-start gap-2 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === "IN_HOUSE"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs border border-zinc-200/60 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <BedDouble className="h-3.5 w-3.5" />
                <span>🏨 In-House Active Folios</span>
              </div>
              <span className={`px-2 py-0.2 rounded-md text-[10.5px] font-mono font-bold ${
                activeMainTab === "IN_HOUSE"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}>
                {inHouseCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMainTab("OUTSTANDING_DUES")}
              className={`flex items-center justify-between sm:justify-start gap-2 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === "OUTSTANDING_DUES"
                  ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs border border-zinc-200/60 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>⚠️ Outstanding Dues</span>
              </div>
              <span className={`px-2 py-0.2 rounded-md text-[10.5px] font-mono font-bold ${
                activeMainTab === "OUTSTANDING_DUES"
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}>
                {outstandingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMainTab("SETTLED_ARCHIVE")}
              className={`flex items-center justify-between sm:justify-start gap-2 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === "SETTLED_ARCHIVE"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs border border-zinc-200/60 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" />
                <span>📁 Settled Archive</span>
              </div>
              <span className={`px-2 py-0.2 rounded-md text-[10.5px] font-mono font-bold ${
                activeMainTab === "SETTLED_ARCHIVE"
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}>
                {settledArchiveCount}
              </span>
            </button>
          </div>
        </div>

        {/* Action Toolbar for In-House Stays */}
        {activeMainTab === "IN_HOUSE" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Showing {filteredDirectoryItems.length} currently occupied rooms</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedRoomKeys.length > 0 && (
                <button
                  onClick={handleOpenGroupPaymentModal}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all duration-150 shadow-xs shadow-emerald-600/25 active:scale-[0.98] cursor-pointer animate-in fade-in"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Group Payment ({selectedRoomKeys.length} {selectedRoomKeys.length === 1 ? "Room" : "Rooms"})</span>
                </button>
              )}

              {selectedRoomKeys.length > 0 && (
                <button
                  onClick={handleExecuteGroupCheckout}
                  className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/90 dark:border-zinc-800 font-semibold text-xs flex items-center gap-1.5 transition-all duration-150 shadow-2xs active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Group Checkout ({selectedRoomKeys.length})</span>
                </button>
              )}

              {folioData && (
                <>
                  <button
                    onClick={handleOpenLiveTaxBill}
                    className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/90 border border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer group"
                  >
                    <Printer className="h-3.5 w-3.5 text-zinc-500 group-hover:text-blue-600 dark:text-zinc-400 dark:group-hover:text-blue-400 transition-colors" />
                    <span>Live Tax Bill</span>
                  </button>

                  <button
                    onClick={() => {
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
                    className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/90 border border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer group"
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5 text-zinc-500 group-hover:text-orange-500 dark:text-zinc-400 dark:group-hover:text-orange-400 transition-colors" />
                    <span>Add KOT Bill</span>
                  </button>

                  <button
                    onClick={() => {
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
                    className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/90 border border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer group"
                  >
                    <Plus className="h-3.5 w-3.5 text-zinc-500 group-hover:text-amber-500 dark:text-zinc-400 dark:group-hover:text-amber-400 transition-colors" />
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
                    className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/90 border border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-all duration-150 shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer group"
                  >
                    <Plus className="h-3.5 w-3.5 text-zinc-500 group-hover:text-rose-500 dark:text-zinc-400 dark:group-hover:text-rose-400 transition-colors" />
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
                    className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition-all duration-150 shadow-xs shadow-blue-600/25 hover:shadow-sm hover:shadow-blue-600/35 active:scale-[0.98] cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Collect Payment</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Toolbar for Outstanding Dues */}
        {activeMainTab === "OUTSTANDING_DUES" && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-rose-100 dark:border-rose-950/80 flex-wrap">
            <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span>Checked-out rooms with pending receivables / debtor balances ({filteredDirectoryItems.length} records)</span>
            </div>

            {folioData && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenLiveTaxBill}
                  className="h-8.5 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Invoice</span>
                </button>
                {currentBalance > 0.5 && (
                  <button
                    onClick={() => {
                      setPaymentForm({
                        amount: String(Math.max(0, currentBalance)),
                        method: activeStay?.primaryGuest?.companyName ? "DIRECT_BILL" : "UPI",
                        reference: `Outstanding Settlement for Room ${activeRoomNumber}`,
                        payerName: formatGuestDisplayName(activeStay?.primaryGuest?.name) || "Guest",
                        companyName: activeStay?.primaryGuest?.companyName || "",
                        gstin: activeStay?.primaryGuest?.gstin || "",
                        creditPeriod: "30_DAYS",
                        billingRemarks: `Settling outstanding balance for Room ${activeRoomNumber}`,
                      });
                      setShowPaymentModal(true);
                    }}
                    className="h-8.5 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Collect Outstanding ({formatINR(currentBalance)})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Toolbar for Settled Archive */}
        {activeMainTab === "SETTLED_ARCHIVE" && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex-wrap">
            <div className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
              <Archive className="h-3.5 w-3.5 text-zinc-400" />
              <span>Viewing historical settled folios & tax invoices ({filteredDirectoryItems.length} records)</span>
            </div>

            {folioData && (
              <button
                onClick={handleOpenLiveTaxBill}
                className="h-8.5 px-4 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Final Tax Invoice</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. MAIN 2-COLUMN OPERATIONAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 xl:gap-4 items-start w-full">
        
        {/* LEFT COLUMN: ROOMS DIRECTORY & GROUP SELECTOR */}
        <BillingSidebar
          activeMainTab={activeMainTab}
          directoryItems={directoryItems}
          filteredDirectoryItems={filteredDirectoryItems}
          selectedStayId={selectedStayId}
          selectedRoomNumber={selectedRoomNumber}
          selectedRoomKeys={selectedRoomKeys}
          staySearchQuery={staySearchQuery}
          setStaySearchQuery={setStaySearchQuery}
          stayStatusFilter={stayStatusFilter}
          setStayStatusFilter={setStayStatusFilter}
          onSelectRoom={(stayId, roomNumber) => {
            setSelectedStayId(stayId);
            setSelectedRoomNumber(roomNumber);
            setGroupBillingMode("NO");
          }}
          onToggleRoomSelection={toggleRoomSelection}
          onSelectAllRooms={() => {
            const inHouseKeys = filteredDirectoryItems.filter((d) => d.status === "IN_HOUSE").map((d) => d.key);
            if (selectedRoomKeys.length === inHouseKeys.length) {
              setSelectedRoomKeys([]);
            } else {
              setSelectedRoomKeys(inHouseKeys);
            }
          }}
          inHouseCount={inHouseCount}
          outstandingCount={outstandingCount}
          settledArchiveCount={settledArchiveCount}
          formatShortDate={formatShortDate}
        />

        {/* RIGHT COLUMN: FOLIO HERO, KPI CARDS & LEDGER */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 min-w-0 space-y-3.5 xl:space-y-4">
          {folioData && activeStay ? (
            <>
              {/* 1. ACTIVE STAY HERO OVERVIEW CARD */}
              <div className="rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
                {/* Hero Header Top Row */}
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Primary Row: Identity & Primary CTA */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        {groupBillingMode === "YES" && isMultiRoomGroup
                          ? `Rooms ${allGroupRooms.join(" + ")}`
                          : `Room ${activeRoomNumber}`}
                      </h1>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-zinc-700/60">
                        {groupBillingMode === "YES" && isMultiRoomGroup
                          ? "Combined Group Folio"
                          : activeDirectoryItem?.roomType?.name || activeStay?.roomAssignments?.[0]?.room?.roomType?.name || "Deluxe Room"}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        activeStay?.status === "IN_HOUSE"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                      }`}>
                        {activeStay?.status === "IN_HOUSE" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {activeStay?.status === "IN_HOUSE" ? "In-House" : activeStay?.status}
                      </span>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      {activeStay?.status === "IN_HOUSE" ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExecuteCheckout}
                            disabled={actionLoading}
                            className="h-9 px-4 sm:h-10 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>
                              {actionLoading
                                ? "Checking Out..."
                                : groupBillingMode === "YES" && isMultiRoomGroup
                                ? "Check Out Group & Invoice"
                                : `Check Out Room ${activeRoomNumber}`}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {currentBalance > 0.5 && (
                            <button
                              onClick={() => {
                                setPaymentForm({
                                  amount: String(Math.max(0, currentBalance)),
                                  method: activeStay?.primaryGuest?.companyName ? "DIRECT_BILL" : "UPI",
                                  reference: `Outstanding Settlement for Room ${activeRoomNumber}`,
                                  payerName: formatGuestDisplayName(activeStay?.primaryGuest?.name) || "Guest",
                                  companyName: activeStay?.primaryGuest?.companyName || "",
                                  gstin: activeStay?.primaryGuest?.gstin || "",
                                  creditPeriod: "30_DAYS",
                                  billingRemarks: `Settling outstanding debtor balance for Room ${activeRoomNumber}`,
                                });
                                setShowPaymentModal(true);
                              }}
                              className="h-9 px-3.5 sm:h-10 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <CreditCard className="h-4 w-4" />
                              <span>Collect Due ({formatINR(currentBalance)})</span>
                            </button>
                          )}
                          <button
                            onClick={handleOpenLiveTaxBill}
                            className="h-9 px-4 sm:h-10 sm:px-5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 active:scale-[0.98] font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <Printer className="h-4 w-4" />
                            <span>Print Final Invoice</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Genuine Outstanding Ledger Alert Banner */}
                  {currentBalance > 0.5 && (
                    <div className="w-full p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                        <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>
                          <strong>Debtors Ledger Record:</strong> Room {activeRoomNumber} has an unpaid balance of <strong>{formatINR(currentBalance)}</strong>.
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 shrink-0">
                        Status: UNPAID_DEBTOR
                      </span>
                    </div>
                  )}

                  {/* Master Folio Settlement Banner (Industry Standard) */}
                  {isMultiRoomGroup && currentBalance <= 0.5 && (
                    <div className="w-full p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          <strong>Master Folio Settlement:</strong> {groupBillingMode === "YES" ? "Combined Group charges" : `Room ${activeRoomNumber} tariff`} ({formatINR(totalCharges)}) is fully covered under the Group Advance Pool ({activeStay?.primaryGuest?.companyName || activeStay?.primaryGuest?.name}). Balance due from guest: <strong>₹0.00</strong>.
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0">
                        ✓ SETTLED & CLEARED
                      </span>
                    </div>
                  )}

                  {/* Secondary Row: Guest Meta & Rate/Stay Summary */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-0.5">
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 flex-wrap">
                      <span className="font-medium text-zinc-900 dark:text-zinc-200">
                        Guest: <strong className="font-bold">{formatGuestDisplayName(activeStay?.primaryGuest?.name)}</strong>
                      </span>
                      {activeStay?.primaryGuest?.phone && (
                        <span className="font-mono text-zinc-400">({activeStay.primaryGuest.phone})</span>
                      )}
                      {activeStay?.primaryGuest?.email && (
                        <span className="text-zinc-400 hidden sm:inline">• {activeStay.primaryGuest.email}</span>
                      )}
                      {activeStay?.primaryGuest?.companyName && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-xs font-medium text-amber-900 dark:text-amber-200">
                          <Building2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Bill to: <strong>{activeStay.primaryGuest.companyName}</strong></span>
                          {activeStay?.primaryGuest?.gstin && (
                            <span className="font-mono text-amber-700 dark:text-amber-400 text-[11px]">• GSTIN: {activeStay.primaryGuest.gstin}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stay Cycle Metric Summary */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap shrink-0">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {stayCalculations.nights} Night{stayCalculations.nights > 1 ? "s" : ""} Billed
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                        {stayCalculations.elapsedHours}h Stay
                      </span>
                      {stayCalculations.isEarlyBird && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-700">
                          Early Bird
                        </span>
                      )}
                      {stayCalculations.isWithinGrace && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-700">
                          In Grace
                        </span>
                      )}
                      {stayCalculations.waivedNextNight && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                          Next Night Waived
                        </span>
                      )}
                      <span className="font-mono text-[11px]">
                        • {stayCalculations.isComplimentary ? "Complimentary" : `₹${stayCalculations.roomRatePerNight.toLocaleString("en-IN")}/nt (${stayCalculations.isRateInclusive ? "Incl. GST" : "+Tax"})`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sleek Horizontal Metadata Strip (Replaces the 4 chunky grey boxes) */}
                <div className="border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/60 dark:divide-zinc-800 text-xs">
                    <div className="p-3 sm:px-4 sm:py-2.5">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">GRC Number</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs mt-0.5 block truncate">
                        {activeStay?.guestRegistration?.registrationNo || (activeStay?.reservationRoom?.reservation?.confirmationNo ? `GRC-${activeStay.reservationRoom.reservation.confirmationNo}` : (activeRoomNumber ? `GRC-2627-${activeRoomNumber}` : "—"))}
                      </span>
                    </div>

                    <div className="p-3 sm:px-4 sm:py-2.5">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">Bill / Invoice No</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-xs mt-0.5 block truncate">
                        {folioData?.windows?.[0]?.invoices?.[0]?.invoiceNo || (activeStay?.status === "IN_HOUSE" ? `LIVE-BILL/${activeRoomNumber || "310"}` : `INV-2627-${activeRoomNumber || "310"}`)}
                      </span>
                    </div>

                    <div className="p-3 sm:px-4 sm:py-2.5">
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">Check-In</span>
                      <span className="font-mono text-zinc-700 dark:text-zinc-300 text-xs mt-0.5 block truncate font-medium">
                        {formatDateTimeShort(activeStay?.arrivalAt || activeStay?.guestRegistration?.arrivalDateTime)}
                      </span>
                    </div>

                    <div className="p-3 sm:px-4 sm:py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider block">
                          {activeStay?.actualDepartureAt ? "Checked Out At" : "Expected Departure"}
                        </span>
                        {stayCalculations.isExtendedDeparture && !activeStay?.actualDepartureAt && (
                          <span
                            title={stayCalculations.originalExpectedDepartureAt ? `Originally scheduled: ${formatDateTimeShort(stayCalculations.originalExpectedDepartureAt)}` : "Auto-extended stay"}
                            className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          >
                            Auto-Extended{stayCalculations.extensionNights > 1 ? ` (+${stayCalculations.extensionNights - 1}N)` : ""}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-zinc-700 dark:text-zinc-300 text-xs mt-0.5 block truncate font-medium">
                        {formatDateTimeShort(activeStay?.actualDepartureAt || stayCalculations.effectiveDepartureAt || activeStay?.expectedDepartureAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Billing Controls: Grace Period & Group Billing */}
                <div className="p-3.5 sm:px-5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Grace Period */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        Grace Period:
                      </label>
                      <select
                        value={gracePeriodMinutes >= 1440 && !stayCalculations.canWaiveNextNight ? 0 : gracePeriodMinutes}
                        onChange={(e) => handleGracePeriodChange(Number(e.target.value))}
                        className="h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer transition shadow-2xs"
                      >
                        <option value={0}>0 Hours / None</option>
                        <option value={60}>1 Hour Grace</option>
                        <option value={120}>2 Hours Grace</option>
                        <option value={180}>3 Hours Grace</option>
                        <option value={240}>4 Hours Grace</option>
                        <option value={300}>5 Hours Grace</option>
                        <option value={360}>6 Hours Grace</option>
                        <option value={420}>7 Hours Grace</option>
                        <option value={1440} disabled={!stayCalculations.canWaiveNextNight}>
                          {stayCalculations.canWaiveNextNight
                            ? `Waive Next Night (Waive Night ${stayCalculations.unWaivedNights})`
                            : "Waive Next Night (Not applicable for 1-night stay)"}
                        </option>
                      </select>
                    </div>

                    {/* Group Billing Selector (Only visible for multi-room groups) */}
                    {isMultiRoomGroup && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          Group Billing:
                        </label>
                        <select
                          value={groupBillingMode}
                          onChange={(e) => setGroupBillingMode(e.target.value as "NO" | "YES")}
                          className="h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition shadow-2xs"
                        >
                          <option value="NO">No — Separate Billing (Room {activeRoomNumber} Only)</option>
                          <option value="YES">Yes — Combined Group Billing ({allGroupRooms.length} Rooms)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Clean Status Badge for Multi-Room Group */}
                  {isMultiRoomGroup && (
                    <div className="flex items-center gap-2 text-xs font-medium shrink-0">
                      {groupBillingMode === "NO" ? (
                        <span className="text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                          Room {activeRoomNumber} of {allGroupRooms.length} (Group)
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
                          ✓ Combined ({allGroupRooms.length} Rooms)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Group Advance Deposit Pool Widget (Multi-Room Groups) */}
              {isMultiRoomGroup && groupAdvanceMetrics.totalReceived > 0 && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-emerald-50/80 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-emerald-950/40 border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                          Group Advance Deposit Pool
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          {formatINR(groupAdvanceMetrics.available)} Available
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                        Total Received: <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{formatINR(groupAdvanceMetrics.totalReceived)}</strong> • Applied to Rooms: <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{formatINR(groupAdvanceMetrics.consumed)}</strong> • Held for room checkouts or final group settlement
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAdvanceModal(true)}
                      className="h-8.5 px-3.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Coins className="h-4 w-4 text-blue-500" />
                      <span>Manage Advance</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. THREE FINANCIAL KPI STAT TILES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:gap-3.5">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-1 min-w-0">
                  <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider truncate">
                    Total Charges Posted
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tabular-nums truncate">
                    {formatINR(totalCharges)}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono truncate">
                    Taxable: {formatINR(totalTaxable)} • Tax: {formatINR(totalTaxes)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-1 min-w-0">
                  <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider truncate">
                    Payments Received
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums truncate">
                    {formatINR(totalPayments)}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono truncate">
                    {payments.length} Transaction{payments.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border shadow-xs space-y-1 transition min-w-0 ${
                  surplusCredit > 0
                    ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60"
                    : currentBalance > 0
                    ? "bg-white dark:bg-[#121215] border-zinc-200/80 dark:border-zinc-800/80"
                    : "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                }`}>
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-[10.5px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                      {surplusCredit > 0 ? "Advance Surplus" : "Outstanding Balance"}
                    </div>
                    {surplusCredit > 0 && (
                      <button
                        onClick={() => handleOpenRefundModal(surplusCredit)}
                        className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-[10px] transition shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                        title="Issue refund return to guest"
                      >
                        <span>↩️ Refund</span>
                      </button>
                    )}
                  </div>
                  <div
                    className={`text-xl sm:text-2xl font-black tabular-nums truncate ${
                      surplusCredit > 0
                        ? "text-amber-700 dark:text-amber-400"
                        : currentBalance > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {surplusCredit > 0 ? `+ ${formatINR(surplusCredit)}` : formatINR(currentBalance)}
                  </div>
                  <div className="text-[11px] font-medium text-zinc-400 truncate">
                    {surplusCredit > 0
                      ? "Refund Due at Checkout"
                      : currentBalance > 0
                      ? "Pending Settlement"
                      : "✓ Settled & Cleared"}
                  </div>
                </div>
              </div>

              {/* 3. FOLIO CHARGES LEDGER TABLE */}
              <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      {groupBillingMode === "YES" && isMultiRoomGroup
                        ? `Group Folio Ledger (${allGroupRooms.join(", ")})`
                        : `Room ${activeRoomNumber} Itemized Charges`}
                    </h2>
                    <span className="text-[11px] font-mono text-zinc-500 font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60">
                      {entries.length} Item{entries.length === 1 ? "" : "s"}
                    </span>
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
                        className="w-full h-8.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-8 pr-7 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition"
                      />
                      {ledgerSearchQuery && (
                        <button
                          onClick={() => setLedgerSearchQuery("")}
                          className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <select
                      value={ledgerTypeFilter}
                      onChange={(e: any) => setLedgerTypeFilter(e.target.value)}
                      className="h-8.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="ROOM_TARIFF">Room Tariffs ({ACTIVE_TAX_RATES.ROOM_ACCOMMODATION_RATE}%)</option>
                      <option value="RESTAURANT_FOOD">Restaurant F&B ({ACTIVE_TAX_RATES.RESTAURANT_FOOD_RATE}%)</option>
                      <option value="MANUAL">Laundry & Services ({ACTIVE_TAX_RATES.SERVICES_LAUNDRY_RATE}%)</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50/70 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[10.5px] uppercase border-b border-zinc-100 dark:border-zinc-800 font-semibold tracking-wider">
                      <tr>
                        <th className="py-3 px-5">Date</th>
                        <th className="py-3 px-5">Description & Category</th>
                        <th className="py-3 px-5">SAC</th>
                        <th className="py-3 px-5 text-right">Taxable</th>
                        <th className="py-3 px-5 text-right">GST</th>
                        <th className="py-3 px-5 text-right">Total Amount</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {entries.map((e: any) => {
                        const taxAmt = (e.totalAmount || 0) - (e.taxableAmount || 0);
                        const isFood = e.chargeCode?.includes("FOOD") || e.chargeCode?.includes("RESTAURANT") || e.chargeCode?.includes("FB");
                        const isRoom = e.chargeCode?.includes("ROOM_TARIFF") || e.chargeCode === "STAY_EXTENSION" || e.sourceType === "PMS_NIGHTLY_CHARGE" || e.chargeCode === "EXTRA_PAX";
                        const isSystemRoomCharge = isRoom && e.sourceType !== "MANUAL_CHARGE";
                        const isDiscount = (e.amount || 0) < 0 || (e.totalAmount || 0) < 0;

                        return (
                          <tr key={e.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                            <td className="py-3 px-5 text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                              {e.serviceDate || e.createdAt?.slice(0, 10)}
                            </td>
                            <td className="py-3 px-5 font-medium text-zinc-900 dark:text-zinc-100">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{e.description}</span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    isDiscount
                                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/60"
                                      : isFood
                                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60"
                                      : isRoom
                                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60"
                                      : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60"
                                  }`}
                                >
                                  {isDiscount ? "Discount" : isFood ? `F&B (${ACTIVE_TAX_RATES.RESTAURANT_FOOD_RATE}%)` : isRoom ? `Room (${ACTIVE_TAX_RATES.ROOM_ACCOMMODATION_RATE}%)` : `Service (${ACTIVE_TAX_RATES.SERVICES_LAUNDRY_RATE}%)`}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-5 font-mono text-zinc-500 dark:text-zinc-400 text-xs">
                              {e.sacHsn || (isFood ? "996331" : "996311")}
                            </td>
                            <td className="py-3 px-5 font-mono tabular-nums text-zinc-600 dark:text-zinc-300 text-right">
                              {formatINR(e.taxableAmount || 0)}
                            </td>
                            <td className="py-3 px-5 font-mono text-zinc-400 dark:text-zinc-500 tabular-nums text-right">
                              {formatINR(taxAmt)}
                            </td>
                            <td className="py-3 px-5 font-mono font-semibold text-zinc-950 dark:text-white text-right tabular-nums">
                              {formatINR(e.totalAmount || 0)}
                            </td>
                            <td className="py-3 px-5 text-right">
                              {!isSystemRoomCharge && activeStay?.status === "IN_HOUSE" && folioData?.status === "OPEN" ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCharge(e.id, e.description, e.totalAmount || 0)}
                                  disabled={actionLoading}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 transition cursor-pointer disabled:opacity-50"
                                  title="Delete posted charge from folio"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              ) : (
                                <span className="text-zinc-400 dark:text-zinc-600 select-none text-xs font-mono pr-2">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {entries.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 px-5 text-center text-zinc-400 dark:text-zinc-500 italic text-xs">
                            {rawEntries.length === 0 ? "No charges posted yet" : "No charges match your search filter"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. PAYMENT RECEIPTS TABLE */}
              <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#121215] overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80">
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Payment & Settlement Receipts
                    </h2>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {payments.length} Transaction{payments.length === 1 ? "" : "s"} Recorded for Folio
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/60">
                    Total Settled: {formatINR(totalPayments)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-50/70 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[10.5px] uppercase border-b border-zinc-100 dark:border-zinc-800 font-semibold tracking-wider">
                      <tr>
                        <th className="py-3 px-5 whitespace-nowrap">Receipt #</th>
                        <th className="py-3 px-5 whitespace-nowrap">Date & Time</th>
                        <th className="py-3 px-5 whitespace-nowrap">Payment Method</th>
                        <th className="py-3 px-5 whitespace-nowrap">Reference / Notes</th>
                        <th className="py-3 px-5 text-right whitespace-nowrap">Amount</th>
                        <th className="py-3 px-5 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {payments.map((p: any) => {
                        const isGroup = p.reference?.includes("GRP") || p.receiptNo?.includes("GRP");
                        const isBTC = p.method === "DIRECT_BILL";
                        const isRefund = Number(p.amount) < 0 || p.method?.includes("REFUND") || p.method?.includes("PAYOUT");

                        return (
                          <tr key={p.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                            <td className="py-3 px-5 font-mono text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap align-middle">
                              <div className="inline-flex items-center gap-1.5">
                                <span className={isRefund ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}>
                                  {p.receiptNo}
                                </span>
                                {isGroup && (
                                  <span className="text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 py-0.2 rounded font-medium">
                                    Group
                                  </span>
                                )}
                                {isRefund && (
                                  <span className="text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-1.5 py-0.2 rounded font-medium uppercase">
                                    Refund
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-5 text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap align-middle font-mono">
                              {p.receivedAt ? new Date(p.receivedAt).toLocaleString("en-GB") : "—"}
                            </td>
                            <td className="py-3 px-5 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap align-middle">
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium inline-flex items-center gap-1.5 ${
                                  isRefund
                                    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
                                    : isBTC
                                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 shadow-2xs"
                                    : p.method === "UPI"
                                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                                    : p.method === "CARD"
                                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60"
                                    : p.method === "BANK_TRANSFER"
                                    ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60"
                                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                                }`}
                              >
                                {isRefund ? (
                                  <span>Refund Payout ({p.method.replace("_REFUND", "")})</span>
                                ) : isBTC ? (
                                  <>
                                    <Building2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                    <span>Bill to Company (BTC)</span>
                                  </>
                                ) : p.method === "UPI" ? (
                                  <span>UPI / QR</span>
                                ) : p.method === "CARD" ? (
                                  <span>Card</span>
                                ) : p.method === "BANK_TRANSFER" ? (
                                  <span>Bank Transfer</span>
                                ) : (
                                  <span>{p.method || "Cash"}</span>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-5 font-mono text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap align-middle">
                              {p.reference && !p.reference.startsWith("GRC-DEPOSIT-") ? p.reference : "—"}
                            </td>
                            <td className={`py-3 px-5 font-mono font-bold text-right tabular-nums text-sm whitespace-nowrap align-middle ${
                              isRefund ? "text-rose-600 dark:text-rose-400 font-black" : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              {isRefund ? `- ${formatINR(Math.abs(p.amount))}` : formatINR(p.amount || 0)}
                            </td>
                            <td className="py-3 px-5 text-right whitespace-nowrap align-middle">
                              <button
                                type="button"
                                onClick={() => {
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
                                className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                                title="Edit collected amount and payment details"
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 px-5 text-center text-zinc-400 italic text-xs">
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
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        onSubmit={handleRecordPayment}
        loading={actionLoading}
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
