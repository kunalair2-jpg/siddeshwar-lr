# Transport ERP — Phase 1 (+ gate & delivery checkpoints)

A working implementation of Phase 1 ("Replace paper") from `Transport_ERP_System_Design.md`:
digital Lorry Receipt creation, a fleet/LR dashboard, and vehicle/client masters — built from
the Siddheshwer Transport mockups. Also includes logged-in (not link-based) versions of two
Phase 2 checkpoints: security gate-out and warehouse delivery confirmation.

## Stack

- **server/** — Express API, Node's built-in `node:sqlite` for storage, JWT auth.
- **client/** — React (Vite) + Tailwind, calling the API via a dev-server proxy.

## Run it

Two terminals:

```bash
cd server
npm install   # first time only
npm run dev   # http://localhost:4000
```

```bash
cd client
npm install   # first time only
npm run dev   # http://localhost:5173
```

Open http://localhost:5173 and sign in with one of three roles (toggle on the login screen):

- **Office Staff:** Employee ID `EMP-4920` / password `dispatch123` — Dashboard, History (LR list), Settings, plus a "Reports" view (Live Arrivals board).
- **Security Checker:** Employee ID `SEC-1001` / password `gate123` — Gate Control + Departure Log.
- **Receiver:** Employee ID `REC-2001` / password `receive123` — Incoming Deliveries, Delivery Log, Inspections (your own past verifications), and Reconciliation (Payment & Finance Tracking).

The SQLite database is created at `server/data/erp.sqlite3` on first run, seeded with demo
vehicles and clients (no LRs — create your own from the dashboard).

## What's implemented vs. the full spec

Phase 1 ("replace paper": LR creation/listing/status tracking, a fleet status dashboard, and
vehicle/client masters) plus two Phase 2 checkpoints, each gated to its own login role with
the LR operator deliberately excluded from self-approving:

- **Draft → In Transit** (gate-out): only **Security** can do this. Confirmed from `/gate`
  ("Verify & Authorize").
- **In Transit → Delivered/Disputed** (proof of delivery): only **Receiver** can do this, from
  `/delivery` — either a quick "Mark Delivered"/"Report Issue" action, or "Inspect" first to
  record received quantity and condition per goods line item (visible afterward on the
  dispatcher's LR detail page).
- **Delivered → Paid** (payment receipt): also **Receiver**-only, from `/reconciliation`'s "Pay"
  button — continuing the same "operator excluded from self-approving" pattern. Office can see a
  read-only "Payments Received" summary on its own Dashboard but can't mark anything Paid itself.

The full state machine (`Draft → In Transit → Delivered → Paid`, with `Disputed`/`Cancelled`
branches) is enforced authoritatively in `server/src/routes/lrs.js`'s `TRANSITIONS` table — any
transition not explicitly listed there is rejected with 400 regardless of role, and each listed
transition names exactly which role(s) may perform it (403 otherwise). The frontend's per-role
buttons are just a convenience on top of that; the API is the real gate.

The rest of Phase 2+ from the spec — the driver mobile app, GPS tracking, the *external*
link/QR-based version of gate-out and POD confirmation (no login, for staff who aren't system
users) — is out of scope for this build.

## Office-side navigation

The Office Staff role has **two zones** within the same account, sharing top tabs (Direct
Dispatch / Reports / History) and header search, but each with its own sidebar:

**Core zone** (`/`, `/payments`, `/lrs`, `/lrs/new`, `/lrs/:id`, sidebar: Dashboard / Payments /
History / Settings) — the day-to-day LR-maker's workspace. This is intentionally the *only*
thing Office does: create the LR, see LR history, and see whether payments have come in
(read-only) — nothing else.
- **Dashboard** (`/`) — the original "Good morning" view: active trips/disputed/total-today
  counters, a compact "Payments Received" summary (received vs. pending-past-21-days, read-only)
  with a link into the full Payments page, a recent-LRs table, and the "Create New Lorry
  Receipt" CTA.
- **Payments** (`/payments`) — all delivered transportation (Delivered + Paid LRs, i.e.
  everything actually billable; still-in-transit LRs are excluded), sorted by urgency (soonest
  due / most overdue first), with an All/Pending/Paid filter. The "Days Remaining to Pay" column
  reads **"Paid"** in green once settled, **"Pending"** in red once past due, or **"N days
  remaining"** otherwise. Read-only — same as the Dashboard summary, Office can see this but
  Receiver is the one who actually marks something Paid.
- **History** (`/lrs`) — the full LR list with status/date/search filters.

**Reports zone** (`/reports`, sidebar: Dashboard / Settings) — reached via the "Reports" top
tab: the "Live Arrivals" board (4 metric cards, status pills, a filterable arrivals table).
"Delayed" and the ETA/On-Time/Late labels are a heuristic from `lr_date` vs. today, since no
ETA/expected-transit-time field is modeled.

## Receiver-side navigation

The Receiver role (consignee/warehouse) owns the back half of the LR lifecycle — confirming
delivery *and* confirming payment — exclusively. Sidebar: Incoming Deliveries / Delivery Log /
Inspections / Reconciliation.
- **Incoming Deliveries** (`/delivery`) — In-Transit LRs awaiting confirmation: a quick "Mark
  Delivered"/"Report Issue" action, or "Inspect" first to record received quantity and condition
  per goods line item.
- **Delivery Log** (`/delivery/log`) — history of confirmed/disputed deliveries.
- **Inspections** (`/inspections`) — your own past delivery-verification records (read-only,
  separate from the live action screen above).
- **Reconciliation** ("Payment & Finance Tracking", `/reconciliation`) — receivables/overdue
  computed live from existing LR `amount` + the matched client's `payment_terms_days` (no new
  schema). **"Pay" is real** — it calls `Delivered → Paid` in `TRANSITIONS`, restricted to
  Receiver same as the delivery checkpoints. **"Hold" is visual-only** — a local toggle that
  isn't persisted, by explicit choice.

These (Inspections, Reconciliation) used to live on the Office side; they were moved to be
Receiver-exclusive on request, so Office never sees or approves its own deliveries/payments.
