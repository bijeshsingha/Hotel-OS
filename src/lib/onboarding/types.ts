/**
 * Hotel OS - Multi-Property Onboarding & Configuration Types
 */

export interface OnboardingPropertyData {
  // 1. Identity & Legal
  displayName: string;       // e.g. "Hotel Ambarish Grand Residency"
  legalName: string;         // e.g. "AMBARISH RESIDENCY"
  code: string;              // e.g. "GUW-01", "HDW-01"
  gstin: string;             // e.g. "18AACCB2447F1ZX"
  stateCode: string;         // e.g. "18" for Assam
  address: string;           // MD Shah Road, Paltan Bazar, Guwahati
  city: string;              // Guwahati
  state: string;             // Assam
  pinCode: string;           // 781008
  phone: string;             // 9864341211
  email: string;             // reservation.ambarish@gmail.com
  timezone?: string;         // default "Asia/Kolkata"
  currency?: string;         // default "INR"
  checkinTime?: string;      // default "12:00"
  checkoutTime?: string;     // default "11:00"
  businessDate?: string;     // YYYY-MM-DD

  // 2. Room Types & Rates
  roomTypes: Array<{
    code: string;            // DELUXE, EXECUTIVE, SUITE
    name: string;            // Deluxe Room
    capacity: number;        // 2
    extraCapacity: number;   // 1
    baseRate: number;        // 2000
    extraAdultRate: number;  // 500
    extraChildRate: number;  // 250
    bedType: string;         // King Bed
    amenities: string[];     // ["Air Conditioning", "Free Wi-Fi", "Smart TV"]
  }>;

  // 3. Physical Rooms
  rooms: Array<{
    number: string;          // "201", "301"
    floor: number;           // 2
    roomTypeCode: string;    // "DELUXE"
    wing?: string;
  }>;

  // 4. GST & Billing Configurations
  taxProfiles?: Array<{
    name: string;
    supplyType: "ACCOMMODATION" | "RESTAURANT" | "SERVICE";
    sacHsn: string;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
  }>;

  // 5. Document Number Sequences
  documentSequences?: {
    invoicePrefix?: string;       // default "INV-2627-"
    creditNotePrefix?: string;    // default "CN-2627-"
    receiptPrefix?: string;       // default "REC-2627-"
    reservationPrefix?: string;   // default "RES-2627-"
    kotPrefix?: string;           // default "KOT-"
    orderPrefix?: string;         // default "ORD-"
    financialYear?: string;       // default "2026-2027"
  };

  // 6. Food & Beverage Outlets (Optional)
  outlets?: Array<{
    code: string;
    name: string;
    type: "RESTAURANT" | "ROOM_SERVICE" | "BAR" | "BANQUET";
    tableCount?: number;
  }>;

  // 7. Initial Staff Users
  staffUsers?: Array<{
    name: string;
    email: string;
    phone?: string;
    roleCode: "ORG_OWNER" | "ADMIN_GM" | "FD_MGR" | "FD_AGENT" | "HK_SUP" | "FNB_MGR" | "ACCT";
  }>;

  // 8. Optional Legacy Backup Path to auto-import
  legacyBackupPath?: string;
}

export interface OnboardingResult {
  success: boolean;
  propertyId: string;
  propertyCode: string;
  propertyName: string;
  roomsCreated: number;
  roomTypesCreated: number;
  usersCreated: number;
  message: string;
}
