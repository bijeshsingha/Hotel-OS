# Hotel Operations SaaS — V1 Product Specification

**Status:** Build-ready baseline  
**Version:** 1.0  
**Date:** 20 August 2026  
**Target:** Independent Indian hotels, 20–150 rooms; multiple properties per organization  
**Stack baseline:** Next.js + TypeScript + PostgreSQL + Prisma  
**Change policy:** This is a living specification. Decisions marked `OPEN` are not implementation blockers unless stated.

---

## 1. Product vision

One simple operating system for independent hotels: reservations, front desk, rooms, housekeeping, restaurant orders, guest folios, payments, maintenance, and owner visibility in one auditable product.

V1 succeeds when a hotel can run a normal operating day without a paper room register, a separate KOT book, or a spreadsheet for room status, while preserving enough accounting detail to reconcile cash, digital payments, room revenue, F&B revenue, and GST.

### 1.1 Product principles

1. **The room grid is the operational truth.** Staff can understand availability, occupancy, housekeeping, and out-of-order state at a glance.
2. **One stay, one folio, many charge sources.** Room, restaurant, adjustments, and payments converge into a single guest account.
3. **Fast on shared devices.** Common front-desk and restaurant actions require few clicks and work on desktop and tablet widths.
4. **Financial records are append-only after issue.** Corrections use reversal, void, refund, or credit note—not silent edits.
5. **Property isolation is mandatory.** Every operational record belongs to one organization and one property unless explicitly organization-wide.
6. **Configuration over hard-coding.** Tax, numbering, meal periods, service charges, room statuses, and printer routing vary by property.
7. **Progressive depth.** V1 has inventory and maintenance hooks without pretending to be a full ERP or CMMS.

### 1.2 Success measures for first 90 days

- 95% of reservations and stays completed without support intervention.
- Median front-desk check-in under 3 minutes when guest data is available.
- Median KOT creation under 45 seconds for a five-item order.
- Zero cross-tenant data exposure in automated authorization tests.
- Daily folio/payment reconciliation difference under ₹1 after approved rounding.
- At least 90% of occupied-room F&B postings reach the correct folio without manual adjustment.
- Night audit completed on 95% of operational dates by configured cut-off.

## 2. V1 scope, assumptions, and non-goals

### 2.1 In scope

- Multi-organization SaaS; multiple properties within an organization.
- User invitations, property assignments, roles, and fine-grained permissions.
- Property setup, room types, rooms, rate plans, tax profiles, outlets, tables, menu, printers.
- PMS: reservation, walk-in, check-in, room assignment, move, extension, no-show, cancellation, checkout.
- Guest profiles, companions, basic identity-document metadata and protected uploads.
- Room grid and tape-chart-style reservation calendar.
- Housekeeping room states, assignments, inspections, notes, and lost/damaged/minibar hooks.
- KOT/POS for dine-in, room service, and takeaway; split/merge basic bills; kitchen routing.
- Folios, room charges, F&B posting, payments, deposits, adjustments, invoices, voids, refunds, credit-note hooks.
- Basic India GST-ready configuration and tax invoice rendering.
- Operational day and night audit basics.
- Dashboard and core operational/financial reports.
- Maintenance issue logging, assignment, status, room blocking, and resolution.
- Basic inventory catalogue and stock-movement event hooks; optional menu recipe link.
- In-app realtime updates and configurable in-app/email/SMS/WhatsApp adapter hooks.
- Audit trail and exports.

### 2.2 Assumptions

- One base currency per property; V1 ships with INR and two-decimal money storage.
- One property timezone and operational day boundary; default `Asia/Kolkata`, audit cut-off 03:00.
- A reservation can have multiple rooms, but each assigned room produces a separate `Stay`; related stays retain a reservation-group link.
- One primary folio per stay, with additional folio windows supported for company/guest split billing.
- Room inventory is allocated by room type before assignment; a physical room may be assigned later.
- Restaurant sales may be settled directly or posted to an in-house room folio.
- Hotel management is responsible for choosing legally correct GST profiles and numbering; the product validates structure and preserves evidence.
- Internet is normally available. Critical KOT offline resilience is an `OPEN` decision; V1 guarantees retry/idempotency, not full offline operation.

### 2.3 Non-goals for V1

- OTA/channel manager, booking engine, GDS, dynamic pricing, or two-way inventory sync.
- Full accounting/ERP, purchase orders, vendor payable, payroll, or bank reconciliation.
- Full recipe costing, batch/expiry tracking, physical stocktake, or procurement.
- Banquet/event management, spa, loyalty, gift cards, or membership.
- Door-lock, PBX, smart-energy, passport scanner, or government guest-report integrations.
- Complex group allotments, travel-agent commission settlement, or central reservations office.
- Multiple currencies on one folio, forex gain/loss, or DCC.
- Statutory GST filing; V1 exports data and supports future e-invoice integration but is not a tax-filing system.
- Native mobile apps. Responsive web/PWA shell only.

## 3. Domain and module boundaries

| Module | Owns | May read | Must not own |
|---|---|---|---|
| Identity & tenancy | organizations, properties, memberships, roles, sessions | audit | operational records |
| Configuration | rooms, room types, rates, taxes, outlets, menus, numbering | tenancy | reservations/payments |
| Reservations | reservation intent, room-type allocation, source, guarantee | availability, guest | occupied-room lifecycle |
| Stays/PMS | check-in/out, room assignment/move, stay dates | reservations, housekeeping, folio | invoice mutation |
| Housekeeping | clean state, tasks, inspections | room occupancy, maintenance | commercial availability |
| POS/KOT | orders, items, KOTs, tables, kitchen status | menu, stay lookup, folio posting | final room invoice |
| Folio/Billing | charges, payments, allocations, invoices, refunds, credit notes | stay/order snapshots, tax | source-order editing |
| Operational day | business date, audit checklist, close/reopen | all summaries | arbitrary record rewriting |
| Maintenance | issues, work log, room block request/state | rooms, users | housekeeping clean state |
| Inventory hooks | item catalogue, locations, stock movements | menu/order events | procurement/accounting |
| Reporting | read models/exports | all scoped modules | source-of-truth writes |
| Notifications | templates, deliveries, preferences | domain events | domain decisions |
| Audit | immutable action records | actor and target metadata | business workflow state |

Cross-module commands use application services and database transactions. Modules do not directly mutate another module's tables except through documented service interfaces.

## 4. Tenancy and property scoping

### 4.1 Hierarchy

`Organization → Properties → Operational records`

- Organization-wide: organization, subscription placeholder, organization roles, shared guest matching option, user preferences.
- Property-scoped: room inventory, reservations, stays, folios, invoices, outlets, orders, taxes, printers, operational days, reports.
- Optional organization-shared master: guest profile. Guest access is still limited to users with access to at least one linked property; sensitive documents remain property-scoped.

### 4.2 Mandatory scoping rules

- Every property-scoped table contains non-null `organization_id` and `property_id`.
- IDs are UUID/UUIDv7/CUID2 and never encode tenant information.
- Request context contains authenticated `user_id`, selected `organization_id`, selected `property_id`, role grants, and request ID.
- API handlers never accept tenant scope as trusted authorization. They compare requested scope with server-derived memberships.
- Composite unique constraints include scope, for example `(property_id, room_number)` and `(property_id, financial_year, invoice_series, invoice_number)`.
- Background jobs carry explicit organization/property IDs and re-authorize service accounts.
- Object-storage keys start with random tenant/property prefixes; signed URLs are short-lived.
- Cross-property views require an organization-level permission and return aggregate data by default.
- PostgreSQL Row Level Security is recommended as defense in depth, with transaction-local tenant context. Application filters remain mandatory.

### 4.3 Property switcher

Users assigned to multiple properties see a persistent property switcher. Switching clears property-specific caches, open drafts, realtime subscriptions, and stale optimistic data. No form can be submitted after a scope switch without reconfirmation.

## 5. Roles and permissions

### 5.1 Built-in roles

- **Platform Support:** tightly controlled internal support; no financial export by default; impersonation requires reason and is audited.
- **Organization Owner:** all properties, organization settings, users, exports.
- **Property Admin/GM:** all operations and settings for assigned properties except organization ownership/billing.
- **Front Desk Manager:** reservations/stays/folios; overrides, refunds, room moves, audit close if granted.
- **Front Desk Agent:** daily reservation, check-in/out, payment collection; limited reversals.
- **Housekeeping Supervisor:** room state, task assignment, inspection, HK reports.
- **Housekeeping Attendant:** assigned tasks and room updates only.
- **F&B Manager:** menu, POS, discounts/void approval, outlet reports.
- **Waiter/Cashier:** tables, orders, KOTs, settlement within thresholds.
- **Kitchen:** view/print KOT, acknowledge, prepare, ready; no prices by default.
- **Maintenance Supervisor:** all issues, assignment, block request, reports.
- **Technician:** assigned issues, notes, status, resolution evidence.
- **Accountant/Auditor:** billing/report read and export; credit notes/refunds if explicitly granted.
- **Owner Viewer:** organization/property dashboards and reports, no guest-document access or writes.

Custom roles are post-V1; V1 allows per-user additive permission overrides only for exceptional approvals.

### 5.2 Permission matrix

