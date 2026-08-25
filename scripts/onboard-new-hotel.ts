/**
 * CLI Onboarding Script for Hotel OS
 * Usage: npx tsx scripts/onboard-new-hotel.ts
 */

import { OnboardingService } from "../src/lib/onboarding/onboarding-service";
import { OnboardingPropertyData } from "../src/lib/onboarding/types";

async function run() {
  const sampleNewHotel: OnboardingPropertyData = {
    displayName: "Hotel Pine Vista & Spa",
    legalName: "Pine Vista Hospitality LLP",
    code: "SHL-01",
    gstin: "17AABCP1234F1Z5",
    stateCode: "17",
    address: "Upper Shillong, Near Elephant Falls",
    city: "Shillong",
    state: "Meghalaya",
    pinCode: "793009",
    phone: "9864300000",
    email: "reservations@pinevista.com",
    checkinTime: "13:00",
    checkoutTime: "11:00",
    roomTypes: [
      {
        code: "DELUXE",
        name: "Deluxe Pine Room",
        capacity: 2,
        extraCapacity: 1,
        baseRate: 3500,
        extraAdultRate: 800,
        extraChildRate: 400,
        bedType: "King Bed",
        amenities: ["Mountain View", "Heater", "Free Wi-Fi", "Tea Maker"]
      },
      {
        code: "SUITE",
        name: "Valley View Suite",
        capacity: 3,
        extraCapacity: 2,
        baseRate: 6500,
        extraAdultRate: 1200,
        extraChildRate: 600,
        bedType: "King Bed + Balcony",
        amenities: ["Panoramic Balcony", "Fireplace", "Jacuzzi", "Smart TV"]
      }
    ],
    rooms: [
      { number: "101", floor: 1, roomTypeCode: "DELUXE" },
      { number: "102", floor: 1, roomTypeCode: "DELUXE" },
      { number: "103", floor: 1, roomTypeCode: "DELUXE" },
      { number: "201", floor: 2, roomTypeCode: "DELUXE" },
      { number: "202", floor: 2, roomTypeCode: "SUITE" },
      { number: "203", floor: 2, roomTypeCode: "SUITE" },
    ],
    documentSequences: {
      invoicePrefix: "INV-PV-2627-",
      receiptPrefix: "REC-PV-2627-",
      reservationPrefix: "RES-PV-2627-",
      kotPrefix: "KOT-PV-",
      financialYear: "2026-2027"
    }
  };

  console.log("Onboarding new hotel property...");
  const result = await OnboardingService.onboardProperty(sampleNewHotel);
  console.log("Result:", result);
}

// Only execute if run directly
if (require.main === module) {
  run().catch(console.error);
}
