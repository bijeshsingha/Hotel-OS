/**
 * Hotel OS - Clean Property Configuration for Hotel Divine View
 * Source: DV_Today.bak & Verified PMS Master
 *
 * FULL INVENTORY: EXACT 76 ROOMS ACROSS 4 FLOORS
 * - Floor 1: 101 to 120 (20 Double Deluxe, Paltan Wing)
 * - Floor 2: 201 to 220 (20 Double Deluxe, Paltan Wing)
 * - Floor 3: 301 to 321 (21 Double Deluxe, City View Wing)
 * - Floor 4: 401 to 407 (7 Double Executive, Executive Floor)
 * - Floor 4: 408 to 415 (8 Family Executive, Executive Floor)
 * Total: 61 Deluxe + 7 Executive + 8 Family Executive = 76 Rooms
 *
 * STRICT COMPLIANCE:
 * - Clean hotel master configuration only.
 * - ZERO guest records, booking transactions, or personal data.
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

  // 3 Master Room Categories (61 Deluxe, 7 Executive, 8 Family Executive)
  roomTypes: [
    {
      code: "DELUXE",
      name: "Double Deluxe (AC)",
      capacity: 2,
      extraCapacity: 1,
      baseRate: 2000,
      extraAdultRate: 500,
      extraChildRate: 250,
      bedType: "Queen / Twin AC",
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
      code: "EXECUTIVE",
      name: "Double Executive (AC)",
      capacity: 2,
      extraCapacity: 1,
      baseRate: 2500,
      extraAdultRate: 500,
      extraChildRate: 250,
      bedType: "King Bed AC",
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
      code: "FAMILY_EXECUTIVE",
      name: "Family Executive (AC)",
      capacity: 4,
      extraCapacity: 2,
      baseRate: 3000,
      extraAdultRate: 600,
      extraChildRate: 300,
      bedType: "2 King Beds / Quad AC",
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

  // Exact 76 Physical Rooms Across 4 Floors
  rooms: [
    {
        "number": "101",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "102",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "103",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "104",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "105",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "106",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "107",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "108",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "109",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "110",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "111",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "112",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "113",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "114",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "115",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "116",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "117",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "118",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "119",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "120",
        "floor": 1,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "201",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "202",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "203",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "204",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "205",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "206",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "207",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "208",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "209",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "210",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "211",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "212",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "213",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "214",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "215",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "216",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "217",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "218",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "219",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "220",
        "floor": 2,
        "roomTypeCode": "DELUXE",
        "wing": "Paltan Wing"
    },
    {
        "number": "301",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "302",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "303",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "304",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "305",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "306",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "307",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "308",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "309",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "310",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "311",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "312",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "313",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "314",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "315",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "316",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "317",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "318",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "319",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "320",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "321",
        "floor": 3,
        "roomTypeCode": "DELUXE",
        "wing": "City View Wing"
    },
    {
        "number": "401",
        "floor": 4,
        "roomTypeCode": "EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "402",
        "floor": 4,
        "roomTypeCode": "EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "403",
        "floor": 4,
        "roomTypeCode": "EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "404",
        "floor": 4,
        "roomTypeCode": "EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "405",
        "floor": 4,
        "roomTypeCode": "EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "406",
        "floor": 4,
        "roomTypeCode": "EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "407",
        "floor": 4,
        "roomTypeCode": "EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "408",
        "floor": 4,
        "roomTypeCode": "FAMILY_EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "409",
        "floor": 4,
        "roomTypeCode": "FAMILY_EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "410",
        "floor": 4,
        "roomTypeCode": "FAMILY_EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "411",
        "floor": 4,
        "roomTypeCode": "FAMILY_EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "412",
        "floor": 4,
        "roomTypeCode": "FAMILY_EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "413",
        "floor": 4,
        "roomTypeCode": "FAMILY_EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "414",
        "floor": 4,
        "roomTypeCode": "FAMILY_EXECUTIVE",
        "wing": "Executive Floor"
    },
    {
        "number": "415",
        "floor": 4,
        "roomTypeCode": "FAMILY_EXECUTIVE",
        "wing": "Executive Floor"
    }
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
