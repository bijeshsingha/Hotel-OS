export const ROOM_STATUS_BADGES = {
  VACANT_READY: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
    label: "Vacant Ready",
    cardBg: "bg-white dark:bg-[#111114]",
    cardBorder: "border-zinc-200/80 dark:border-zinc-800/80",
  },
  OCCUPIED: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800/60",
    dot: "bg-blue-500",
    label: "Occupied",
    cardBg: "bg-white dark:bg-[#111114]",
    cardBorder: "border-blue-300/70 dark:border-blue-800/50",
  },
  DIRTY: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/60",
    dot: "bg-amber-500",
    label: "Dirty",
    cardBg: "bg-white dark:bg-[#111114]",
    cardBorder: "border-amber-300/70 dark:border-amber-800/50",
  },
  CLEAN: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800/60",
    dot: "bg-teal-500",
    label: "Clean",
    cardBg: "bg-white dark:bg-[#111114]",
    cardBorder: "border-zinc-200/80 dark:border-zinc-800/80",
  },
  INSPECTED: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800/60",
    dot: "bg-indigo-500",
    label: "Inspected",
    cardBg: "bg-white dark:bg-[#111114]",
    cardBorder: "border-zinc-200/80 dark:border-zinc-800/80",
  },
  OUT_OF_ORDER: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800/60",
    dot: "bg-rose-500",
    label: "Out of Order",
    cardBg: "bg-white dark:bg-[#111114]",
    cardBorder: "border-rose-300/70 dark:border-rose-800/50",
  },
} as const;

export const MAINTENANCE_PRIORITY_BADGES = {
  LOW: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
    border: "border-zinc-200 dark:border-zinc-700",
  },
  NORMAL: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800/50",
  },
  HIGH: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/50",
  },
  URGENT: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800/50",
  },
} as const;

export const FOLIO_STATUS_BADGES = {
  OPEN: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800/50",
    label: "Open Folio",
  },
  SETTLED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/50",
    label: "Settled & Paid",
  },
  DUE_OUT: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/50",
    label: "Due Out Today",
  },
} as const;