Legend: `M` manage, `W` normal workflow write, `A` assigned-only write, `R` read, `P` approval/override, `—` none. Platform Support is governed separately.

| Capability | Org Owner | Admin/GM | FD Mgr | FD Agent | HK Sup | HK Att | F&B Mgr | Waiter | Kitchen | Maint Sup | Tech | Acct | Viewer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Org/properties/users | M | property M | R | — | — | — | — | — | — | — | — | R | R |
| Property configuration | M | M | R | R | R | — | outlet M | R | R | R | — | R | R |
| Reservations | M | M | M | W | R | — | R | room lookup | — | R | — | R | aggregate |
| Check-in/move/extend/out | M | M | M/P | W | R | — | room lookup | room lookup | — | R | — | R | aggregate |
| Guest PII/ID documents | M | M | M | W/R | limited R | — | name/room only | name/room only | — | limited R | — | R | — |
| Room status/HK tasks | M | M | M | W | M/P | A | R | — | — | R | — | R | R |
| POS/orders/KOT | M | M | R | room lookup | — | — | M/P | W | W status | — | — | R | aggregate |
| Folios/charges | M | M | M/P | W | — | — | R | post only | — | — | — | R | aggregate |
| Payment/settlement | M | M | M/P | W | — | — | M/P | W | — | — | — | R | aggregate |
| Void/refund/credit note | M/P | P | P | request | — | — | P | request | — | — | — | P if granted | — |
| Night audit close/reopen | M/P | P | P if granted | checklist | — | — | outlet close | outlet close | — | — | — | R/P | R |
| Maintenance | M | M | R | create/R | create/R | create | R | create | create | M/P | A | R | R |
| Reports/export | all | all property | ops/export | limited | HK | assigned | F&B | shift | KOT only | maint | assigned | finance/export | aggregate/export |
| Audit log | all | property | relevant | own/relevant | relevant | own | relevant | own | own | relevant | own | all finance | — |

### 5.3 Sensitive permissions

Separate permission keys: `guest.document.view`, `guest.document.upload`, `folio.adjust`, `discount.override`, `order.void`, `payment.refund`, `invoice.credit_note`, `night_audit.close`, `night_audit.reopen`, `report.export_pii`, `user.manage`, `support.impersonate`. Approval actions require reason and optional manager PIN/re-authentication.

## 6. Navigation and screen inventory

### 6.1 Global shell

**G01 Login:** email/phone, password or magic-link/OTP adapter, organization SSO placeholder; actions sign in/forgot; states invalid, locked, expired invite, MFA challenge; never reveal whether an account exists.  
**G02 Organization/property chooser:** accessible memberships, property status, search; choose/switch; empty state requests admin contact.  
**G03 App shell:** business date, property, global search, notifications, sync/realtime status, profile; warn on operational date lag and unsaved draft.  
**G04 My profile:** name, phone, locale, password/session management, notification preference; revoke other sessions.  
**G05 Notifications center:** type, property, time, read state, target; mark read/all read; expired target remains readable.  
**G06 Access denied/not found:** safe message, no existence disclosure across tenants, return action, request ID.

### 6.2 Setup and administration

| ID / screen | Purpose and key fields | Actions | States and edge cases |
|---|---|---|---|
| A01 Setup checklist | legal/property profile, rooms, tax, folio/invoice series, outlet/menu, printers, users | resume, validate, go live | draft/live; block go-live on no rooms, no active tax profile, invalid series |
| A02 Organization | legal/display name, PAN optional, address, logo, data-sharing policy | edit | only owner; changes audited |
| A03 Property profile | name, code, legal name, GSTIN, address/state code, phone/email, timezone, currency, check-in/out, audit cut-off | save, test tax identity | GSTIN format check only; legal advice disclaimer; immutable currency after transactions |
| A04 Users | name, email/phone, status, last active, property grants, role | invite, resend, suspend, revoke sessions | duplicate account joins via membership; cannot remove last owner/admin |
| A05 Roles/access | built-in role description and effective permission preview | assign, add permitted override | deny override wins; self-escalation forbidden |
| A06 Room types | code, name, capacity, extra capacity, bed, base occupancy, amenities, active | create/edit/archive | cannot archive when future inventory/reservations exist without mapping |
| A07 Rooms | number/name, floor/wing, type, phone, sort order, active | add/bulk import/edit/archive | unique per property; occupied room cannot archive |
| A08 Rate plans | name/code, room type, meal plan, base amount, occupancy adjustments, inclusions, valid dates/days, tax profile, cancellability | create/version/archive | existing reservation keeps rate snapshot; overlapping rates allowed by priority |
| A09 Tax profiles | name, supply type, SAC/HSN, CGST/SGST/IGST rates, inclusive flag, effective dates, ITC/premises note | create new version, activate | no edits after use; prevent gaps for sellable items |
| A10 Numbering | document type, prefix/template, next number, financial-year reset, property/outlet scope | preview, save | no reuse; changing next number requires permission and audit |
| A11 Outlets/tables | outlet name/code/type, service modes, floor sections; table name/capacity | add/edit/archive | open orders block table/outlet archive |
| A12 Menu | category, item, variant, SKU, price, tax profile, service charge eligibility, station, availability, inventory item/recipe hook | CRUD, bulk availability | used item archives; price/tax snapshot on order line |
| A13 Printers/stations | logical station, printer type, connection agent name, paper width, copies, fallback | test, route categories, enable | browser cannot directly guarantee silent print; show queued/failed/reprint |
| A14 Payment methods | cash/card/UPI/bank/OTA/credit, reference required, refund support, active | configure | system methods cannot be deleted after use |
| A15 Policies | cancellation/no-show text, discount limits, service charge, rounding, guest-document retention, folio windows | save/version | changes apply prospectively |
| A16 Audit log | actor, action, target, timestamp, property, reason, before/after diff, request/IP/device | filter/export/view | masked secrets/ID numbers; append-only |

### 6.3 PMS and front desk

| ID / screen | Purpose and fields | Main actions | States / edge cases |
|---|---|---|---|
| P01 Front-desk dashboard | arrivals, departures, in-house, dirty vacant, out-of-order, unsettled departures, audit alerts | open guest/stay/task | data as of selected business date; stale/realtime banner |
| P02 Room grid | room number/type/floor, occupancy, guest, due-out, HK state, maintenance block, balance | assign, check-in, move, mark HK, log issue | combined badges; maintenance/out-of-order supersedes sellable availability; filter/search |
| P03 Reservation calendar | date columns, room/room-type rows, reservations, blocks | create, drag date/room after confirm, open | conflict check server-side; unassigned reservations appear by room type |
| P04 Reservation list | confirmation, guest, dates, rooms, source, status, amount/deposit, balance | create, edit, cancel, no-show, export | pagination; saved filters; masked PII export permission |
| P05 Reservation create/edit | property, stay dates/times, rooms/count/type, rate plan, nightly rates, adults/children, primary guest, companions, source/channel/reference, company/agent text, guarantee, deposit, notes, ETA, preferences | quote, hold/save confirmed, take deposit, send confirmation | dates valid; availability; rate/tax snapshot; override overbooking with reason; edit restrictions after check-in |
| P06 Reservation detail | header/status, guest, room allocations, price/tax breakdown, deposits, notes, timeline | assign room, edit, cancel, no-show, check in, duplicate | partial room check-in/cancel; related stays displayed |
| P07 Guest search/profile | name, phone, email, nationality, address, GST billing details, stay history, preferences, blacklist warning, consent | create/merge request/edit | fuzzy duplicates; merge is privileged/post-V1 manual support; sensitive fields masked |
| P08 Check-in wizard | reservation/walk-in; guest/companions, ID type/last4/upload, address/nationality, dates, room, rate, deposit, registration card consent/signature hook | validate, assign, check in, print registration | room must be sellable or approved override; age/capacity; already checked-in idempotent response |
| P09 In-house stay | guest and room, dates, occupancy, rate, folio balance, HK, notes, timeline | move, extend, add guest, post charge, open folio, early checkout | concurrent update warning; restrictions after checkout |
| P10 Room move | current/new room, effective time/business date, reason, rate handling, move folio? | preview conflicts, confirm | target vacant/clean/inspected; old room becomes dirty; same stay retained; history immutable |
| P11 Stay extension/shorten | old/new departure, rate per added night, availability, reason | quote, confirm | room conflict; optionally propose move; checked-out stay cannot edit |
| P12 Arrivals/check-in queue | filters by date/status/ETA, assignment, deposit, guest completion | bulk assign, open check-in | never bulk check in; room readiness badge |
| P13 Departures/checkout queue | due-out, balance, pending KOT, room, late checkout | open folio/checkout | warns on open restaurant order/unposted charge |
| P14 Search | guest, phone last digits, confirmation, room, invoice | open scoped result | exact IDs prioritized; no cross-property result without permission |

### 6.4 Housekeeping

