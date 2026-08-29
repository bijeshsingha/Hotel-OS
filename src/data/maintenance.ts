export const MAINTENANCE_CATEGORIES = [
  { id: "HVAC", label: "HVAC / Air Conditioning & Ventilation" },
  { id: "ELECTRICAL", label: "Electrical / Lighting & Power Outlets" },
  { id: "PLUMBING", label: "Plumbing / Geyser & Sanitary" },
  { id: "CARPENTRY", label: "Carpentry / Doors, Windows & Furniture" },
  { id: "APPLIANCE", label: "Appliance / Smart TV, Mini-Fridge, Safe" },
  { id: "MASONRY", label: "Civil / Wall Paint, Tiles & Seepage" },
  { id: "IT_KEYCARD", label: "IT / Keycard Lock, Wi-Fi & Intercom" },
] as const;

export const MAINTENANCE_PRIORITIES = [
  { id: "LOW", label: "Low", blocksRoomByDefault: false },
  { id: "NORMAL", label: "Normal", blocksRoomByDefault: false },
  { id: "HIGH", label: "High", blocksRoomByDefault: true },
  { id: "URGENT", label: "Urgent (Emergency Defect)", blocksRoomByDefault: true },
] as const;

export const MAINTENANCE_STATUSES = [
  { id: "REPORTED", label: "Reported", badge: "Open" },
  { id: "IN_PROGRESS", label: "In Progress", badge: "Repairing" },
  { id: "RESOLVED", label: "Resolved", badge: "Fixed" },
  { id: "VERIFIED", label: "Verified & Tested", badge: "Approved" },
  { id: "CLOSED", label: "Closed", badge: "Archived" },
] as const;
