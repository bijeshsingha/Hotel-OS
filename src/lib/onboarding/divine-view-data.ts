/**
 * Hotel OS - Clean Property Configuration for Hotel Divine View
 * Source: Physical Room & Inventory Master (Verified 5 Floors)
 *
 * FULL INVENTORY: EXACT 75 GUEST ROOMS ACROSS 5 FLOORS
 * Separate Room Types based on Bed Configurations:
 * - DLX_QUEEN: Deluxe Room (Queen Bed)
 * - DLX_TWIN: Deluxe Room (Twin Bed)
 * - STD_QUEEN: Standard Room Non-AC (Queen Bed)
 * - STD_TWIN: Standard Room Non-AC (Twin Bed)
 * - EXEC_KING: Executive Room (King Bed)
 * - EXEC_QUEEN: Executive Room (Queen Bed)
 * - FAM_2DBL: Family Executive (2 Double Beds)
 * - FAM_KINGSGL: Family Executive (1 King + 1 Single)
 *
 * Back of House / Operational Units:
 * - Room 30 (Common Washroom, 1st Floor)
 * - Rooms 61, 62 (Staff Rooms, 3rd Floor)
 */

import { OnboardingPropertyData } from "./types";

export const HOTEL_DIVINE_VIEW_PRESET: OnboardingPropertyData = {
  displayName: "Hotel Divine View",
  legalName: "HOTEL DIVINE VIEW",
  code: "HDV-01",
  gstin: "18AALFH7867B1Z2",
  stateCode: "18",
  address: "Md.Shah Road, Paltan Bazar",
  city: "Guwahati",
  state: "Assam",
  pinCode: "781008",
  phone: "9706277133",
  email: "divineview02@gmail.com",
  timezone: "Asia/Kolkata",
  currency: "INR",
  checkinTime: "12:00",
  checkoutTime: "11:00",
  businessDate: "2026-08-31",
  sourceBackup: "DV_Today.bak",
  restrictToBijeshOnly: true,

  // 8 Specific Master Room Categories separated by Bed Type
  roomTypes: [
    {
      code: "DLX_QUEEN",
      name: "Deluxe Room (Queen Bed)",
      capacity: 2,
      extraCapacity: 1,
      baseRate: 2000,
      extraAdultRate: 500,
      extraChildRate: 250,
      bedType: "Queen Size Bed",
      amenities: [
        "Split AC",
        "Free High-Speed Wi-Fi",
        "Smart LED TV",
        "Electric Kettle",
        "Attached Bath with Geyser",
        "Intercom Facility"
      ]
    },
    {
      code: "DLX_TWIN",
      name: "Deluxe Room (Twin Bed)",
      capacity: 2,
      extraCapacity: 1,
      baseRate: 2000,
      extraAdultRate: 500,
      extraChildRate: 250,
      bedType: "Twin Bed",
      amenities: [
        "Split AC",
        "Free High-Speed Wi-Fi",
        "Smart LED TV",
        "Electric Kettle",
        "Attached Bath with Geyser",
        "Intercom Facility"
      ]
    },
    {
      code: "STD_QUEEN",
      name: "Standard Room Non-AC (Queen Bed)",
      capacity: 2,
      extraCapacity: 1,
      baseRate: 1500,
      extraAdultRate: 400,
      extraChildRate: 200,
      bedType: "Queen Size Bed",
      amenities: [
        "Ceiling Fan",
        "Free High-Speed Wi-Fi",
        "LED TV",
        "Attached Bath with Hot Water",
        "Intercom Facility"
      ]
    },
    {
      code: "STD_TWIN",
      name: "Standard Room Non-AC (Twin Bed)",
      capacity: 2,
      extraCapacity: 1,
      baseRate: 1500,
      extraAdultRate: 400,
      extraChildRate: 200,
      bedType: "Twin Bed",
      amenities: [
        "Ceiling Fan",
        "Free High-Speed Wi-Fi",
        "LED TV",
        "Attached Bath with Hot Water",
        "Intercom Facility"
      ]
    },
    {
      code: "EXEC_KING",
      name: "Executive Room (King Bed)",
      capacity: 2,
      extraCapacity: 1,
      baseRate: 2500,
      extraAdultRate: 500,
      extraChildRate: 250,
      bedType: "King Size Bed",
      amenities: [
        "Split AC",
        "Smart TV",
        "High-Speed Wi-Fi",
        "Work Desk",
        "Sofa Seating",
        "Minibar Fridge",
        "Electric Kettle",
        "Attached Luxury Bathroom with Geyser"
      ]
    },
    {
      code: "EXEC_QUEEN",
      name: "Executive Room (Queen Bed)",
      capacity: 2,
      extraCapacity: 1,
      baseRate: 2500,
      extraAdultRate: 500,
      extraChildRate: 250,
      bedType: "Queen Size Bed",
      amenities: [
        "Split AC",
        "Smart TV",
        "High-Speed Wi-Fi",
        "Work Desk",
        "Sofa Seating",
        "Minibar Fridge",
        "Electric Kettle",
        "Attached Luxury Bathroom with Geyser"
      ]
    },
    {
      code: "FAM_2DBL",
      name: "Family Executive (2 Double Beds)",
      capacity: 4,
      extraCapacity: 2,
      baseRate: 3000,
      extraAdultRate: 600,
      extraChildRate: 300,
      bedType: "2 Double Beds",
      amenities: [
        "Large Family Suite",
        "Dual AC",
        "55\" Smart TV",
        "High-Speed Wi-Fi",
        "Spacious Lounge",
        "Attached Luxury Bathroom with Geyser",
        "Tea/Coffee Bar",
        "24hr In-Room Dining"
      ]
    },
    {
      code: "FAM_KINGSGL",
      name: "Family Executive (1 King + 1 Single)",
      capacity: 3,
      extraCapacity: 2,
      baseRate: 3000,
      extraAdultRate: 600,
      extraChildRate: 300,
      bedType: "1 King Bed 1 Single Bed",
      amenities: [
        "Large Family Suite",
        "Dual AC",
        "55\" Smart TV",
        "High-Speed Wi-Fi",
        "Spacious Lounge",
        "Attached Luxury Bathroom with Geyser",
        "Tea/Coffee Bar",
        "24hr In-Room Dining"
      ]
    }
  ],

  // Exact 75 Physical Guest Rooms Across 5 Floors
  rooms: [
    // --- 1ST FLOOR (12 Guest Rooms) ---
    { number: "22", floor: 1, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "23", floor: 1, roomTypeCode: "EXEC_KING", wing: "View Site Room" },
    { number: "24", floor: 1, roomTypeCode: "EXEC_KING", wing: "View Site Room" },
    { number: "25", floor: 1, roomTypeCode: "DLX_TWIN", wing: "Paltan Wing" },
    { number: "26", floor: 1, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "27", floor: 1, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "28", floor: 1, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "29", floor: 1, roomTypeCode: "FAM_2DBL", wing: "Paltan Wing" },
    { number: "31", floor: 1, roomTypeCode: "FAM_2DBL", wing: "Paltan Wing" },
    { number: "32", floor: 1, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "33", floor: 1, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "34", floor: 1, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },

    // --- 2ND FLOOR (16 Guest Rooms) ---
    { number: "35", floor: 2, roomTypeCode: "STD_QUEEN", wing: "Paltan Wing" },
    { number: "36", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "37", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "38", floor: 2, roomTypeCode: "EXEC_KING", wing: "View Site Room" },
    { number: "39", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "40", floor: 2, roomTypeCode: "FAM_2DBL", wing: "Paltan Wing" },
    { number: "41", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "42", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "43", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "44", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "45", floor: 2, roomTypeCode: "FAM_2DBL", wing: "Paltan Wing" },
    { number: "46", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "47", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "48", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "49", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },
    { number: "50", floor: 2, roomTypeCode: "DLX_QUEEN", wing: "Paltan Wing" },

    // --- 3RD FLOOR (15 Guest Rooms) ---
    { number: "51", floor: 3, roomTypeCode: "STD_QUEEN", wing: "City View Wing" },
    { number: "52", floor: 3, roomTypeCode: "STD_QUEEN", wing: "City View Wing" },
    { number: "53", floor: 3, roomTypeCode: "STD_QUEEN", wing: "City View Wing" },
    { number: "54", floor: 3, roomTypeCode: "DLX_QUEEN", wing: "City View Wing" },
    { number: "55", floor: 3, roomTypeCode: "DLX_QUEEN", wing: "City View Wing" },
    { number: "56", floor: 3, roomTypeCode: "STD_TWIN", wing: "City View Wing" },
    { number: "57", floor: 3, roomTypeCode: "STD_QUEEN", wing: "City View Wing" },
    { number: "58", floor: 3, roomTypeCode: "STD_QUEEN", wing: "City View Wing" },
    { number: "59", floor: 3, roomTypeCode: "STD_QUEEN", wing: "City View Wing" },
    { number: "60", floor: 3, roomTypeCode: "STD_TWIN", wing: "City View Wing" },
    { number: "63", floor: 3, roomTypeCode: "STD_QUEEN", wing: "City View Wing" },
    { number: "64", floor: 3, roomTypeCode: "STD_QUEEN", wing: "City View Wing" },
    { number: "65", floor: 3, roomTypeCode: "FAM_2DBL", wing: "City View Wing" },
    { number: "66", floor: 3, roomTypeCode: "STD_QUEEN", wing: "City View Wing" },
    { number: "67", floor: 3, roomTypeCode: "STD_QUEEN", wing: "City View Wing" },

    // --- 4TH FLOOR (18 Guest Rooms) ---
    { number: "215", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "216", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "217", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "218", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "219", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "220", floor: 4, roomTypeCode: "STD_QUEEN", wing: "Upper Wing" },
    { number: "221", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "222", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "223", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "224", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "225", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "226", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "227", floor: 4, roomTypeCode: "EXEC_QUEEN", wing: "View Site Room" },
    { number: "228", floor: 4, roomTypeCode: "FAM_KINGSGL", wing: "View Site Room" },
    { number: "229", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "230", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "231", floor: 4, roomTypeCode: "DLX_QUEEN", wing: "Upper Wing" },
    { number: "232", floor: 4, roomTypeCode: "DLX_TWIN", wing: "Upper Wing" },

    // --- 5TH FLOOR (14 Guest Rooms) ---
    { number: "201", floor: 5, roomTypeCode: "DLX_QUEEN", wing: "Executive Floor" },
    { number: "202", floor: 5, roomTypeCode: "DLX_QUEEN", wing: "Executive Floor" },
    { number: "203", floor: 5, roomTypeCode: "DLX_QUEEN", wing: "Executive Floor" },
    { number: "204", floor: 5, roomTypeCode: "EXEC_KING", wing: "Executive Floor" },
    { number: "205", floor: 5, roomTypeCode: "EXEC_KING", wing: "Executive Floor" },
    { number: "206", floor: 5, roomTypeCode: "DLX_TWIN", wing: "Executive Floor" },
    { number: "207", floor: 5, roomTypeCode: "DLX_QUEEN", wing: "Executive Floor" },
    { number: "208", floor: 5, roomTypeCode: "DLX_QUEEN", wing: "Executive Floor" },
    { number: "209", floor: 5, roomTypeCode: "DLX_QUEEN", wing: "Executive Floor" },
    { number: "210", floor: 5, roomTypeCode: "FAM_KINGSGL", wing: "Executive Floor" },
    { number: "211", floor: 5, roomTypeCode: "FAM_KINGSGL", wing: "Executive Floor" },
    { number: "212", floor: 5, roomTypeCode: "EXEC_KING", wing: "Executive Floor" },
    { number: "213", floor: 5, roomTypeCode: "DLX_QUEEN", wing: "Executive Floor" },
    { number: "214", floor: 5, roomTypeCode: "DLX_QUEEN", wing: "Executive Floor" }
  ],

  // Document Number Sequences with HDV branding
  documentSequences: {
    invoicePrefix: "INV-HDV-2627-",
    creditNotePrefix: "CN-HDV-2627-",
    receiptPrefix: "REC-HDV-2627-",
    reservationPrefix: "RES-HDV-2627-",
    kotPrefix: "KOT-HDV-",
    orderPrefix: "ORD-HDV-",
    financialYear: "2026-2027"
  },

  // Outlets
  outlets: [
    { code: "REST_DIVINE", name: "Divine View Restaurant", type: "RESTAURANT", tableCount: 12 },
    { code: "ROOM_SERVICE", name: "In-Room Dining (IRD)", type: "ROOM_SERVICE", tableCount: 0 }
  ]
};