| ID / screen | Purpose and fields | Actions | States / edge cases |
|---|---|---|---|
| H01 HK board | rooms grouped by vacant/occupied and clean state; priority, attendant, due arrivals | assign, mark status, inspect | occupancy and HK status are separate; offline/stale warning |
| H02 Task list | room, task type, priority, assignee, due, status, notes | claim/start/complete/reassign | attendant sees assigned/claimable only; completion can require checklist |
| H03 Room task detail | checklist, linen/minibar counts hook, issues, photos, DND, timestamps | update, log maintenance/lost item, complete | DND blocks entry not task; photo limits; failed inspection reopens |
| H04 Supervisor inspection | room/checklist, attendant, defects | pass clean/inspected, fail with reason | only vacant inspected becomes arrival-ready if policy requires |
| H05 HK reports | turnaround, pending by age, attendant completion, discrepancy | filter/export | occupancy discrepancy flag needs acknowledgement |

Statuses: occupancy and sellability are never inferred solely from housekeeping. Checkout emits `DIRTY`; task completion emits `CLEAN`; inspection emits `INSPECTED`.

### 6.5 KOT/POS

| ID / screen | Purpose and fields | Actions | States / edge cases |
|---|---|---|---|
| F01 Outlet home/table map | business date/shift, tables, covers, order state, totals | open table, new takeaway/room service, close shift | table cannot have unintended multiple open orders; manager override supports it |
| F02 New order | mode, table/room, guest/stay, covers, waiter, notes | create | room service requires active stay; takeaway contact optional/configurable |
| F03 Order editor | menu search/categories, variants, qty, modifiers/free text, course, seat, price/tax, availability | add/update/remove unsent, send KOT, hold | sent item changes use cancel/void line; rapid duplicate submission idempotent |
| F04 KOT preview/status | KOT number, station groups, items, notes, created/accepted/ready times, print state | fire, reprint, cancel with approval | KOT immutable after fire; reprint labeled COPY; partial cancel creates cancellation ticket |
| F05 Kitchen display | queued/accepted/preparing/ready tickets, elapsed time, station | accept/start/ready/recall with reason | realtime reconnect; printed-only station can operate without KDS updates |
| F06 Open orders | mode/table/room, age, waiter, KOT state, amount | open, transfer table, merge | merge only compatible outlet/tax/customer; audit transfer |
| F07 Bill/settlement | lines, discounts, service charge, tax, rounding, split selector, payer, payment methods | preview bill, split, room post, direct settle, print | cannot post to checked-out/locked folio; pending items warning; overpayment policy |
| F08 Room posting dialog | room search, guest/stay confirmation, folio window, amount, signature/name/OTP hook, note | post | revalidate active stay and folio lock in one transaction; no room-number-only posting |
| F09 Direct POS invoice | customer/billing GSTIN/address, tax breakdown, payments | issue invoice | invoice becomes immutable; B2B details validation |
| F10 Shift close | opening cash optional, sales by method, refunds, expected/actual cash, variance/reason, open orders | reconcile, close | open orders must transfer/settle or approved carry; cannot edit closed shift |
| F11 POS history | orders/KOTs/bills, statuses, waiter, amount | view/reprint/request void/refund | void/refund permission and reason; original retained |

### 6.6 Folio, billing, and payment

| ID / screen | Purpose and fields | Actions | States / edge cases |
|---|---|---|---|
| B01 Folio | guest/company windows, dated charges, source, qty, tax, payments, allocations, balance | post charge, transfer, adjust, collect/refund, invoice, checkout | locked/issued rows immutable; pending async POS posting visible |
| B02 Manual charge | business date, charge code, description, qty, unit price, tax profile, folio window, reference, reason | post | backdate only open business date and permission; negative charges use adjustment flow |
| B03 Transfer/split | source lines/amount, destination window or related folio, reason | preview, transfer | same property only; preserve source and transfer links/tax snapshots |
| B04 Payment | amount, method, reference, payer, received date, notes | collect deposit/payment, allocate | positive amount; method rules; idempotency key; excess becomes unapplied deposit if allowed |
| B05 Refund/void | original payment, refundable balance, amount, method/reference, reason, approver | request/approve/execute | never delete original; async gateway failure status; cash permissions |
| B06 Checkout | charges review, unresolved orders, tax/customer identity, payment, folio windows, invoice preview, departure time | settle, issue invoice, check out, email/print | balance must meet tolerance or authorized city-ledger placeholder; atomic invoice + stay transition |
| B07 Invoice view | legal identity, unique number/date, recipient, line/tax breakdown, payment summary, QR/e-invoice placeholders | print/email/download, create credit note | immutable; reprints labeled duplicate/copy per policy; no regenerated values |
| B08 Credit note | original invoice, lines/amount/tax, reason, date, recipient | preview/issue | permission; unique series; cannot exceed remaining creditable amount |
| B09 Cashier ledger | shift/user, receipts/refunds by method, expected cash, variance | filter/export/reconcile | late/offline payment flagged; no silent method change after close |

### 6.7 Night audit and operational day

| ID / screen | Purpose and fields | Actions | States / edge cases |
|---|---|---|---|
| N01 Audit checklist | business date, arrivals not resolved, departures open, open KOT/orders, unposted room charges, out-of-balance folios, room/HK discrepancies, cashier shifts | resolve/open item, run preview | checks are repeatable and read-only |
| N02 Post room charges preview | eligible in-house stays, nightly rate/tax snapshot, already-posted flag, exceptions | post all/retry exception | unique `(stay, service_date, charge_type)` prevents double post |
| N03 Close business date | summary, unresolved override list/reasons, next date | close | serializable transaction/advisory lock; only one close; emits reports/snapshots |
| N04 Audit history | dates, closer, time, overrides, totals, reopen state | view/export/reopen if permitted | reopen creates audit event; issued invoices remain immutable; subsequent day blocks unsafe reopen |

V1 night audit posts room charges and advances the business date. It does not run accounting journal entries or automatically no-show/cancel without a user-confirmed policy action.

### 6.8 Maintenance and inventory hooks

| ID / screen | Purpose and fields | Actions | States / edge cases |
|---|---|---|---|
| M01 Issue board | number, asset/room/location, category, priority, status, assignee, SLA due | create/assign/filter | room block badge; overdue calculation |
| M02 Issue detail | description, reporter, photos, work notes, parts text, timestamps, block interval, resolution | start/pause/resolve/verify/reopen | technician cannot self-verify if policy; block conflict shown |
| M03 Room block | room, start/end, severity, reason, linked issue | request/approve/release | conflicts with reservation surfaced; block does not silently relocate guests |
| I01 Inventory catalogue | item code/name, category, unit, reorder level, active | CRUD/import | no balances promised unless movements used |
| I02 Locations/balances | outlet/store/location, calculated on-hand from movements | view/adjust with permission | negative stock warning/allow policy |
| I03 Stock movements | type, item, qty, from/to, source event, time, actor, reason | manual adjustment/transfer | immutable; reversal movement corrects; KOT consumption hook optional |

### 6.9 Dashboard and reports

**D01 Owner dashboard:** property/date filters; occupancy, rooms sold/available, ADR, RevPAR, room revenue, F&B revenue, taxes, discounts, receipts by method, outstanding folios, arrivals/departures, room status, maintenance open, comparison with prior period. Cross-property view shows comparable cards and a property table.  
**D02 Front office reports:** reservation/arrival/departure/in-house/no-show/cancellation, room status, guest ledger.  
**D03 Revenue reports:** revenue by business date/source/room type/rate plan/charge code; tax summary; payment summary; folio balance; refunds/voids/discounts.  
**D04 F&B reports:** outlet/menu category/item, order mode, waiter, KOT time, discounts, voids, settlement method.  
**D05 Audit reports:** night audit, cashier shift, transaction journal, document sequence gaps, privileged actions.  
Exports use CSV; invoice/registration/audit summaries use PDF/print CSS. Large exports are async with expiring download links.

## 7. Core workflows

### 7.1 Reservation

1. Agent selects dates, room types/count, occupants, and rate plan.
2. Availability service calculates physical inventory minus active allocations/blocks; holds are not required in V1 except transaction-duration locks.
3. Quote snapshots nightly base, discount, taxable value, tax profile/rates, inclusions, and total.
4. Agent selects/creates guest, adds source/reference, guarantee, notes, and deposit.
5. Server rechecks availability and writes reservation, room allocations, rate snapshots, folio shell/deposit in one transaction.
6. Confirmation number is assigned from a property sequence; event sends confirmation.
7. Modification recalculates only future/unconsumed nights after explicit quote acceptance.

States: `DRAFT → TENTATIVE | CONFIRMED → PARTIALLY_CHECKED_IN → CHECKED_IN → COMPLETED`; alternatives `CANCELLED`, `NO_SHOW`. Tentative expiry is optional scheduled-job behavior.

### 7.2 Walk-in and check-in

1. Start from room grid or check-in wizard; select dates/room type/rate.
2. Capture primary guest and required local-policy fields; warn on duplicates/blacklist.
3. Select a sellable, clean/inspected room. Authorized override captures reason.
4. Capture companions, ID metadata/upload, deposit, and registration acknowledgment.
5. Transaction creates/updates reservation, `Stay`, room assignment, folio, guest links; room occupancy becomes `OCCUPIED`.
6. Emit `stay.checked_in`, update grids, and optionally print registration card.

### 7.3 Room move

1. From in-house stay choose target room and effective time.
2. System checks target availability, clean state, blocks, capacity, and rate implications.
3. User chooses retain current rate or apply new room/rate prospectively; override requires permission.
4. Transaction closes old assignment, creates new assignment, leaves stay/folio identity intact, and marks old room dirty.
5. Emit room/HK events; never rewrite historical charge descriptions.

