# Hotel OS — Design System & Direction

> **Design Read:** Hotel Operations Management System (Front Desk, PMS & Billing) for hotel general managers, front desk staff, and auditors. Minimalist, high-legibility, quiet editorial-functional style with large, clear typography.
> **Dials:** ENERGY 1 / RHYTHM 1 / MOTION 1

---

## 1. Core Principles

1. **Information First, Zero Slop**: Front desk staff need to scan room numbers, occupancy status, guest names, and live balances in milliseconds. Every decorative box, unnecessary pill badge, and template shadow is eliminated.
2. **Anti-Boxy Architecture**:
   - Zero nested cards inside cards inside cards.
   - Group information using open divider lines (`divide-y divide-zinc-100 dark:divide-zinc-800`), open stat bars, and generous whitespace.
   - Clean, rounded-2xl outer panels with soft single hairline borders.
3. **Large & Readable Typographic Scale**:
   - Root font size: Standard 16px (1rem = 16px).
   - Room numbers: `text-3xl sm:text-4xl font-black font-mono tracking-tight` (36px-40px).
   - Financial balances & primary KPIs: `text-3xl sm:text-4xl font-black font-mono` (32px-40px).
   - Headings & Page Titles: `text-2xl sm:text-3xl font-extrabold tracking-tight` (24px-30px).
   - Guest names & primary items: `text-base sm:text-lg font-bold` (16px-18px).
   - Body & table text: `text-sm` (14px) with generous row padding (`py-3.5` to `py-4`).
   - Labels & metadata: `text-xs uppercase font-bold tracking-wider text-zinc-400` (12px).
   - Banned: Microscopic text below 12px (`text-[10px]` or `text-[9px]`).
4. **Calm, Disciplined Palette**:
   - Canvas: Warm crisp white / slate-50 (`#f8fafc`) in light mode, deep zinc (`#09090b`) in dark mode.
   - Surfaces: Flat clean card (`#ffffff` / `#121215`) with single hairline border.
   - Primary Accent: Precision cobalt (`#2563eb` / `#3b82f6`) for focused interactions.
   - Semantic Status:
     - **Clean / Vacant Ready**: Emerald (`#059669` / `#10b981`)
     - **Occupied / Active In-House**: Blue (`#2563eb` / `#3b82f6`)
     - **Turnover / Dirty**: Amber (`#d97706` / `#f59e0b`)
     - **Out of Order / Maintenance / Overdue**: Rose (`#e11d48` / `#f43f5e`)
5. **Separation of Presentation & Logic**:
   - Presentation files live in `src/components/...` focusing strictly on layout, legibility, and user feedback.
   - Functional logic and state engines live in `src/lib/hooks/...` maintaining 100% of hotel business rules.
6. **No AI Tells**:
   - Zero em dashes in UI copy (Rule R-02).
   - No buzzwords ("AI Powered", "Seamless", "Revolutionary").
   - No gratuitous blur/glassmorphism on standard panels.
   - Clear WCAG AA contrast (minimum 4.5:1 for normal text).
