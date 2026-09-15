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
  isExtendedDeparture?: boolean;
  extensionNights?: number;
  originalExpectedDepartureAt?: string;
  status: string;
  roomCharges: number;
  roomPayments: number;
  directPayments?: number;
  groupAdvanceCovered?: number;
  isGroupAdvanceCovered?: boolean;
  roomBalance: number;
  isSettled: boolean;
}

export type MainFolioTab = "IN_HOUSE" | "OUTSTANDING_DUES" | "SETTLED_ARCHIVE";

export interface ChargeFormState {
  description: string;
  chargeCode: string;
  sacHsn: string;
  amount: string;
  isInclusive: boolean;
  kotNumber?: string;
}

export interface DiscountFormState {
  description: string;
  amount: string;
  sacHsn: string;
}

export interface PaymentFormState {
  amount: string;
  method: string;
  reference: string;
  payerName: string;
  companyName: string;
  gstin: string;
  creditPeriod: string;
  billingRemarks: string;
}

export interface RefundFormState {
  amount: string;
  method: string;
  reference: string;
  notes: string;
}

export interface GroupPaymentFormState {
  payerName: string;
  companyName: string;
  gstin: string;
  reference: string;
  method: string;
  allocations: Record<string, number>;
}

export interface OutstandingFormState {
  reason: string;
  dueDate: string;
  remarks: string;
}

export interface GroupAdvanceMetrics {
  totalReceived: number;
  consumed: number;
  available: number;
  unallocatedPayments: any[];
}
