import type {
  Bin,
  PlasticPrice,
  TrendDataPoint,
  Activity,
  Recycler,
  Batch,
} from '../types';

// ── Bins ─────────────────────────────────────────────────────

export const mockBins: Bin[] = [];

// ── Pricing ──────────────────────────────────────────────────

export const mockPrices: PlasticPrice[] = [
  {
    id: 'price-US-EAST',
    region: 'US',
    pricePerKg: 1.20,
    currency: 'USD/kg',
    trend: 'up',
    action: 'Sell',
    updatedAt: '2026-05-18T10:00:00Z',
  },
  {
    id: 'price-US',
    region: 'US',
    pricePerKg: 0.48,
    currency: 'USD/kg',
    trend: 'down',
    action: 'Hold',
    updatedAt: '2026-05-18T10:00:00Z',
  },
  {
    id: 'price-EU',
    region: 'EU',
    pricePerKg: 0.61,
    currency: 'EUR/kg',
    trend: 'up',
    action: 'Sell',
    updatedAt: '2026-05-18T10:00:00Z',
  },
];

// ── 7-day Trend ───────────────────────────────────────────────

export const mockTrendData: TrendDataPoint[] = [
  { date: 'Mon', plastic: 120, organic: 98,  glass: 45, paper: 60, metal: 18 },
  { date: 'Tue', plastic: 145, organic: 110, glass: 52, paper: 55, metal: 20 },
  { date: 'Wed', plastic: 132, organic: 105, glass: 48, paper: 58, metal: 17 },
  { date: 'Thu', plastic: 178, organic: 134, glass: 61, paper: 72, metal: 24 },
  { date: 'Fri', plastic: 210, organic: 160, glass: 74, paper: 88, metal: 29 },
  { date: 'Sat', plastic: 265, organic: 195, glass: 93, paper: 102, metal: 36 },
  { date: 'Sun', plastic: 198, organic: 148, glass: 68, paper: 79, metal: 27 },
];

// ── Initial Activities ────────────────────────────────────────

export const mockActivities: Activity[] = [];

// ── Recyclers ─────────────────────────────────────────────────

export const mockRecyclers: Recycler[] = [];

export const mockBatches: Batch[] = [];

