# SortyX EcoTracker — Smart Waste Management Dashboard

> **A next-generation, AI-ready waste tracking platform that transforms how hotels and tourist locations manage, track, and monetise waste — from collection to compliance.**

---

## What Is SortyX EcoTracker?

SortyX EcoTracker is a **real-time Smart Waste Management Dashboard** designed for hotels, resorts, and tourist locations. It provides end-to-end visibility into waste — from the moment it's collected in smart bins to its final processing destination — while automatically generating ESG compliance reports.

The system bridges the gap between **IoT hardware** (smart bins with sensors) and **business intelligence**, giving facility managers, sustainability officers, and stakeholders a single platform to monitor, optimise, and report on waste operations.

---

## How It Works

### The Complete Flow

```
Hotel / Location
       ↓
Smart Bins (IoT sensors track fill level, weight, composition)
       ↓
Batch Creation (waste collected → batch generated with full metadata)
       ↓
Logistics Registry (manually assigned fleet driver details & vehicle plates)
       ↓
Recycler Connectivity (manually registered external facility buyers)
       ↓
Compliance & ESG Report (auto-generated, audit-ready)
```

---

## Key Features

### 1. Visual Overview & Analytics Dashboard
- **Compact Layout** — Side-by-side horizontal grid rows to maximize workspace and reduce vertical scrolling.
- **Environmental Metrics** — CO₂ saved, waste diverted from landfill, and recycling rates updated in real time.
- **Verification Summaries** — Recharts donut chart visualization showing verified vs pending shipment ratios.
- **Delivery Statistics** — Compact progress indicators illustrating batch volumes across all operational stages (`CREATED`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `VERIFIED`).
- **Audit Feed** — Chronological log of operational activities with monochrome icons.

### 2. Dedicated Recycler Coordination
- **Separate Operations View** — Managed on a dedicated page in the sidebar navigation instead of mixed into the dashboard.
- **Status & Details List** — View buying prices, currency trend indices (Rising / Falling / Stable), location, and contact information.
- **Shipment Delivery History** — Interactive logs nested under each facility card showing historical batches assigned or delivered to them.
- **Admin Modal Registry** — Quick form to register new facilities. Started in a clean, fresh empty state until data is manually added.

### 3. Dedicated Logistics & Fleet Registry
- **Separate Logistics View** — Managed on a dedicated page in the sidebar navigation.
- **Fleet Operator Cards** — View assigned drivers, phone numbers, and vehicle plate numbers.
- **Active Cargo Assignments** — Displays active batches currently in transit under each driver's card.
- **Admin Modal Registry** — Quick form to register new fleet drivers and vehicles. Started in a clean, fresh empty state until data is manually added.

### 4. Light & Dark Theme Swapping
- **Dynamic Switcher** — Persists preferences to `localStorage` and binds the appropriate styles to the root document.
- **Accessible Toggles** — Easily toggle between themes via a floating icon on the Login page, or a button next to the calendar date in the header bar.
- **Light Theme Palette** — Off-white backgrounds (`#f5f6fa`), clean white cards, and indigo/slate typography, while retaining the purple brand aesthetic.

### 5. Curved Premium Button Design
- **Modern Edges** — Button heights set to `40px` with curved, pill-shaped edges (`border-radius: 9999px`) across the entire platform.
- **Micro-Animations** — Smooth state transitions, hover scale effects, and distinct active clicks.

### 6. Smart Bin Monitoring
- Track active bins across multiple locations.
- **5-category waste breakdown** per bin: Plastic, Organic, Glass, Paper, Metal.
- **Fill-level visualization** with colour-coded progress bars.
- Insights modal featuring Recharts trend graph of historical waste weights generated.

### 7. Batch Tracking & Chain of Custody
- **One-click batch generation** — creates a traceable waste batch from any bin's current data.
- **4-step status timeline** with animated progression (Collected → In Transit → Delivered → Verified).
- **Audit verification indicators** — QR scan, GPS logging, and photo verification status per batch.
- **Audit Ledger Correction** — Admins can correct weights/reopen batches even after verification, saving audit edits in `batch.history`.

### 8. Role-Based Access Control
- **Admin role** — full access: generate batches, register recyclers/drivers, execute trades, edit history, export data.
- **Viewer role** — read-only dashboard access for stakeholders and auditors.

---

## Technical Highlights

| Feature | Detail |
|---------|--------|
| **Core Framework** | React 18 + TypeScript + Vite |
| **State Management** | React Context API |
| **Styling** | Vanilla CSS with custom design system variables, light/dark theme selectors |
| **Icons & Charts** | Lucide React + Recharts |
| **Verification & Build** | Vite production compiler (zero TypeScript/bundler warnings) |

---

## Demo Walkthrough

1. **Theme Switch** → Toggle between Light and Dark mode using the button in the top-right corner.
2. **Login** → Sign in as admin (full access) or any username (viewer).
3. **Operations Setup** → Go to Recyclers and Logistics pages to register a facility and driver using the Admin modals.
4. **Bin Inspection** → Click any bin under Bin Monitor to view telemetry and historical collections graphs.
5. **Collection Dispatch** → Go to Batch Ops, click Add Batch to generate cargo metadata, choose the registered driver/recycler, and dispatch.
6. **Delivery Operations** → Go to Recyclers to see shipment delivery logs, or Logistics to track active cargo assignments.
7. **View Analytics** → Return to the Dashboard to see the Recharts verification summary donut chart update instantly.

---

## License

Proprietary — SortyX Technologies. All rights reserved.

---

<p align="center">
  <strong>SortyX EcoTracker</strong> — Turning waste into insight, compliance into confidence.
</p>
