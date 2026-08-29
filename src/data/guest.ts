export const ID_PROOF_TYPES = [
  { id: "AADHAAR", label: "Aadhaar Card (UIDAI)", requiresBack: true },
  { id: "PASSPORT", label: "Passport", requiresBack: true, isForeignerValid: true },
  { id: "VOTER_ID", label: "Voter ID Card (EPIC)", requiresBack: true },
  { id: "DRIVING_LICENSE", label: "Driving License", requiresBack: true },
  { id: "PAN_CARD", label: "PAN Card", requiresBack: false },
  { id: "GOVT_ID", label: "Govt / PSU Official ID", requiresBack: true },
] as const;

export const PURPOSE_OF_VISIT_OPTIONS = [
  { id: "LEISURE", label: "Leisure / Vacation" },
  { id: "BUSINESS", label: "Business / Corporate Work" },
  { id: "TRANSIT", label: "Transit / Flight Layover" },
  { id: "EVENT_WEDDING", label: "Wedding / Social Event" },
  { id: "MEDICAL", label: "Medical / Healthcare Visit" },
  { id: "OFFICIAL_GOVT", label: "Official Government Duty" },
  { id: "OTHER", label: "Other" },
] as const;

export const MEAL_PLANS = [
  { code: "EP", name: "European Plan (EP)", description: "Room Only - No Meals Included" },
  { code: "CP", name: "Continental Plan (CP)", description: "Includes Daily Breakfast" },
  { code: "MAP", name: "Modified American Plan (MAP)", description: "Includes Breakfast + Lunch or Dinner" },
  { code: "AP", name: "American Plan (AP)", description: "Includes All Meals (Breakfast, Lunch & Dinner)" },
] as const;

export const BOOKING_SOURCES = [
  { code: "WALK_IN", name: "Direct Walk-In", tag: "Front Desk" },
  { code: "DIRECT_PHONE", name: "Direct Phone / WhatsApp", tag: "Direct" },
  { code: "WEBSITE", name: "Hotel Brand Website", tag: "Direct Web" },
  { code: "TRAVEL_AGENT", name: "Tour & Travel Agency", tag: "Tour Agency" },
  { code: "MAKEMYTRIP", name: "MakeMyTrip / Goibibo", tag: "OTA" },
  { code: "BOOKING_COM", name: "Booking.com", tag: "OTA" },
  { code: "AGODA", name: "Agoda", tag: "OTA" },
  { code: "EXPEDIA", name: "Expedia / Hotels.com", tag: "OTA" },
  { code: "CORPORATE", name: "Corporate Company / B2B", tag: "Corporate" },
] as const;

export const POPULAR_TOUR_AGENCIES = [
  { name: "Yashraj Travels", city: "Guwahati / Kolkata", phone: "+91 98640 12345" },
  { name: "Kaziranga & Northeast Holidays", city: "Guwahati", phone: "+91 98641 54321" },
  { name: "Brahmaputra Cruise & Tours", city: "Guwahati", phone: "+91 98642 98765" },
  { name: "Blue Hills Travels", city: "Assam", phone: "+91 98643 11223" },
  { name: "Assam Tourism (ATDC)", city: "Guwahati", phone: "+91 361 2547102" },
  { name: "Meghalaya Tourism Packages", city: "Shillong", phone: "+91 364 2226220" },
  { name: "Purvi Discovery", city: "Dibrugarh", phone: "+91 373 2301120" },
  { name: "Other Local Tour Operator", city: "Custom Agency", phone: "" },
] as const;

export const COMMON_NATIONALITIES = [
  "Indian",
  "American",
  "British",
  "Australian",
  "Canadian",
  "German",
  "French",
  "Japanese",
  "Singaporean",
  "Emirati (UAE)",
  "Other",
] as const;