### 7.4 Stay extension/shortening

1. Select new checkout date/time.
2. Availability check includes the current room and proposed nights.
3. Quote additional/removed nights using selected rate; preserve posted charges.
4. If conflict exists, offer a room move from the conflict date.
5. Confirm updates reservation allocation, stay departure, and rate-night snapshots; notify HK/front desk.

### 7.5 Housekeeping room lifecycle

1. Checkout marks room `VACANT + DIRTY` and creates checkout-clean task.
2. Supervisor assigns; attendant starts and completes checklist.
3. Completion marks `CLEAN`; property policy may require inspection.
4. Supervisor passes to `INSPECTED` or fails to `DIRTY` with reason/new task.
5. Discovered defect opens maintenance issue. Severe issue requests/creates room block.
6. Check-in switches occupancy, not clean state; occupied service tasks can set `CLEAN` without making room sellable.

### 7.6 Dine-in KOT

1. Waiter opens table, covers, and order.
2. Adds item variants/modifiers; server snapshots price/tax/station.
3. `Send KOT` groups newly sent lines by station and assigns KOT numbers atomically.
4. Print agent/KDS receives tickets; failures remain queued and visible.
5. Kitchen acknowledges/prepares/marks ready; waiter gets realtime alert.
6. Further items generate incremental KOTs. Sent-line cancellation creates a cancellation KOT and audit entry.
7. Bill consolidates valid lines, discount/service charge/tax; direct settlement issues POS invoice.

### 7.7 Room service and F&B posting to room

1. Order begins with room lookup returning active stay and guest name—not room number alone.
2. KOT follows normal kitchen flow.
3. On settlement, server locks order and folio, revalidates stay is in-house and folio open, computes final totals, creates folio charge with order/bill snapshot, marks order `POSTED_TO_ROOM`, and commits atomically.
4. Retry uses idempotency key and returns existing posting.
5. If guest checked out/folio locked, posting fails safely; cashier chooses direct payment or manager-approved destination folio.

### 7.8 Takeaway

Create order with optional customer/contact, fire KOT, prepare, settle directly, issue invoice/receipt. No room link. Payment and invoice rules match POS direct settlement.

### 7.9 Checkout

1. Load folio windows and unresolved open orders/authorization holds.
2. Review charges; transfer/split only before invoice issue.
3. Confirm recipient legal/GST details and invoice preview.
4. Collect/allocate payment or use permitted settlement account placeholder.
5. In one transaction: validate balance tolerance; issue immutable invoice(s); mark folio window(s) closed; close stay and room assignment; mark room vacant/dirty; create HK task.
6. Emit checkout, invoice, and room events; print/email outside transaction with retry.

### 7.10 Payment, void, refund, and credit

- A payment is an immutable receipt event with allocations. Incorrect unissued payments may be voided only before external settlement/shift close; otherwise refund.
- Refund references original payment, has requested/approved/processed/failed state, and cannot exceed unrefunded amount.
- Charge void before invoice creates a reversal line; requires reason and threshold approval.
- After invoice issue, correction uses a credit note referencing the invoice; original invoice remains unchanged.
- Gateway calls occur outside the database transaction via outbox/job; unique provider reference and idempotency key prevent duplication.

### 7.11 Night audit basics

1. Run checklist and resolve or explicitly override permitted exceptions.
2. Post missing nightly room charges exactly once for eligible in-house stays.
3. Snapshot occupancy/revenue/payment/tax metrics.
4. Lock the operational date for ordinary backdated postings.
5. Advance property business date and emit completion event.
6. Reopen is exceptional, reasoned, audited, and does not unlock issued documents.

### 7.12 Maintenance issue

Any permitted user logs location/room, category, priority, description, and photo. Supervisor triages/assigns and optionally blocks room. Technician starts, adds work notes/parts text, resolves; supervisor verifies or reopens. Releasing a block prompts HK inspection before room returns to sellable inventory.

## 8. Data model

### 8.1 Common columns and conventions

