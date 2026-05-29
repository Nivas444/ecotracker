import type {
  Bin,
  PlasticPrice,
  TrendDataPoint,
  Activity,
  Recycler,
  Batch,
} from '../types';

// ── Bins ─────────────────────────────────────────────────────

export const mockBins: Bin[] = [
  {
    id: 'BIN-001',
    location: 'Lobby North Area',
    zone: 'North',
    fillLevel: 88,
    weightKg: 124,
    lastCollected: '2026-05-28T14:30:00Z',
    status: 'full',
    connectivity: 'online',
    lastUpdated: '2026-05-29T12:00:00Z',
    recyclablePct: 82,
    nonRecyclablePct: 18,
    segregationScore: 85,
    customerName: 'Grand Hyatt Resort',
    deviceId: 'IOT-BIN-101',
    categories: [
      { name: 'plastic', weightKg: 62, percentage: 50 },
      { name: 'organic', weightKg: 31, percentage: 25 },
      { name: 'glass', weightKg: 18, percentage: 15 },
      { name: 'metal', weightKg: 13, percentage: 10 }
    ]
  },
  {
    id: 'BIN-002',
    location: 'Kitchen Service Entry',
    zone: 'East',
    fillLevel: 42,
    weightKg: 78,
    lastCollected: '2026-05-28T16:15:00Z',
    status: 'medium',
    connectivity: 'online',
    lastUpdated: '2026-05-29T12:05:00Z',
    recyclablePct: 65,
    nonRecyclablePct: 35,
    segregationScore: 70,
    customerName: 'Hilton Bay View',
    deviceId: 'IOT-BIN-102',
    categories: [
      { name: 'plastic', weightKg: 30, percentage: 38 },
      { name: 'organic', weightKg: 28, percentage: 36 },
      { name: 'glass', weightKg: 12, percentage: 15 },
      { name: 'metal', weightKg: 8, percentage: 11 }
    ]
  },
  {
    id: 'BIN-003',
    location: 'Poolside Bar Restrooms',
    zone: 'South',
    fillLevel: 15,
    weightKg: 22,
    lastCollected: '2026-05-29T09:00:00Z',
    status: 'empty',
    connectivity: 'online',
    lastUpdated: '2026-05-29T12:10:00Z',
    recyclablePct: 90,
    nonRecyclablePct: 10,
    segregationScore: 92,
    customerName: 'Marriott Cabana Club',
    deviceId: 'IOT-BIN-103',
    categories: [
      { name: 'plastic', weightKg: 11, percentage: 50 },
      { name: 'organic', weightKg: 4, percentage: 18 },
      { name: 'glass', weightKg: 4, percentage: 18 },
      { name: 'metal', weightKg: 3, percentage: 14 }
    ]
  }
];

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

export const mockRecyclers: Recycler[] = [
  {
    id: 'REC-001',
    name: 'Caribbean Eco-Processors',
    acceptedWasteType: 'PET, HDPE, Mixed Plastic',
    buyingPricePerKg: 0.85,
    currency: '$',
    priceUnit: 'kg',
    trend: 'up',
    status: 'Receiving',
    location: 'Port of Spain, Trinidad',
    contactPerson: 'David Warner'
  },
  {
    id: 'REC-002',
    name: 'BioFuel & Glass Recoveries',
    acceptedWasteType: 'Glass, Metal, Organic Residue',
    buyingPricePerKg: 0.32,
    currency: '$',
    priceUnit: 'kg',
    trend: 'stable',
    status: 'Receiving',
    location: 'Kingston, Jamaica',
    contactPerson: 'Sarah Connor'
  }
];

// ── Batches ───────────────────────────────────────────────────

export const mockBatches: Batch[] = [
  {
    id: 'BATCH-001',
    source: 'BIN-001',
    sourceLocation: 'Grand Hyatt Resort',
    weightKg: 120,
    plasticWeightKg: 62,
    metalWeightKg: 13,
    glassWeightKg: 18,
    composition: {
      pet: 30,
      hdpe: 25,
      ldpe: 15,
      pp: 15,
      mixed: 15,
      metal: 11,
      glass: 15,
      organic: 25,
      paper: 0
    },
    quality: 'Good',
    status: 'VERIFIED',
    destination: 'recycler',
    assignedRecyclerId: 'REC-001',
    timestamps: {
      created: '2026-05-27T10:00:00Z',
      assigned: '2026-05-27T11:30:00Z',
      delivered: '2026-05-27T15:45:00Z',
      verified: '2026-05-27T16:30:00Z'
    },
    audit: {
      qrVerified: true,
      gpsLogged: true,
      photoVerified: true
    },
    driverName: 'Liam Neeson',
    vehicleId: 'CARIB-03'
  },
  {
    id: 'BATCH-002',
    source: 'BIN-002',
    sourceLocation: 'Hilton Bay View',
    weightKg: 78,
    plasticWeightKg: 30,
    metalWeightKg: 8,
    glassWeightKg: 12,
    composition: {
      pet: 35,
      hdpe: 25,
      ldpe: 10,
      pp: 15,
      mixed: 15,
      metal: 10,
      glass: 15,
      organic: 36,
      paper: 0
    },
    quality: 'Medium',
    status: 'DELIVERED',
    destination: 'recycler',
    assignedRecyclerId: 'REC-001',
    timestamps: {
      created: '2026-05-28T09:00:00Z',
      assigned: '2026-05-28T10:15:00Z',
      delivered: '2026-05-28T14:20:00Z'
    },
    audit: {
      qrVerified: true,
      gpsLogged: true,
      photoVerified: false
    },
    driverName: 'John Doe',
    vehicleId: 'TRK-9921'
  },
  {
    id: 'BATCH-003',
    source: 'BIN-003',
    sourceLocation: 'Marriott Cabana Club',
    weightKg: 22,
    plasticWeightKg: 11,
    metalWeightKg: 3,
    glassWeightKg: 4,
    composition: {
      pet: 40,
      hdpe: 30,
      ldpe: 10,
      pp: 10,
      mixed: 10,
      metal: 14,
      glass: 18,
      organic: 18,
      paper: 0
    },
    quality: 'Good',
    status: 'CREATED',
    destination: 'recycler',
    assignedRecyclerId: 'REC-002',
    timestamps: {
      created: '2026-05-29T08:30:00Z',
      assigned: '2026-05-29T09:10:00Z'
    },
    audit: {
      qrVerified: true,
      gpsLogged: true,
      photoVerified: true
    },
    driverName: 'John Doe',
    vehicleId: 'TRK-9921'
  }
];
