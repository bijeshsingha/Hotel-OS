export const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash (Front Desk Drawer)", icon: "Banknote" },
  { id: "UPI", label: "UPI / QR Code", icon: "QrCode" },
  { id: "CARD", label: "Credit / Debit Card (EDC POS)", icon: "CreditCard" },
  { id: "BANK_TRANSFER", label: "NEFT / RTGS / Net Banking", icon: "Landmark" },
  { id: "POST_TO_ROOM", label: "Post to Room Folio", icon: "BedDouble" },
  { id: "DIRECT_BILLING", label: "Company Direct Billing / BTC", icon: "Building2" },
] as const;

export const EXPENSE_CATEGORIES = [
  { id: "DRIVER_COMMISSION", label: "Driver Commission", defaultDescription: "Cab / Taxi driver referral commission" },
  { id: "PETTY_CASH", label: "Petty Cash Purchase", defaultDescription: "Daily front office / pantry petty cash" },
  { id: "VENDOR_SUPPLY", label: "Vendor / Supplier Payment", defaultDescription: "Fresh vegetables, dairy, linens, toiletries" },
  { id: "MAINTENANCE_REPAIR", label: "Maintenance & Repairs", defaultDescription: "Plumbing, electrical, AC gas refill, carpentry" },
  { id: "STAFF_ADVANCE", label: "Staff Salary Advance / Tips", defaultDescription: "Front desk / housekeeping staff advance" },
  { id: "FNB_RAW_MATERIAL", label: "F&B Kitchen Inventory", defaultDescription: "Groceries, meat, beverage purchases" },
  { id: "LAUNDRY_EXPENSE", label: "Commercial Laundry Outsource", defaultDescription: "Off-site sheet & towel washing fees" },
  { id: "MISC_EXPENSE", label: "Miscellaneous Outflow", defaultDescription: "General operational expenses" },
] as const;

export const FOLIO_CHARGE_CATEGORIES = [
  { code: "ROOM_TARIFF", label: "Room Tariff", hsnSac: "996311", defaultTaxRate: 12 },
  { code: "FOOD_AND_BEVERAGE", label: "Restaurant & In-Room Dining", hsnSac: "996331", defaultTaxRate: 5 },
  { code: "LAUNDRY", label: "Laundry Service", hsnSac: "999799", defaultTaxRate: 18 },
  { code: "SPA", label: "Spa & Wellness", hsnSac: "999721", defaultTaxRate: 18 },
  { code: "EXTRA_BED", label: "Extra Bed / Rollaway", hsnSac: "996311", defaultTaxRate: 12 },
  { code: "AIRPORT_TRANSFER", label: "Airport Cab Transfer", hsnSac: "996412", defaultTaxRate: 5 },
  { code: "BANQUET", label: "Conference / Banquet Hall", hsnSac: "996339", defaultTaxRate: 18 },
  { code: "MISCELLANEOUS", label: "Miscellaneous Surcharge", hsnSac: "999799", defaultTaxRate: 18 },
] as const;

export const DISCOUNT_REASONS = [
  { id: "MANAGEMENT_APPROVAL", label: "Management Courtesy" },
  { id: "CORPORATE_DISCOUNT", label: "Corporate Agreement Rate" },
  { id: "LONG_STAY", label: "Long Stay Discount" },
  { id: "SERVICE_RECOVERY", label: "Service Recovery / Guest Complaint" },
  { id: "PROMOTIONAL", label: "Seasonal Promo Offer" },
] as const;