Unless noted, entities have `id`, `organization_id`, `property_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, and optimistic `version`. Use `timestamptz` for instants, `date` for service/business dates, and `numeric(14,2)` or integer paise for money—choose one consistently (`OPEN`, recommendation: integer paise at application boundary plus PostgreSQL `numeric` totals). Soft deletion is `archived_at`; transactional records are never hard deleted.

### 8.2 Identity, tenancy, configuration

| Entity | Key fields | Relationships / constraints |
|---|---|---|
| Organization | legal_name, display_name, PAN, address_json, status | has properties/memberships |
| Property | code, legal_name, display_name, GSTIN, address/state_code, timezone, currency, checkin/checkout, audit_cutoff, business_date, status | unique org+code |
| User | name, email_norm, phone_norm, auth_subject, status, last_login | global identity |
| Membership | user_id, organization_id, status | unique user+org |
| PropertyGrant | membership_id, property_id, role_id | unique membership+property+role |
| Role | code, name, scope_type, built_in | has permissions |
| Permission | code, description, sensitivity | many-to-many RolePermission |
| PermissionOverride | user_id, property_id, permission_id, effect, expires_at, reason | deny wins |
| UserSession | user_id, token_hash/session_provider_id, expires_at, revoked_at, device | never store raw token |
| RoomType | code, name, capacity, extra_capacity, base_occupancy, bed_type, amenities_json, active | rooms/rates |
| Room | room_type_id, number, name, floor, wing, sort_order, active | unique property+number |
| RatePlan | code, name, meal_plan, cancellation_policy, priority, active | has versions |
| RatePlanVersion | rate_plan_id, room_type_id, effective_from/to, days_mask, pricing_json, tax_profile_id, inclusions_json | immutable after use |
| TaxProfile | name, supply_type, SAC_HSN, component_rates_json, inclusive, effective_from/to, premises_treatment, ITC_note, version | immutable after use |
| DocumentSequence | document_type, scope_key, financial_year, prefix, next_value, padding | unique scoped series; row locked |
| ChargeCode | code, name, category, revenue_group, tax_profile_id, active | room/manual charges |
| PaymentMethod | code, name, kind, reference_required, supports_refund, active | property configured |
| Outlet | code, name, type, supported_modes, service_charge_policy_id, active | tables/menu/printers |
| DiningTable | outlet_id, section, name, capacity, active | unique outlet+name |
| MenuCategory | outlet_id, name, sort_order, active | menu items |
| MenuItem | category_id, code, name, description, active, inventory_item_id nullable | has variants |
| MenuItemVariant | item_id, name, SKU, price, tax_profile_id, station_id, service_charge_eligible, active | price snapshot at order |
| ModifierGroup/Modifier | item mapping, min/max, name, price_delta, tax_profile_id, active | V1 simple modifiers |
| KitchenStation | outlet_id, code, name, active | printer/KDS route |
| PrinterRoute | station_id, agent_id, printer_name, paper_width, copies, fallback_station_id, active | logical; secrets external |
| PolicyVersion | type, effective_from, config_json, created_by | cancellation/rounding/limits/etc. |

### 8.3 Guests, reservations, and stays

| Entity | Key fields | Relationships / constraints |
|---|---|---|
| Guest | org_id, name, phone/email normalized, DOB optional, nationality, address_json, GSTIN/company optional, preferences, consent flags, risk_note | shared per org by policy |
| GuestDocument | guest_id, property_id, document_type, last4, issuer/country, expires_on, object_key, encrypted metadata, retention_until | no full number in logs/search |
| Reservation | confirmation_no, primary_guest_id, arrival/departure, status, source, channel_ref, guarantee_type, notes, total_snapshot, group_key | unique property+confirmation |
| ReservationRoom | reservation_id, room_type_id, assigned_room_id nullable, adults, children, status | one eventual Stay |
| ReservationNight | reservation_room_id, service_date, rate_plan_version_id, base, discount, taxable, tax, total, snapshot_json | unique allocation+date |
| ReservationGuest | reservation_id, guest_id, role, room_allocation_id nullable | companions |
| ReservationNote | reservation_id, category, text, visibility, author | append-only edits create revisions |
| Stay | reservation_room_id nullable, primary_guest_id, status, arrival_at, expected_departure_at, actual_departure_at, adults/children, folio_id | one active assignment |
| StayGuest | stay_id, guest_id, role, checkin/out timestamps | companion history |
| RoomAssignment | stay_id, room_id, starts_at, ends_at, move_reason, rate_handling | no overlapping active assignment per room |
| RoomBlock | room_id, type, starts_at, ends_at, status, reason, maintenance_issue_id | impacts availability |
| AvailabilityOverride | target_type/id, date range, reason, approved_by | overbook/unclean check-in evidence |

### 8.4 Housekeeping and maintenance

| Entity | Key fields | Relationships / constraints |
|---|---|---|
| RoomState | room_id, occupancy_status, housekeeping_status, sellability_status, DND_until, last_changed_at | one current projection; derived with rules |
| RoomStateHistory | room_id, from/to statuses, reason, source_type/id, actor, happened_at | append-only |
| HousekeepingTask | room_id, stay_id nullable, type, priority, assignee_id, due_at, status, checklist_template_id | status history |
| HKChecklistTemplate | name, room_type_id nullable, items_json, version | snapshot into task |
| HKTaskEvent | task_id, event_type, notes, checklist_result_json, photos, actor, happened_at | append-only |
| MaintenanceIssue | issue_no, room_id/location, asset_text, category, priority, status, reporter, assignee, SLA_due, description, resolution | unique scoped no. |
| MaintenanceEvent | issue_id, type, note, photos, parts_text, actor, happened_at | append-only |

### 8.5 POS/KOT

| Entity | Key fields | Relationships / constraints |
|---|---|---|
| POSShift | outlet_id, opened/closed by/at, opening_cash, expected_cash, actual_cash, variance, status | one open per cashier/outlet policy |
| Order | order_no, outlet_id, shift_id, mode, table_id, stay_id nullable, customer_name/contact, covers, waiter_id, status, totals snapshot | unique property/outlet series |
| OrderItem | order_id, menu_item/variant IDs, name snapshot, qty, unit_price, discount, tax, total, station_id, status, notes, course/seat | sent qty tracked |
| OrderItemModifier | order_item_id, modifier_id, name/price/tax snapshot, qty | immutable after send |
| KOT | kot_no, order_id, station_id, status, fired_at, accepted/ready_at, print_status, reprint_count | unique property/station series |
| KOTLine | kot_id, order_item_id, qty, action (`NEW/CANCEL`), notes_snapshot | immutable |
| POSDiscount | order/item target, type, value, amount, reason, rule_id, approved_by | audit threshold |
| POSBill | bill_no, order_id, customer snapshot, subtotal/discount/service/tax/rounding/total, status, invoice_id/folio_charge_id | settlement snapshot |
| PrintJob | document_type/id, station/printer, payload_hash, status, attempts, error, copy_reason | outbox-like |

### 8.6 Folio and finance

| Entity | Key fields | Relationships / constraints |
|---|---|---|
| Folio | stay_id, status, currency, opened/closed_at, balance projection | has windows/entries |
| FolioWindow | folio_id, name, payer_type, guest/company snapshot, status | invoice per window |
| FolioEntry | folio/window, service_date, posted_at, type, charge_code, description, qty, unit_amount, taxable, tax components, total, source_type/id, reversal_of_id, transfer_of_id, status | append-only; idempotent source key |
| Deposit | reservation_id/folio_id, payment_id, available_amount, status | allocation bridge |
| Payment | receipt_no, folio/order/reservation context, amount, method, reference, payer snapshot, status, received_at, idempotency_key | unique provider/reference as applicable |
| PaymentAllocation | payment_id, folio_window/invoice, amount, allocated_at, reversed_by | sum ≤ payment net |
| Refund | refund_no, payment_id, amount, method/reference, reason, status, approved_by, provider_ref | sum ≤ refundable |
| Invoice | invoice_no/series/FY, folio_window or POS_bill, issued_at/business_date, supplier/recipient snapshots, subtotal/tax/rounding/total, status, IRN/ack/QR placeholders, document_hash | immutable after `ISSUED` |
| InvoiceLine | invoice_id, source_entry_ids, description, SAC/HSN, qty, unit, taxable, discount, component tax rates/amounts, total | immutable snapshot |
| CreditNote | number/FY, invoice_id, issued_at, reason, recipient/tax/total snapshots, status | immutable after issue |
| CreditNoteLine | credit_note_id, invoice_line_id, taxable/tax/total credited | cumulative limit |
| FinancialApproval | action_type, target_id, requested_by, approved_by, amount, reason, status, timestamps | manager approval trail |

### 8.7 Operational, reporting, notifications, and audit

| Entity | Key fields | Relationships / constraints |
|---|---|---|
| OperationalDay | business_date, status, opened/closed_at/by, overrides_json | unique property+date |
| NightAuditRun | operational_day_id, status, checklist snapshot, totals snapshot, started/completed by/at | retry-safe |
| MetricSnapshot | property/date, metric_code, dimensions_json, value | dashboard acceleration |
| InventoryItem | code, name, category, unit, reorder_level, active | optional menu link |
| InventoryLocation | code, name, type, active | property-scoped |
| StockMovement | item, type, qty, from/to, source_type/id, reversal_of, reason, happened_at | immutable |
| Notification | recipient_user, type, title/body, target, read_at, expires_at | in-app |
| NotificationDelivery | notification/template, channel, destination masked, status, attempts, provider_ref/error | no secrets |
| OutboxEvent | event_id, aggregate_type/id, event_type/version, payload, occurred_at, published_at, attempts | written with domain transaction |
| IdempotencyRecord | scope/user, key, request_hash, response_ref, expires_at | mutation retry safety |
| AuditLog | actor/effective actor, action, target, org/property, reason, before/after redacted JSON, request/IP/device, occurred_at, hash optional | append-only partition candidate |
| DataExport | type, filters redacted, requester, status, object_key, expires_at | permission snapshot |

## 9. Enumerations and state machines

| Domain | Values |
|---|---|
| Organization/Property | `TRIAL`, `ACTIVE`, `SUSPENDED`, `ARCHIVED` |
| User/Membership | `INVITED`, `ACTIVE`, `SUSPENDED`, `REVOKED` |
| Reservation | `DRAFT`, `TENTATIVE`, `CONFIRMED`, `PARTIALLY_CHECKED_IN`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| Reservation room | `HELD`, `CONFIRMED`, `CHECKED_IN`, `CANCELLED`, `NO_SHOW`, `COMPLETED` |
| Stay | `DUE_IN`, `IN_HOUSE`, `DUE_OUT`, `CHECKED_OUT`, `CANCELLED` |
| Occupancy | `VACANT`, `OCCUPIED` |
| Housekeeping | `DIRTY`, `CLEANING`, `CLEAN`, `INSPECTED`, `PICKUP`, `DND` (DND is a flag if implementation permits) |
| Sellability | `SELLABLE`, `OUT_OF_ORDER`, `OUT_OF_SERVICE`, `BLOCKED` |
| HK task | `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `FAILED_INSPECTION`, `CANCELLED` |
| Order | `DRAFT`, `OPEN`, `KOT_SENT`, `PARTIALLY_READY`, `READY`, `BILLED`, `POSTED_TO_ROOM`, `PAID`, `VOIDED`, `CANCELLED` |
| Order item | `DRAFT`, `SENT`, `PREPARING`, `READY`, `SERVED`, `CANCEL_REQUESTED`, `CANCELLED` |
| KOT | `QUEUED`, `PRINTED`, `ACKNOWLEDGED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`, `PRINT_FAILED` |
| Folio/window | `OPEN`, `LOCKED`, `INVOICED`, `CLOSED`, `REOPENED` |
| Folio entry | `POSTED`, `REVERSED`, `TRANSFERRED` |
| Payment | `PENDING`, `SUCCEEDED`, `FAILED`, `VOIDED`, `PARTIALLY_REFUNDED`, `REFUNDED` |
| Refund | `REQUESTED`, `APPROVED`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `REJECTED` |
| Invoice/credit note | `DRAFT`, `ISSUED`, `CANCELLED` only if legally permitted; otherwise credited |
| Operational day | `OPEN`, `CLOSING`, `CLOSED`, `REOPENED` |
| Maintenance | `REPORTED`, `TRIAGED`, `ASSIGNED`, `IN_PROGRESS`, `ON_HOLD`, `RESOLVED`, `VERIFIED`, `CLOSED`, `REOPENED`, `CANCELLED` |
| Priority | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| Print/delivery job | `QUEUED`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `DEAD_LETTER` |

Illegal transitions return `409 Conflict` with current state and allowed actions.

## 10. Business rules and validation

### 10.1 General

- All mutations require authorization, scope, schema validation, idempotency for create/settle/post endpoints, and audit where relevant.
- Dates/times render in property timezone; database stores UTC instants. Business date is explicit, never derived only from wall-clock date.
- Money calculations use decimal-safe arithmetic; line rounding and invoice rounding policy are versioned and snapshotted.
- No floating-point JavaScript arithmetic for posted money/tax.
- Optimistic concurrency uses `version`; stale updates receive `409` and latest record.
- Free text is length-limited and escaped; uploads are type/size checked, malware-scanned if service available, and private.

### 10.2 Availability/stay

- `arrival < departure`; at least one room and one adult unless policy allows otherwise.
- Capacity cannot exceed room type without approved override.
- Availability counts active reservation-room allocations, in-house assignments, and commercial blocks; cancelled/no-show allocations do not count.
- A physical room cannot have overlapping active assignments or blocks that disallow occupancy.
- Check-in requires confirmed/walk-in reservation, assigned room, guest minimum fields, room sellability, and clean/inspected policy.
- Checkout requires no balance outside tolerance and no unresolved hard blocker.
- Room move uses effective-dated assignments; never changes past assignment rows.

### 10.3 POS and folio

- Menu price/tax changes affect only newly added lines; existing sent lines keep snapshots.
- A fired KOT is immutable; changes create new tickets/actions.
- Discounts cannot make a line taxable value negative; thresholds require approval.
- Service charge is a configurable commercial charge, displayed separately, and snapshotted.
- Room posting requires `IN_HOUSE` stay, open folio window, same property, compatible currency, and unposted order.
- Exactly one successful settlement path per POS bill; room post/direct payment compete under a row lock.
- Folio entry total equals taxable + tax + non-tax charges + rounding as defined; reversal equals original components proportionally/full.

