import {
  LayoutDashboard,
  BedDouble,
  Sparkles,
  Receipt,
  Wallet,
  Briefcase,
  Moon,
  Wrench,
  BarChart3,
  ScrollText,
  Building2,
  SlidersHorizontal,
  UtensilsCrossed,
  Users,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge: string;
  description?: string;
  superAdminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    badge: "D",
    description: "Operational overview & live hotel KPIs",
  },
  {
    label: "Front Desk",
    href: "/pms",
    icon: BedDouble,
    badge: "P",
    description: "Room rack grid, in-house guests & digital GRC",
  },
  {
    label: "Housekeeping",
    href: "/housekeeping",
    icon: Sparkles,
    badge: "H",
    description: "Room cleaning Kanban, tasks & inspections",
  },
  {
    label: "Billing & Folio",
    href: "/billing",
    icon: Receipt,
    badge: "B",
    description: "Guest ledgers, tax invoices & charge posting",
  },
  {
    label: "Cashier Shift",
    href: "/cashier-shift",
    icon: Wallet,
    badge: "CS",
    description: "Daily shift entry ledger, income receipts, expenses & drawer handover",
  },
  {
    label: "Corporate B2B",
    href: "/companies",
    icon: Briefcase,
    badge: "24",
    description: "Master B2B Corporate Ledger, GSTIN & Travel Agents",
  },
  {
    label: "Night Audit",
    href: "/night-audit",
    icon: Moon,
    badge: "N",
    description: "12 AM midnight day close & room charges",
  },
  {
    label: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
    badge: "M",
    description: "Defect tickets, repairs & out-of-order blocks",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    badge: "R",
    description: "Manager reporting, cashier sheet & CSV exports",
  },
  {
    label: "Audit Trail",
    href: "/audit-log",
    icon: ScrollText,
    badge: "A",
    description: "Immutable compliance log of system operations",
  },
  {
    label: "Staff & Roles",
    href: "/staff",
    icon: Users,
    badge: "USR",
    description: "Manage hotel terminal staff, access permissions & multi-property grants",
    superAdminOnly: true,
  },
  {
    label: "Admin Editor",
    href: "/admin",
    icon: SlidersHorizontal,
    badge: "ADM",
    description: "Database editor for Hotel, GRC, Rates, Rooms, Backups & Disaster Recovery",
    superAdminOnly: true,
  },
  {
    label: "Onboarding",
    href: "/onboarding",
    icon: Building2,
    badge: "NEW",
    description: "Configure new property, room matrix & GSTIN",
  },
];
