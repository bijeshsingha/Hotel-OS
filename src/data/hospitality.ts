export interface RoomStatusConfig {
  key: string;
  label: string;
  description: string;
}

export const ROOM_STATUSES = {
  VACANT_READY: {
    key: "VACANT_READY",
    label: "Vacant Ready",
    shortLabel: "VR",
    description: "Room is clean, inspected, and ready for check-in",
  },
  OCCUPIED: {
    key: "OCCUPIED",
    label: "Occupied",
    shortLabel: "OCC",
    description: "Guest currently residing in room",
  },
  DIRTY: {
    key: "DIRTY",
    label: "Dirty",
    shortLabel: "VD",
    description: "Vacant dirty, awaiting housekeeping cleaning",
  },
  CLEAN: {
    key: "CLEAN",
    label: "Clean",
    shortLabel: "VC",
    description: "Cleaned by housekeeping, awaiting inspection",
  },
  INSPECTED: {
    key: "INSPECTED",
    label: "Inspected",
    shortLabel: "VI",
    description: "Supervised and verified ready for sale",
  },
  OUT_OF_ORDER: {
    key: "OUT_OF_ORDER",
    label: "Out of Order",
    shortLabel: "OOO",
    description: "Maintenance or repair block active",
  },
} as const;

export const HOUSEKEEPING_COLUMNS = [
  {
    id: "DIRTY",
    title: "Dirty / Due Cleaning",
    subtitle: "Awaiting attendant cleaning",
    statusKey: "DIRTY",
  },
  {
    id: "CLEAN",
    title: "Cleaned",
    subtitle: "Housekeeper completed cleaning",
    statusKey: "CLEAN",
  },
  {
    id: "INSPECTED",
    title: "Inspected / Ready",
    subtitle: "Supervisor verified & approved",
    statusKey: "INSPECTED",
  },
  {
    id: "OOO",
    title: "Out of Order / Repair",
    subtitle: "Maintenance blocks & defects",
    statusKey: "OOO",
  },
] as const;

export const BED_CONFIGURATIONS = [
  { id: "KING_BED", label: "King Bed", beds: "1 King" },
  { id: "QUEEN_BED", label: "Queen Bed", beds: "1 Queen" },
  { id: "TWIN_BED", label: "Twin Bed", beds: "2 Single" },
  { id: "SUITE", label: "Suite Bedding", beds: "1 King + Lounge" },
  { id: "EXTRA_BED", label: "Rollaway / Extra Bed", beds: "1 Extra" },
] as const;

export const DEFAULT_ROOM_TYPES = [
  { code: "DLX", name: "Deluxe Room", baseRate: 3500, maxGuests: 2 },
  { code: "EXEC", name: "Executive Suite", baseRate: 5500, maxGuests: 3 },
  { code: "PRES", name: "Presidential Suite", baseRate: 12000, maxGuests: 4 },
  { code: "STD", name: "Standard Double", baseRate: 2500, maxGuests: 2 },
] as const;