### 10.4 Payments and documents

- Receipt/invoice/credit-note numbers are unique, sequential within configured series, and never reused after rollback; sequence gaps are reportable with reason.
- Issued document snapshots cannot change when property/customer/tax configuration changes.
- Refunds and credits cannot exceed remaining eligible amount.
- Payment reference is required for card/UPI/bank/OTA methods unless configuration says otherwise.
- Cash received/returned affects the open cashier shift of the actor.

## 11. India GST design requirements (V1)

This section is product design, not tax advice. Hotels must confirm configuration with their tax professional.

### 11.1 Configurable treatment

- Store GSTIN, legal name/address, state and state code per property/registration.
- Tax profiles are effective-dated and immutable after use; support CGST+SGST/UTGST and IGST component structures.
- Accommodation and restaurant supplies can have different profiles and SAC codes.
- Do not determine restaurant treatment solely from today's room tariff. From 1 April 2025, the specified-premises treatment can depend on prior-financial-year accommodation value or an opt-in declaration; keep a per-property, per-financial-year `premises_treatment` and evidence note.
- Ship editable templates reflecting commonly applicable accommodation treatment (12% up to ₹7,500 value of supply per unit/day and 18% above) and restaurant treatment (often 5% without ITC outside specified premises; 18% with ITC at specified/opted premises), but require property confirmation before activation.
- Tax-exclusive and tax-inclusive pricing are both supported. The invoice stores component rates/amounts per line.
- Place-of-supply and interstate component selection is configuration/rule driven and manually reviewable for V1.

### 11.2 Invoice data and lifecycle

Tax invoice rendering supports supplier name/address/GSTIN; unique financial-year serial (maximum format constraints configurable); issue date; registered recipient name/address/GSTIN/UIN; unregistered recipient/address/state details when required/requested; SAC/HSN; description; quantity/unit where relevant; gross and taxable values; discount; tax rates and component amounts; place of supply for interstate supply; delivery address where relevant; reverse-charge indicator; signature/digital-signature placeholder; payment summary; and original invoice reference on credit notes.

Property policy determines invoice vs receipt/bill of supply. V1 stores IRN, acknowledgement number/date, signed QR payload, and e-invoice status fields for future/provider integration. It does not submit returns. E-invoice eligibility is an organization configuration and compliance warning; B2B export/API adapter is isolated from invoice generation.

### 11.3 Rounding and mixed supply

- Calculate taxes at line level using the snapshotted profile; aggregate by component/rate for display.
- Keep room and restaurant charge lines distinct on a consolidated folio invoice.
- Rounding is a separate line and must not hide a reconciliation difference.
- Discounts are allocated to affected lines before tax according to configured policy.
- Credit notes reproduce the original tax components for credited lines.

Primary design references: [CBIC GST service rates](https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html), [CBIC Rule 46 tax-invoice particulars](https://cbic-gst.gov.in/pdf/cgst-rules-30122017.pdf), [CBIC invoice and credit/debit-note rules](https://cbic-gst.gov.in/gst-invoice-rules.html), and the [55th GST Council recommendations effective from 1 April 2025](https://cbic-gst.gov.in/pdf/Press-Release%20-55-GST-Council.pdf). Configuration must be revalidated before production launch.

## 12. Printing and KOT architecture

- Treat printing as an asynchronous delivery, not proof of order creation.
- Recommended V1: a lightweight on-premise print agent maintains an authenticated outbound WebSocket/HTTPS connection, advertises logical printers, receives signed short-lived jobs, prints via OS driver/ESC-POS, and acknowledges result.
- Alternative browser print is supported manually but cannot promise silent routing.
- KOT payload contains property/outlet, KOT no., type (`NEW/CANCEL/COPY`), table/room/order, server, timestamp/business date, station, item qty/name/modifiers/notes, and barcode/QR optional.
- A KOT is partitioned by station. Each station can have primary/fallback printer and copy count.
- Print retries do not create new KOTs. Reprints require reason and are labeled `COPY` with reprint time/user.
- UI always distinguishes `KOT created`, `queued`, `printed`, and `failed`; kitchen operations may continue after explicit acknowledgement of printer failure.
- No card data is sent to kitchen printers.

## 13. Realtime events and notifications

### 13.1 Event envelope

`event_id`, `event_type`, `version`, `occurred_at`, `organization_id`, `property_id`, `actor_id`, `aggregate_type`, `aggregate_id`, `correlation_id`, and minimal redacted `payload`.

Events are written to an outbox in the same transaction as the domain change, published at least once, and consumers are idempotent. Web clients subscribe only to authorized property channels; authorization is rechecked on reconnect.

### 13.2 V1 event catalogue

- `reservation.created|updated|cancelled|no_show`
- `stay.checked_in|moved|extended|checked_out`
- `room.state_changed|blocked|unblocked`
- `housekeeping.task_created|assigned|completed|inspection_failed`
- `order.created|updated|settled|voided`
- `kot.fired|print_failed|acknowledged|ready|cancelled`
- `folio.entry_posted|reversed|balance_changed`
- `payment.succeeded|failed|refunded`
- `invoice.issued|credit_note_issued`
- `maintenance.reported|assigned|overdue|resolved|verified`
- `operational_day.closed|reopened`
- `notification.created`

### 13.3 Notifications

| Trigger | Default recipients | Channels |
|---|---|---|
| Arrival room not ready within configured ETA | front desk + HK supervisor | in-app |
| KOT ready / print failed | waiter/cashier + F&B manager on failure | in-app, KDS |
| Urgent maintenance / room block | maintenance supervisor + GM + front desk | in-app; external adapter optional |
| Pending departure balance/open order | front desk | in-app |
| Audit unresolved near cut-off | FD manager/GM/accountant | in-app/email |
| Refund/void approval requested | permitted approvers | in-app |
| Reservation confirmation/invoice | guest | email/SMS/WhatsApp adapter by consent |

Delivery failures never roll back the business transaction; they retry and surface in a delivery log.

## 14. API and module interfaces

### 14.1 Style

Use versioned REST/JSON (`/api/v1`) for explicit, testable module boundaries. Next.js route handlers/BFF may serve the web app; domain services remain framework-independent. OpenAPI is generated/maintained as a contract. Mutations accept `Idempotency-Key`; all responses include `requestId`.

### 14.2 Endpoint groups

- `/auth`, `/me`, `/organizations`, `/properties`, `/users`, `/roles`
- `/properties/:propertyId/config/*`
- `/availability/quote`, `/reservations`, `/reservations/:id/*`
- `/stays`, `/stays/:id/check-in|move|extend|checkout`
- `/rooms`, `/rooms/:id/state`, `/housekeeping/tasks`
- `/outlets/:id/orders`, `/orders/:id/items|fire-kot|settle|post-to-room|void`
- `/kots/:id/status|reprint`, `/print-jobs`
- `/folios/:id`, `/folios/:id/entries|payments|transfers`, `/payments/:id/refund`
- `/invoices`, `/invoices/:id/credit-notes`
- `/operational-days/:date/checks|post-room-charges|close|reopen`
- `/maintenance/issues`, `/inventory/items|movements`
- `/reports/:reportCode`, `/exports`, `/dashboard`
- `/audit-logs`, `/notifications`

### 14.3 Required service commands

`quoteReservation`, `createReservation`, `assignRoom`, `checkInStay`, `moveRoom`, `extendStay`, `checkoutStay`, `transitionRoomState`, `fireKOT`, `cancelKOTLine`, `settleOrder`, `postOrderToFolio`, `postFolioEntry`, `collectPayment`, `refundPayment`, `issueInvoice`, `issueCreditNote`, `runNightAuditChecks`, `postNightlyCharges`, `closeOperationalDay`, `logMaintenanceIssue`, `blockRoom`.

Each command defines input schema, permissions, allowed state, transaction boundary, idempotency behavior, audit event, domain events, and error codes.

### 14.4 Error contract

```json
{
  "error": {
    "code": "ROOM_NOT_AVAILABLE",
    "message": "Room 203 is no longer available for these dates.",
    "fieldErrors": { "roomId": "conflict" },
    "retryable": false,
    "requestId": "req_...",
    "details": { "allowedActions": ["select_another_room"] }
  }
}
```

Use `400` malformed, `401` unauthenticated, `403` denied, `404` safely not found, `409` state/concurrency conflict, `422` domain validation, `429` rate limit, `503` transient dependency.

## 15. UX system states

- **Loading:** skeleton for dashboards/lists; button-local progress for mutations; never blank the room grid during refresh.
- **Empty:** explain why and provide the permitted primary action (for example, “No arrivals today”). Setup empties link to setup only for admins.
- **Error:** plain message, retry if safe, request ID, preserve unsaved input. Never show stack traces or sensitive identifiers.
- **Offline/disconnected:** persistent status; read cache labeled with last updated time. Disable unsafe financial/check-in mutations unless queued semantics are explicitly implemented.
- **Stale/conflict:** show what changed and allow reload/reapply; never silently overwrite.
- **Permission denied:** hide irrelevant navigation, but server still enforces. Disabled approval action explains required role.
- **Partial success:** business commit remains successful when print/email fails; show retry action.
- **Destructive action:** confirmation includes target, impact, reason field, and approval status.
- **Long-running export/audit:** job progress with safe navigation away and notification on completion.

Accessibility baseline: keyboard-accessible common workflows, visible focus, semantic labels, status text in addition to color, WCAG AA contrast, 44px touch targets on operational screens.

## 16. Reporting definitions

All revenue metrics use `business_date` and posted, non-reversed entries unless stated. Dashboard displays “as of” time and timezone.

| Metric | Definition |
|---|---|
| Available room nights | Active rooms minus out-of-order commercial blocks for date; policy clearly states whether house-use excluded |
| Rooms sold | Distinct occupied/sold room assignments for service date, excluding complimentary only if filter applied |
| Occupancy % | rooms sold ÷ available room nights × 100 |
| Room revenue | taxable + non-tax room charge value before GST; discounts included as reductions |
| ADR | room revenue ÷ rooms sold |
| RevPAR | room revenue ÷ available room nights |
| F&B revenue | posted POS food/beverage/service revenue before GST, net of discounts/voids |
| Gross revenue | net posted charge value including configured charges, excluding GST unless toggle says gross-with-tax |
| Receipts | successful payments minus successful refunds in period, separate from revenue |
| Outstanding folio | positive open folio balances as of timestamp |
| Average length of stay | occupied room nights ÷ completed stays/rooms in cohort |
| Cancellation/no-show rate | respective reservation rooms ÷ eligible confirmed reservation rooms |
| HK turnaround | clean/inspected timestamp minus checkout timestamp |
| KOT preparation time | ready timestamp minus fired timestamp; show median/P90 |
| Maintenance resolution time | resolved minus reported, paused time optionally excluded by policy |

Reports reconcile to a transaction journal. Filters: property, business-date range, room type, source, outlet, revenue group, payment method, user/shift as relevant. Cross-property totals reject mixed currencies.

## 17. Security, privacy, and isolation

- Use a managed identity provider or audited auth library; Argon2id/bcrypt if passwords are owned. Secure, HttpOnly, SameSite cookies; CSRF protection for cookie mutations.
- Optional MFA in V1 for owners/admins/financial approvers; design schema and step-up hooks now.
- TLS everywhere; encryption at rest; application/KMS encryption for full document identifiers and sensitive notes.
- Never store card PAN/CVV. Store provider token/reference and non-sensitive last4/network only.
- Short-lived signed upload/download URLs; private buckets; file allow-list and scan pipeline.
- PII access is permissioned and logged. Mask phone/email/GSTIN/document data in lists and logs according to role.
- Tenant/property context is enforced in repository layer, PostgreSQL RLS defense, realtime channel authorization, cache keys, search indexes, jobs, object keys, and exports.
- Rate-limit login, guest search, exports, refunds, and support access.
- Audit privileged actions, authentication changes, exports, guest-document views, financial mutations, configuration/tax/sequence changes, and support impersonation.
- Backups encrypted and restoration tested. Define RPO 15 minutes/RTO 4 hours as V1 production target (`OPEN` commercial confirmation).
- Retention: configurable guest-document retention; legal financial records retained per hotel policy/law; deletion requests anonymize where retention does not require preservation.
- Support impersonation is time-bound, bannered, reasoned, and includes both real/effective actor.
- Secrets use a secret manager; no secrets in source, database JSON, client bundles, print payload logs, or error telemetry.
- Dependency scanning, static analysis, migration review, and pre-production penetration test required.

## 18. Suggested technical architecture

### 18.1 Deployable shape

- **Web/BFF:** Next.js App Router, React, TypeScript, responsive PWA shell; Server Components for read-heavy screens and client components for grids/POS interaction.
- **Domain API:** initially a modular monolith in the same repository/process boundary or a separate Node service. Recommendation: separate packages, one deployable API to keep transactions simple.
- **Database:** PostgreSQL with Prisma ORM; SQL migrations reviewed; raw SQL allowed for exclusion constraints, RLS, advisory locks, and reports.
- **Jobs/queues:** Redis-backed queue or managed equivalent for print, notifications, exports, metric snapshots, and outbox publishing.
- **Realtime:** managed WebSocket service or Node gateway consuming outbox events; property-scoped channels.
- **Storage:** S3-compatible private object storage for IDs, photos, PDFs/exports.
- **Observability:** structured redacted logs, OpenTelemetry traces, metrics, error tracking, audit store.
- **Print agent:** separately versioned small desktop/service app with outbound secure connection.

The official [Next.js App Router documentation](https://nextjs.org/docs/app) supports the selected routing/rendering model. Prisma supports ACID transaction patterns needed for dependent writes and interactive workflows; use its [transaction guidance](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) and PostgreSQL constraints/RLS where ORM abstractions are insufficient.

### 18.2 Repository layout

```text
apps/web                 Next.js UI/BFF
apps/api                 optional dedicated API deployable
apps/print-agent         local print bridge
packages/domain          entities, policies, commands, errors
packages/db              Prisma schema, migrations, tenant repositories
packages/contracts       OpenAPI schemas, event schemas, generated clients
packages/ui              design system
packages/config          lint, TypeScript, environment schemas
packages/testkit         factories, fixtures, tenant-isolation helpers
```

### 18.3 Transaction and consistency strategy

- PostgreSQL is source of truth; projections are rebuildable.
- Use database transactions for reservation allocation, check-in/move/checkout, KOT fire, settlement, room posting, invoice issue, refund recording, and day close.
- Use unique constraints/idempotency rows to make retries safe.
- Use row locks/advisory locks for document sequences, room assignment, order settlement, folio posting, and night audit.
- Use outbox pattern for realtime, printing, email, and integrations.
- Prefer `READ COMMITTED` for ordinary CRUD; `SERIALIZABLE` or explicit locking for oversell/day-close critical sections with bounded retry.
- Cache configuration/read models only with property-prefixed keys and event invalidation.

### 18.4 Environments and delivery

Local, test, staging, production; per-environment databases/buckets/keys. Migrations are forward-only with expand/migrate/contract for high-risk changes. Feature flags are organization/property scoped. CI runs typecheck, lint, unit, integration, migration, contract, authorization, and E2E smoke tests.

## 19. Phased implementation and acceptance criteria

### Phase 0 — Foundation and tenancy

Build shell, auth, organizations/properties, users/roles, audit, request context, database conventions, design system, CI/observability.

**Acceptance:**
- User sees only assigned properties; automated cross-tenant matrix passes for read/write/export/realtime.
- Owner can invite/suspend users and assign built-in roles without removing last owner.
- Every privileged configuration change produces redacted audit entry.
- Scope switch invalidates property data and draft submissions.

### Phase 1 — Property, room, rate, and tax setup

Build setup checklist, room types/rooms, rate/tax/policies/numbering.

**Acceptance:**
- Admin can configure a 20–150-room property and activate it.
- Used rate/tax versions cannot be silently edited.
- Duplicate room/document sequence constraints hold under concurrency.
- Tax-inclusive and exclusive quote fixtures reconcile to expected paise.

### Phase 2 — Reservations and availability

Build guest basics, quotes, reservation CRUD, calendar/list, cancellation/no-show.

**Acceptance:**
- Two concurrent attempts cannot allocate the last room without explicit override.
- Multi-room reservation supports partial assignment/cancellation.
- Modification preserves consumed snapshots and produces correct revised quote.
- Confirmation, cancellation, and no-show states and permissions are tested.

### Phase 3 — Check-in, stays, room grid

Build check-in/walk-in, assignments, in-house screen, move/extend, guest documents.

**Acceptance:**
- Check-in atomically creates stay/folio/assignment and updates all subscribed grids.
- Unclean/blocked/conflicting room is rejected unless correct override is captured.
- Move preserves history, marks old room dirty, and does not duplicate folio.
- Extension rejects conflicts and quotes added nights correctly.

### Phase 4 — Housekeeping and maintenance hooks

Build HK board/tasks/inspection and maintenance issue/block.

**Acceptance:**
- Checkout-to-dirty-to-clean-to-inspected flow works with role restrictions.
- Attendant cannot edit unassigned restricted tasks; supervisor can reassign/fail.
- Severe issue blocks availability without changing historical occupancy.
- Releasing block prompts required HK state before sellable.

### Phase 5 — Folio, charges, payments, invoice

Build folio windows/entries, deposits, payments, checkout, invoice/credit/refund primitives.

**Acceptance:**
- Folio always reconciles entries, allocations, refunds, and balance to paise.
- Issued invoice remains byte/value stable after master-data edits.
- Duplicate payment/checkout retry returns original success, not a duplicate.
- Refund/credit limits and approval thresholds hold under concurrency.
- Invoice fixtures include configured Rule 46 fields and correct tax summaries.

### Phase 6 — POS/KOT and printing

Build outlets/tables/menu/order/KOT/KDS/print agent/settlement.

**Acceptance:**
- Five-item order can be fired in target time and routes items to correct stations.
- Fired KOT cannot be edited; cancellation/reprint evidence is retained.
- Print failure is visible/retryable and does not duplicate KOT/order.
- Direct, split, and room-post settlements reconcile; exactly one final settlement wins.
- Room posting rejects checked-out/wrong-property stays atomically.

### Phase 7 — Night audit, reports, dashboards

Build audit checklist/charge posting/day close, core reports and snapshots.

**Acceptance:**
- Nightly charge is posted once per stay/service date even after retry.
- Two simultaneous closes yield one success and one safe conflict.
- Closed date blocks unauthorized backdating; reopen is reasoned/audited.
- Dashboard metrics reconcile with seeded transaction journal and cross-property currency rules.
- CSV exports honor filters, permission masking, and tenant scope.

### Phase 8 — Hardening and pilot

Performance, accessibility, backup restore, security tests, printer burn-in, pilot migration/support.

**Acceptance:**
- 150-room grid and 500 open/arriving records meet agreed p95 response target (`OPEN`: recommend reads <1.5s, mutations <1s excluding external delivery).
- Restore drill meets RPO/RTO; audit/export evidence available.
- Pilot completes seven consecutive business days with no unreconciled critical data defect.
- Go-live, rollback, support, and incident runbooks are approved.

## 20. Seed/demo data

Create deterministic organization **Brahmaputra Hospitality Pvt Ltd** with:

- **Property 1:** Riverbend Hotel Guwahati, 48 rooms, GST-registered Assam profile, INR, audit cut-off 03:00.
- **Property 2:** Pineview Retreat Shillong, 30 rooms, Meghalaya profile, distinct tax/number series.
- Room types: Standard, Deluxe, Executive, Suite; floors 1–4; rooms including one out-of-order and varied HK states.
- Rate plans: BAR Room Only, Breakfast Included, Corporate Fixed; weekday/weekend and tax-inclusive examples.
- Users: one for every built-in role, with clearly non-production credentials generated at seed time.
- 25 guests with duplicates/companions/company GST example; no real PII.
- Reservations covering confirmed, tentative, cancelled, no-show, arrival, in-house, due-out, multi-room, overbooking warning.
- Stays with folio windows, deposits, room move history, extension, F&B charge, partial payment.
- Outlet: River Café with 12 tables; room service and takeaway; 30 menu items, variants/modifiers, kitchen/bar stations.
- KOTs in queued/preparing/ready/print-failed states; one cancellation/reprint.
- Payments across cash/card/UPI/OTA; one partial refund; one invoice and credit note.
- HK tasks in all states; urgent AC issue with room block; normal plumbing issue.
- 14 operational days with snapshots for comparison charts and one audit override.
- Inventory hooks: linen, toiletries, cleaner, rice, tea, water; locations Main Store/Housekeeping/Café; sample movements.

Seeds must be repeatable, tenant-isolated, and resettable only in non-production.

## 21. Test strategy

### 21.1 Test layers

- **Unit/property tests:** money/tax/rounding, availability, capacity, state transitions, permission resolution, dashboard formulae.
- **Database integration:** constraints, migrations, RLS, repositories, locks, sequence behavior, transaction rollback, idempotency.
- **API contract:** OpenAPI request/response/error compatibility and event-schema versioning.
- **Authorization:** generated role × endpoint × tenant/property matrix; IDOR tests; export/realtime/object-storage isolation.
- **E2E:** reservation→check-in→room service→folio→payment→checkout→HK; dine-in direct payment; move/extend; refund/credit; audit close.
- **Concurrency:** last-room allocation, room assignment, duplicate KOT fire, double settlement/posting, refund limit, document numbering, day close.
- **Printer:** routing, agent disconnect, duplicate delivery, fallback, reprint/cancel label, 58/80mm snapshots.
- **Visual/accessibility:** core screens at desktop/tablet; keyboard workflows; color-independent statuses; PDF/print golden files.
- **Security:** dependency/SAST/secret scan, auth/session/CSRF/rate-limit tests, upload abuse, log redaction, penetration test.
- **Performance:** 150 rooms, 3 years reservations, 1M folio/order lines; p95 and queue recovery.
- **Recovery:** database point-in-time restore, object restore, outbox replay, failed job/dead-letter replay.

### 21.2 Critical invariant tests

1. No query/mutation/event/export can cross organization/property scope.
2. No room has overlapping active assignments.
3. No source order posts twice to a folio or settles twice.
4. No issued financial document mutates.
5. Refund/credit never exceeds eligible original value.
6. Folio balance equals posted non-reversed charges minus net allocated payments.
7. Document identifiers never repeat in a scoped financial year.
8. Nightly room charge never duplicates for stay/service date.
9. Closed operational day cannot receive ordinary backdated writes.
10. Realtime or printer retry cannot change business outcome.

## 22. Operational readiness

- Feature flags for POS, night audit, credit notes, and external notifications.
- Health checks for app, DB, queue, realtime, storage, print agents; property-specific degraded-state banner.
- Alert on failed settlement jobs, print failure rate, outbox backlog, sequence conflicts, audit lateness, backup failure, and cross-tenant policy violation.
- Runbooks: payment uncertainty, printer outage, wrong room posting, guest checkout rollback boundary, invoice correction, reopen day, suspected data exposure.
- Support diagnostics expose request/event IDs and redacted timelines, never raw sensitive documents.

## 23. Open decisions and assumptions log

Every item receives an owner, due phase, decision date, rationale, and spec sections affected. Default enables implementation until decided unless marked blocker.

| ID | Decision / assumption | Default recommendation | Due | Blocker? |
|---|---|---|---|---|
| OD-001 | Product name/branding | Working name “Hotel OS” | Pilot | No |
| OD-002 | Full offline POS/KOT | Online-first with idempotent retry and print-agent buffering | Before Phase 6 | Pilot risk |
| OD-003 | Auth provider and MFA | Managed provider; MFA required for privileged roles | Phase 0 | Yes |
| OD-004 | Shared guest across properties | Org-shared profile, property-scoped documents/history access | Phase 2 | Yes |
| OD-005 | Money storage | PostgreSQL numeric totals + decimal library; API decimal strings | Phase 1 | Yes |
| OD-006 | Room inspection required | Configurable; default required for checkout cleans | Phase 4 | No |
| OD-007 | Multiple folio windows | Support guest/company windows in V1 | Phase 5 | Yes |
| OD-008 | City ledger/company credit | Settlement-account placeholder only; full AR post-V1 | Phase 5 | No |
| OD-009 | GST/e-invoice provider | Fields/export now; provider integration after pilot need confirmed | Phase 5 | Legal review |
| OD-010 | Invoice timing for room-posted F&B | Consolidated checkout invoice by default; property/legal review | Phase 5 | Yes |
| OD-011 | Service charge rules | Property-configured, explicit line, item eligibility | Phase 6 | No |
| OD-012 | Split bill depth | Split by item/amount/payment; no cross-order complex split | Phase 6 | No |
| OD-013 | Print agent technology | Small signed Windows service first; 80mm ESC/POS | Phase 6 | Yes |
| OD-014 | Night audit auto actions | User-confirmed, not automatic no-show/departure | Phase 7 | No |
| OD-015 | Backdated posting after close | Manager reopen or next-day adjustment; never silent | Phase 7 | Yes |
| OD-016 | RPO/RTO | 15 minutes / 4 hours | Pilot | Commercial |
| OD-017 | PII/document retention | Configurable with India legal/privacy review | Pilot | Legal |
| OD-018 | Performance SLO | p95 read 1.5s, mutation 1s excluding delivery | Phase 8 | No |
| OD-019 | WhatsApp/SMS vendor | Adapter only until hotel demand/vendor chosen | Pilot | No |
| OD-020 | Inventory depletion point | On KOT fire or bill settlement; recommend settlement in V1 | Phase 6 | No |
| OD-021 | Complimentary/house-use rooms | Explicit rate/market segment and report treatment | Phase 2 | No |
| OD-022 | Children/extra-bed pricing | Per-rate-plan occupancy adjustments | Phase 1 | No |
| OD-023 | GST configuration approval | Hotel admin attestation plus accountant sign-off log | Before live | Yes |
| OD-024 | Data residency and privacy framework | India-region infrastructure where available; legal review | Before live | Yes |

## 24. Definition of done for any feature

A feature is done only when:

1. User journey and permissions work for all relevant roles and property scopes.
2. Domain invariants, validation, state transitions, idempotency, and transaction boundary are tested.
3. Audit and event behavior are implemented with redaction.
4. Loading, empty, error, conflict, disconnected, and partial-delivery states are handled.
5. Accessible keyboard/touch behavior and responsive layouts are verified.
6. Metrics/logs/traces and operational runbook notes exist.
7. API/event contract and schema migration are reviewed.
8. Unit, integration, authorization, and relevant E2E tests pass.
9. Seed/demo scenario demonstrates the feature.
10. Product decision log and this specification are updated for any changed assumption.

---

## Appendix A — V1 requirement traceability

Use IDs in tickets and test names:

- `TEN-*` tenancy/security
- `CFG-*` setup/configuration
- `RES-*` reservation/availability
- `PMS-*` stay/front desk
- `HKS-*` housekeeping
- `POS-*` order/KOT
- `BIL-*` folio/payment/invoice
- `NIT-*` night audit
- `MNT-*` maintenance
- `INV-*` inventory hooks
- `RPT-*` reports/dashboard
- `NTF-*` notifications/realtime
- `OPS-*` architecture/operations

The first implementation task for each phase should convert its acceptance criteria into numbered requirements and executable test cases without changing the underlying product decision silently.
